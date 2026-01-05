// src/bot/handlers/callbacks/feedback.callbacks.ts

/**
 * Обработчики для кнопок обратной связи 👍/👎
 */

import { logger } from '../../../utils/logger.js';
import { BotContext } from '../../../types/index.js';
import { feedbackRepository } from '../../../database/repositories/FeedbackRepository.js';
import { analyticsRepository } from '../../../database/repositories/AnalyticsRepository.js';

// ОБРАБОТЧИК 1: Кнопка "👍 Полезно"
export async function handleRuleFeedbackHelpful(ctx: BotContext) {
  // Шаг 1: Получаем данные из callback
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  // Проверка безопасности - если нет данных, выходим
  if (!callbackData || !userId) return;

  // Шаг 2: Извлекаем ruleId из callback_data
  // "feedback_helpful_IT_TRANSPORT_001" → "IT_TRANSPORT_001"
  const ruleId = callbackData.replace('feedback_helpful_', '');

  logger.info('Пользователь нажал ПОЛЕЗНО на правило', {
    userId: userId,
    ruleId: ruleId,
  });

  // Шаг 3: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 4: Проверяем - не оставлял ли пользователь уже отзыв на это правило
  const hasExistingFeedback = await feedbackRepository.hasUserFeedbackForRule(userId, ruleId);

  if (hasExistingFeedback) {
    // Уже есть отзыв - показываем уведомление и выходим
    await ctx.answerCallbackQuery(ctx.t('feedback.already_submitted'));
    return; // Выходим из функции
  }

  // Шаг 5: Сохраняем положительный отзыв в БД
  const feedback = await feedbackRepository.submit({
    user_id: userId,
    rule_id: ruleId,
    feedback_type: 'helpful',
    priority: 5, // Средний приоритет (положительные отзывы менее срочны)
  });

  // Шаг 6: Трекаем событие в аналитике
  await analyticsRepository.trackEvent(userId, 'feedback_submitted', {
    rule_id: ruleId,
    type: 'helpful',
  });

  // Шаг 7: Показываем пользователю подтверждение
  // answerCallbackQuery = всплывающее уведомление в Telegram
  await ctx.answerCallbackQuery(ctx.t('feedback.thanks'));

  logger.info('Положительный отзыв сохранён', {
    feedbackId: feedback?.id,
    userId: userId,
    ruleId: ruleId,
  });
}

// ОБРАБОТЧИК 2: Кнопка "👎 Не полезно"
export async function handleRuleFeedbackNotHelpful(ctx: BotContext) {
  // Шаг 1: Получаем данные из callback
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  // Проверка безопасности
  if (!callbackData || !userId) return;

  // Шаг 2: Извлекаем ruleId из callback_data
  const ruleId = callbackData.replace('feedback_not_helpful_', '');

  logger.info('Пользователь нажал НЕ ПОЛЕЗНО на правило', {
    userId: userId,
    ruleId: ruleId,
  });

  // Шаг 3: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 4: Проверяем - не оставлял ли пользователь уже отзыв на это правило
  const hasExistingFeedback = await feedbackRepository.hasUserFeedbackForRule(userId, ruleId);

  if (hasExistingFeedback) {
    // Уже есть отзыв - показываем уведомление и выходим
    await ctx.answerCallbackQuery(ctx.t('feedback.already_submitted'));
    return;
  }

  // Шаг 5: Убираем "часики" на кнопке
  await ctx.answerCallbackQuery();

  // Шаг 6: Сохраняем в сессию что мы ждём текст от пользователя
  if (!ctx.session) ctx.session = {};
  ctx.session.awaiting_feedback_text = ruleId;

  logger.info('Режим ожидания текста включен', {
    userId: userId,
    ruleId: ruleId,
  });

  // Шаг 7: Формируем сообщение с просьбой написать детали
  const promptMessage = [
    ctx.t('feedback.prompt_details_title'),
    '',
    ctx.t('feedback.prompt_details_question'),
    '',
    ctx.t('feedback.prompt_details_instruction'),
  ].join('\n');

  // Шаг 8: Создаём кнопку "Отмена"
  const cancelButton = {
    text: ctx.t('feedback.cancel_button'),
    callback_data: 'feedback_cancel',
  };

  // Шаг 9: Отправляем сообщение с просьбой
  await ctx.reply(promptMessage, {
    reply_markup: {
      inline_keyboard: [[cancelButton]],
    },
    parse_mode: 'HTML',
  });
}

