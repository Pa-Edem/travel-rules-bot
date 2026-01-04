// src/bot/middlewares/error.middleware.ts

/**
 * Глобальный обработчик ошибок для бота
 *
 * Ловит все необработанные ошибки, логирует их и показывает пользователю понятное сообщение
 */

import { BotError, GrammyError, HttpError } from 'grammy';
import { logger } from '../../utils/logger.js';
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  TelegramError,
  RateLimitError,
  isOperationalError,
} from '../../utils/errors.js';
import type { BotContext } from '../../types/index.js';
import { userRepository } from '../../database/repositories/UserRepository.js';

/**
 * Получить подходящее сообщение об ошибке для пользователя
 */
async function getUserErrorMessage(error: Error, ctx: BotContext): Promise<string> {
  // Получаем язык пользователя из БД
  let lang: 'en' | 'ru' = 'en';

  if (ctx.from?.id) {
    try {
      const user = await userRepository.findById(ctx.from.id);
      lang = (user?.language_code as 'en' | 'ru') || 'en';
    } catch {
      // Если не удалось получить язык, используем английский
      lang = 'en';
    }
  }

  // Для кастомных ошибок используем переводы
  if (error instanceof DatabaseError) {
    return ctx.t('errors.database');
  }

  if (error instanceof NotFoundError) {
    return ctx.t('errors.not_found');
  }

  if (error instanceof RateLimitError) {
    return ctx.t('errors.rate_limit');
  }

  if (error instanceof TelegramError) {
    return ctx.t('errors.telegram_api');
  }

  if (error instanceof ValidationError) {
    return ctx.t('errors.generic');
  }

  // Для Grammy ошибок
  if (error instanceof GrammyError) {
    // Сообщение слишком старое для редактирования
    if (error.message.includes("message can't be edited")) {
      return lang === 'ru'
        ? '⚠️ Сообщение устарело, попробуйте снова'
        : '⚠️ Message is too old, please try again';
    }

    // Сообщение не изменилось
    if (error.message.includes('message is not modified')) {
      return lang === 'ru' ? 'ℹ️ Контент не изменился' : 'ℹ️ Content has not changed';
    }

    return ctx.t('errors.telegram_api');
  }

  // Для HTTP ошибок (проблемы с сетью)
  if (error instanceof HttpError) {
    return ctx.t('errors.database');
  }

  // Для всех остальных ошибок
  return ctx.t('errors.generic');
}

/**
 * Глобальный обработчик ошибок
 *
 * Подключается через bot.catch()
 */
export async function errorHandler(err: BotError<BotContext>) {
  const ctx = err.ctx;
  const error = err.error;

  // Собираем контекст для логирования
  const errorContext = {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    updateType: ctx.update ? Object.keys(ctx.update)[0] : 'unknown',
    callbackData: ctx.callbackQuery?.data,
    messageText: ctx.message?.text,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };

  // Определяем уровень серьёзности ошибки
  const isOperational = isOperationalError(error as Error);

  if (isOperational) {
    // Операционная ошибка (ожидаемая) — логируем как warning
    logger.warn('Операционная ошибка в боте', errorContext);
  } else {
    // Неоперационная ошибка (баг в коде) — логируем как error
    logger.error('Критическая ошибка в боте', errorContext);
  }

  // Пытаемся показать пользователю понятное сообщение
  try {
    const userMessage = await getUserErrorMessage(error as Error, ctx);

    // Если это callback query — отвечаем через answerCallbackQuery
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: userMessage,
        show_alert: true, // Показываем как alert (не toast)
      });
    } else {
      // Иначе просто отправляем сообщение
      await ctx.reply(userMessage);
    }
  } catch (replyError) {
    // Если даже не можем отправить сообщение об ошибке
    logger.error('Не удалось отправить сообщение об ошибке пользователю', {
      userId: ctx.from?.id,
      originalError: error instanceof Error ? error.message : String(error),
      replyError: replyError instanceof Error ? replyError.message : String(replyError),
    });
  }
}

/**
 * Middleware для обработки специфичных Telegram ошибок
 *
 * Некоторые ошибки Telegram API не критичны и их можно игнорировать
 */
export function telegramErrorMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error: any) {
      // Пользователь заблокировал бота
      if (error.message?.includes('bot was blocked')) {
        logger.info('Пользователь заблокировал бота', {
          userId: ctx.from?.id,
        });
        return; // Не бросаем ошибку дальше
      }

      // Сообщение удалено
      if (error.message?.includes('message to delete not found')) {
        logger.debug('Сообщение уже удалено', {
          userId: ctx.from?.id,
        });
        return;
      }

      // Бросаем ошибку дальше для обработки глобальным handler
      throw error;
    }
  };
}
