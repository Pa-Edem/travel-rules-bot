// src/database/repositories/RuleRepository.ts

/**
 * Rule Repository
 * Класс для работы с правилами в базе данных
 */

import { supabase } from '../client.js';

/**
 * Интерфейс правила из БД
 */
export interface Rule {
  id: string;
  country_code: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  fine_min: number | null;
  fine_max: number | null;
  fine_currency: string | null;

  content: {
    en: {
      title: string;
      description: string;
      details: string;
    };
    ru: {
      title: string;
      description: string;
      details: string;
    };
  };

  sources: Array<{
    type: string;
    url: string;
    title: string;
  }>;

  views: number;
  created_at: string;
  updated_at: string;
}

/**
 * Repository для работы с правилами
 */
export class RuleRepository {
  /**
   * Получить все правила для страны и категории
   */
  async getRulesByCountryAndCategory(countryCode: string, category: string): Promise<Rule[]> {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('country_code', countryCode)
      .eq('category', category)
      .is('deleted_at', null)
      .order('severity', { ascending: false }); // critical → high → medium → low

    if (error) {
      console.error('❌ Ошибка при получении правил:', error);
      throw error;
    }

    return (data || []) as Rule[];
  }

  /**
   * Получить правило по ID
   */
  async getRuleById(ruleId: string): Promise<Rule | null> {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('id', ruleId)
      .is('deleted_at', null)
      .single();

    if (error) {
      // Код PGRST116 = запись не найдена
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Ошибка при получении правила:', error);
      throw error;
    }

    return data as Rule;
  }

  /**
   * Увеличить счетчик просмотров
   */
  async incrementViews(ruleId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_rule_views', {
      rule_id: ruleId,
    });

    if (error) {
      console.error('⚠️ Ошибка при увеличении просмотров:', error);
      // Не бросаем ошибку - это не критично
    }
  }

  /**
   * Базовый поиск правил по ключевым словам
   * Использует full-text search по search_vector
   *
   * @param query - Поисковый запрос
   * @param language - Язык для поиска
   * @param countryCode - Фильтр по стране (опционально)
   * @param category - Фильтр по категории (опционально)
   * @param limit - Максимальное количество результатов (по умолчанию 10)
   * @returns Массив найденных правил
   */
  async searchRules(
    query: string,
    language: 'en' | 'ru',
    countryCode?: string,
    category?: string,
    limit: number = 10
  ): Promise<Rule[]> {
    try {
      // Определяем какой search_vector использовать
      const searchColumn = language === 'ru' ? 'search_vector_ru' : 'search_vector_en';

      // Формируем запрос
      let queryBuilder = supabase
        .from('rules')
        .select('*')
        .textSearch(searchColumn, query, {
          type: 'websearch',
          config: language === 'ru' ? 'russian' : 'english',
        })
        .is('deleted_at', null)
        .limit(limit);

      // Добавляем фильтры если указаны
      if (countryCode) {
        queryBuilder = queryBuilder.eq('country_code', countryCode);
      }

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      // Выполняем запрос
      const { data, error } = await queryBuilder;

      if (error) {
        console.error('❌ Ошибка при поиске правил:', error);
        throw error;
      }

      return (data || []) as Rule[];
    } catch (err) {
      console.error('❌ Неожиданная ошибка при поиске:', err);
      return []; // Возвращаем пустой массив вместо ошибки
    }
  }
}

// Экспортируем singleton экземпляр
export const ruleRepository = new RuleRepository();
