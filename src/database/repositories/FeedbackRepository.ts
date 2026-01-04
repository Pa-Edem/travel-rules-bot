// src/database/repositories/FeedbackRepository.ts

/**
 * FeedbackRepository - репозиторий для работы с отзывами пользователей
 *
 * Этот класс - "прослойка" между нашим кодом и базой данных.
 * Вместо того чтобы писать SQL запросы везде, мы пишем их тут один раз,
 * а потом просто вызываем методы: feedbackRepository.submit(), feedbackRepository.getUserFeedback() и т.д.
 */

import { logger } from '../../utils/logger.js';
import { supabase } from '../client.js';

/**
 * Типы отзывов (что пользователь может оставить)
 */
export type FeedbackType =
  | 'helpful' // 👍 Полезно
  | 'not_helpful' // 👎 Не полезно
  | 'outdated' // 📅 Устаревшая информация (пока не используем, но может пригодиться)
  | 'incorrect' // ❌ Неверная информация
  | 'suggestion' // 💡 Предложение (когда пользователь пишет текст)
  | 'general'; // 💬 Общий отзыв о боте (из Settings)

/**
 * Статус обработки отзыва (для будущей админ-панели)
 */
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

/**
 * Интерфейс отзыва (как он хранится в БД)
 */
export interface Feedback {
  id: number;
  user_id: number | null;
  rule_id: string | null; // NULL если это общий отзыв о боте
  feedback_type: FeedbackType;
  message: string | null; // NULL если просто нажали 👍/👎 без текста
  user_contact: string | null; // username пользователя (на будущее)
  status: FeedbackStatus;
  priority: number; // 1-10, где 1 = самый важный
  resolved_by: string | null; // Кто обработал (для админки)
  resolved_at: string | null; // Когда обработали
  created_at: string;
  updated_at: string;
}

/**
 * Данные для СОЗДАНИЯ отзыва (что нам нужно передать)
 */
export interface FeedbackInsert {
  user_id: number; // Telegram ID пользователя
  rule_id?: string | null; // ID правила (опционально, может быть общий отзыв)
  feedback_type: FeedbackType; // Тип отзыва
  message?: string | null; // Текст отзыва (опционально)
  user_contact?: string | null; // Username (опционально)
  priority?: number; // Приоритет (опционально, по умолчанию 5)
}

/**
 * Класс репозитория
 */
export class FeedbackRepository {
  /**
   * МЕТОД 1: Отправить отзыв
   *
   * @param feedbackData - данные отзыва
   * @returns Созданный отзыв или null если ошибка (например, дубликат)
   *
   * Пример использования:
   * const feedback = await feedbackRepository.submit({
   *   user_id: 123456,
   *   rule_id: 'IT_TRANSPORT_001',
   *   feedback_type: 'helpful'
   * });
   */
  async submit(feedbackData: FeedbackInsert): Promise<Feedback | null> {
    try {
      // Подготавливаем данные для вставки в БД
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: feedbackData.user_id,
          rule_id: feedbackData.rule_id || null,
          feedback_type: feedbackData.feedback_type,
          message: feedbackData.message || null,
          user_contact: feedbackData.user_contact || null,
          status: 'pending', // Новый отзыв всегда pending
          priority: feedbackData.priority || 5, // По умолчанию средний приоритет
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select() // .select() чтобы получить созданную запись обратно
        .single(); // .single() потому что мы создаём только 1 запись

      // Проверяем есть ли ошибка
      if (error) {
        // Код ошибки 23505 = нарушение UNIQUE constraint
        // Это значит пользователь уже оставлял отзыв на это правило
        if (error.code === '23505') {
          logger.info('Пользователь уже оставлял отзыв на это правило', {
            user_id: feedbackData.user_id,
            rule_id: feedbackData.rule_id,
          });
          return null; // Возвращаем null = "не получилось создать"
        }

        // Если другая ошибка - логируем и выбрасываем
        logger.error('Ошибка при отправке отзыва', {
          error_message: error.message,
          user_id: feedbackData.user_id,
          rule_id: feedbackData.rule_id,
        });
        throw error;
      }

      // Всё ок! Логируем успех и возвращаем созданный отзыв
      logger.info('Отзыв успешно отправлен', {
        feedback_id: data.id,
        user_id: feedbackData.user_id,
        rule_id: feedbackData.rule_id,
      });
      return data as Feedback;
    } catch (err) {
      logger.error('Неожиданная ошибка при отправке отзыва', {
        error: err instanceof Error ? err.message : 'Unknown error',
        user_id: feedbackData.user_id,
        rule_id: feedbackData.rule_id,
      });
      return null;
    }
  }

