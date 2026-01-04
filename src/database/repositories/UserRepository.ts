// src/database/repositories/UserRepository.ts

/**
 * User Repository
 */

import { supabase } from '../client.js';
import { logger } from '../../utils/logger.js';
import { withRetry, withSilentFail } from '../wrappers/db-wrapper.js';

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
  premium_interested: boolean;
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
  premium_interested?: boolean;
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
  premium_interested?: boolean;
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
  // Найти пользователя по Telegram ID
  async findById(telegramId: number): Promise<User | null> {
    return await withRetry(
      async () => {
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
          // logger.error('Ошибка при поиске пользователя', {
          //   error: error.message,
          //   userId: telegramId,
          //   code: error.code,
          // });
          throw error;
        }

        return data as User;
      },
      3,
      'findUserById'
    );
  }

  // Создать нового пользователя
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
      logger.error('Ошибка при создании пользователя', {
        error: error.message,
        userId: userData.id,
        code: error.code,
      });
      throw error;
    }

    logger.info('Создан новый пользователь', {
      userId: data.id,
      username: data.username || 'no_username',
      language: data.language_code,
    });
    return data as User;
  }

  // Обновить данные пользователя
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
      logger.error('Ошибка при обновлении пользователя', {
        error: error.message,
        userId: telegramId,
        code: error.code,
      });
      throw error;
    }

    logger.debug('Обновлены данные пользователя', {
      userId: telegramId,
      fields: Object.keys(updates),
    });

    return data as User;
  }

  //Найти или создать пользователя
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

  //Увеличить счетчик просмотров правил пользователя
  async incrementViews(userId: number): Promise<void> {
    // try {
    //   const { error } = await supabase.rpc('increment_user_views', {
    //     user_id: userId,
    //   });
    //   if (error) {
    //     logger.warn('Ошибка при увеличении счетчика просмотров пользователя', {
    //       error: error.message,
    //       userId,
    //       code: error.code,
    //     });
    //     // Не бросаем ошибку - это не критично для UX
    //   }
    // } catch (err) {
    //   logger.warn('Неожиданная ошибка при увеличении просмотров', {
    //     error: err instanceof Error ? err.message : 'Unknown error',
    //     userId,
    //   });
    //   // Игнорируем - не критично для UX
    // }
    await withSilentFail(async () => {
      const { error } = await supabase.rpc('increment_user_views', {
        user_id: userId,
      });

      if (error) throw error;
    }, 'incrementUserViews');
  }
}

// Экспортируем единственный экземпляр (Singleton)
export const userRepository = new UserRepository();
