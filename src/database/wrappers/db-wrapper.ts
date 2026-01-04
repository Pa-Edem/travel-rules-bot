// src/database/wrappers/db-wrapper.ts

/**
 * Wrapper для database операций с retry логикой
 *
 * Автоматически повторяет запросы при временных ошибках (timeout, network issues)
 */

import { logger } from '../../utils/logger.js';
import { shouldRetry, classifyDatabaseError } from '../../utils/errors.js';

/**
 * Задержка между попытками (exponential backoff)
 * @param attempt - номер попытки (1, 2, 3...)
 * @returns задержка в миллисекундах
 */
function getRetryDelay(attempt: number): number {
  // 1s, 2s, 4s
  return Math.pow(2, attempt - 1) * 1000;
}

/**
 * Функция ожидания
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Обёртка для database операций с автоматическим retry
 *
 * @param operation - Функция для выполнения (database query)
 * @param maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param operationName - Название операции для логирования
 * @returns Результат операции
 *
 * @example
 * const user = await withRetry(
 *   () => supabase.from('users').select('*').eq('id', userId).single(),
 *   3,
 *   'getUserById'
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'database_operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Пытаемся выполнить операцию
      const result = await operation();

      // Если это первая попытка — просто возвращаем результат
      if (attempt === 1) {
        return result;
      }

      // Если это retry который сработал — логируем успех
      logger.info('Database операция успешна после retry', {
        operation: operationName,
        attempt,
        totalAttempts: maxRetries,
      });

      return result;
    } catch (error: any) {
      lastError = error;

      // Классифицируем ошибку
      const dbError = classifyDatabaseError(error);

      // Проверяем нужно ли делать retry
      if (!shouldRetry(dbError) || attempt === maxRetries) {
        // Если это последняя попытка или ошибка не подлежит retry
        logger.error('Database операция провалилась', {
          operation: operationName,
          attempt,
          totalAttempts: maxRetries,
          error: dbError.message,
          code: 'code' in dbError ? dbError.code : undefined,
          canRetry: shouldRetry(dbError),
        });

        throw dbError;
      }

      // Вычисляем задержку перед следующей попыткой
      const delay = getRetryDelay(attempt);

      logger.warn('Database операция провалилась, делаем retry', {
        operation: operationName,
        attempt,
        totalAttempts: maxRetries,
        error: dbError.message,
        code: 'code' in dbError ? dbError.code : undefined,
        retryAfter: `${delay}ms`,
      });

      // Ждём перед следующей попыткой
      await sleep(delay);
    }
  }

  // Этот код никогда не должен выполниться (мы либо return либо throw в цикле)
  throw lastError;
}

/**
 * Обёртка для операций которые не должны ломать основной функционал
 * Например: увеличение счётчика просмотров, логирование аналитики
 *
 * Если операция упала — логируем warning, но не бросаем ошибку
 *
 * @param operation - Функция для выполнения
 * @param operationName - Название операции для логирования
 *
 * @example
 * await withSilentFail(
 *   () => incrementRuleViews(ruleId),
 *   'incrementViews'
 * );
 */
export async function withSilentFail<T>(
  operation: () => Promise<T>,
  operationName: string = 'non_critical_operation'
): Promise<T | null> {
  try {
    return await operation();
  } catch (error: any) {
    logger.warn('Некритичная операция провалилась', {
      operation: operationName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
