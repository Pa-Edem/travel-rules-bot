import { Bot } from 'grammy';
import 'dotenv/config';

const bot = new Bot(process.env.BOT_TOKEN);

// Команда /start с главным меню
bot.command('start', (ctx) => {
  ctx.reply('Привет! Я бот для путешественников! 🌍\n\nВыбери действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🗺️ Выбрать страну', callback_data: 'countries' }],
        [
          { text: '❓ Помощь', callback_data: 'help' },
          { text: 'ℹ️ О боте', callback_data: 'about' },
        ],
      ],
    },
  });
});

// Команда /help
bot.command('help', (ctx) => {
  ctx.reply('Доступные команды:\n/start - Начать\n/help - Помощь\n/about - О боте');
});

// Команда /about
bot.command('about', (ctx) => {
  ctx.reply('Я бот который помогает узнать о правилах в разных странах! 🌍\n\nВерсия: 1.0');
});

// Обработка нажатий на кнопки
bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery.data;

  // Кнопка "Помощь"
  if (data === 'help') {
    ctx.answerCallbackQuery();
    ctx.reply('Доступные команды:\n/start - Начать\n/help - Помощь\n/about - О боте');
  }

  // Кнопка "О боте"
  if (data === 'about') {
    ctx.answerCallbackQuery();
    ctx.reply('Я бот который помогает узнать о правилах в разных странах! 🌍\n\nВерсия: 1.0');
  }

  // Кнопка "Выбрать страну"
  if (data === 'countries') {
    ctx.answerCallbackQuery();
    ctx.editMessageText('Выбери страну:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇮🇹 Италия', callback_data: 'country_IT' },
            { text: '🇹🇷 Турция', callback_data: 'country_TR' },
          ],
          [
            { text: '🇦🇪 ОАЭ', callback_data: 'country_AE' },
            { text: '🇹🇭 Таиланд', callback_data: 'country_TH' },
          ],
          [{ text: '🔙 Назад', callback_data: 'back_main' }],
        ],
      },
    });
  }

  // Кнопка "Назад" (в главное меню)
  if (data === 'back_main') {
    ctx.answerCallbackQuery();
    ctx.editMessageText('Главное меню:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗺️ Выбрать страну', callback_data: 'countries' }],
          [
            { text: '❓ Помощь', callback_data: 'help' },
            { text: 'ℹ️ О боте', callback_data: 'about' },
          ],
        ],
      },
    });
  }

  // Обработка выбора конкретной страны
  if (data.startsWith('country_')) {
    const countryCode = data.replace('country_', '');

    // Названия стран для отображения
    const countryNames = {
      IT: 'Италия 🇮🇹',
      TR: 'Турция 🇹🇷',
      AE: 'ОАЭ 🇦🇪',
      TH: 'Таиланд 🇹🇭',
    };

    ctx.answerCallbackQuery();
    ctx.editMessageText(`Вы выбрали: ${countryNames[countryCode]}\n\nВыберите категорию правил:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚗 Транспорт', callback_data: `category_${countryCode}_transport` }],
          [{ text: '🍺 Алкоголь', callback_data: `category_${countryCode}_alcohol` }],
          [{ text: '🚁 Дроны', callback_data: `category_${countryCode}_drones` }],
          [{ text: '🔙 Назад', callback_data: 'countries' }],
        ],
      },
    });
  }

  // Обработка выбора категории
  if (data.startsWith('category_')) {
    const parts = data.replace('category_', '').split('_');
    const countryCode = parts[0];
    const category = parts[1];

    const categoryNames = {
      transport: 'Транспорт 🚗',
      alcohol: 'Алкоголь 🍺',
      drones: 'Дроны 🚁',
    };

    ctx.answerCallbackQuery();
    ctx.editMessageText(`Категория: ${categoryNames[category]}\n\n(Здесь будут правила для этой категории)`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад к странам', callback_data: 'countries' }]],
      },
    });
  }
});

// Обработка обычных сообщений
bot.on('message', (ctx) => {
  ctx.reply('Используйте кнопки меню или команду /start');
});

// Запуск бота
bot.start();
console.log('Бот запущен! ✅');
