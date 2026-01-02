// src/bot/handlers/callbacks/onboarding.callbacks.ts

/**
 * Обработчики callback queries для онбординга
 *
 * Callback query - это событие когда пользователь нажимает inline кнопку
 */

import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
import { translate } from '../../utils/translate.helper.js';
import {
  createDisclaimerKeyboard,
  createFullDisclaimerKeyboard,
  createMainMenuKeyboard,
} from '../../keyboards/onboarding.keyboards.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';

/**
 * Обработка выбора языка
 * Показывает КРАТКИЙ disclaimer
 */
export async function handleLanguageSelection(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!callbackData || !userId) return;

  const selectedLang = callbackData === 'lang_en' ? 'en' : 'ru';

  await userRepository.update(userId, {
    language_code: selectedLang,
  });

  // ✅ Трекаем выбор языка
  await analyticsRepository.trackEvent(userId, 'language_selected', {
    language: selectedLang,
  });

  if (!ctx.session) ctx.session = {};
  ctx.session.onboarding_step = 'disclaimer';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  // ✅ Используем helper для перевода
  const title = translate(selectedLang, 'onboarding.disclaimer.title');
  const text = translate(selectedLang, 'onboarding.disclaimer.short_text');
  const message = `${title}\n\n${text}`;

  await ctx.reply(message, {
    reply_markup: createDisclaimerKeyboard(selectedLang),
  });
}

/**
 * Обработка принятия disclaimer
 * Callback data: 'disclaimer_accept'
 */
export async function handleDisclaimerAccept(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  await userRepository.update(userId, {
    onboarding_done: true,
  });

  if (!ctx.session) ctx.session = {};
  ctx.session.onboarding_step = 'completed';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  // ✅ Используем helper
  const welcomeText = [
    translate(lang, 'onboarding.welcome.title'),
    '',
    translate(lang, 'onboarding.welcome.description'),
    '',
    translate(lang, 'onboarding.welcome.instruction'),
    '',
    translate(lang, 'menu.main_title'),
  ].join('\n');

  await ctx.reply(welcomeText, {
    reply_markup: createMainMenuKeyboard(lang),
  });
}

/**
 * Обработка отклонения disclaimer
 * Callback data: 'disclaimer_decline'
 */
export async function handleDisclaimerDecline(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  // ✅ Используем helper
  const declineText = translate(lang, 'onboarding.disclaimer.declined');

  await ctx.reply(declineText);
}

/**
 * Показать полный текст disclaimer
 * Callback data: 'disclaimer_read_full'
 */
export async function handleDisclaimerReadFull(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  // ✅ Используем helper
  const fullText = translate(lang, 'onboarding.disclaimer.full_text');

  await ctx.reply(fullText, {
    reply_markup: createFullDisclaimerKeyboard(lang),
    parse_mode: 'Markdown',
  });
}

/**
 * Вернуться к краткому disclaimer
 * Callback data: 'disclaimer_back'
 */
export async function handleDisclaimerBack(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await userRepository.findById(userId);
  const lang = user?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  // ✅ Используем helper
  const title = translate(lang, 'onboarding.disclaimer.title');
  const text = translate(lang, 'onboarding.disclaimer.short_text');
  const message = `${title}\n\n${text}`;

  await ctx.reply(message, {
    reply_markup: createDisclaimerKeyboard(lang),
  });
}
