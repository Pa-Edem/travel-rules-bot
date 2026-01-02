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
import { ruleRepository, Rule } from '../../../database/repositories/RuleRepository.js';

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
 * Обработчик выбора категории
 * Показывает список правил для выбранной страны и категории
 */
/**
 * Обработчик выбора категории
 * Показывает список правил для выбранной страны и категории
 */
export async function handleCategorySelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !ctx.session) return;

  const categoryId = callbackData.replace('category_', '');
  const countryCode = ctx.session.current_country;

  if (!countryCode) {
    await ctx.answerCallbackQuery('⚠️ Ошибка: страна не выбрана');
    return;
  }

  // Сохраняем выбранную категорию в сессию
  ctx.session.current_category = categoryId;

  try {
    // Получаем язык пользователя
    const user = await userRepository.findById(ctx.from!.id);
    const lang = (user?.language_code as 'en' | 'ru') || 'en';

    // Загружаем правила из БД
    const rules = await ruleRepository.getRulesByCountryAndCategory(countryCode, categoryId);

    // Получаем названия страны и категории
    const country = COUNTRIES.find((c) => c.code === countryCode);
    const category = CATEGORIES.find((c) => c.id === categoryId);

    const countryName = lang === 'ru' ? country?.name_ru : country?.name_en;
    const categoryName = lang === 'ru' ? category?.name_ru : category?.name_en;

    if (rules.length === 0) {
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
    } else {
      // Показываем список правил
      const message = translate(lang, 'navigation.rules.list_title', {
        country: `${country?.emoji} ${countryName}`,
        category: `${category?.emoji} ${categoryName}`,
        count: rules.length.toString(),
      });

      await ctx.editMessageText(message, {
        reply_markup: createRulesListKeyboard(rules, lang),
      });
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('❌ Ошибка при загрузке правил:', error);
    await ctx.answerCallbackQuery('❌ Ошибка при загрузке правил');
  }
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

/**
 * Обработчик просмотра правила
 * Показывает полную информацию о правиле
 */
export async function handleRuleView(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) return;

  const ruleId = callbackData.replace('rule_', '');

  try {
    // Получаем правило из БД
    const rule = await ruleRepository.getRuleById(ruleId);

    if (!rule) {
      await ctx.answerCallbackQuery('❌ Правило не найдено');
      return;
    }

    // Увеличиваем счетчик просмотров
    await ruleRepository.incrementViews(ruleId);

    // Получаем язык пользователя
    const user = await userRepository.findById(ctx.from!.id);
    const lang = (user?.language_code as 'en' | 'ru') || 'en';

    // Формируем текст правила
    const message = formatRuleMessage(rule, lang);

    // Отправляем сообщение
    await ctx.editMessageText(message, {
      reply_markup: createRuleViewKeyboard(lang),
      parse_mode: 'HTML',
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('❌ Ошибка при просмотре правила:', error);
    await ctx.answerCallbackQuery('❌ Ошибка при загрузке правила');
  }
}

/**
 * Форматирование сообщения с правилом
 */
function formatRuleMessage(rule: Rule, lang: 'en' | 'ru'): string {
  const content = rule.content[lang];
  const severityEmoji = getSeverityEmoji(rule.severity);
  const severityText = getSeverityText(rule.severity, lang);

  let message = `${severityEmoji} <b>${content.title}</b>\n\n`;
  message += `📊 ${lang === 'en' ? 'Severity' : 'Серьезность'}: ${severityText}\n\n`;
  message += `📝 ${content.description}\n\n`;

  if (content.details) {
    message += `ℹ️ <b>${lang === 'en' ? 'Details' : 'Подробности'}:</b>\n${content.details}\n\n`;
  }

  // Штрафы
  if (rule.fine_min && rule.fine_max) {
    const fineLabel = lang === 'en' ? 'Fine' : 'Штраф';
    message += `💰 <b>${fineLabel}:</b> ${rule.fine_min}-${rule.fine_max} ${rule.fine_currency}\n\n`;
  }

  // Источники
  if (rule.sources && rule.sources.length > 0) {
    message += `📚 <b>${lang === 'en' ? 'Sources' : 'Источники'}:</b>\n`;
    rule.sources.forEach((source, index) => {
      message += `${index + 1}. <a href="${source.url}">${source.title}</a>\n`;
    });
  }

  return message;
}

/**
 * Получить текст для уровня серьезности
 */
function getSeverityText(severity: string, lang: 'en' | 'ru'): string {
  const texts = {
    critical: { en: 'Critical ⛔', ru: 'Критично ⛔' },
    high: { en: 'High ⚠️', ru: 'Высокий ⚠️' },
    medium: { en: 'Medium ⚡', ru: 'Средний ⚡' },
    low: { en: 'Low ℹ️', ru: 'Низкий ℹ️' },
  };

  return texts[severity as keyof typeof texts]?.[lang] || severity;
}

/**
 * Получить эмодзи для уровня серьезности
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}
