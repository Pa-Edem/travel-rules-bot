// src/utils/cache.ts

/**
 * Простая in-memory система кэширования с поддержкой TTL
 *
 * Используется для хранения часто запрашиваемых данных
 * для уменьшения нагрузки на БД и ускорения ответов.
 */

import { logger } from './logger.js';

/**
 * Интерфейс записи в кэше
 */
interface CacheEntry<T> {
  data: T; // Данные
  expiresAt: number; // Timestamp когда запись устаревает
  createdAt: number; // Timestamp когда запись создана
}

/**
 * Статистика кэша
 */
interface CacheStats {
  hits: number; // Количество успешных обращений
  misses: number; // Количество промахов
  size: number; // Текущий размер кэша
}

/**
 * Класс для работы с кэшем
 */
class Cache {
  private store: Map<string, CacheEntry<any>>;
  private stats: CacheStats;

  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
    };

    logger.debug('Cache initialized');
  }

  /**
   * Получить данные из кэша
   *
   * @param key - Ключ
   * @returns Данные или null если не найдено / устарело
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    // Нет в кэше
    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Проверяем TTL
    const now = Date.now();
    if (now > entry.expiresAt) {
      // Данные устарели
      this.store.delete(key);
      this.stats.size = this.store.size;
      this.stats.misses++;

      logger.debug('Cache expired', {
        key,
        age: Math.round((now - entry.createdAt) / 1000) + 's',
      });

      return null;
    }

    // Данные свежие
    this.stats.hits++;

    logger.debug('Cache hit', {
      key,
      age: Math.round((now - entry.createdAt) / 1000) + 's',
      ttl: Math.round((entry.expiresAt - now) / 1000) + 's',
    });

    return entry.data as T;
  }

  /**
   * Сохранить данные в кэш
   *
   * @param key - Ключ
   * @param data - Данные для сохранения
   * @param ttlSeconds - Время жизни в секундах (по умолчанию 3600 = 1 час)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 3600): void {
    const now = Date.now();

    this.store.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    });

    this.stats.size = this.store.size;

    logger.debug('Cache set', {
      key,
      ttl: ttlSeconds + 's',
      size: this.stats.size,
    });
  }

  /**
   * Удалить данные из кэша
   *
   * @param key - Ключ
   * @returns true если запись была удалена, false если её не было
   */
  delete(key: string): boolean {
    const deleted = this.store.delete(key);

    if (deleted) {
      this.stats.size = this.store.size;
      logger.debug('Cache delete', { key });
    }

    return deleted;
  }

  /**
   * Проверить существует ли ключ в кэше
   *
   * @param key - Ключ
   * @returns true если ключ существует и не устарел
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    this.stats.size = 0;

    logger.info('Cache cleared', { removedEntries: size });
  }

  /**
   * Очистить устаревшие записи
   * Удаляет все записи с истёкшим TTL
   *
   * @returns Количество удалённых записей
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.stats.size = this.store.size;

      logger.debug('Cache cleanup completed', {
        removedEntries: removedCount,
        remainingEntries: this.store.size,
      });
    }

    return removedCount;
  }

  /**
   * Получить статистику кэша
   *
   * @returns Статистика (hits, misses, size, hit rate)
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100, // Округляем до 2 знаков
    };
  }

  /**
   * Сбросить статистику
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    logger.debug('Cache stats reset');
  }

  /**
   * Получить все ключи в кэше
   *
   * @returns Массив ключей
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Получить размер кэша (количество записей)
   *
   * @returns Количество записей в кэше
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Singleton экземпляр кэша
 */
export const cache = new Cache();

/**
 * Запуск автоматической очистки устаревших записей
 * Вызывается при инициализации бота
 *
 * @param intervalMinutes - Интервал очистки в минутах (по умолчанию 10)
 */
export function startCacheCleanup(intervalMinutes: number = 10): NodeJS.Timeout {
  const interval = setInterval(
    () => {
      cache.cleanup();
    },
    intervalMinutes * 60 * 1000
  );

  logger.info('Cache cleanup scheduler started', {
    interval: `${intervalMinutes} minutes`,
  });

  return interval;
}

/**
 * Утилита для создания кэш-ключей
 * Помогает избежать коллизий и делает ключи читаемыми
 */
export const CacheKeys = {
  /**
   * Ключ для популярных правил
   */
  popularRules: () => 'popular_rules',

  /**
   * Ключ для правил страны и категории
   */
  rulesByCountryCategory: (country: string, category: string) => `rules:${country}:${category}`,

  /**
   * Ключ для результатов поиска
   */
  searchResults: (query: string, country?: string, category?: string) => {
    const parts = ['search', query];
    if (country) parts.push(country);
    if (category) parts.push(category);
    return parts.join(':');
  },

  /**
   * Ключ для статистики пользователя
   */
  userStats: (userId: number) => `user_stats:${userId}`,
};