  /**
   * МЕТОД 2: Проверить, оставлял ли пользователь отзыв на это правило
   *
   * @param userId - Telegram ID пользователя
   * @param ruleId - ID правила
   * @returns true если отзыв уже есть, false если нет
   *
   * Пример использования:
   * const exists = await feedbackRepository.hasUserFeedbackForRule(123456, 'IT_TRANSPORT_001');
   * if (exists) {
   *   await ctx.answerCallbackQuery("Вы уже оставляли отзыв");
   *   return;
   * }
   */
  async hasUserFeedbackForRule(userId: number, ruleId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('id') // Нам нужен только id, не все поля
        .eq('user_id', userId) // WHERE user_id = userId
        .eq('rule_id', ruleId) // AND rule_id = ruleId
        .single(); // Ожидаем максимум 1 запись

      // Ошибка PGRST116 = "запись не найдена"
      // Это НОРМАЛЬНО - значит отзыва нет
      if (error && error.code === 'PGRST116') {
        return false; // Отзыва нет
      }

      // Если другая ошибка - логируем
      if (error) {
        logger.error('Ошибка при проверке существования отзыва:', {
          error: error.message,
          user_id: userId,
          rule_id: ruleId,
        });

        return false; // На всякий случай возвращаем false
      }

      // Если data не null - значит отзыв есть
      return data !== null;
    } catch (err) {
      logger.error('Неожиданная ошибка при проверке существования отзыва:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        user_id: userId,
        rule_id: ruleId,
      });
      return false;
    }
  }

  /**
   * МЕТОД 3: Получить все отзывы пользователя
   *
   * @param userId - Telegram ID пользователя
   * @param limit - Максимальное количество отзывов (по умолчанию 20)
   * @returns Массив отзывов пользователя
   */
  async getUserFeedback(userId: number, limit: number = 20): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*') // Выбираем все поля
        .eq('user_id', userId) // WHERE user_id = userId
        .order('created_at', { ascending: false }) // Сортируем: новые первыми
        .limit(limit); // Ограничиваем количество

      if (error) {
        logger.error('Ошибка при получении отзывов пользователя:', {
          error_message: error.message,
          user_id: userId,
        });
        return []; // Возвращаем пустой массив при ошибке
      }

      return (data || []) as Feedback[]; // Возвращаем массив отзывов
    } catch (err) {
      logger.error('Неожиданная ошибка при получении отзывов пользователя:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        user_id: userId,
      });
      return [];
    }
  }

  /**
   * МЕТОД 4 (БОНУС): Получить все pending отзывы
   * Для будущей админ-панели
   *
   * @param limit - Максимальное количество
   * @returns Массив pending отзывов
   */
  async getPendingFeedback(limit: number = 50): Promise<Feedback[]> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('status', 'pending') // Только pending
        .order('priority', { ascending: true }) // Сначала важные (1, 2, 3...)
        .order('created_at', { ascending: true }) // Потом старые
        .limit(limit);

      if (error) {
        logger.error('Ошибка при получении pending отзывов:', {
          error_message: error.message,
          code: error.code,
        });
        return [];
      }

      return (data || []) as Feedback[];
    } catch (err) {
      logger.error('Неожиданная ошибка при получении pending отзывов:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    }
  }
}

// Экспортируем ОДИН экземпляр класса (singleton паттерн)
// Теперь везде в коде мы будем использовать этот же экземпляр
export const feedbackRepository = new FeedbackRepository();
