// src/index.ts

/**
 * Главный файл Telegram бота
 * Travel Rules Bot - помощник для путешественников
 */

import { Bot } from 'grammy';
import { config } from './config/index.js';
import { testDatabaseConnection } from './database/client.js';
import { userRepository } from './database/repositories/UserRepository.js';
import { i18nMiddleware } from './bot/middlewares/i18n.middleware.js';
import { sessionMiddleware } from './bot/middlewares/session.middleware.js';
import { logger } from './utils/logger.js';
import { errorHandler, telegramErrorMiddleware } from './bot/middlewares/error.middleware.js';
import { startCacheCleanup } from './utils/cache.js';
import {
  rateLimitMiddleware,
  startRateLimitCleanup,
} from './bot/middlewares/ratelimit.middleware.js';
import type { BotContext } from './types/index.js';
import {
  createLanguageKeyboard,
  createMainMenuKeyboard,
} from './bot/keyboards/onboarding.keyboards.js';
import {
  handleLanguageSelection,
  handleDisclaimerAccept,
  handleDisclaimerDecline,
  handleDisclaimerReadFull,
  handleDisclaimerBack,
} from './bot/handlers/callbacks/onboarding.callbacks.js';
import {
  handleShowCountries,
  handleCountrySelection,
  handleCategorySelection,
  handleBack,
  handleMainMenu,
  handleRuleView,
  handlePagePrev,
  handlePageNext,
  handlePageCurrent,
} from './bot/handlers/callbacks/navigation.callbacks.js';
import {
  handleSearchStart,
  handleSearchCancel,
  handleSearchQuery,
  handleSearchNew,
  handleSearchShowFilters,
  handleSearchBackToResults,
  handleFilterCountry,
  handleFilterCountrySelect,
  handleFilterCategory,
  handleFilterCategorySelect,
  handleSearchClearFilters,
  handleSearchPagePrev,
  handleSearchPageNext,
  handleSearchPageCurrent,
  handleSearchCountryHeader,
} from './bot/handlers/callbacks/search.callbacks.js';
import { analyticsRepository } from './database/repositories/AnalyticsRepository.js';
import {
  handleSettingsMenu,
  handleShowStatistics,
  handleChangeLanguage,
  handleLanguageChange,
  handleAboutBot,
} from './bot/handlers/callbacks/settings.callbacks.js';
import {
  handleRuleFeedbackHelpful,
  handleRuleFeedbackNotHelpful,
  handleFeedbackTextMessage,
  handleFeedbackCancel,
  handleSettingsFeedback,
  handleGeneralFeedbackMessage,
  handleGeneralFeedbackCancel,
} from './bot/handlers/callbacks/feedback.callbacks.js';
import {
  handlePremiumInfo,
  handlePremiumNotify,
} from './bot/handlers/callbacks/premium.callbacks.js';

/**
 * Создаем экземпляр бота
 */
const bot = new Bot<BotContext>(config.bot.token);

/**
 * Подключаем middleware
 */
bot.use(i18nMiddleware());
bot.use(sessionMiddleware());
bot.use(telegramErrorMiddleware());
bot.use(rateLimitMiddleware());

/**
 * Обработчик команды /start
 */
bot.command('start', async (ctx) => {
  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply(ctx.t('errors.user_data'));
      return;
    }

    // Получаем или создаем пользователя
    const user = await userRepository.findOrCreate(telegramUser.id, {
      id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      language_code: telegramUser.language_code === 'ru' ? 'ru' : 'en',
      onboarding_done: false, // По умолчанию онбординг не пройден
    });

    // ✅ Трекаем событие "пользователь запустил бота"
    await analyticsRepository.trackEvent(telegramUser.id, 'user_started');

    // ПРОВЕРКА: прошел ли пользователь онбординг?
    if (!user.onboarding_done) {
      // Показываем экран выбора языка
      await ctx.reply('🌍 Добро пожаловать!\n\nВыберите язык / Choose your language:', {
        reply_markup: createLanguageKeyboard(),
      });
      return;
    }

    // Если онбординг пройден - показываем главное меню
    const lang = user.language_code === 'ru' ? 'ru' : 'en';
    const menuTitle = lang === 'ru' ? '📋 Главное меню' : '📋 Main Menu';

    await ctx.reply(menuTitle, {
      reply_markup: createMainMenuKeyboard(lang),
    });

    logger.info('Пользователь запустил бота', {
      userId: user.id,
      username: user.username || 'unknown',
    });
  } catch (error) {
    logger.error('Ошибка в команде /start', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId: ctx.from?.id,
    });
    await ctx.reply(ctx.t('errors.generic'));
  }
});

