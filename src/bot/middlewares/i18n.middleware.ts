// src/bot/middlewares/i18n.middleware.ts

/**
 * i18n Middleware - Упрощенная синхронная версия
 */

import { Middleware } from 'grammy';
import { logger } from '../../utils/logger.js';
import type { BotContext } from '../../types/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переводы один раз при старте
const translations = {
  en: JSON.parse(readFileSync(resolve(__dirname, '../../locales/en/translation.json'), 'utf8')),
  ru: JSON.parse(readFileSync(resolve(__dirname, '../../locales/ru/translation.json'), 'utf8')),
};

logger.info('Переводы загружены: EN, RU');

/**
 * Получить перевод по ключу
 */
function translate(locale: 'en' | 'ru', key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  if (typeof value === 'string') {
    if (params) {
      Object.keys(params).forEach((param) => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }
    return value;
  }

  return key;
}

/**
 * Middleware - СИНХРОННАЯ версия
 */
export function i18nMiddleware(): Middleware<BotContext> {
  return (ctx, next) => {
    // Определяем язык (по умолчанию русский для тебя)
    const telegramLang = ctx.from?.language_code;
    const locale: 'en' | 'ru' = telegramLang?.startsWith('ru') ? 'ru' : 'en';

    // Добавляем функцию t() в контекст
    ctx.t = (key: string, params?: Record<string, string>) => {
      return translate(locale, key, params);
    };

    // ВАЖНО: вызываем next() синхронно
    return next();
  };
}
