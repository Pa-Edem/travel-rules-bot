// src/bot/keyboards/navigation.keyboards.ts

/**
 * Клавиатуры для навигации по странам и категориям
 */

import { InlineKeyboard } from 'grammy';
import { COUNTRIES, CATEGORIES } from '../../config/constants.js';
import { translate } from '../utils/translate.helper.js';
import type { Rule } from '../../database/repositories/RuleRepository.js';

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

/**
 * Клавиатура со списком правил
 */
export function createRulesListKeyboard(rules: Rule[], lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Добавляем кнопку для каждого правила
  rules.forEach((rule) => {
    const title = rule.content[lang].title;
    const severity = getSeverityEmoji(rule.severity);

    keyboard.text(`${severity} ${title}`, `rule_${rule.id}`).row();
  });

  // Кнопки навигации
  keyboard
    .text(translate(lang, 'navigation.buttons.back'), 'nav_back')
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}

/**
 * Получить эмодзи для уровня серьезности
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Клавиатура для экрана просмотра правила
 */
export function createRuleViewKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard
    .text(translate(lang, 'navigation.buttons.back_to_list'), 'nav_back')
    .row()
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}
