// src/config/database.ts

/**
 * Конфигурация подключения к базе данных Supabase
 */

import { logger } from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';

// Проверяем наличие необходимых переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_KEY. ' + 'Проверьте файл .env'
  );
}

/**
 * Клиент Supabase
 * Используется для всех операций с базой данных
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Отключаем встроенную систему auth, используем свою
  },
});

/**
 * Проверка подключения к базе данных
 * Вызывается при старте бота
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Простой запрос для проверки подключения
    const { error } = await supabase.from('countries').select('count').limit(1);

    if (error) {
      logger.error('Ошибка подключения к Supabase:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error.code,
      });
      return false;
    }

    logger.info('Успешное подключение к базе данных Supabase');
    return true;
  } catch (error) {
    logger.error('Не удалось подключиться к Supabase:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}
