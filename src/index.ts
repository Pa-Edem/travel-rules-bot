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

/**
 * Создаем экземпляр бота
 */
const bot = new Bot<BotContext>(config.bot.token);

/**
 * Подключаем middleware
 */
bot.use(i18nMiddleware());
bot.use(sessionMiddleware());

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

    console.log(`✅ Пользователь ${user.id} (@${user.username || 'unknown'})`);
  } catch (error) {
    console.error('❌ Ошибка в /start:', error);
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
 * Обработчик текстовых сообщений
 */
bot.on('message:text', async (ctx) => {
  const message = [
    ctx.t('errors.unknown_command'),
    '',
    ctx.t('commands.start.command_start'),
    ctx.t('commands.start.command_help'),
  ].join('\n');

  await ctx.reply(message);
});

/**
 * Обработчик ошибок
 */
bot.catch((err) => {
  console.error('❌ ОШИБКА В БОТЕ:');
  console.error(err);
});

/**
 * Запуск бота
 */
async function startBot() {
  try {
    console.log('🚀 Запуск Travel Rules Bot...');

    // Проверяем подключение к базе данных
    console.log('🔌 Проверка подключения к базе данных...');
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.error('❌ Не удалось подключиться к базе данных!');
      process.exit(1);
    }

    // Получаем информацию о боте
    const botInfo = await bot.api.getMe();
    console.log(`✅ Бот запущен: @${botInfo.username}`);
    console.log(`📝 ID бота: ${botInfo.id}`);
    console.log(`🔄 Режим: Development (Long Polling)`);

    // Запускаем long polling
    await bot.start();
  } catch (error) {
    console.error('❌ Ошибка при запуске бота:', error);
    process.exit(1);
  }
}

/**
 * Обработка сигналов завершения
 */
process.once('SIGINT', () => {
  console.log('\n⏸️  Останавливаем бота...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('\n⏸️  Останавливаем бота...');
  bot.stop();
});

// Запускаем бота
startBot();
