/**
 * Supabase Database Client
 * Подключение к PostgreSQL через Supabase
 */

import { createClient } from '@supabase/supabase-js';
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
      console.error('❌ Ошибка подключения к БД:', error.message);
      return false;
    }

    console.log('✅ Подключение к БД успешно!');
    console.log(`📊 Тестовый запрос выполнен: найдено ${data?.length || 0} записей`);
    return true;
  } catch (err) {
    console.error('❌ Критическая ошибка подключения к БД:', err);
    return false;
  }
}

// Экспортируем для использования в других файлах
export default supabase;
