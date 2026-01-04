// src/bot/keyboards/premium.keyboards.ts

/**
 * Клавиатуры для Premium функционала бота.
 */

import { InlineKeyboard } from 'grammy';

// Клавиатура для страницы Premium
export function createPremiumInfoKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Кнопка "Уведомить меня"
  const notifyText = lang === 'ru' ? '🔔 Уведомить меня' : '🔔 Notify Me';

  keyboard.text(notifyText, 'premium_notify').row();

  // Кнопка "Назад в меню"
  const backText = lang === 'ru' ? '◀️ Назад в меню' : '◀️ Back to Menu';

  keyboard.text(backText, 'nav_main_menu');

  return keyboard;
}

// Клавиатура ПОСЛЕ нажатия "Уведомить меня"
export function createPremiumNotifiedKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Кнопка-индикатор (неактивная)
  const notifiedText = lang === 'ru' ? '✅ Вы в списке ожидания' : "✅ You're on the Waitlist";

  keyboard
    .text(notifiedText, 'premium_already_notified') // callback не обрабатываем
    .row();

  // Кнопка "Назад в меню"
  const backText = lang === 'ru' ? '◀️ Назад в меню' : '◀️ Back to Menu';

  keyboard.text(backText, 'nav_main_menu');

  return keyboard;
}
