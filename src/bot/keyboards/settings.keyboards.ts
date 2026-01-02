// src/bot/keyboards/settings.keyboards.ts

/**
 * Клавиатуры для настроек
 */

import { InlineKeyboard } from 'grammy';

/**
 * Главная клавиатура настроек
 */
export function createSettingsKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  if (lang === 'ru') {
    keyboard
      .text('📊 Моя статистика', 'settings_statistics')
      .row()
      .text('🌐 Изменить язык', 'settings_change_language')
      .row()
      .text('ℹ️ О боте', 'settings_about')
      .row()
      .text('🏠 Главное меню', 'nav_main_menu');
  } else {
    keyboard
      .text('📊 My Statistics', 'settings_statistics')
      .row()
      .text('🌐 Change Language', 'settings_change_language')
      .row()
      .text('ℹ️ About Bot', 'settings_about')
      .row()
      .text('🏠 Main Menu', 'nav_main_menu');
  }

  return keyboard;
}

/**
 * Клавиатура выбора языка в настройках
 */
export function createLanguageChangeKeyboard(currentLang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Показываем оба языка с отметкой текущего
  keyboard
    .text(currentLang === 'en' ? '🇬🇧 English ✅' : '🇬🇧 English', 'settings_lang_en')
    .text(currentLang === 'ru' ? '🇷🇺 Русский ✅' : '🇷🇺 Русский', 'settings_lang_ru')
    .row()
    .text(currentLang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu_settings');

  return keyboard;
}
