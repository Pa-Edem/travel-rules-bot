// test-cache.ts

/**
 * Тестовый скрипт для проверки Cache
 * Запуск: npx tsx test-cache.ts
 */

import { cache, CacheKeys } from './src/utils/cache.js';

console.log('🧪 Тестирование Cache...\n');

// Тест 1: Базовые операции
console.log('1️⃣ Тест базовых операций:');

cache.set('test_key', { name: 'John', age: 30 }, 10); // TTL 10 секунд
console.log('  ✅ Данные сохранены в кэш');

const data1 = cache.get('test_key');
console.log('  ✅ Данные получены:', data1);

const exists = cache.has('test_key');
console.log('  ✅ Ключ существует:', exists);

// Тест 2: TTL (Time To Live)
console.log('\n2️⃣ Тест TTL:');

cache.set('short_ttl', { test: 'data' }, 2); // TTL 2 секунды
console.log('  Данные сохранены с TTL 2 секунды');

const immediate = cache.get('short_ttl');
console.log('  Сразу после сохранения:', immediate ? '✅ Есть' : '❌ Нет');

console.log('  Ожидание 3 секунды...');
await new Promise((resolve) => setTimeout(resolve, 3000));

const afterTTL = cache.get('short_ttl');
console.log('  После истечения TTL:', afterTTL ? '❌ Есть' : '✅ Нет (корректно)');

// Тест 3: CacheKeys утилита
console.log('\n3️⃣ Тест CacheKeys:');

const popularKey = CacheKeys.popularRules();
console.log('  Popular rules key:', popularKey);

const searchKey = CacheKeys.searchResults('alcohol', 'IT', 'alcohol_smoking');
console.log('  Search key:', searchKey);

const rulesKey = CacheKeys.rulesByCountryCategory('IT', 'transport');
console.log('  Rules by country/category:', rulesKey);

// Тест 4: Статистика
console.log('\n4️⃣ Тест статистики:');

cache.resetStats();

// Генерируем hits и misses
cache.set('stats_test', 'data');
cache.get('stats_test'); // hit
cache.get('stats_test'); // hit
cache.get('non_existent'); // miss

const stats = cache.getStats();
console.log('  Статистика кэша:');
console.log('    Hits:', stats.hits);
console.log('    Misses:', stats.misses);
console.log('    Hit Rate:', stats.hitRate + '%');
console.log('    Size:', stats.size);

// Тест 5: Cleanup
console.log('\n5️⃣ Тест cleanup:');

cache.set('cleanup_test_1', 'data', 1); // Истечёт через 1 секунду
cache.set('cleanup_test_2', 'data', 100); // Долгий TTL

console.log('  Размер до cleanup:', cache.size());
console.log('  Ожидание 2 секунды...');
await new Promise((resolve) => setTimeout(resolve, 2000));

const removed = cache.cleanup();
console.log('  Удалено записей:', removed);
console.log('  Размер после cleanup:', cache.size());

// Тест 6: Массовые операции
console.log('\n6️⃣ Тест массовых операций:');

for (let i = 0; i < 5; i++) {
  cache.set(`rule_${i}`, { id: i, name: `Rule ${i}` }, 60);
}

const keys = cache.keys();
console.log('  Все ключи в кэше:', keys);
console.log('  Размер кэша:', cache.size());

cache.clear();
console.log('  После clear():', cache.size());

console.log('\n✅ Все тесты завершены!');
console.log('\n💡 Статистика кэша:');
const finalStats = cache.getStats();
console.log('  Total requests:', finalStats.hits + finalStats.misses);
console.log('  Hit rate:', finalStats.hitRate + '%');