// ОБРАБОТЧИК 3: Обработка текстового сообщения с деталями отзыва
export async function handleFeedbackTextMessage(ctx: BotContext) {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text;

  // Проверка безопасности
  if (!userId || !messageText) return;

  // Проверяем есть ли ruleId в сессии
  const ruleId = ctx.session?.awaiting_feedback_text;

  if (!ruleId) {
    // Это не наш случай - пользователь не в режиме ожидания отзыва
    return;
  }

  logger.info('Получен текстовый отзыв от пользователя', {
    userId: userId,
    ruleId: ruleId,
    messageText: messageText,
  });

  // Шаг 1: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 2: Сохраняем текстовый отзыв в БД
  const feedback = await feedbackRepository.submit({
    user_id: userId,
    rule_id: ruleId,
    feedback_type: 'suggestion', // Тип "suggestion" когда есть текст
    message: messageText, // Сам текст отзыва
    user_contact: ctx.from.username || null, // Username пользователя (на будущее)
    priority: 2, // Высокий приоритет - есть конкретное описание проблемы
  });

  logger.info('Текстовый отзыв сохранён', {
    feedbackId: feedback?.id,
    userId: userId,
    ruleId: ruleId,
  });

  // Шаг 3: Трекаем событие в аналитике
  await analyticsRepository.trackEvent(userId, 'feedback_submitted', {
    rule_id: ruleId,
    type: 'suggestion_with_text',
  });

  // Шаг 4: ОЧИЩАЕМ сессию - больше не ждём текст
  if (ctx.session?.awaiting_feedback_text) {
    delete ctx.session.awaiting_feedback_text;
  }

  logger.info('Режим ожидания текста выключен', {
    userId: userId,
  });

  // Шаг 5: Благодарим пользователя
  await ctx.reply(ctx.t('feedback.thanks_detailed'));
}

// ОБРАБОТЧИК 4: Отмена ввода текстового отзыва
export async function handleFeedbackCancel(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Получаем ruleId из сессии (для какого правила отменяем)
  const ruleId = ctx.session?.awaiting_feedback_text;

  logger.info('Пользователь отменил ввод отзыва', {
    userId: userId,
    ruleId: ruleId,
  });

  // Шаг 1: Получаем язык пользователя - отменено, не нужно здесь

  // ════════════════════════════════════════════════════════════════
  // ✨ НОВОЕ: Сохраняем отзыв "not_helpful" БЕЗ текста
  // Потому что пользователь нажал 👎 но не захотел писать детали
  // ════════════════════════════════════════════════════════════════

  if (ruleId) {
    // Сохраняем отзыв в БД
    const feedback = await feedbackRepository.submit({
      user_id: userId,
      rule_id: ruleId,
      feedback_type: 'not_helpful',
      message: null, // Нет текста - пользователь отказался писать
      priority: 5, // Средний приоритет (нет деталей)
    });

    logger.info('Отзыв "not_helpful" сохранён (без текста)', {
      feedbackId: feedback?.id,
      userId: userId,
      ruleId: ruleId,
    });

    // Трекаем событие в аналитике
    await analyticsRepository.trackEvent(userId, 'feedback_submitted', {
      rule_id: ruleId,
      type: 'not_helpful_without_text',
    });
  }

  // Шаг 2: ОЧИЩАЕМ сессию
  if (ctx.session?.awaiting_feedback_text) {
    delete ctx.session.awaiting_feedback_text;
  }

  logger.info('Режим ожидания текста выключен', {
    userId: userId,
  });

  // Шаг 3: Убираем часики на кнопке
  await ctx.answerCallbackQuery();

  // Шаг 4: Удаляем сообщение с кнопкой "Отмена"
  try {
    await ctx.deleteMessage();
  } catch (error) {
    // Иногда сообщение уже удалено - игнорируем ошибку
    logger.warn('Не удалось удалить сообщение с кнопкой Отмена', {
      userId: userId,
    });
  }

  // Шаг 5: Показываем подтверждение
  await ctx.reply(ctx.t('feedback.thanks'));
}

