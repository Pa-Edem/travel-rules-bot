// src/bot/handlers/callbacks/premium.callbacks.ts

/**
 * Обработчики для Premium функционала бота.
 */

import { logger } from '../../../utils/logger.js';
import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';
import {
  createPremiumInfoKeyboard,
  createPremiumNotifiedKeyboard,
} from '../../keyboards/premium.keyboards.js';
import { formatPremiumPage } from '../../../services/premium.service.js';

// ОБРАБОТЧИК 1: Показать страницу Premium
export async function handlePremiumInfo(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь открыл страницу Premium', {
    userId: userId,
  });

  // Шаг 1: Получаем данные пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 2: Проверяем - уже в waitlist или нет?
  const isInterested = user?.premium_interested || false;

  // Шаг 3: Формируем текст страницы Premium
  const premiumMessage = formatPremiumPage(lang, isInterested);

  // Шаг 4: Выбираем правильную клавиатуру
  const keyboard = isInterested
    ? createPremiumNotifiedKeyboard(lang) // Уже в waitlist
    : createPremiumInfoKeyboard(lang); // Ещё не в waitlist

  // Шаг 5: Трекаем просмотр страницы Premium
  await analyticsRepository.trackEvent(userId, 'premium_page_viewed', {
    already_interested: isInterested,
  });

  // Шаг 6: Показываем страницу
  await ctx.editMessageText(premiumMessage, {
    reply_markup: keyboard,
    parse_mode: 'HTML',
  });

  await ctx.answerCallbackQuery();
}

// ОБРАБОТЧИК 2: Записаться в waitlist Premium
export async function handlePremiumNotify(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь нажал "Уведомить меня" для Premium', {
    userId: userId,
  });

  // Шаг 1: Получаем данные пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 2: Проверяем - уже в waitlist?
  if (user?.premium_interested) {
    // Уже записан
    await ctx.answerCallbackQuery(ctx.t('premium.already_notified'));
    return;
  }

  // Шаг 3: Сохраняем premium_interested = TRUE
  await userRepository.update(userId, {
    premium_interested: true,
  });

  logger.info('Пользователь добавлен в Premium waitlist', {
    userId: userId,
  });

  // Шаг 4: Трекаем событие
  await analyticsRepository.trackEvent(userId, 'premium_waitlist_joined', {
    source: 'premium_page',
  });

  // Шаг 5: Показываем подтверждение
  await ctx.answerCallbackQuery(ctx.t('premium.notify_success'));

  // Шаг 6: Обновляем страницу с новой клавиатурой
  const premiumMessage = formatPremiumPage(lang, true);

  // Обновляем с клавиатурой "Вы в списке ожидания"
  await ctx.editMessageText(premiumMessage, {
    reply_markup: createPremiumNotifiedKeyboard(lang),
    parse_mode: 'HTML',
  });
}
