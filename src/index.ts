/**
 * Главный файл Telegram бота
 * Travel Rules Bot - помощник для путешественников
 */

import { Bot } from 'grammy';
import { config } from './config/index.js';
import { testDatabaseConnection } from './database/client.js';
import { userRepository } from './database/repositories/UserRepository.js';
import type { BotContext } from './types/index.js';

/**
 * Создаем экземпляр бота
 */
const bot = new Bot<BotContext>(config.bot.token);

/**
 * Обработчик команды /start
 * Первое взаимодействие пользователя с ботом
 * Сохраняет/обновляет пользователя в базе данных
 */
bot.command('start', async (ctx) => {
  try {
    // Получаем данные пользователя из Telegram
    const telegramUser = ctx.from;
    if (!telegramUser) {
      await ctx.reply('Ошибка: не удалось получить данные пользователя');
      return;
    }

    // Сохраняем или обновляем пользователя в БД
    const user = await userRepository.findOrCreate(telegramUser.id, {
      id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      language_code: telegramUser.language_code === 'ru' ? 'ru' : 'en',
    });

    // Приветствие на языке пользователя
    const firstName = user.first_name || 'путешественник';

    if (user.language_code === 'ru') {
      await ctx.reply(
        `👋 Привет, ${firstName}!\n\n` +
          `Я Travel Rules Bot - твой помощник в путешествиях.\n\n` +
          `🌍 Я помогу тебе узнать о законах и правилах в разных странах, ` +
          `чтобы избежать штрафов и неприятностей.\n\n` +
          `⚙️ Сейчас я в разработке. Скоро здесь появится много полезной информации!\n\n` +
          `📝 Доступные команды:\n` +
          `/start - начать работу с ботом\n` +
          `/help - помощь`
      );
    } else {
      await ctx.reply(
        `👋 Hello, ${firstName}!\n\n` +
          `I'm Travel Rules Bot - your travel assistant.\n\n` +
          `🌍 I help you learn about laws and regulations in different countries ` +
          `to avoid fines and troubles.\n\n` +
          `⚙️ Currently in development. Useful information coming soon!\n\n` +
          `📝 Available commands:\n` +
          `/start - start using the bot\n` +
          `/help - get help`
      );
    }

    // Логируем событие
    console.log(
      `✅ Пользователь: ${user.id} (@${user.username || 'unknown'}) | ` +
        `Язык: ${user.language_code} | ` +
        `Создан: ${new Date(user.created_at).toLocaleDateString('ru-RU')}`
    );
  } catch (error) {
    console.error('❌ Ошибка в обработчике /start:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

/**
 * Обработчик команды /help
 */
bot.command('help', async (ctx) => {
  await ctx.reply(
    `ℹ️ *Справка по боту*\n\n` +
      `Travel Rules Bot помогает узнать о законах и правилах в популярных туристических направлениях.\n\n` +
      `🚧 Бот находится в разработке.\n\n` +
      `📌 Планируемые функции:\n` +
      `• Правила для 6 стран (Италия, Турция, ОАЭ, Таиланд, Испания, Германия)\n` +
      `• 5 категорий (Транспорт, Алкоголь, Дроны, Медикаменты, Культурные нормы)\n` +
      `• Поиск по правилам\n` +
      `• Двуязычная поддержка (EN/RU)\n\n` +
      `❓ Вопросы? Напиши разработчику!`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * Обработчик всех текстовых сообщений
 */
bot.on('message:text', async (ctx) => {
  await ctx.reply(
    `Спасибо за сообщение! 🙏\n\n` +
      `Я пока в разработке и не могу обрабатывать произвольные сообщения.\n\n` +
      `Используйте команды:\n` +
      `/start - начать\n` +
      `/help - справка`
  );
});

/**
 * Обработчик ошибок
 */
bot.catch((err) => {
  console.error('❌ Ошибка в боте:', err);
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
      console.error('Проверьте SUPABASE_URL и SUPABASE_ANON_KEY в .env файле');
      process.exit(1);
    }

    // Получаем информацию о боте
    const botInfo = await bot.api.getMe();
    console.log(`✅ Бот запущен: @${botInfo.username}`);
    console.log(`📝 ID бота: ${botInfo.id}`);
    console.log(`🔄 Режим: ${config.isDevelopment ? 'Development (Long Polling)' : 'Production'}`);

    // Запускаем long polling (для локальной разработки)
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
  console.log('\n⏸️  Получен сигнал SIGINT, останавливаем бота...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('\n⏸️  Получен сигнал SIGTERM, останавливаем бота...');
  bot.stop();
});

// Запускаем бота
startBot();
