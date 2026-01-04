// src/bot/handlers/callbacks/premium.callbacks.ts

/**
 * Обработчики для Premium функционала бота.
 */

import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';
import {
  createPremiumInfoKeyboard,
  createPremiumNotifiedKeyboard,
} from '../../keyboards/premium.keyboards.js';

// ОБРАБОТЧИК 1: Показать страницу Premium
export async function handlePremiumInfo(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  console.log(`💎 Пользователь ${userId} открыл страницу Premium`);

  // Шаг 1: Получаем данные пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 2: Проверяем - уже в waitlist или нет?
  const isInterested = user?.premium_interested || false;

  // Шаг 3: Формируем текст страницы Premium
  const premiumMessage =
    lang === 'ru'
      ? [
          '💎 <b>Travel Rules Premium</b>',
          '',
          '<b>Скоро будут доступны:</b>',
          '',
          '📱 <b>Офлайн доступ</b>',
          '   • Скачайте правила в PDF',
          '   • Просматривайте без интернета',
          '',
          '🔍 <b>Расширенный поиск</b>',
          '   • Фильтры по категориям',
          '   • Поиск по регионам',
          '   • История поисков',
          '',
          '🗺️ <b>Региональные правила</b>',
          '   • Правила для городов',
          '   • Туристические зоны',
          '   • Локальные особенности',
          '',
          '🔔 <b>Push-уведомления</b>',
          '   • Изменения в правилах',
          '   • Новые законы',
          '   • Персональные напоминания',
          '',
          '⚡ <b>Приоритетная поддержка</b>',
          '   • Быстрые ответы на вопросы',
          '   • Помощь в сложных ситуациях',
          '',
          isInterested
            ? '✅ <i>Вы уже в списке ожидания! Мы сообщим когда Premium будет готов.</i>'
            : '💡 <i>Нажмите "Уведомить меня" чтобы узнать о запуске первыми!</i>',
        ].join('\n')
      : [
          '💎 <b>Travel Rules Premium</b>',
          '',
          '<b>Coming Soon:</b>',
          '',
          '📱 <b>Offline Access</b>',
          '   • Download rules as PDF',
          '   • Browse without internet',
          '',
          '🔍 <b>Advanced Search</b>',
          '   • Category filters',
          '   • Regional search',
          '   • Search history',
          '',
          '🗺️ <b>Regional Rules</b>',
          '   • City-specific rules',
          '   • Tourist zones',
          '   • Local regulations',
          '',
          '🔔 <b>Push Notifications</b>',
          '   • Rule changes',
          '   • New laws',
          '   • Personal reminders',
          '',
          '⚡ <b>Priority Support</b>',
          '   • Fast responses',
          '   • Help with complex cases',
          '',
          isInterested
            ? "✅ <i>You're on the waitlist! We'll notify you when Premium is ready.</i>"
            : '💡 <i>Click "Notify Me" to be among the first to know about the launch!</i>',
        ].join('\n');

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

  console.log(`🔔 Пользователь ${userId} нажал "Уведомить меня" для Premium`);

  // Шаг 1: Получаем данные пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 2: Проверяем - уже в waitlist?
  if (user?.premium_interested) {
    // Уже записан
    await ctx.answerCallbackQuery(
      lang === 'ru' ? 'ℹ️ Вы уже в списке ожидания!' : "ℹ️ You're already on the waitlist!"
    );
    return;
  }

  // Шаг 3: Сохраняем premium_interested = TRUE
  await userRepository.update(userId, {
    premium_interested: true,
  });

  console.log(`✅ Пользователь ${userId} добавлен в Premium waitlist`);

  // Шаг 4: Трекаем событие
  await analyticsRepository.trackEvent(userId, 'premium_waitlist_joined', {
    source: 'premium_page',
  });

  // Шаг 5: Показываем подтверждение
  await ctx.answerCallbackQuery(
    lang === 'ru'
      ? '✅ Отлично! Мы сообщим вам когда Premium будет готов.'
      : "✅ Great! We'll notify you when Premium is ready."
  );

  // Шаг 6: Обновляем страницу с новой клавиатурой
  const premiumMessage =
    lang === 'ru'
      ? [
          '💎 <b>Travel Rules Premium</b>',
          '',
          '<b>Скоро будут доступны:</b>',
          '',
          '📱 <b>Офлайн доступ</b>',
          '   • Скачайте правила в PDF',
          '   • Просматривайте без интернета',
          '',
          '🔍 <b>Расширенный поиск</b>',
          '   • Фильтры по категориям',
          '   • Поиск по регионам',
          '   • История поисков',
          '',
          '🗺️ <b>Региональные правила</b>',
          '   • Правила для городов',
          '   • Туристические зоны',
          '   • Локальные особенности',
          '',
          '🔔 <b>Push-уведомления</b>',
          '   • Изменения в правилах',
          '   • Новые законы',
          '   • Персональные напоминания',
          '',
          '⚡ <b>Приоритетная поддержка</b>',
          '   • Быстрые ответы на вопросы',
          '   • Помощь в сложных ситуациях',
          '',
          '✅ <i>Вы уже в списке ожидания! Мы сообщим когда Premium будет готов.</i>',
        ].join('\n')
      : [
          '💎 <b>Travel Rules Premium</b>',
          '',
          '<b>Coming Soon:</b>',
          '',
          '📱 <b>Offline Access</b>',
          '   • Download rules as PDF',
          '   • Browse without internet',
          '',
          '🔍 <b>Advanced Search</b>',
          '   • Category filters',
          '   • Regional search',
          '   • Search history',
          '',
          '🗺️ <b>Regional Rules</b>',
          '   • City-specific rules',
          '   • Tourist zones',
          '   • Local regulations',
          '',
          '🔔 <b>Push Notifications</b>',
          '   • Rule changes',
          '   • New laws',
          '   • Personal reminders',
          '',
          '⚡ <b>Priority Support</b>',
          '   • Fast responses',
          '   • Help with complex cases',
          '',
          "✅ <i>You're on the waitlist! We'll notify you when Premium is ready.</i>",
        ].join('\n');

  // Обновляем с клавиатурой "Вы в списке ожидания"
  await ctx.editMessageText(premiumMessage, {
    reply_markup: createPremiumNotifiedKeyboard(lang),
    parse_mode: 'HTML',
  });
}
