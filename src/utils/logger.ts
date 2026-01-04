// src/utils/logger.ts

/**
 * Централизованная система логирования на основе Winston
 *
 * Используется для записи всех событий, ошибок и отладочной информации.
 * Логи записываются одновременно в консоль и в файлы с автоматической ротацией.
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Определяем текущую среду выполнения
 * В development показываем больше деталей, в production — только важное
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Определяем уровень логирования
 * - development: 'debug' (показываем всё)
 * - production: 'info' (только важные события и ошибки)
 */
const logLevel = isDevelopment ? 'debug' : 'info';

/**
 * Создаём кастомный формат для консоли (красиво и читаемо)
 * Пример вывода:
 * 2026-01-04 15:30:45 [INFO]: Пользователь зарегистрировался {"userId":123456}
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(), // Цветной вывод (error=красный, warn=жёлтый, info=зелёный)
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Формируем строку лога
    let log = `${timestamp} [${level}]: ${message}`;

    // Если есть дополнительные данные (userId, error и т.д.), добавляем их
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

/**
 * Создаём формат для файлов (JSON для удобного парсинга)
 * Пример записи в файле:
 * {"timestamp":"2026-01-04T15:30:45.123Z","level":"info","message":"Пользователь зарегистрировался","userId":123456}
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json() // JSON формат — легко парсить программно
);

/**
 * Настройка транспорта для ротации файлов с ОШИБКАМИ
 * Создаёт файлы вида: error-2026-01-04.log
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join('logs', 'error-%DATE%.log'), // %DATE% заменится на текущую дату
  datePattern: 'YYYY-MM-DD', // Формат даты в имени файла
  level: 'error', // Записываем только ошибки
  maxSize: '20m', // Максимальный размер одного файла: 20 мегабайт
  maxFiles: '14d', // Хранить файлы за последние 14 дней
  format: fileFormat,
});

/**
 * Настройка транспорта для ротации файлов со ВСЕМИ логами
 * Создаёт файлы вида: combined-2026-01-04.log
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join('logs', 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

/**
 * Настройка транспорта для вывода в консоль
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

/**
 * Создаём основной экземпляр logger
 */
const logger = winston.createLogger({
  level: logLevel, // Минимальный уровень логирования (debug или info)

  // Транспорты — куда записывать логи
  transports: [
    consoleTransport, // → В терминал
    errorFileTransport, // → В error-*.log
    combinedFileTransport, // → В combined-*.log
  ],

  // Обработка исключений (непойманные ошибки)
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'exceptions.log'),
    }),
  ],

  // Обработка отклонённых промисов (unhandled promise rejections)
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'rejections.log'),
    }),
  ],
});

/**
 * В development режиме добавляем дополнительную информацию в логи
 */
if (isDevelopment) {
  logger.debug('Logger инициализирован в development режиме');
  logger.debug(`Уровень логирования: ${logLevel}`);
  logger.debug(`Логи сохраняются в: ${path.join(process.cwd(), 'logs')}`);
}

/**
 * Экспортируем logger для использования в других файлах
 *
 * Использование:
 * import { logger } from './utils/logger.js';
 *
 * logger.error('Ошибка!', { userId, error });
 * logger.warn('Предупреждение', { action });
 * logger.info('Информация', { event });
 * logger.debug('Детали', { params });
 */
export { logger };
