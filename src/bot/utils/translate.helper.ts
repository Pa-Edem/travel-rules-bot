// src/bot/utils/translate.helper.ts

/**
 * Helper для получения переводов
 * Используется когда ctx.t() недоступна или использует неправильный язык
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переводы
const translations = {
  en: JSON.parse(readFileSync(resolve(__dirname, '../../locales/en/translation.json'), 'utf8')),
  ru: JSON.parse(readFileSync(resolve(__dirname, '../../locales/ru/translation.json'), 'utf8')),
};

/**
 * Получить перевод по ключу
 * @param lang - Язык (en/ru)
 * @param key - Ключ (например: "onboarding.disclaimer.short_text")
 * @param params - Параметры для подстановки
 */
export function translate(lang: 'en' | 'ru', key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Перевод не найден
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
