/**
 * Конфигурация приложения
 * Загружает и валидирует переменные окружения
 */

import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

/**
 * Проверяет наличие обязательной переменной окружения
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${key}`);
  }
  return value;
}

/**
 * Конфигурация бота
 */
export const config = {
  // Telegram Bot
  bot: {
    token: requireEnv('BOT_TOKEN'),
  },

  // Supabase Database
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    anonKey: requireEnv('SUPABASE_ANON_KEY'),
  },

  // Окружение
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // Webhook (для production)
  webhook: {
    domain: process.env.WEBHOOK_DOMAIN,
    path: process.env.WEBHOOK_PATH || '/webhook',
    port: parseInt(process.env.PORT || '3000', 10),
  },
} as const;

// Логируем конфигурацию при запуске (без секретов)
console.log('🔧 Конфигурация загружена:');
console.log(`   Окружение: ${config.env}`);
console.log(`   Supabase URL: ${config.supabase.url}`);
console.log(`   Bot token: ${config.bot.token.substring(0, 10)}...`);
