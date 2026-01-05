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
  createRulesListKeyboard,
  createRuleViewKeyboard,
} from '../../keyboards/navigation.keyboards.js';
import { createMainMenuKeyboard } from '../../keyboards/onboarding.keyboards.js';
import { COUNTRIES, CATEGORIES } from '../../../config/constants.js';
import { ruleRepository } from '../../../database/repositories/RuleRepository.js';
import { formatRuleDetailed } from '../../../services/rule.service.js';
import { paginate, formatPageCounter } from '../../utils/pagination.helper.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';
import { logger } from '../../../utils/logger.js';

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

// Обработка выбора страны
export async function handleCountrySelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  const countryCode = callbackData.replace('country_', '');

  if (!ctx.session) ctx.session = {};
  ctx.session.current_country = countryCode;

  // ✅ Трекаем выбор страны
  await analyticsRepository.trackEvent(userId, 'country_selected', {
    country: countryCode,
  });

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  // ✅ Получаем название из константы
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const countryName = country ? (lang === 'ru' ? country.name_ru : country.name_en) : countryCode;

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const title = translate(lang, 'navigation.categories.title', { country: countryName });

  await ctx.reply(title, {
    reply_markup: createCategoriesKeyboard(lang),
  });
}

// Показывает список правил для выбранной страны и категории (с пагинацией)
export async function handleCategorySelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !ctx.session) return;

  const categoryId = callbackData.replace('category_', '');
  const countryCode = ctx.session.current_country;

  if (!countryCode) {
    await ctx.answerCallbackQuery(ctx.t('errors.country_not_selected'));
    return;
  }

  // Сохраняем выбранную категорию в сессию
  ctx.session.current_category = categoryId;
  ctx.session.current_page = 1; // Сбрасываем на первую страницу

  // ✅ Трекаем выбор категории
  const userId = ctx.from?.id;
  if (userId) {
    await analyticsRepository.trackEvent(userId, 'category_selected', {
      country: countryCode,
      category: categoryId,
    });
  }

  try {
    await showRulesList(ctx, countryCode, categoryId, 1);
    await ctx.answerCallbackQuery();
  } catch (err) {
    logger.error('Ошибка при загрузке правил:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      country: countryCode,
      category: categoryId,
    });
    await ctx.answerCallbackQuery(ctx.t('errors.loading_rules'));
  }
}

// Кнопка "Назад"
export async function handleBack(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  if (ctx.session?.current_category) {
    delete ctx.session.current_category;
    delete ctx.session.current_page;

    const countryCode = ctx.session.current_country || 'IT';

    // ✅ Получаем название из константы
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

// Возврат в главное меню
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

// Обработчик просмотра полной информации о правиле
export async function handleRuleView(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;

  const ruleId = callbackData.replace('rule_', '');

  try {
    // Получаем правило из БД
    const rule = await ruleRepository.getRuleById(ruleId);

    if (!rule) {
      await ctx.answerCallbackQuery(ctx.t('errors.rule_not_found'));
      return;
    }

    // Увеличиваем счетчик просмотров правила
    await ruleRepository.incrementViews(ruleId);

    // Увеличиваем счетчик просмотров пользователя
    if (ctx.from?.id) {
      await userRepository.incrementViews(ctx.from.id);

      // ✅ Трекаем просмотр правила
      await analyticsRepository.trackEvent(ctx.from.id, 'rule_viewed', {
        rule_id: ruleId,
        country: rule.country_code,
        category: rule.category,
        severity: rule.severity,
      });
    }

    // Получаем язык пользователя
    const user = await userRepository.findById(ctx.from!.id);
    const lang = (user?.language_code as 'en' | 'ru') || 'en';

    // Форматируем правило через RuleService
    const message = formatRuleDetailed(rule, lang);

    // Отправляем сообщение
    await ctx.editMessageText(message, {
      reply_markup: createRuleViewKeyboard(lang, ruleId),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Ошибка при просмотре правила:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ruleId: ruleId,
    });
    await ctx.answerCallbackQuery(ctx.t('errors.loading_rule'));
  }
}

// Обработчик кнопки "Предыдущая страница"
export async function handlePagePrev(ctx: BotContext) {
  if (!ctx.session?.current_country || !ctx.session?.current_category) {
    await ctx.answerCallbackQuery(ctx.t('errors.navigation_error'));
    return;
  }

  const currentPage = ctx.session.current_page || 1;
  const newPage = Math.max(1, currentPage - 1);

  ctx.session.current_page = newPage;

  try {
    await showRulesList(ctx, ctx.session.current_country, ctx.session.current_category, newPage);
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Ошибка при переходе на предыдущую страницу:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      country: ctx.session.current_country,
    });
    await ctx.answerCallbackQuery(ctx.t('errors.loading_page'));
  }
}

// Обработчик кнопки "Следующая страница"
export async function handlePageNext(ctx: BotContext) {
  if (!ctx.session?.current_country || !ctx.session?.current_category) {
    await ctx.answerCallbackQuery(ctx.t('errors.navigation_error'));
    return;
  }

  const currentPage = ctx.session.current_page || 1;
  const newPage = currentPage + 1;

  ctx.session.current_page = newPage;

  try {
    await showRulesList(ctx, ctx.session.current_country, ctx.session.current_category, newPage);
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error('Ошибка при переходе на следующую страницу:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      country: ctx.session.current_country,
    });
    await ctx.answerCallbackQuery(ctx.t('errors.loading_page'));
  }
}

// Обработчик нажатия на счетчик страниц (ничего не делает)
export async function handlePageCurrent(ctx: BotContext) {
  // Просто отвечаем на callback query, чтобы убрать "часики"
  await ctx.answerCallbackQuery();
}

// Вспомогательная функция для отображения списка правил
async function showRulesList(
  ctx: BotContext,
  countryCode: string,
  categoryId: string,
  page: number
) {
  // Получаем язык пользователя
  const user = await userRepository.findById(ctx.from!.id);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Загружаем ВСЕ правила из БД
  const allRules = await ruleRepository.getRulesByCountryAndCategory(countryCode, categoryId);

  // Получаем названия страны и категории
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const category = CATEGORIES.find((c) => c.id === categoryId);

  const countryName = lang === 'ru' ? country?.name_ru : country?.name_en;
  const categoryName = lang === 'ru' ? category?.name_ru : category?.name_en;

  if (allRules.length === 0) {
    // Если правил нет - показываем placeholder
    await ctx.editMessageText(
      translate(lang, 'navigation.rules.coming_soon', {
        country: `${country?.emoji} ${countryName}`,
        category: `${category?.emoji} ${categoryName}`,
      }),
      {
        reply_markup: createRulesKeyboard(lang),
      }
    );
    return;
  }

  // Применяем пагинацию
  const { items: rulesPage, currentPage, totalPages } = paginate(allRules, page, 5);

  // Формируем сообщение
  const pageInfo = totalPages > 1 ? `\n\n${formatPageCounter(currentPage, totalPages, lang)}` : '';

  const message =
    translate(lang, 'navigation.rules.list_title', {
      country: `${country?.emoji} ${countryName}`,
      category: `${category?.emoji} ${categoryName}`,
      count: allRules.length.toString(),
    }) + pageInfo;

  // Отправляем сообщение с клавиатурой
  await ctx.editMessageText(message, {
    reply_markup: createRulesListKeyboard(rulesPage, currentPage, totalPages, lang),
  });
}
