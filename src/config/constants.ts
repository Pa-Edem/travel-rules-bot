// src/config/constants.ts

/**
 * Константы проекта
 * Все статические данные хранятся здесь
 */

import type { CountryCode, Category } from '../types/database.types';

/**
 * Список поддерживаемых стран для MVP
 */
export const COUNTRIES: Array<{
  code: CountryCode;
  name_en: string;
  name_ru: string;
  emoji: string;
}> = [
  { code: 'IT', name_en: 'Italy', name_ru: 'Италия', emoji: '🇮🇹' },
  { code: 'TR', name_en: 'Turkey', name_ru: 'Турция', emoji: '🇹🇷' },
  { code: 'AE', name_en: 'UAE', name_ru: 'ОАЭ', emoji: '🇦🇪' },
  { code: 'TH', name_en: 'Thailand', name_ru: 'Таиланд', emoji: '🇹🇭' },
  { code: 'ES', name_en: 'Spain', name_ru: 'Испания', emoji: '🇪🇸' },
  { code: 'DE', name_en: 'Germany', name_ru: 'Германия', emoji: '🇩🇪' },
];

/**
 * Список категорий правил
 */
export const CATEGORIES: Array<{
  id: Category;
  name_en: string;
  name_ru: string;
  emoji: string;
}> = [
  {
    id: 'transport',
    name_en: 'Transport & Driving',
    name_ru: 'Транспорт и вождение',
    emoji: '🚗',
  },
  {
    id: 'alcohol_smoking',
    name_en: 'Alcohol & Smoking',
    name_ru: 'Алкоголь и курение',
    emoji: '🍺',
  },
  {
    id: 'drones',
    name_en: 'Drones',
    name_ru: 'Дроны',
    emoji: '🚁',
  },
  {
    id: 'medications',
    name_en: 'Medications',
    name_ru: 'Лекарства',
    emoji: '💊',
  },
  {
    id: 'cultural',
    name_en: 'Cultural & Religious Norms',
    name_ru: 'Культурные и религиозные нормы',
    emoji: '🕌',
  },
];

/**
 * Эмодзи для уровней серьезности
 */
export const SEVERITY_EMOJI = {
  info: '🟢',
  warning: '🟡',
  important: '🟠',
  critical: '🔴',
} as const;

/**
 * Лимиты
 */
export const LIMITS = {
  RULES_PER_PAGE: 5, // Сколько правил показывать на одной странице
  MAX_SEARCH_RESULTS: 10, // Максимум результатов поиска
} as const;