/**
 * Обработчик команды /help
 */
bot.command('help', async (ctx) => {
  const message = [
    ctx.t('commands.help.title'),
    '',
    ctx.t('commands.help.description'),
    '',
    ctx.t('commands.help.dev_status'),
    '',
    ctx.t('commands.help.planned_features'),
    ctx.t('commands.help.feature_countries'),
    ctx.t('commands.help.feature_categories'),
    ctx.t('commands.help.feature_search'),
    ctx.t('commands.help.feature_bilingual'),
    '',
    ctx.t('commands.help.questions'),
  ].join('\n');

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

/**
 * Обработчик команды /settings
 */
/**
 * Обработчик команды /settings
 */
bot.command('settings', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Импортируем функции
  const { getUserStatistics, formatSettingsMessage } =
    await import('./bot/handlers/callbacks/settings.callbacks.js');
  const { createSettingsKeyboard } = await import('./bot/keyboards/settings.keyboards.js');

  // Получаем статистику
  const stats = await getUserStatistics(userId, lang);
  const message = formatSettingsMessage(stats, lang);

  await ctx.reply(message, {
    reply_markup: createSettingsKeyboard(lang),
    parse_mode: 'HTML',
  });
});

/**
 * Callback handlers для онбординга
 */
bot.callbackQuery(/^lang_(en|ru)$/, handleLanguageSelection);
bot.callbackQuery('disclaimer_accept', handleDisclaimerAccept);
bot.callbackQuery('disclaimer_decline', handleDisclaimerDecline);
bot.callbackQuery('disclaimer_read_full', handleDisclaimerReadFull);
bot.callbackQuery('disclaimer_back', handleDisclaimerBack);

// Обработчики пагинации
bot.callbackQuery('page_prev', handlePagePrev);
bot.callbackQuery('page_next', handlePageNext);
bot.callbackQuery('page_current', handlePageCurrent);

/**
 * Callback handlers для навигации
 */
bot.callbackQuery('menu_countries', handleShowCountries);
bot.callbackQuery(/^country_[A-Z]{2}$/, handleCountrySelection);
bot.callbackQuery(/^category_\w+$/, handleCategorySelection);
bot.callbackQuery('nav_back', handleBack);
bot.callbackQuery('nav_main_menu', handleMainMenu);
bot.callbackQuery(/^rule_[A-Z]{2}_[A-Z_]+_\d{3}$/, handleRuleView);

/**
 * Callback handlers для поиска
 */
bot.callbackQuery('menu_search', handleSearchStart);
bot.callbackQuery('search_cancel', handleSearchCancel);
bot.callbackQuery('search_new', handleSearchNew);
bot.callbackQuery('search_show_filters', handleSearchShowFilters);
bot.callbackQuery('search_back_to_results', handleSearchBackToResults);
bot.callbackQuery('filter_country', handleFilterCountry);
bot.callbackQuery(/^filter_country_[A-Z]{2}$/, handleFilterCountrySelect);
bot.callbackQuery('filter_country_all', handleFilterCountrySelect);
bot.callbackQuery('filter_category', handleFilterCategory);
bot.callbackQuery(/^filter_category_\w+$/, handleFilterCategorySelect);
bot.callbackQuery('filter_category_all', handleFilterCategorySelect);
bot.callbackQuery('search_clear_filters', handleSearchClearFilters);
bot.callbackQuery('search_page_prev', handleSearchPagePrev);
bot.callbackQuery('search_page_next', handleSearchPageNext);
bot.callbackQuery('search_page_current', handleSearchPageCurrent);
bot.callbackQuery(/^search_country_header_/, handleSearchCountryHeader);

/**
 * Callback handlers для настроек
 */
bot.callbackQuery('menu_settings', handleSettingsMenu);
bot.callbackQuery('settings_statistics', handleShowStatistics);
bot.callbackQuery('settings_change_language', handleChangeLanguage);
bot.callbackQuery(/^settings_lang_(en|ru)$/, handleLanguageChange);
bot.callbackQuery('settings_about', handleAboutBot);

// Обработчики feedback на правилах
bot.callbackQuery(/^feedback_helpful_/, handleRuleFeedbackHelpful);
bot.callbackQuery(/^feedback_not_helpful_/, handleRuleFeedbackNotHelpful);
bot.callbackQuery('feedback_cancel', handleFeedbackCancel);
bot.callbackQuery('settings_feedback', handleSettingsFeedback);
bot.callbackQuery('general_feedback_cancel', handleGeneralFeedbackCancel);

// Обработчики Premium
bot.callbackQuery('menu_premium', handlePremiumInfo);
bot.callbackQuery('premium_notify', handlePremiumNotify);

/**
 * Обработчик текстовых сообщений
 */
bot.on('message:text', async (ctx) => {
  // Проверяем режим общего отзыва (ПЕРВЫМ!)
  if (ctx.session?.awaiting_general_feedback) {
    await handleGeneralFeedbackMessage(ctx);
    return;
  }

  // Проверяем режим ожидания текстового feedback на правило
  if (ctx.session?.awaiting_feedback_text) {
    await handleFeedbackTextMessage(ctx);
    return;
  }

  // Проверяем режим поиска
  if (ctx.session?.search_mode) {
    await handleSearchQuery(ctx);
    return;
  }

  // Если не в режиме поиска и не в режиме feedback - показываем помощь
  const message = [
    ctx.t('errors.unknown_command'),
    '',
    ctx.t('commands.start.command_start'),
    ctx.t('commands.start.command_help'),
  ].join('\n');

  await ctx.reply(message);
});

/**
 * Глобальный обработчик ошибок
 */
/**
 * Глобальный обработчик ошибок
 */
bot.catch(errorHandler);
// bot.catch((err) => {
//   const ctx = err.ctx;

//   logger.error('Критическая ошибка в боте', {
//     error: err.error instanceof Error ? err.error.message : 'Unknown error',
//     stack: err.error instanceof Error ? err.error.stack : undefined,
//     userId: ctx.from?.id,
//     updateType: ctx.update ? Object.keys(ctx.update)[0] : 'unknown',
//   });

//   // Пытаемся показать пользователю дружелюбное сообщение
//   try {
//     ctx.reply(ctx.t('errors.generic')).catch(() => {
//       // Если даже это не работает - просто логируем
//       logger.error('Не удалось отправить сообщение об ошибке пользователю', {
//         userId: ctx.from?.id,
//       });
//     });
//   } catch {
//     // Игнорируем
//   }
// });

/**
 * Запуск бота
 */
async function startBot() {
  try {
    logger.info('Запуск Travel Rules Bot...');

    // Проверяем подключение к базе данных
    logger.info('Проверка подключения к базе данных...');
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      logger.error('Не удалось подключиться к базе данных!');
      process.exit(1);
    }
    logger.info('Подключение к базе данных успешно');

    // Запускаем rate limit cleanup
    startRateLimitCleanup();

    // Запускаем cache cleanup
    startCacheCleanup(10);

    // Получаем информацию о боте
    const botInfo = await bot.api.getMe();
    logger.info('Бот успешно запущен', {
      botUsername: botInfo.username,
      botId: botInfo.id,
      mode: 'development',
      pollingType: 'long-polling',
    });

    // Запускаем long polling
    await bot.start();
  } catch (error) {
    logger.error('Критическая ошибка при запуске бота', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

/**
 * Обработка сигналов завершения
 */
process.once('SIGINT', () => {
  logger.info('Получен сигнал SIGINT, останавливаем бота...');
  bot.stop();
});

process.once('SIGTERM', () => {
  logger.info('Получен сигнал SIGTERM, останавливаем бота...');
  bot.stop();
});

// Запускаем бота
startBot();
