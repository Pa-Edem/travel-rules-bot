// src/services/rule.service.ts

/**
 * Rule Service
 * Бизнес-логика для работы с правилами: форматирование, отображение
 */

import type { Rule } from '../database/repositories/RuleRepository.js';

/**
 * Маппинг severity на эмодзи и текст
 */
const SEVERITY_MAP = {
  critical: { emoji: '🔴', text: 'Критично', textEn: 'Critical' },
  high: { emoji: '🟠', text: 'Высокий', textEn: 'High' },
  medium: { emoji: '🟡', text: 'Средний', textEn: 'Medium' },
  low: { emoji: '🟢', text: 'Низкий', textEn: 'Low' },
} as const;

/**
 * Получить эмодзи для severity
 */
export function getSeverityEmoji(severity: Rule['severity']): string {
  return SEVERITY_MAP[severity].emoji;
}

/**
 * Получить текст для severity
 */
export function getSeverityText(severity: Rule['severity'], language: 'en' | 'ru'): string {
  return language === 'ru' ? SEVERITY_MAP[severity].text : SEVERITY_MAP[severity].textEn;
}

/**
 * Форматировать штраф для отображения
 */
export function formatFine(
  fine_min: number | null,
  fine_max: number | null,
  fine_currency: string | null,
  language: 'en' | 'ru'
): string | null {
  if (!fine_min || !fine_max || !fine_currency) {
    return null;
  }

  const currencySymbol = fine_currency === 'EUR' ? '€' : fine_currency;
  const fineText = language === 'ru' ? 'Штраф' : 'Fine';

  return `${fineText}: ${currencySymbol}${fine_min} - ${currencySymbol}${fine_max}`;
}

/**
 * Форматировать правило для детального просмотра
 * Используется при просмотре конкретного правила
 * Формат: HTML для Telegram
 */
export function formatRuleDetailed(rule: Rule, language: 'en' | 'ru'): string {
  const content = rule.content[language];
  const severityEmoji = getSeverityEmoji(rule.severity);
  const severityText = getSeverityText(rule.severity, language);

  // Заголовок
  let text = `${severityEmoji} <b>${content.title}</b>\n\n`;

  // Уровень серьезности
  const severityLabel = language === 'ru' ? 'Серьезность' : 'Severity';
  text += `📊 ${severityLabel}: ${severityText}\n\n`;

  // Описание
  text += `📝 ${content.description}\n\n`;

  // Детали (если есть)
  if (content.details && content.details.trim()) {
    const detailsTitle = language === 'ru' ? 'ℹ️ Подробности:' : 'ℹ️ Details:';
    text += `<b>${detailsTitle}</b>\n`;

    // Разбиваем на строки и форматируем как список
    const detailsLines = content.details.split('\n').filter((line) => line.trim());
    detailsLines.forEach((line) => {
      text += `• ${line.trim()}\n`;
    });
    text += '\n';
  }

  // Штраф
  if (rule.fine_min && rule.fine_max) {
    const fineLabel = language === 'ru' ? 'Штраф' : 'Fine';
    text += `💰 <b>${fineLabel}:</b> ${rule.fine_min}-${rule.fine_max} ${rule.fine_currency}\n\n`;
  }

  // Источники
  if (rule.sources && rule.sources.length > 0) {
    const sourcesTitle = language === 'ru' ? 'Источники' : 'Sources';
    text += `📚 <b>${sourcesTitle}:</b>\n`;
    rule.sources.forEach((source, index) => {
      text += `${index + 1}. <a href="${source.url}">${source.title}</a>\n`;
    });
  }

  return text;
}
