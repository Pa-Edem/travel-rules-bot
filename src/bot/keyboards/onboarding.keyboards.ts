// src/bot/keyboards/onboarding.keyboards.ts

/**
 * Клавиатуры для онбординга пользователя
 */

import { InlineKeyboard } from 'grammy';
import { translate } from '../utils/translate.helper.js';

// Клавиатура выбора языка
export function createLanguageKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🇬🇧 English', 'lang_en').text('🇷🇺 Русский', 'lang_ru');
}

// Клавиатура для краткого Legal Disclaimer
export function createDisclaimerKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  return new InlineKeyboard()
    .text(translate(lang, 'onboarding.disclaimer.accept'), 'disclaimer_accept')
    .text(translate(lang, 'onboarding.disclaimer.decline'), 'disclaimer_decline')
    .row()
    .text(translate(lang, 'onboarding.disclaimer.read_full'), 'disclaimer_read_full');
}

// Клавиатура для полного disclaimer
export function createFullDisclaimerKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  return new InlineKeyboard().text(
    translate(lang, 'onboarding.disclaimer.back'),
    'disclaimer_back'
  );
}

// Главное меню (после онбординга)
export function createMainMenuKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  return new InlineKeyboard()
    .text(translate(lang, 'menu.browse_countries'), 'menu_countries')
    .row()
    .text(translate(lang, 'menu.search_rules'), 'menu_search')
    .row()
    .text(translate(lang, 'menu.premium'), 'menu_premium')
    .row()
    .text(translate(lang, 'menu.settings'), 'menu_settings')
    .text(translate(lang, 'menu.help'), 'menu_help');
}