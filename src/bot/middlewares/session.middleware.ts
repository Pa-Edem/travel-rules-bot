// src/bot/middlewares/session.middleware.ts

/**
 * Session Middleware - Упрощенная версия
 */

import { Middleware } from 'grammy';
import { BotContext } from '../../types/index.js';
import { sessionRepository } from '../../database/repositories/SessionRepository.js';

export function sessionMiddleware(): Middleware<BotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    // Загружаем сессию
    ctx.session = await sessionRepository.get(userId);

    // ВЫПОЛНЯЕМ обработчик
    await next();

    // Сохраняем сессию
    if (ctx.session) {
      await sessionRepository.set(userId, ctx.session);
    }
  };
}