// ОБРАБОТЧИК 5: Открыть диалог общего отзыва
export async function handleSettingsFeedback(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь открыл диалог общего отзыва', {
    userId: userId,
  });

  // Шаг 1: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 2: Включаем режим ожидания общего отзыва
  if (!ctx.session) ctx.session = {};
  ctx.session.awaiting_general_feedback = true;

  logger.info('Режим ожидания общего отзыва включен', {
    userId: userId,
  });

  // Шаг 3: Убираем часики на кнопке
  await ctx.answerCallbackQuery();

  // Шаг 4: Формируем сообщение с просьбой написать отзыв
  const promptMessage = [
    ctx.t('feedback.general_title'),
    '',
    ctx.t('feedback.general_prompt'),
    '',
    ctx.t('feedback.general_importance'),
    '',
    ctx.t('feedback.general_instruction'),
  ].join('\n');

  // Шаг 5: Создаём кнопку "Отмена"
  const cancelButton = {
    text: ctx.t('feedback.cancel_button'),
    callback_data: 'general_feedback_cancel',
  };

  // Шаг 6: Отправляем сообщение
  await ctx.reply(promptMessage, {
    reply_markup: {
      inline_keyboard: [[cancelButton]],
    },
    parse_mode: 'HTML',
  });
}

// ОБРАБОТЧИК 6: Обработка текста общего отзыва
export async function handleGeneralFeedbackMessage(ctx: BotContext) {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text;

  // Проверка безопасности
  if (!userId || !messageText) return;

  logger.info('Получен общий отзыв от пользователя', {
    userId: userId,
    messageText: messageText,
  });

  // Шаг 1: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 2: Сохраняем общий отзыв в БД
  const feedback = await feedbackRepository.submit({
    user_id: userId,
    rule_id: null, // NULL = общий отзыв о боте, не о конкретном правиле
    feedback_type: 'general',
    message: messageText,
    user_contact: ctx.from.username || null,
    priority: 4, // Средне-высокий приоритет
  });

  logger.info('Общий отзыв сохранён', {
    feedbackId: feedback?.id,
    userId: userId,
  });

  // Шаг 3: Трекаем событие в аналитике
  await analyticsRepository.trackEvent(userId, 'feedback_submitted', {
    type: 'general',
    source: 'settings',
  });

  // Шаг 4: ОЧИЩАЕМ сессию
  if (ctx.session) {
    delete ctx.session.awaiting_general_feedback;
  }

  logger.info('Режим ожидания общего отзыва выключен', {
    userId: userId,
  });

  // Шаг 5: Благодарим пользователя
  await ctx.reply(ctx.t('feedback.general_thanks'));
}

// ОБРАБОТЧИК 7: Отмена общего отзыва
export async function handleGeneralFeedbackCancel(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь отменил общий отзыв', {
    userId: userId,
  });

  // Шаг 1: Получаем язык пользователя - отменено, не нужно здесь

  // Шаг 2: ОЧИЩАЕМ сессию
  if (ctx.session) {
    delete ctx.session.awaiting_general_feedback;
  }

  logger.info('Режим ожидания общего отзыва выключен', {
    userId: userId,
  });

  // Шаг 3: Убираем часики на кнопке
  await ctx.answerCallbackQuery();

  // Шаг 4: Удаляем сообщение с кнопкой "Отмена"
  try {
    await ctx.deleteMessage();
  } catch (error) {
    logger.warn('Не удалось удалить сообщение', {
      userId: userId,
    });
  }

  // Шаг 5: Показываем подтверждение отмены
  await ctx.reply(ctx.t('feedback.cancelled'));
}
