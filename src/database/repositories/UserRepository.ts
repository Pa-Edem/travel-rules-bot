// src/database/repositories/UserRepository.ts

/**
 * User Repository
 * Класс для работы с пользователями в базе данных
 *
 * Инкапсулирует всю логику работы с таблицей users:
 * - Поиск пользователей
 * - Создание новых пользователей
 * - Обновление данных
 */

import { supabase } from '../client.js';

// Обновленные типы с добавлением onboarding_done
export interface User {
  id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string;
  onboarding_done: boolean;
  is_premium: boolean;
  premium_until: string | null;
  total_searches: number;
  total_views: number;
  last_country: string | null;
  last_category: string | null;
  created_at: string;
  last_active: string;
  deleted_at: string | null;
}

export interface UserInsert {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string;
  onboarding_done?: boolean;
  is_premium?: boolean;
  premium_until?: string | null;
  total_searches?: number;
  total_views?: number;
  last_country?: string | null;
  last_category?: string | null;
}

export interface UserUpdate {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string;
  onboarding_done?: boolean;
  is_premium?: boolean;
  premium_until?: string | null;
  total_searches?: number;
  total_views?: number;
  last_country?: string | null;
  last_category?: string | null;
  last_active?: string;
}

/**
 * Repository для работы с пользователями
 */
export class UserRepository {
  /**
   * Найти пользователя по Telegram ID
   * @param telegramId - ID пользователя из Telegram
   * @returns Пользователь или null если не найден
   */
  async findById(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', telegramId)
      .is('deleted_at', null) // Только активные пользователи
      .single(); // Ожидаем одну запись

    if (error) {
      // Если пользователь не найден - это нормально, возвращаем null
      if (error.code === 'PGRST116') {
        return null;
      }
      // Другие ошибки логируем
      console.error('Ошибка при поиске пользователя:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Создать нового пользователя
   * @param userData - Данные для создания пользователя
   * @returns Созданный пользователь
   */
  async create(userData: UserInsert): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании пользователя:', error);
      throw error;
    }

    console.log(`✅ Создан новый пользователь: ${data.id} (@${data.username || 'no_username'})`);
    return data as User;
  }

  /**
   * Обновить данные пользователя
   * @param telegramId - ID пользователя
   * @param updates - Поля для обновления
   * @returns Обновлённый пользователь
   */
  async update(telegramId: number, updates: UserUpdate): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        last_active: new Date().toISOString(), // Обновляем last_active при любом обновлении
      })
      .eq('id', telegramId)
      .select()
      .single();

    if (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Найти или создать пользователя
   * Удобный метод: если пользователь существует - вернуть его,
   * если нет - создать нового
   *
   * @param telegramId - ID пользователя из Telegram
   * @param userData - Данные для создания (если пользователя нет)
   * @returns Пользователь (найденный или созданный)
   */
  async findOrCreate(telegramId: number, userData: UserInsert): Promise<User> {
    // Сначала пытаемся найти
    const existingUser = await this.findById(telegramId);

    if (existingUser) {
      // Пользователь уже есть - обновляем last_active
      return await this.update(telegramId, { last_active: new Date().toISOString() });
    }

    // Пользователя нет - создаём нового
    return await this.create(userData);
  }
}

// Экспортируем единственный экземпляр (Singleton)
export const userRepository = new UserRepository();
