// src/database/repositories/AnalyticsRepository.ts

/**
 * Analytics Repository
 * Класс для работы с событиями аналитики
 */

import { supabase } from '../client.js';

/**
 * Типы событий аналитики
 */
export type AnalyticsEventType =
  | 'user_started'
  | 'language_selected'
  | 'country_selected'
  | 'category_selected'
  | 'rule_viewed'
  | 'search_performed'
  | 'feedback_submitted'
  | 'premium_page_viewed'
  | 'premium_waitlist_joined';

/**
 * Интерфейс события аналитики
 */
export interface AnalyticsEvent {
  id?: number;
  user_id: number;
  event_type: AnalyticsEventType;
  event_data?: Record<string, any>;
  created_at?: string;
}

/**
 * Repository для работы с аналитикой
 */
export class AnalyticsRepository {
  /**
   * Записать событие аналитики
   *
   * @param userId - Telegram ID пользователя
   * @param eventType - Тип события
   * @param eventData - Дополнительные данные о событии (опционально)
   */
  async trackEvent(
    userId: number,
    eventType: AnalyticsEventType,
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      // Используем RPC функцию track_event из БД
      const { error } = await supabase.rpc('track_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_event_data: eventData || {},
      });

      if (error) {
        console.error('⚠️ Ошибка при записи события аналитики:', error);
        // Не бросаем ошибку - аналитика не должна ломать основной функционал
      }
    } catch (err) {
      console.error('⚠️ Неожиданная ошибка при записи события:', err);
      // Игнорируем ошибку - не критично для UX
    }
  }

  /**
   * Получить последние события пользователя
   *
   * @param userId - Telegram ID пользователя
   * @param limit - Количество событий (по умолчанию 50)
   */
  async getUserEvents(userId: number, limit: number = 50): Promise<AnalyticsEvent[]> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Ошибка при получении событий пользователя:', error);
        return [];
      }

      return (data || []) as AnalyticsEvent[];
    } catch (err) {
      console.error('❌ Неожиданная ошибка при получении событий:', err);
      return [];
    }
  }

  /**
   * Получить статистику по типам событий пользователя
   *
   * @param userId - Telegram ID пользователя
   * @returns Объект с количеством каждого типа события
   */
  async getUserEventStats(userId: number): Promise<Record<AnalyticsEventType, number>> {
    try {
      const events = await this.getUserEvents(userId, 1000); // Берём последние 1000

      // Подсчитываем количество каждого типа события
      const stats = events.reduce(
        (acc, event) => {
          const type = event.event_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<AnalyticsEventType, number>
      );

      return stats;
    } catch (err) {
      console.error('❌ Ошибка при получении статистики событий:', err);
      return {} as Record<AnalyticsEventType, number>;
    }
  }

  /**
   * Получить самую популярную страну пользователя
   * (страну, которую он чаще всего выбирал)
   */
  async getUserFavoriteCountry(userId: number): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_data')
        .eq('user_id', userId)
        .eq('event_type', 'country_selected')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Подсчитываем частоту каждой страны
      const countryCounts: Record<string, number> = {};

      data.forEach((event) => {
        const country = event.event_data?.country;
        if (country) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      });

      // Находим самую частую
      let maxCount = 0;
      let favoriteCountry: string | null = null;

      Object.entries(countryCounts).forEach(([country, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteCountry = country;
        }
      });

      return favoriteCountry;
    } catch (err) {
      console.error('❌ Ошибка при получении любимой страны:', err);
      return null;
    }
  }

  /**
   * Получить самую популярную категорию пользователя
   */
  async getUserFavoriteCategory(userId: number): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_data')
        .eq('user_id', userId)
        .eq('event_type', 'category_selected')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Подсчитываем частоту каждой категории
      const categoryCounts: Record<string, number> = {};

      data.forEach((event) => {
        const category = event.event_data?.category;
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });

      // Находим самую частую
      let maxCount = 0;
      let favoriteCategory: string | null = null;

      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteCategory = category;
        }
      });

      return favoriteCategory;
    } catch (err) {
      console.error('❌ Ошибка при получении любимой категории:', err);
      return null;
    }
  }
}

// Экспортируем singleton экземпляр
export const analyticsRepository = new AnalyticsRepository();
