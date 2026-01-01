// src/bot/handlers/callbacks/navigation.callbacks.ts

/**
 * Обработчики навигации по странам и категориям
 */

import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { translate } from '../../utils/translate.helper.js';
import {
  createCountriesKeyboard,
  createCategoriesKeyboard,
  createRulesKeyboard,
} from '../../keyboards/navigation.keyboards.js';
import { createMainMenuKeyboard } from '../../keyboards/onboarding.keyboards.js';
import { COUNTRIES, CATEGORIES } from '../../../config/constants.js';

export async function handleShowCountries(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const title = translate(lang, 'navigation.countries.title');

  await ctx.reply(title, {
    reply_markup: createCountriesKeyboard(lang),
  });
}

/**
 * Обработка выбора страны
 */
export async function handleCountrySelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  const countryCode = callbackData.replace('country_', '');

  if (!ctx.session) ctx.session = {};
  ctx.session.current_country = countryCode;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  // ✅ Получаем название из констант
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const countryName = country ? (lang === 'ru' ? country.name_ru : country.name_en) : countryCode;

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const title = translate(lang, 'navigation.categories.title', { country: countryName });

  await ctx.reply(title, {
    reply_markup: createCategoriesKeyboard(lang),
  });
}

/**
 * Обработка выбора категории
 */
export async function handleCategorySelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  const categoryId = callbackData.replace('category_', '');

  if (!ctx.session) ctx.session = {};
  ctx.session.current_category = categoryId;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  const countryCode = ctx.session.current_country || 'IT';

  // ✅ Получаем названия из констант
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const countryName = country ? (lang === 'ru' ? country.name_ru : country.name_en) : countryCode;

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const categoryName = category
    ? lang === 'ru'
      ? category.name_ru
      : category.name_en
    : categoryId;

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const message = translate(lang, 'navigation.rules.coming_soon', {
    country: countryName,
    category: categoryName,
  });

  await ctx.reply(message, {
    reply_markup: createRulesKeyboard(lang),
  });
}

/**
 * Кнопка "Назад"
 */
export async function handleBack(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  if (ctx.session?.current_category) {
    delete ctx.session.current_category;

    const countryCode = ctx.session.current_country || 'IT';

    // ✅ Получаем название из констант
    const country = COUNTRIES.find((c) => c.code === countryCode);
    const countryName = country ? (lang === 'ru' ? country.name_ru : country.name_en) : countryCode;

    const title = translate(lang, 'navigation.categories.title', { country: countryName });

    await ctx.reply(title, {
      reply_markup: createCategoriesKeyboard(lang),
    });
  } else if (ctx.session?.current_country) {
    delete ctx.session.current_country;

    const title = translate(lang, 'navigation.countries.title');

    await ctx.reply(title, {
      reply_markup: createCountriesKeyboard(lang),
    });
  } else {
    const menuTitle = translate(lang, 'menu.main_title');

    await ctx.reply(menuTitle, {
      reply_markup: createMainMenuKeyboard(lang),
    });
  }
}

/**
 * Возврат в главное меню
 */
export async function handleMainMenu(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  // Очищаем навигацию из сессии
  if (ctx.session) {
    delete ctx.session.current_country;
    delete ctx.session.current_category;
  }

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const menuTitle = translate(lang, 'menu.main_title');

  await ctx.reply(menuTitle, {
    reply_markup: createMainMenuKeyboard(lang),
  });
}
