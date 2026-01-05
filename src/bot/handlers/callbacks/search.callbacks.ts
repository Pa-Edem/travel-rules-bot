// src/bot/handlers/callbacks/search.callbacks.ts

/**
 * Обработчики поиска правил
 */

import { logger } from '../../../utils/logger.js';
import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { ruleRepository } from '../../../database/repositories/RuleRepository.js';
import { translate } from '../../utils/translate.helper.js';
import { paginate, formatPageCounter } from '../../utils/pagination.helper.js';
import {
  createSearchCancelKeyboard,
  createSearchResultsKeyboard,
  createSearchFiltersKeyboard,
  createFilterCountryKeyboard,
  createFilterCategoryKeyboard,
  createNoResultsKeyboard,
} from '../../keyboards/search.keyboards.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';

// Обработчик кнопки "🔍 Поиск правил" из главного меню
export async function handleSearchStart(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  // Инициализируем состояние поиска в сессии
  if (!ctx.session) ctx.session = {};
  ctx.session.search_mode = true;
  ctx.session.search_filters = {
    country: null,
    category: null,
  };

  const message = [
    translate(lang, 'search.prompt_title'),
    '',
    translate(lang, 'search.prompt_text'),
  ].join('\n');

  // Используем editMessageText вместо delete + reply
  try {
    await ctx.editMessageText(message, {
      reply_markup: createSearchCancelKeyboard(lang),
    });
  } catch (error) {
    // Если не удалось отредактировать (например, сообщение слишком старое)
    // Тогда удаляем и создаём новое
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(message, {
      reply_markup: createSearchCancelKeyboard(lang),
    });
  }
}

// Обработчик отмены поиска
export async function handleSearchCancel(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Очищаем состояние поиска
  if (ctx.session) {
    delete ctx.session.search_mode;
    delete ctx.session.search_query;
    delete ctx.session.search_filters;
    delete ctx.session.search_results;
    delete ctx.session.search_page;
  }

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  const menuTitle = translate(lang, 'menu.main_title');
  const { createMainMenuKeyboard } = await import('../../keyboards/onboarding.keyboards.js');

  await ctx.reply(menuTitle, {
    reply_markup: createMainMenuKeyboard(lang),
  });
}

// Обработчик текстового ввода в режиме поиска
export async function handleSearchQuery(ctx: BotContext) {
  const userId = ctx.from?.id;
  const query = ctx.message?.text;

  if (!userId || !query) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Проверка минимальной длины (3 символа)
  if (query.trim().length < 3) {
    await ctx.reply(translate(lang, 'search.too_short'), {
      reply_markup: createSearchCancelKeyboard(lang),
    });
    return;
  }

  // Показываем индикатор "печатает..."
  await ctx.replyWithChatAction('typing');

  try {
    // Получаем фильтры из сессии
    const filters = ctx.session?.search_filters || { country: null, category: null };

    // Выполняем поиск
    const results = await ruleRepository.searchRules(
      query,
      filters.country || undefined,
      filters.category || undefined,
      50 // Максимум 50 результатов
    );

    // Сохраняем результаты в сессию
    if (!ctx.session) ctx.session = {};
    ctx.session.search_mode = false; // Выключаем режим ожидания ввода
    ctx.session.search_query = query;
    ctx.session.search_results = results;
    ctx.session.search_page = 1;

    // Увеличиваем счетчик поисков пользователя
    await userRepository.update(userId, {
      total_searches: (user?.total_searches || 0) + 1,
    });

    // ✅ Трекаем выполнение поиска
    await analyticsRepository.trackEvent(userId, 'search_performed', {
      query: query,
      results_count: results.length,
      has_country_filter: filters.country !== null,
      has_category_filter: filters.category !== null,
      country_filter: filters.country,
      category_filter: filters.category,
    });

    // Показываем результаты
    await showSearchResults(ctx, lang, query, results, 1);
  } catch (error) {
    logger.error('Ошибка при поиске правил:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: ctx.from?.id,
      query,
    });

    await ctx.reply(translate(lang, 'errors.generic'));
  }
}

// Обработчик кнопки "Новый поиск"
export async function handleSearchNew(ctx: BotContext) {
  // Очищаем предыдущие результаты
  if (ctx.session) {
    delete ctx.session.search_query;
    delete ctx.session.search_results;
    delete ctx.session.search_page;
  }

  await handleSearchStart(ctx);
}

// Обработчик кнопки "Показать фильтры"
export async function handleSearchShowFilters(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const filters = ctx.session?.search_filters || { country: null, category: null };

  await ctx.editMessageText(translate(lang, 'search.filter_title'), {
    reply_markup: createSearchFiltersKeyboard(filters.country, filters.category, lang),
  });
}

// Обработчик возврата к результатам поиска из фильтров
export async function handleSearchBackToResults(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  const query = ctx.session?.search_query;
  const results = ctx.session?.search_results || [];
  const page = ctx.session?.search_page || 1;

  if (!query) {
    // Если нет сохраненного запроса - запускаем новый поиск
    await handleSearchStart(ctx);
    return;
  }

  await showSearchResults(ctx, lang, query, results, page, true);
}

// Обработчик выбора фильтра "Страна"
export async function handleFilterCountry(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(translate(lang, 'search.filter_title'), {
    reply_markup: createFilterCountryKeyboard(lang),
  });
}

// Обработчик выбора конкретной страны для фильтра
export async function handleFilterCountrySelect(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;

  const countryCode = callbackData.replace('filter_country_', '');

  // Сохраняем фильтр в сессию
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.search_filters) ctx.session.search_filters = { country: null, category: null };

  ctx.session.search_filters.country = countryCode === 'all' ? null : countryCode;

  await ctx.answerCallbackQuery();

  // Если есть сохраненный запрос - повторяем поиск с новым фильтром
  const query = ctx.session.search_query;
  if (query) {
    await performSearchWithFilters(ctx);
  } else {
    // Возвращаемся к экрану фильтров
    await handleSearchShowFilters(ctx);
  }
}

