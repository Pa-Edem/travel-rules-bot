// src/bot/keyboards/navigation.keyboards.ts

/**
 * Клавиатуры для навигации по странам и категориям
 */

import { InlineKeyboard } from 'grammy';
import { COUNTRIES, CATEGORIES } from '../../config/constants.js';
import { translate } from '../utils/translate.helper.js';

/**
 * Клавиатура выбора страны
 */
export function createCountriesKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Добавляем кнопки стран (по 2 в ряд)
  COUNTRIES.forEach((country, index) => {
    const name = lang === 'ru' ? country.name_ru : country.name_en;
    keyboard.text(`${country.emoji} ${name}`, `country_${country.code}`);

    // Каждые 2 кнопки - новый ряд
    if (index % 2 === 1) {
      keyboard.row();
    }
  });

  // Кнопка "Главное меню" из переводов
  keyboard.row().text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}

/**
 * Клавиатура выбора категории
 */
export function createCategoriesKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Добавляем кнопки категорий (по одной в ряд)
  CATEGORIES.forEach((category) => {
    const name = lang === 'ru' ? category.name_ru : category.name_en;
    keyboard.text(`${category.emoji} ${name}`, `category_${category.id}`).row();
  });

  // Кнопки навигации из переводов
  keyboard
    .text(translate(lang, 'navigation.buttons.back'), 'nav_back')
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}

/**
 * Клавиатура для экрана правил (placeholder)
 */
export function createRulesKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard
    .text(translate(lang, 'navigation.buttons.back_to_categories'), 'nav_back')
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}
