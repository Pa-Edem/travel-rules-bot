// src/types/index.ts

/**
 * Типы данных для Travel Rules Bot
 */

import { Context } from 'grammy';

/**
 * Данные сессии пользователя
 * Хранятся в БД (таблица sessions)
 */
export interface SessionData {
  // Онбординг
  onboarding_step?: 'language' | 'disclaimer' | 'completed';

  // Навигация
  current_country?: string;
  current_category?: string;
  current_page?: number;

  // История навигации (для кнопки "Назад")
  navigation_history?: Array<{
    screen: 'menu' | 'countries' | 'categories' | 'rules';
    data?: any;
  }>;

  // Поиск
  search_mode?: boolean; // Включен ли режим ожидания ввода поиска
  search_query?: string; // Последний поисковый запрос
  search_filters?: {
    country: string | null;
    category: string | null;
  };
  search_results?: any[]; // Результаты последнего поиска
  search_page?: number; // Текущая страница результатов поиска
}

/**
 * Расширенный контекст бота с поддержкой сессий и i18n
 *
 * Объяснение:
 * - Context - базовый контекст Grammy
 * - I18nFlavor - добавляет методы для переводов (t(), i18n)
 * - session - данные сессии пользователя
 */
export interface BotContext extends Context {
  session?: SessionData;
  t: (key: string, params?: Record<string, string>) => string;
}

/**
 * Страна в базе данных
 */
export interface Country {
  id: string;
  name_en: string;
  name_ru: string;
  code: string; // ISO код (IT, TR, AE, TH, ES, DE)
  flag_emoji: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Категория правил
 */
export interface Category {
  id: string;
  name_en: string;
  name_ru: string;
  code: string; // TRANSPORT, ALCOHOL, DRONES, MEDICATIONS, CULTURAL
  icon_emoji: string;
  description_en?: string;
  description_ru?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Уровень серьезности нарушения
 */
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Правило/закон
 */
export interface Rule {
  id: string;
  rule_id: string; // Уникальный код (например: IT_TRANSPORT_001)
  country_id: string;
  category_id: string;

  // Основная информация (английский)
  title_en: string;
  description_en: string;
  details_en?: string;

  // Основная информация (русский)
  title_ru: string;
  description_ru: string;
  details_ru?: string;

  // Дополнительные поля
  severity: SeverityLevel;
  fine_min_eur?: number;
  fine_max_eur?: number;
  exceptions_en?: string;
  exceptions_ru?: string;
  scope_note_en?: string;
  scope_note_ru?: string;

  // Источники
  sources: RuleSource[];

  // Метаданные
  last_verified_at: string;
  view_count: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Источник информации для правила
 */
export interface RuleSource {
  title: string;
  url: string;
  type: 'official' | 'news' | 'blog' | 'other';
}

/**
 * Пользователь
 */
export interface User {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code: string;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * События аналитики
 */
export type AnalyticsEventType =
  | 'user_started'
  | 'language_selected'
  | 'country_selected'
  | 'category_selected'
  | 'rule_viewed'
  | 'search_performed'
  | 'feedback_submitted';

export interface AnalyticsEvent {
  id?: string;
  user_id: string;
  event_type: AnalyticsEventType;
  event_data?: Record<string, unknown>;
  created_at?: string;
}