// Обработчик выбора фильтра "Категория"
export async function handleFilterCategory(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(translate(lang, 'search.filter_title'), {
    reply_markup: createFilterCategoryKeyboard(lang),
  });
}

// Обработчик выбора конкретной категории для фильтра
export async function handleFilterCategorySelect(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;

  const categoryId = callbackData.replace('filter_category_', '');

  // Сохраняем фильтр в сессию
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.search_filters) ctx.session.search_filters = { country: null, category: null };

  ctx.session.search_filters.category = categoryId === 'all' ? null : categoryId;

  await ctx.answerCallbackQuery();

  // Если есть сохраненный запрос - повторяем поиск с новым фильтром
  const query = ctx.session.search_query;
  if (query) {
    await performSearchWithFilters(ctx);
  } else {
    // Возвращаемся к экрану фильтров
    await handleSearchShowFilters(ctx);
  }
}

// Обработчик кнопки "Сбросить фильтры"
export async function handleSearchClearFilters(ctx: BotContext) {
  // Очищаем фильтры
  if (ctx.session?.search_filters) {
    ctx.session.search_filters = { country: null, category: null };
  }

  await ctx.answerCallbackQuery();

  // Если есть сохраненный запрос - повторяем поиск без фильтров
  const query = ctx.session?.search_query;
  if (query) {
    await performSearchWithFilters(ctx);
  } else {
    // Возвращаемся к экрану фильтров
    await handleSearchShowFilters(ctx);
  }
}

// Обработчик пагинации поиска - предыдущая страница
export async function handleSearchPagePrev(ctx: BotContext) {
  if (!ctx.session?.search_results) {
    await ctx.answerCallbackQuery(ctx.t('errors.search_results_not_found'));
    return;
  }

  const currentPage = ctx.session.search_page || 1;
  const newPage = Math.max(1, currentPage - 1);

  ctx.session.search_page = newPage;

  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();
  await showSearchResults(
    ctx,
    lang,
    ctx.session.search_query!,
    ctx.session.search_results,
    newPage,
    true
  );
}

// Обработчик пагинации поиска - следующая страница
export async function handleSearchPageNext(ctx: BotContext) {
  if (!ctx.session?.search_results) {
    await ctx.answerCallbackQuery(ctx.t('errors.search_results_not_found'));
    return;
  }

  const currentPage = ctx.session.search_page || 1;
  const newPage = currentPage + 1;

  ctx.session.search_page = newPage;

  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  await ctx.answerCallbackQuery();
  await showSearchResults(
    ctx,
    lang,
    ctx.session.search_query!,
    ctx.session.search_results,
    newPage,
    true
  );
}

// Обработчик клика на счетчик страниц (ничего не делает)
export async function handleSearchPageCurrent(ctx: BotContext) {
  await ctx.answerCallbackQuery();
}

// Обработчик клика на заголовок страны (ничего не делает)
export async function handleSearchCountryHeader(ctx: BotContext) {
  await ctx.answerCallbackQuery();
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

// Показать результаты поиска
async function showSearchResults(
  ctx: BotContext,
  lang: 'en' | 'ru',
  query: string,
  results: any[],
  page: number,
  isEdit: boolean = false
) {
  if (results.length === 0) {
    const message = [
      translate(lang, 'search.no_results', { query }),
      '',
      translate(lang, 'search.no_results_hint'),
    ].join('\n');

    if (isEdit) {
      await ctx.editMessageText(message, {
        reply_markup: createNoResultsKeyboard(lang),
      });
    } else {
      await ctx.reply(message, {
        reply_markup: createNoResultsKeyboard(lang),
      });
    }
    return;
  }

  // Применяем пагинацию
  const { items: rulesPage, currentPage, totalPages } = paginate(results, page, 10);

  // Формируем сообщение
  const pageInfo = totalPages > 1 ? `\n${formatPageCounter(currentPage, totalPages, lang)}` : '';
  const message = [
    translate(lang, 'search.results_title', { query }),
    translate(lang, 'search.results_count', { count: results.length.toString() }),
    pageInfo,
  ].join('\n');

  if (isEdit) {
    await ctx.editMessageText(message, {
      reply_markup: createSearchResultsKeyboard(rulesPage, currentPage, totalPages, lang),
    });
  } else {
    await ctx.reply(message, {
      reply_markup: createSearchResultsKeyboard(rulesPage, currentPage, totalPages, lang),
    });
  }
}

// Выполнить поиск с текущими фильтрами
async function performSearchWithFilters(ctx: BotContext) {
  const userId = ctx.from?.id;
  const query = ctx.session?.search_query;

  if (!userId || !query) return;

  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  try {
    const filters = ctx.session?.search_filters || { country: null, category: null };

    // Выполняем поиск с фильтрами
    const results = await ruleRepository.searchRules(
      query,
      filters.country || undefined,
      filters.category || undefined,
      50
    );

    // Сохраняем новые результаты
    if (ctx.session) {
      ctx.session.search_results = results;
      ctx.session.search_page = 1;
    }

    await ctx.answerCallbackQuery();
    await showSearchResults(ctx, lang, query, results, 1, true);
  } catch (error) {
    logger.error('Ошибка при поиске правил с фильтрами:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: ctx.from?.id,
      query,
    });
    await ctx.answerCallbackQuery(ctx.t('errors.search_error'));
  }
}
