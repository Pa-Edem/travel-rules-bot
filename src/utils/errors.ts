// src/utils/errors.ts

/**
 * Кастомные типы ошибок для Travel Rules Bot
 *
 * Эти классы помогают идентифицировать тип ошибки и правильно её обработать.
 */

/**
 * Базовый класс для всех кастомных ошибок
 */
export class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(message: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка работы с базой данных
 *
 * Примеры:
 * - Connection timeout
 * - Query failed
 * - Connection pool exhausted
 */
export class DatabaseError extends AppError {
  public readonly code?: string;
  public readonly operation?: string;

  constructor(message: string, code?: string, operation?: string) {
    super(message, true);
    this.code = code;
    this.operation = operation;
  }
}

/**
 * Ошибка "Запись не найдена"
 *
 * Примеры:
 * - Правило не существует
 * - Пользователь не найден
 */
export class NotFoundError extends AppError {
  public readonly resource: string;
  public readonly code?: string;

  constructor(resource: string, message?: string) {
    super(message || `${resource} not found`, true);
    this.resource = resource;
    this.code = 'NOT_FOUND';
  }
}

/**
 * Ошибка валидации данных
 *
 * Примеры:
 * - Некорректный формат данных
 * - Отсутствует обязательное поле
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, true);
    this.field = field;
  }
}

/**
 * Ошибка Telegram API
 *
 * Примеры:
 * - Message can't be edited
 * - Bot was blocked by user
 * - Message is too old
 */
export class TelegramError extends AppError {
  public readonly code?: number;

  constructor(message: string, code?: number) {
    super(message, true);
    this.code = code;
  }
}

/**
 * Ошибка Rate Limiting
 *
 * Когда пользователь превысил лимит запросов
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number; // секунды

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded', true);
    this.retryAfter = retryAfter;
  }
}

/**
 * Проверка, является ли ошибка операционной (ожидаемой)
 *
 * Операционные ошибки — это нормальные ошибки (not found, validation, etc.)
 * Неоперационные — это баги в коде (undefined is not a function, etc.)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Проверка, нужно ли делать retry для этой ошибки
 */
export function shouldRetry(error: any): boolean {
  // Retry для временных проблем с БД
  if (error instanceof DatabaseError) {
    // Коды ошибок Supabase/PostgreSQL, при которых имеет смысл retry
    const retryableCodes = [
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '57P01', // admin_shutdown
      '57P03', // cannot_connect_now
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];

    return retryableCodes.some((code) => error.code?.includes(code));
  }

  // Retry для network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  return false;
}

/**
 * Извлечение понятного сообщения об ошибке
 */
export function getErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

/**
 * Определение типа ошибки по коду Supabase/PostgreSQL
 */
export function classifyDatabaseError(error: any): DatabaseError | NotFoundError {
  const code = error.code;
  const message = error.message || 'Database error';

  // Not found
  if (code === 'PGRST116') {
    return new NotFoundError('Record', 'Record not found in database');
  }

  // Connection errors
  if (code?.startsWith('08') || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
    return new DatabaseError('Database connection failed', code, 'connect');
  }

  // Query errors
  if (code?.startsWith('42')) {
    return new DatabaseError('Database query error', code, 'query');
  }

  // Constraint violations
  if (code === '23505') {
    return new DatabaseError('Duplicate record', code, 'insert');
  }

  if (code === '23503') {
    return new DatabaseError('Foreign key violation', code, 'insert');
  }

  // Generic database error
  return new DatabaseError(message, code, 'unknown');
}
