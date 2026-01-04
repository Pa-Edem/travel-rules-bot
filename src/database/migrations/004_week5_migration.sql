-- =============================================================================
-- Миграция 004: Week 5 - Feedback & Premium Interest
-- Дата: 2026-01-03
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Добавляем поле premium_interested в таблицу users
-- 
-- ЗАЧЕМ: Чтобы запоминать кто нажал "Уведомить меня" о готовности Premium
-- ОТЛИЧИЕ от is_premium: 
--   - is_premium = "У меня ЕСТЬ Premium СЕЙЧАС"
--   - premium_interested = "Я ХОЧУ Premium когда будет готов" (waitlist)
-- -----------------------------------------------------------------------------

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS premium_interested BOOLEAN DEFAULT FALSE;

-- Комментарий для документации
COMMENT ON COLUMN users.premium_interested IS 
'Пользователь в waitlist Premium (нажал "Уведомить меня")';

-- Проверяем что поле добавилось
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'premium_interested'
  ) THEN
    RAISE NOTICE '✅ Поле premium_interested добавлено в users';
  ELSE
    RAISE EXCEPTION '❌ ОШИБКА: Поле premium_interested не создалось!';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Добавляем UNIQUE constraint для защиты от спама в feedback
--
-- ПРОБЛЕМА: Пользователь может нажать 👍 или 👎 много раз на одно правило
-- РЕШЕНИЕ: UNIQUE constraint на (user_id, rule_id) 
--          = один пользователь = один отзыв на правило
-- -----------------------------------------------------------------------------

-- Проверяем, не существует ли уже такой constraint
DO $$ 
BEGIN
  -- Если constraint уже есть - пропускаем
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'feedback_user_rule_unique'
  ) THEN
    RAISE NOTICE 'ℹ️  Constraint feedback_user_rule_unique уже существует (пропускаем)';
  ELSE
    -- Создаём constraint
    ALTER TABLE feedback 
    ADD CONSTRAINT feedback_user_rule_unique 
    UNIQUE (user_id, rule_id);
    
    RAISE NOTICE '✅ Constraint feedback_user_rule_unique создан';
  END IF;
END $$;

-- Комментарий для документации
COMMENT ON CONSTRAINT feedback_user_rule_unique ON feedback IS 
'Защита от спама: один пользователь может оставить только один отзыв на правило';

-- -----------------------------------------------------------------------------
-- 3. Создаём индекс для быстрого поиска заинтересованных в Premium
--
-- ЗАЧЕМ: Чтобы быстро находить всех кто в waitlist
-- ИСПОЛЬЗОВАНИЕ: SELECT * FROM users WHERE premium_interested = TRUE;
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_premium_interested 
ON users(premium_interested) 
WHERE premium_interested = TRUE;

COMMENT ON INDEX idx_users_premium_interested IS 
'Быстрый поиск пользователей в Premium waitlist';

-- -----------------------------------------------------------------------------
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  interested_count INTEGER;
BEGIN
  -- Считаем сколько сейчас заинтересованных (должно быть 0 после миграции)
  SELECT COUNT(*) INTO interested_count 
  FROM users 
  WHERE premium_interested = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Миграция 004 успешно завершена!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Что добавлено:';
  RAISE NOTICE '  ✅ Поле users.premium_interested (BOOLEAN)';
  RAISE NOTICE '  ✅ Constraint feedback_user_rule_unique';
  RAISE NOTICE '  ✅ Индекс idx_users_premium_interested';
  RAISE NOTICE '';
  RAISE NOTICE 'Текущая статистика:';
  RAISE NOTICE '  📊 Пользователей в Premium waitlist: %', interested_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Готово! Можно переходить к коду.';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;