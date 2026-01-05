// src/bot/keyboards/settings.keyboards.ts

/**
 * Клавиатуры для настроек
 */

import { InlineKeyboard } from 'grammy';
import { translate } from '../utils/translate.helper.js';

// Главная клавиатура настроек
export function createSettingsKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard
    .text(translate(lang, 'settings.my_statistics'), 'settings_statistics')
    .row()
    .text(translate(lang, 'settings.change_language'), 'settings_change_language')
    .row()
    .text(translate(lang, 'settings.leave_feedback'), 'settings_feedback')
    .row()
    .text(translate(lang, 'settings.about_bot'), 'settings_about')
    .row()
    .text(translate(lang, 'menu.main_title'), 'nav_main_menu');

  return keyboard;
}

// Клавиатура выбора языка в настройках
export function createLanguageChangeKeyboard(currentLang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Показываем оба языка с отметкой текущего
  keyboard
    .text(currentLang === 'en' ? '🇬🇧 English ✅' : '🇬🇧 English', 'settings_lang_en')
    .text(currentLang === 'ru' ? '🇷🇺 Русский ✅' : '🇷🇺 Русский', 'settings_lang_ru')
    .row()
    .text(translate(currentLang, 'settings.back'), 'menu_settings');

  return keyboard;
}
