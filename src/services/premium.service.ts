// src/services/premium.service.ts

/**
 * Сервис для формирования Premium контента
 */

import { translate } from '../bot/utils/translate.helper.js';

// Формирует текст страницы Premium
export function formatPremiumPage(lang: 'en' | 'ru', isInterested: boolean): string {
  const message = [
    translate(lang, 'premium.title'),
    '',
    translate(lang, 'premium.coming_soon'),
    '',
    translate(lang, 'premium.offline_access_title'),
    translate(lang, 'premium.offline_access_pdf'),
    translate(lang, 'premium.offline_access_browse'),
    '',
    translate(lang, 'premium.advanced_search_title'),
    translate(lang, 'premium.advanced_search_filters'),
    translate(lang, 'premium.advanced_search_regional'),
    translate(lang, 'premium.advanced_search_history'),
    '',
    translate(lang, 'premium.regional_rules_title'),
    translate(lang, 'premium.regional_rules_cities'),
    translate(lang, 'premium.regional_rules_zones'),
    translate(lang, 'premium.regional_rules_local'),
    '',
    translate(lang, 'premium.push_notifications_title'),
    translate(lang, 'premium.push_notifications_changes'),
    translate(lang, 'premium.push_notifications_laws'),
    translate(lang, 'premium.push_notifications_reminders'),
    '',
    translate(lang, 'premium.priority_support_title'),
    translate(lang, 'premium.priority_support_fast'),
    translate(lang, 'premium.priority_support_help'),
    '',
    isInterested
      ? translate(lang, 'premium.already_on_waitlist')
      : translate(lang, 'premium.join_waitlist_cta'),
  ];

  return message.join('\n');
}
