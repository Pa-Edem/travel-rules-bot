// src/bot/keyboards/onboarding.keyboards.ts

/**
 * Клавиатуры для онбординга пользователя
 */

import { InlineKeyboard } from 'grammy';

// Клавиатура выбора языка
export function createLanguageKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🇬🇧 English', 'lang_en').text('🇷🇺 Русский', 'lang_ru');
}

// Клавиатура для краткого Legal Disclaimer
export function createDisclaimerKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const acceptText = lang === 'ru' ? '✅ Я согласен' : '✅ I Accept';
  const declineText = lang === 'ru' ? '❌ Отклонить' : '❌ Decline';
  const readFullText = lang === 'ru' ? '📄 Читать полностью' : '📄 Read Full';

  return new InlineKeyboard()
    .text(acceptText, 'disclaimer_accept')
    .text(declineText, 'disclaimer_decline')
    .row()
    .text(readFullText, 'disclaimer_read_full');
}

// Клавиатура для полного disclaimer
export function createFullDisclaimerKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const backText = lang === 'ru' ? '◀️ Назад' : '◀️ Back';

  return new InlineKeyboard().text(backText, 'disclaimer_back');
}

// Главное меню (после онбординга)
export function createMainMenuKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  if (lang === 'ru') {
    return new InlineKeyboard()
      .text('🌍 Выбрать страну', 'menu_countries')
      .row()
      .text('🔍 Поиск правил', 'menu_search')
      .row()
      .text('💎 Premium', 'menu_premium')
      .row()
      .text('⚙️ Настройки', 'menu_settings')
      .text('❓ Помощь', 'menu_help');
  } else {
    return new InlineKeyboard()
      .text('🌍 Browse Countries', 'menu_countries')
      .row()
      .text('🔍 Search Rules', 'menu_search')
      .row()
      .text('💎 Premium', 'menu_premium')
      .row()
      .text('⚙️ Settings', 'menu_settings')
      .text('❓ Help', 'menu_help');
  }
}
