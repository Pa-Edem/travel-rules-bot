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
 * Клавиатура со списком правил (с пагинацией)
 *
 * @param rules - Правила для текущей страницы
 * @param currentPage - Текущая страница
 * @param totalPages - Всего страниц
 * @param lang - Язык
 */
export function createRulesListKeyboard(
  rules: Rule[],
  currentPage: number,
  totalPages: number,
  lang: 'en' | 'ru'
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Добавляем кнопку для каждого правила
  rules.forEach((rule) => {
    const title = rule.content[lang].title;
    const severity = getSeverityEmoji(rule.severity);

    keyboard.text(`${severity} ${title}`, `rule_${rule.id}`).row();
  });

  // Пагинация (если больше 1 страницы)
  if (totalPages > 1) {
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    // Кнопки Назад/Далее
    if (hasPrev && hasNext) {
      keyboard
        .text('⬅️ ' + (lang === 'ru' ? 'Назад' : 'Prev'), `page_prev`)
        .text(`${currentPage}/${totalPages}`, 'page_current')
        .text((lang === 'ru' ? 'Далее' : 'Next') + ' ➡️', `page_next`)
        .row();
    } else if (hasPrev) {
      keyboard
        .text('⬅️ ' + (lang === 'ru' ? 'Назад' : 'Prev'), `page_prev`)
        .text(`${currentPage}/${totalPages}`, 'page_current')
        .row();
    } else if (hasNext) {
      keyboard
        .text(`${currentPage}/${totalPages}`, 'page_current')
        .text((lang === 'ru' ? 'Далее' : 'Next') + ' ➡️', `page_next`)
        .row();
    }
  }

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
 * С кнопками обратной связи 👍/👎
 *
 * @param lang - Язык интерфейса ('en' или 'ru')
 * @param ruleId - ID правила (например: 'IT_TRANSPORT_001')
 */
export function createRuleViewKeyboard(lang: 'en' | 'ru', ruleId: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Текст кнопок в зависимости от языка
  const helpfulText = lang === 'ru' ? '👍 Полезно' : '👍 Helpful';
  const notHelpfulText = lang === 'ru' ? '👎 Не полезно' : '👎 Not Helpful';

  // СТРОКА 1: Кнопки обратной связи
  // callback_data формат: feedback_helpful_IT_TRANSPORT_001
  keyboard
    .text(helpfulText, `feedback_helpful_${ruleId}`)
    .text(notHelpfulText, `feedback_not_helpful_${ruleId}`)
    .row(); // .row() = перенос на новую строку

  // СТРОКА 2: Кнопка "Назад к списку"
  keyboard.text(translate(lang, 'navigation.buttons.back_to_list'), 'nav_back').row();

  // СТРОКА 3: Кнопка "Главное меню"
  keyboard.text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}
