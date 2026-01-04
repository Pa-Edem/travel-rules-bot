// test-cache-integration.ts

/**
 * Тест интеграции кэша с RuleRepository
 * Запуск: npx tsx test-cache-integration.ts
 */

import { ruleRepository } from './src/database/repositories/RuleRepository.js';
import { cache } from './src/utils/cache.js';

console.log('🧪 Тестирование интеграции кэша...\n');

async function testPopularRules() {
  console.log('1️⃣ Тест getPopularRules:');

  // Очищаем кэш
  cache.clear();

  console.log('  Первый запрос (из БД):');
  const start1 = Date.now();
  const rules1 = await ruleRepository.getPopularRules(5);
  const time1 = Date.now() - start1;
  console.log(`    ✅ Получено ${rules1.length} правил за ${time1}ms`);

  console.log('\n  Второй запрос (из кэша):');
  const start2 = Date.now();
  const rules2 = await ruleRepository.getPopularRules(5);
  const time2 = Date.now() - start2;
  console.log(`    ✅ Получено ${rules2.length} правил за ${time2}ms`);

  console.log(`\n  Ускорение: ${Math.round(time1 / time2)}x раз!`);

  console.log('\n  Статистика кэша:');
  const stats = cache.getStats();
  console.log(`    Hits: ${stats.hits}`);
  console.log(`    Misses: ${stats.misses}`);
  console.log(`    Hit Rate: ${stats.hitRate}%`);
}

// Запускаем тест
testPopularRules()
  .then(() => {
    console.log('\n✅ Тест завершён!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  });
