// src/types/database.types.ts

/**
 * Типы для работы с базой данных
 * Описывают структуру таблиц и данных
 */

// Языки, поддерживаемые ботом
export type Language = 'en' | 'ru';

// Уровень серьезности правила
export type Severity = 'info' | 'warning' | 'important' | 'critical';

// Категории правил
export type Category = 'transport' | 'alcohol_smoking' | 'drones' | 'medications' | 'cultural';

// Коды стран (ISO 3166-1 alpha-2)
export type CountryCode = 'IT' | 'TR' | 'AE' | 'TH' | 'ES' | 'DE';

/**
 * Пользователь бота
 */
export interface User {
  id: number; // Telegram User ID
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code: Language;
  is_premium: boolean;
  premium_until?: string;
  total_searches: number;
  total_views: number;
  last_country?: CountryCode;
  last_category?: Category;
  onboarding_done: boolean; // Прошел ли онбординг
  created_at: string;
  last_active: string;
  deleted_at?: string;
}

/**
 * Данные сессии пользователя
 * Хранит текущее состояние пользователя в боте
 */
export interface SessionData {
  // Onboarding
  onboarding_step?: 'language' | 'welcome' | 'disclaimer' | 'completed';
  language?: Language;
  disclaimer_accepted?: boolean;

  // Навигация
  current_country?: CountryCode;
  current_category?: Category;

  // История навигации (для кнопки "Назад")
  navigation_history?: Array<{
    type: 'menu' | 'country' | 'category' | 'rule';
    data?: any;
  }>;
}

/**
 * Правило (закон/регулирование)
 */
export interface Rule {
  id: string; // Например: IT_TRANSPORT_001
  country_code: CountryCode;
  category: Category;
  title_en: string;
  title_ru: string;
  description_en: string;
  description_ru: string;
  details_en?: string;
  details_ru?: string;
  severity: Severity;
  fine_min?: number;
  fine_max?: string;
  fine_currency?: string;
  sources: Array<{ url: string; title: string }>;
  last_updated: string;
  views: number;
}

/**
 * Страна
 */
export interface Country {
  code: CountryCode;
  name_en: string;
  name_ru: string;
  emoji: string; // Флаг
  enabled: boolean;
}

/**
 * API Response типы
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
