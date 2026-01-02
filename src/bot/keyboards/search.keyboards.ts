// src/bot/keyboards/search.keyboards.ts

/**
 * Клавиатуры для поиска правил
 */

import { InlineKeyboard } from 'grammy';
import { translate } from '../utils/translate.helper.js';
import { COUNTRIES, CATEGORIES } from '../../config/constants.js';
import type { Rule } from '../../database/repositories/RuleRepository.js';

/**
 * Клавиатура с кнопкой "Отмена" для режима ожидания ввода поиска
 */
export function createSearchCancelKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const cancelText = lang === 'ru' ? '❌ Отмена' : '❌ Cancel';
  return new InlineKeyboard().text(cancelText, 'search_cancel');
}

/**
 * Клавиатура результатов поиска с правилами
 *
 * @param rules - Найденные правила
 * @param currentPage - Текущая страница
 * @param totalPages - Всего страниц
 * @param lang - Язык
 * @param hasFilters - Есть ли активные фильтры
 */
export function createSearchResultsKeyboard(
  rules: Rule[],
  currentPage: number,
  totalPages: number,
  lang: 'en' | 'ru'
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Группируем правила по странам для удобного отображения
  const groupedRules = groupRulesByCountry(rules);

  // Добавляем кнопки правил с группировкой по странам
  Object.entries(groupedRules).forEach(([countryCode, countryRules]) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    const countryName = country ? (lang === 'ru' ? country.name_ru : country.name_en) : countryCode;

    // Заголовок страны (не кликабельный)
    keyboard
      .text(
        `📍 ${country?.emoji} ${countryName} (${countryRules.length})`,
        `search_country_header_${countryCode}`
      )
      .row();

    // Добавляем правила из этой страны
    countryRules.forEach((rule) => {
      const title = rule.content[lang].title;
      const severity = getSeverityEmoji(rule.severity);
      keyboard.text(`${severity} ${title}`, `rule_${rule.id}`).row();
    });
  });

  // Пагинация (если больше 1 страницы)
  if (totalPages > 1) {
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    if (hasPrev && hasNext) {
      keyboard
        .text('⬅️ ' + (lang === 'ru' ? 'Назад' : 'Prev'), 'search_page_prev')
        .text(`${currentPage}/${totalPages}`, 'search_page_current')
        .text((lang === 'ru' ? 'Далее' : 'Next') + ' ➡️', 'search_page_next')
        .row();
    } else if (hasPrev) {
      keyboard
        .text('⬅️ ' + (lang === 'ru' ? 'Назад' : 'Prev'), 'search_page_prev')
        .text(`${currentPage}/${totalPages}`, 'search_page_current')
        .row();
    } else if (hasNext) {
      keyboard
        .text(`${currentPage}/${totalPages}`, 'search_page_current')
        .text((lang === 'ru' ? 'Далее' : 'Next') + ' ➡️', 'search_page_next')
        .row();
    }
  }

  // Кнопки навигации
  keyboard
    .text(translate(lang, 'navigation.buttons.show_filters'), 'search_show_filters')
    .text(translate(lang, 'navigation.buttons.new_search'), 'search_new')
    .row()
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}

/**
 * Клавиатура фильтров поиска
 *
 * @param selectedCountry - Выбранная страна (или null для "все")
 * @param selectedCategory - Выбранная категория (или null для "все")
 * @param lang - Язык
 */
export function createSearchFiltersKeyboard(
  selectedCountry: string | null,
  selectedCategory: string | null,
  lang: 'en' | 'ru'
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  const allText = translate(lang, 'search.filter_all');

  // Фильтр по стране
  const countryLabel = selectedCountry
    ? COUNTRIES.find((c) => c.code === selectedCountry)?.[lang === 'ru' ? 'name_ru' : 'name_en'] ||
      allText
    : allText;

  keyboard
    .text(
      `🌍 ${translate(lang, 'search.filter_country', { country: countryLabel })}`,
      'filter_country'
    )
    .row();

  // Фильтр по категории
  const categoryLabel = selectedCategory
    ? CATEGORIES.find((c) => c.id === selectedCategory)?.[lang === 'ru' ? 'name_ru' : 'name_en'] ||
      allText
    : allText;

  keyboard
    .text(
      `📂 ${translate(lang, 'search.filter_category', { category: categoryLabel })}`,
      'filter_category'
    )
    .row();

  // Кнопки действий
  if (selectedCountry || selectedCategory) {
    keyboard.text(`🔄 ${translate(lang, 'search.clear_filters')}`, 'search_clear_filters').row();
  }

  keyboard
    .text(translate(lang, 'navigation.buttons.back_to_search'), 'search_back_to_results')
    .text(translate(lang, 'navigation.buttons.main_menu'), 'nav_main_menu');

  return keyboard;
}

/**
 * Клавиатура выбора страны для фильтра
 */
export function createFilterCountryKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const allText = translate(lang, 'search.filter_all');

  // Кнопка "Все"
  keyboard.text(`🌍 ${allText}`, 'filter_country_all').row();

  // Добавляем кнопки стран (по 2 в ряд)
  COUNTRIES.forEach((country, index) => {
    const name = lang === 'ru' ? country.name_ru : country.name_en;
    keyboard.text(`${country.emoji} ${name}`, `filter_country_${country.code}`);

    if (index % 2 === 1) {
      keyboard.row();
    }
  });

  // Кнопка назад
  keyboard.row().text(translate(lang, 'navigation.buttons.back'), 'search_show_filters');

  return keyboard;
}

/**
 * Клавиатура выбора категории для фильтра
 */
export function createFilterCategoryKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const allText = translate(lang, 'search.filter_all');

  // Кнопка "Все"
  keyboard.text(`📂 ${allText}`, 'filter_category_all').row();

  // Добавляем кнопки категорий (по одной в ряд)
  CATEGORIES.forEach((category) => {
    const name = lang === 'ru' ? category.name_ru : category.name_en;
    keyboard.text(`${category.emoji} ${name}`, `filter_category_${category.id}`).row();
  });

  // Кнопка назад
  keyboard.text(translate(lang, 'navigation.buttons.back'), 'search_show_filters');

  return keyboard;
}

/**
 * Клавиатура "Ничего не найдено"
 */
export function createNoResultsKeyboard(lang: 'en' | 'ru'): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard
    .text(translate(lang, 'navigation.buttons.new_search'), 'search_new')
    .row()
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
 * Группировка правил по странам для удобного отображения
 */
function groupRulesByCountry(rules: Rule[]): Record<string, Rule[]> {
  return rules.reduce(
    (acc, rule) => {
      const countryCode = rule.country_code;
      if (!acc[countryCode]) {
        acc[countryCode] = [];
      }
      acc[countryCode].push(rule);
      return acc;
    },
    {} as Record<string, Rule[]>
  );
}
