// src/bot/handlers/callbacks/settings.callbacks.ts

/**
 * Обработчики настроек и статистики пользователя
 */

import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';
import { COUNTRIES, CATEGORIES } from '../../../config/constants.js';
import {
  createSettingsKeyboard,
  createLanguageChangeKeyboard,
} from '../../keyboards/settings.keyboards.js';
import { translate } from '../../utils/translate.helper.js';

//Обработчик кнопки "Настройки" из главного меню
export async function handleSettingsMenu(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  // Получаем статистику пользователя
  const stats = await getUserStatistics(userId, lang);

  const message = formatSettingsMessage(stats, lang);

  await ctx.reply(message, {
    reply_markup: createSettingsKeyboard(lang),
    parse_mode: 'HTML',
  });
}

// Обработчик кнопки "Моя статистика"
export async function handleShowStatistics(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  // Получаем статистику
  const stats = await getUserStatistics(userId, lang);

  const message = formatStatisticsMessage(stats, lang);

  await ctx.editMessageText(message, {
    reply_markup: createSettingsKeyboard(lang),
    parse_mode: 'HTML',
  });
}

// Обработчик кнопки "Изменить язык"
export async function handleChangeLanguage(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const languageName = lang === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English';
  const message = [
    ctx.t('settings.choose_language_title'),
    '',
    ctx.t('settings.current_language', { language: languageName }),
  ].join('\n');

  await ctx.editMessageText(message, {
    reply_markup: createLanguageChangeKeyboard(lang),
  });
}

// Обработчик выбора нового языка
export async function handleLanguageChange(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  const newLang = callbackData.replace('settings_lang_', '') as 'en' | 'ru';

  // Обновляем язык в БД
  await userRepository.update(userId, {
    language_code: newLang,
  });

  await ctx.answerCallbackQuery(
    newLang === 'ru' ? ctx.t('settings.language_changed_ru') : ctx.t('settings.language_changed_en')
  );

  // Возвращаемся в настройки
  const stats = await getUserStatistics(userId, newLang);
  const message = formatSettingsMessage(stats, newLang);

  await ctx.editMessageText(message, {
    reply_markup: createSettingsKeyboard(newLang),
    parse_mode: 'HTML',
  });
}

// Обработчик кнопки "О боте"
export async function handleAboutBot(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const message = [
    ctx.t('settings.about_title'),
    '',
    ctx.t('settings.about_version'),
    ctx.t('settings.about_launched'),
    '',
    ctx.t('settings.about_features_title'),
    ctx.t('settings.about_feature_countries'),
    ctx.t('settings.about_feature_categories'),
    ctx.t('settings.about_feature_search'),
    ctx.t('settings.about_feature_details'),
    ctx.t('settings.about_feature_sources'),
    '',
    ctx.t('settings.about_coming_soon'),
    ctx.t('settings.about_more_countries'),
    ctx.t('settings.about_notifications'),
    ctx.t('settings.about_premium'),
    '',
    ctx.t('settings.about_contact'),
  ].join('\n');

  await ctx.editMessageText(message, {
    reply_markup: createSettingsKeyboard(lang),
    parse_mode: 'HTML',
  });
}

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

// Интерфейс статистики пользователя
export interface UserStatistics {
  totalViews: number;
  totalSearches: number;
  favoriteCountry: string | null;
  favoriteCategory: string | null;
  currentLanguage: string;
  memberSince: string;
}

// Получить статистику пользователя
export async function getUserStatistics(
  userId: number,
  lang: 'en' | 'ru'
): Promise<UserStatistics> {
  const user = await userRepository.findById(userId);

  if (!user) {
    return {
      totalViews: 0,
      totalSearches: 0,
      favoriteCountry: null,
      favoriteCategory: null,
      currentLanguage: lang,
      memberSince: new Date().toISOString(),
    };
  }

  // Получаем любимую страну и категорию из аналитики
  const favoriteCountry = await analyticsRepository.getUserFavoriteCountry(userId);
  const favoriteCategory = await analyticsRepository.getUserFavoriteCategory(userId);

  return {
    totalViews: user.total_views,
    totalSearches: user.total_searches,
    favoriteCountry,
    favoriteCategory,
    currentLanguage: user.language_code,
    memberSince: user.created_at,
  };
}

// Форматировать сообщение настроек
export function formatSettingsMessage(stats: UserStatistics, lang: 'en' | 'ru'): string {
  const languageName = stats.currentLanguage === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English';

  return [
    translate(lang, 'settings.title'),
    '',
    `${translate(lang, 'settings.language_label')} ${languageName}`,
    `${translate(lang, 'settings.member_since')} ${formatDate(stats.memberSince, lang)}`,
    '',
    translate(lang, 'settings.use_buttons'),
  ].join('\n');
}

// Форматировать сообщение статистики
export function formatStatisticsMessage(stats: UserStatistics, lang: 'en' | 'ru'): string {
  // Получаем названия страны и категории
  const countryName = stats.favoriteCountry
    ? getCountryName(stats.favoriteCountry, lang)
    : translate(lang, 'settings.stats_no_data');

  const categoryName = stats.favoriteCategory
    ? getCategoryName(stats.favoriteCategory, lang)
    : translate(lang, 'settings.stats_no_data');

  return [
    translate(lang, 'settings.stats_title'),
    '',
    `${translate(lang, 'settings.stats_views')} ${stats.totalViews}`,
    `${translate(lang, 'settings.stats_searches')} ${stats.totalSearches}`,
    '',
    `${translate(lang, 'settings.stats_favorite_country')} ${countryName}`,
    `${translate(lang, 'settings.stats_favorite_category')} ${categoryName}`,
    '',
    `${translate(lang, 'settings.member_since')} ${formatDate(stats.memberSince, lang)}`,
  ].join('\n');
}

// Получить название страны по коду
function getCountryName(countryCode: string, lang: 'en' | 'ru'): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return countryCode;

  const name = lang === 'ru' ? country.name_ru : country.name_en;
  return `${country.emoji} ${name}`;
}

// Получить название категории по ID
function getCategoryName(categoryId: string, lang: 'en' | 'ru'): string {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return categoryId;

  const name = lang === 'ru' ? category.name_ru : category.name_en;
  return `${category.emoji} ${name}`;
}

// Форматировать дату
function formatDate(dateString: string, lang: 'en' | 'ru'): string {
  const date = new Date(dateString);

  if (lang === 'ru') {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
