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

/**
 * Обработчик кнопки "⚙️ Настройки" из главного меню
 */
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

/**
 * Обработчик кнопки "📊 Моя статистика"
 */
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

/**
 * Обработчик кнопки "🌐 Изменить язык"
 */
export async function handleChangeLanguage(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const message =
    lang === 'ru'
      ? '🌐 Выберите язык интерфейса:\n\nВыбранный язык: 🇷🇺 Русский'
      : '🌐 Choose interface language:\n\nCurrent language: 🇬🇧 English';

  await ctx.editMessageText(message, {
    reply_markup: createLanguageChangeKeyboard(lang),
  });
}

/**
 * Обработчик выбора нового языка
 */
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
    newLang === 'ru' ? '✅ Язык изменён на русский' : '✅ Language changed to English'
  );

  // Возвращаемся в настройки
  const stats = await getUserStatistics(userId, newLang);
  const message = formatSettingsMessage(stats, newLang);

  await ctx.editMessageText(message, {
    reply_markup: createSettingsKeyboard(newLang),
    parse_mode: 'HTML',
  });
}

/**
 * Обработчик кнопки "ℹ️ О боте"
 */
export async function handleAboutBot(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const message =
    lang === 'ru'
      ? [
          '<b>ℹ️ О Travel Rules Bot</b>',
          '',
          '📌 <b>Версия:</b> 1.0.0 (MVP)',
          '📅 <b>Запущен:</b> Январь 2026',
          '',
          '<b>Что умеет бот:</b>',
          '✅ 6 стран (Италия, Турция, ОАЭ, Таиланд, Испания, Германия)',
          '✅ 5 категорий правил',
          '✅ Билингвальный поиск (EN/RU)',
          '✅ Детальная информация о правилах',
          '✅ Источники и штрафы',
          '',
          '💡 <b>В разработке:</b>',
          '• Больше стран',
          '• Уведомления об изменениях',
          '• Premium функции',
          '',
          '📧 <b>Связь:</b> @your_username',
        ].join('\n')
      : [
          '<b>ℹ️ About Travel Rules Bot</b>',
          '',
          '📌 <b>Version:</b> 1.0.0 (MVP)',
          '📅 <b>Launched:</b> January 2026',
          '',
          '<b>Features:</b>',
          '✅ 6 countries (Italy, Turkey, UAE, Thailand, Spain, Germany)',
          '✅ 5 rule categories',
          '✅ Bilingual search (EN/RU)',
          '✅ Detailed rule information',
          '✅ Sources and fines',
          '',
          '💡 <b>Coming soon:</b>',
          '• More countries',
          '• Change notifications',
          '• Premium features',
          '',
          '📧 <b>Contact:</b> @your_username',
        ].join('\n');

  await ctx.editMessageText(message, {
    reply_markup: createSettingsKeyboard(lang),
    parse_mode: 'HTML',
  });
}

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

/**
 * Интерфейс статистики пользователя
 */
export interface UserStatistics {
  totalViews: number;
  totalSearches: number;
  favoriteCountry: string | null;
  favoriteCategory: string | null;
  currentLanguage: string;
  memberSince: string;
}

/**
 * Получить статистику пользователя
 */
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

/**
 * Форматировать сообщение настроек
 */
export function formatSettingsMessage(stats: UserStatistics, lang: 'en' | 'ru'): string {
  const languageName = stats.currentLanguage === 'ru' ? '🇷🇺 Русский' : '🇬🇧 English';

  if (lang === 'ru') {
    return [
      '<b>⚙️ Настройки</b>',
      '',
      `🌐 <b>Язык:</b> ${languageName}`,
      `📅 <b>С нами с:</b> ${formatDate(stats.memberSince, lang)}`,
      '',
      '<i>Используйте кнопки ниже для изменения настроек</i>',
    ].join('\n');
  } else {
    return [
      '<b>⚙️ Settings</b>',
      '',
      `🌐 <b>Language:</b> ${languageName}`,
      `📅 <b>Member since:</b> ${formatDate(stats.memberSince, lang)}`,
      '',
      '<i>Use buttons below to change settings</i>',
    ].join('\n');
  }
}

/**
 * Форматировать сообщение статистики
 */
export function formatStatisticsMessage(stats: UserStatistics, lang: 'en' | 'ru'): string {
  // Получаем названия страны и категории
  const countryName = stats.favoriteCountry
    ? getCountryName(stats.favoriteCountry, lang)
    : lang === 'ru'
      ? '—'
      : '—';

  const categoryName = stats.favoriteCategory
    ? getCategoryName(stats.favoriteCategory, lang)
    : lang === 'ru'
      ? '—'
      : '—';

  if (lang === 'ru') {
    return [
      '<b>📊 Ваша статистика</b>',
      '',
      `👁 <b>Просмотров правил:</b> ${stats.totalViews}`,
      `🔍 <b>Поисковых запросов:</b> ${stats.totalSearches}`,
      '',
      `🌍 <b>Любимая страна:</b> ${countryName}`,
      `📂 <b>Любимая категория:</b> ${categoryName}`,
      '',
      `📅 <b>С нами с:</b> ${formatDate(stats.memberSince, lang)}`,
    ].join('\n');
  } else {
    return [
      '<b>📊 Your Statistics</b>',
      '',
      `👁 <b>Rules viewed:</b> ${stats.totalViews}`,
      `🔍 <b>Searches performed:</b> ${stats.totalSearches}`,
      '',
      `🌍 <b>Favorite country:</b> ${countryName}`,
      `📂 <b>Favorite category:</b> ${categoryName}`,
      '',
      `📅 <b>Member since:</b> ${formatDate(stats.memberSince, lang)}`,
    ].join('\n');
  }
}

/**
 * Получить название страны по коду
 */
function getCountryName(countryCode: string, lang: 'en' | 'ru'): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return countryCode;

  const name = lang === 'ru' ? country.name_ru : country.name_en;
  return `${country.emoji} ${name}`;
}

/**
 * Получить название категории по ID
 */
function getCategoryName(categoryId: string, lang: 'en' | 'ru'): string {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return categoryId;

  const name = lang === 'ru' ? category.name_ru : category.name_en;
  return `${category.emoji} ${name}`;
}

/**
 * Форматировать дату
 */
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
