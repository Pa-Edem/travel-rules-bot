// src/bot/middlewares/ratelimit.middleware.ts

/**
 * Rate Limiting Middleware
 *
 * Защита от спама и перегрузки сервера.
 * Ограничивает частоту запросов пользователей по типам действий.
 */

import type { BotContext } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Конфигурация лимитов
 *
 * max - максимальное количество запросов
 * window - временное окно в миллисекундах
 */
const RATE_LIMITS = {
  commands: {
    max: 10,
    window: 60000, // 60 секунд
  },
  search: {
    max: 5,
    window: 60000,
  },
  feedback: {
    max: 1,
    window: 60000,
  },
  messages: {
    max: 20,
    window: 60000,
  },
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Хранилище для отслеживания запросов
 *
 * Ключ: "userId:action"
 * Значение: массив timestamps
 *
 * Пример: "123456:search" => [1704380416000, 1704380420000]
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Проверка rate limit для пользователя и действия
 *
 * @param userId - ID пользователя
 * @param action - Тип действия (commands, search, feedback, messages)
 * @returns true если запрос разрешён, false если превышен лимит
 */
export function checkRateLimit(userId: number, action: RateLimitAction): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const limit = RATE_LIMITS[action];

  // Получаем историю запросов пользователя
  let timestamps = rateLimitStore.get(key) || [];

  // Удаляем запросы вне временного окна (старше 60 секунд)
  timestamps = timestamps.filter((timestamp) => now - timestamp < limit.window);

  // Проверяем превышен ли лимит
  if (timestamps.length >= limit.max) {
    logger.warn('Rate limit exceeded', {
      userId,
      action,
      requestsCount: timestamps.length,
      limit: limit.max,
      window: `${limit.window / 1000}s`,
    });
    return false; // ❌ Лимит превышен
  }

  // Добавляем текущий запрос в историю
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);

  logger.debug('Rate limit check passed', {
    userId,
    action,
    requestsCount: timestamps.length,
    limit: limit.max,
  });

  return true; // ✅ Запрос разрешён
}

/**
 * Получить оставшееся время до сброса лимита
 *
 * @param userId - ID пользователя
 * @param action - Тип действия
 * @returns Количество секунд до сброса или 0 если лимит не превышен
 */
export function getRetryAfter(userId: number, action: RateLimitAction): number {
  const key = `${userId}:${action}`;
  const timestamps = rateLimitStore.get(key);

  if (!timestamps || timestamps.length === 0) {
    return 0;
  }

  const now = Date.now();
  const limit = RATE_LIMITS[action];
  const oldestTimestamp = timestamps[0];
  const timeUntilReset = limit.window - (now - oldestTimestamp);

  return Math.ceil(timeUntilReset / 1000); // Возвращаем секунды
}

/**
 * Очистка старых записей из хранилища
 *
 * Удаляет записи пользователей, у которых все timestamps старше временного окна
 * Предотвращает утечку памяти
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    // Находим максимальное окно среди всех действий
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map((l) => l.window));

    // Фильтруем старые timestamps
    const validTimestamps = timestamps.filter((t) => now - t < maxWindow);

    if (validTimestamps.length === 0) {
      // Если все timestamps устарели - удаляем запись
      rateLimitStore.delete(key);
      removedCount++;
    } else if (validTimestamps.length < timestamps.length) {
      // Если остались только некоторые - обновляем
      rateLimitStore.set(key, validTimestamps);
    }
  }

  if (removedCount > 0) {
    logger.debug('Rate limit store cleanup completed', {
      removedEntries: removedCount,
      remainingEntries: rateLimitStore.size,
    });
  }
}

/**
 * Middleware для автоматической проверки rate limit
 *
 * Применяется ко всем callback queries и командам
 */
export function rateLimitMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return next();
    }

    // Определяем тип действия
    let action: RateLimitAction | null = null;

    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;

      // Проверяем специфичные действия
      if (data?.startsWith('search_') || data === 'menu_search') {
        action = 'search';
      } else if (data?.startsWith('feedback_')) {
        action = 'feedback';
      } else {
        action = 'commands'; // Все остальные callback queries
      }
    } else if (ctx.message?.text) {
      // Для текстовых сообщений
      if (ctx.message.text.startsWith('/')) {
        action = 'commands';
      } else {
        action = 'messages';
      }
    }

    // Если не смогли определить действие - пропускаем проверку
    if (!action) {
      return next();
    }

    // Проверяем rate limit
    if (!checkRateLimit(userId, action)) {
      const retryAfter = getRetryAfter(userId, action);

      // Формируем сообщение в зависимости от языка
      let message = `⏱ Too many requests. Please wait ${retryAfter} seconds.`;

      // Пытаемся получить перевод (если доступен i18n)
      try {
        message = ctx.t('errors.rate_limit');
      } catch {
        // Используем дефолтное сообщение
      }

      // Отвечаем пользователю
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: message,
          show_alert: true,
        });
      } else {
        await ctx.reply(message);
      }

      // НЕ вызываем next() - запрос не обрабатывается
      return;
    }

    // Rate limit не превышен - продолжаем обработку
    await next();
  };
}

/**
 * Запуск автоматической очистки хранилища
 * Вызывается при инициализации бота
 */
export function startRateLimitCleanup(): void {
  // Очистка каждые 5 минут
  const interval = setInterval(
    () => {
      cleanupRateLimitStore();
    },
    5 * 60 * 1000
  );

  logger.info('Rate limit cleanup scheduler started', {
    interval: '5 minutes',
  });

  // Возвращаем interval для возможности остановки при shutdown
  return interval as any;
}

/**
 * Экспорт для тестирования
 */
export const __testing__ = {
  rateLimitStore,
  RATE_LIMITS,
};
