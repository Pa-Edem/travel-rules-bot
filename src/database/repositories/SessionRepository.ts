// src/database/repositories/SessionRepository.ts

/**
 * Session Repository
 * Класс для работы с сессиями пользователей в базе данных
 *
 * Сессия хранит текущее состояние пользователя:
 * - На каком шаге онбординга находится
 * - Какую страну выбрал
 * - Какую категорию просматривает
 */

import { supabase } from '../client.js';

/**
 * Данные сессии пользователя
 * Хранятся в JSONB поле в таблице sessions
 */
export interface SessionData {
  // Онбординг
  onboarding_step?: 'language' | 'disclaimer' | 'completed';

  // Навигация
  current_country?: string;
  current_category?: string;

  // История навигации (для кнопки "Назад")
  navigation_history?: Array<{
    screen: 'menu' | 'countries' | 'categories' | 'rules';
    data?: any;
  }>;
}

/**
 * Запись в таблице sessions
 */
export interface Session {
  user_id: number;
  data: SessionData;
  created_at: string;
  updated_at: string;
}

/**
 * Repository для работы с сессиями
 */
export class SessionRepository {
  /**
   * Получить сессию пользователя
   * @param userId - Telegram ID пользователя
   * @returns Данные сессии или пустой объект если сессии нет
   */
  async get(userId: number): Promise<SessionData> {
    const { data, error } = await supabase
      .from('sessions')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Если сессии нет - это нормально, вернем пустой объект
      if (error.code === 'PGRST116') {
        return {};
      }
      console.error('Ошибка при получении сессии:', error);
      return {};
    }

    return (data?.data as SessionData) || {};
  }

  /**
   * Сохранить/обновить сессию пользователя
   * @param userId - Telegram ID пользователя
   * @param sessionData - Данные для сохранения
   */
  async set(userId: number, sessionData: SessionData): Promise<void> {
    const { error } = await supabase.from('sessions').upsert(
      {
        user_id: userId,
        data: sessionData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id', // Если запись существует - обновить
      }
    );

    if (error) {
      console.error('Ошибка при сохранении сессии:', error);
      throw error;
    }
  }

  /**
   * Обновить часть данных сессии (merge)
   * Удобно когда нужно изменить только одно поле
   *
   * @param userId - Telegram ID пользователя
   * @param updates - Поля для обновления
   */
  async update(userId: number, updates: Partial<SessionData>): Promise<void> {
    // Получаем текущую сессию
    const currentSession = await this.get(userId);

    // Объединяем с обновлениями
    const updatedSession = {
      ...currentSession,
      ...updates,
    };

    // Сохраняем
    await this.set(userId, updatedSession);
  }

  /**
   * Удалить сессию пользователя
   * @param userId - Telegram ID пользователя
   */
  async delete(userId: number): Promise<void> {
    const { error } = await supabase.from('sessions').delete().eq('user_id', userId);

    if (error) {
      console.error('Ошибка при удалении сессии:', error);
      throw error;
    }
  }
}

// Экспортируем единственный экземпляр (Singleton)
export const sessionRepository = new SessionRepository();
