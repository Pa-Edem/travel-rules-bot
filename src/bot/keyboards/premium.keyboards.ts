// src/bot/keyboards/premium.keyboards.ts

/**
 * Клавиатуры для Premium функционала бота.
 */

import { InlineKeyboard } from 'grammy';
import { translate } from '../utils/translate.helper.js';

// Клавиатура для страницы Premium
export function createPremiumInfoKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Кнопка "Уведомить меня"
  keyboard.text(translate(lang, 'premium.notify_me'), 'premium_notify').row();

  // Кнопка "Назад в меню"
  keyboard.text(translate(lang, 'premium.back_to_menu'), 'nav_main_menu');

  return keyboard;
}

// Клавиатура ПОСЛЕ нажатия "Уведомить меня"
export function createPremiumNotifiedKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Кнопка-индикатор (неактивная)
  keyboard.text(translate(lang, 'premium.on_waitlist'), 'premium_already_notified').row();

  // Кнопка "Назад в меню"
  keyboard.text(translate(lang, 'premium.back_to_menu'), 'nav_main_menu');

  return keyboard;
}
