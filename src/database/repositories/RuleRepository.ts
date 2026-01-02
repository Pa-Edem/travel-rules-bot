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
   * Билингвальный поиск правил по ключевым словам
   * Ищет одновременно по английскому И русскому, независимо от языка пользователя
   *
   * @param query - Поисковый запрос
   * @param countryCode - Фильтр по стране (опционально)
   * @param category - Фильтр по категории (опционально)
   * @param limit - Максимальное количество результатов (по умолчанию 50)
   * @returns Массив найденных правил, отсортированных по релевантности
   */
  async searchRules(
    query: string,
    countryCode?: string,
    category?: string,
    limit: number = 50
  ): Promise<Rule[]> {
    try {
      // Формируем базовый запрос
      let queryBuilder = supabase
        .from('rules')
        .select('*')
        .is('deleted_at', null)
        .limit(limit * 2); // Берём больше, потому что будем фильтровать на клиенте

      // Добавляем фильтры если указаны
      if (countryCode) {
        queryBuilder = queryBuilder.eq('country_code', countryCode);
      }

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      // Выполняем запрос для получения всех правил
      const { data, error } = await queryBuilder;

      if (error) {
        console.error('❌ Ошибка при поиске правил:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const searchQuery = query.toLowerCase().trim();

      // Фильтруем результаты на стороне клиента (билингвальный поиск)
      const filteredRules = (data as Rule[]).filter((rule) => {
        return (
          textContainsQuery(rule.content.en.title, searchQuery) ||
          textContainsQuery(rule.content.en.description, searchQuery) ||
          textContainsQuery(rule.content.en.details || '', searchQuery) ||
          textContainsQuery(rule.content.ru.title, searchQuery) ||
          textContainsQuery(rule.content.ru.description, searchQuery) ||
          textContainsQuery(rule.content.ru.details || '', searchQuery)
        );
      });

      // Сортируем по релевантности (сначала совпадение в title, потом в description)
      filteredRules.sort((a, b) => {
        const aScore = getRelevanceScore(a, searchQuery);
        const bScore = getRelevanceScore(b, searchQuery);
        return bScore - aScore;
      });

      return filteredRules.slice(0, limit);
    } catch (err) {
      console.error('❌ Неожиданная ошибка при поиске:', err);
      return [];
    }
  }
}

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПОИСКА
// =============================================================================

/**
 * Нормализация текста для поиска
 * Убирает знаки препинания, приводит к нижнему регистру
 */
function normalizeForSearch(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Убираем знаки препинания
      .replace(/[.,!?;:()]/g, ' ')
      // Убираем множественные пробелы
      .replace(/\s+/g, ' ')
  );
}

/**
 * Проверка, содержит ли текст поисковый запрос
 * Поддерживает многословные запросы
 */
function textContainsQuery(text: string, query: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);

  // Простое совпадение подстроки
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  // Проверка по словам (для многословных запросов типа "alcohol limit")
  const queryWords = normalizedQuery.split(' ').filter((w) => w.length > 0);
  return queryWords.every((word) => normalizedText.includes(word));
}

/**
 * Расчет релевантности правила для сортировки результатов поиска
 * Чем выше балл - тем более релевантно правило
 */
function getRelevanceScore(rule: Rule, query: string): number {
  let score = 0;
  const q = query.toLowerCase();

  // Совпадение в title = +10 баллов
  if (textContainsQuery(rule.content.en.title, q)) score += 10;
  if (textContainsQuery(rule.content.ru.title, q)) score += 10;

  // Совпадение в description = +5 баллов
  if (textContainsQuery(rule.content.en.description, q)) score += 5;
  if (textContainsQuery(rule.content.ru.description, q)) score += 5;

  // Совпадение в details = +2 балла
  if (textContainsQuery(rule.content.en.details || '', q)) score += 2;
  if (textContainsQuery(rule.content.ru.details || '', q)) score += 2;

  // Бонус за severity (более важные правила выше)
  if (rule.severity === 'critical') score += 3;
  if (rule.severity === 'high') score += 2;
  if (rule.severity === 'medium') score += 1;

  // Бонус за популярность (популярные правила немного выше)
  score += Math.min(rule.views / 100, 5); // Макс +5 баллов за просмотры

  return score;
}

// Экспортируем singleton экземпляр
export const ruleRepository = new RuleRepository();
