// src/bot/handlers/callbacks/feedback.callbacks.ts

/**
 * Обработчики для кнопок обратной связи 👍/👎
 */

import { logger } from '../../../utils/logger.js';
import { BotContext } from '../../../types/index.js';
import { userRepository } from '../../../database/repositories/UserRepository.js';
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

  // Шаг 3: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 4: Проверяем - не оставлял ли пользователь уже отзыв на это правило
  const hasExistingFeedback = await feedbackRepository.hasUserFeedbackForRule(userId, ruleId);

  if (hasExistingFeedback) {
    // Уже есть отзыв - показываем уведомление и выходим
    await ctx.answerCallbackQuery(
      lang === 'ru'
        ? 'ℹ️ Вы уже оставляли отзыв на это правило'
        : 'ℹ️ You already left feedback for this rule'
    );
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
  await ctx.answerCallbackQuery(
    lang === 'ru' ? '✅ Спасибо за отзыв!' : '✅ Thanks for your feedback!'
  );

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

  // Шаг 3: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 4: Проверяем - не оставлял ли пользователь уже отзыв на это правило
  const hasExistingFeedback = await feedbackRepository.hasUserFeedbackForRule(userId, ruleId);

  if (hasExistingFeedback) {
    // Уже есть отзыв - показываем уведомление и выходим
    await ctx.answerCallbackQuery(
      lang === 'ru'
        ? 'ℹ️ Вы уже оставляли отзыв на это правило'
        : 'ℹ️ You already left feedback for this rule'
    );
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
  const promptMessage =
    lang === 'ru'
      ? [
          '📝 <b>Спасибо за отзыв!</b>',
          '',
          'Хотите рассказать подробнее что не так?',
          '',
          'Просто напишите сообщение, или нажмите "Отмена" чтобы пропустить.',
        ].join('\n')
      : [
          '📝 <b>Thanks for your feedback!</b>',
          '',
          "Would you like to tell us more about what's wrong?",
          '',
          'Just send a message, or click "Cancel" to skip.',
        ].join('\n');

  // Шаг 8: Создаём кнопку "Отмена"
  const cancelButton =
    lang === 'ru'
      ? { text: '❌ Отмена', callback_data: 'feedback_cancel' }
      : { text: '❌ Cancel', callback_data: 'feedback_cancel' };

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

  // Шаг 1: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

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
  const thankYouMessage =
    lang === 'ru'
      ? '✅ Спасибо за подробный отзыв! Мы обязательно учтём ваши замечания.'
      : '✅ Thanks for the detailed feedback! We will definitely consider your comments.';

  await ctx.reply(thankYouMessage);
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

  // Шаг 1: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

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
  const message = lang === 'ru' ? '✅ Спасибо за отзыв!' : '✅ Thanks for your feedback!';

  await ctx.reply(message);
}

// ОБРАБОТЧИК 5: Открыть диалог общего отзыва
export async function handleSettingsFeedback(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь открыл диалог общего отзыва', {
    userId: userId,
  });

  // Шаг 1: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

  // Шаг 2: Включаем режим ожидания общего отзыва
  if (!ctx.session) ctx.session = {};
  ctx.session.awaiting_general_feedback = true;

  logger.info('Режим ожидания общего отзыва включен', {
    userId: userId,
  });

  // Шаг 3: Убираем часики на кнопке
  await ctx.answerCallbackQuery();

  // Шаг 4: Формируем сообщение с просьбой написать отзыв
  const promptMessage =
    lang === 'ru'
      ? [
          '💬 <b>Оставить отзыв о боте</b>',
          '',
          'Расскажите что вам нравится или что можно улучшить.',
          '',
          'Ваше мнение очень важно для нас! 🙏',
          '',
          'Просто напишите сообщение, или нажмите "Отмена".',
        ].join('\n')
      : [
          '💬 <b>Leave Feedback</b>',
          '',
          'Tell us what you like or what could be improved.',
          '',
          'Your opinion is very important to us! 🙏',
          '',
          'Just send a message, or click "Cancel".',
        ].join('\n');

  // Шаг 5: Создаём кнопку "Отмена"
  const cancelButton =
    lang === 'ru'
      ? { text: '❌ Отмена', callback_data: 'general_feedback_cancel' }
      : { text: '❌ Cancel', callback_data: 'general_feedback_cancel' };

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

  // Шаг 1: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

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
  const thankYouMessage =
    lang === 'ru'
      ? '✅ Спасибо за отзыв! Мы обязательно учтём ваше мнение при развитии бота.'
      : '✅ Thanks for your feedback! We will definitely consider your opinion when developing the bot.';

  await ctx.reply(thankYouMessage);
}

// ОБРАБОТЧИК 7: Отмена общего отзыва
export async function handleGeneralFeedbackCancel(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  logger.info('Пользователь отменил общий отзыв', {
    userId: userId,
  });

  // Шаг 1: Получаем язык пользователя
  const user = await userRepository.findById(userId);
  const lang = (user?.language_code as 'en' | 'ru') || 'en';

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
  const cancelMessage = lang === 'ru' ? '❌ Отменено' : '❌ Cancelled';

  await ctx.reply(cancelMessage);
}
