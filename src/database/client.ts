// src/database/client.ts

/**
 * Supabase Database Client
 * Подключение к PostgreSQL через Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Создаём Supabase клиент БЕЗ строгой типизации
 * Типизацию добавим позже, когда всё заработает
 */
export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Функция для проверки подключения к базе данных
 * Используется при старте бота
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Простой запрос для проверки подключения
    const { data, error } = await supabase.from('countries').select('code').limit(1);

    if (error) {
      logger.error('Database connection error:', {
        message: error.message,
        code: error.code,
      });
      return false;
    }

    logger.info('Подключение к БД успешно!', {
      recordsFound: data?.length || 0,
    });
    return true;
  } catch (err) {
    logger.error('Critical database connection error:', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

// Экспортируем для использования в других файлах
export default supabase;
