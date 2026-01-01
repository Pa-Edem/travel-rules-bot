-- Добавляем поле onboarding_done в таблицу users
-- Это поле показывает, прошёл ли пользователь начальную настройку

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT FALSE;

-- Комментарий для документации
COMMENT ON COLUMN users.onboarding_done IS 'Прошёл ли пользователь онбординг (выбор языка + принятие disclaimer)';

-- Обновляем существующих пользователей (если есть)
UPDATE users 
SET onboarding_done = FALSE 
WHERE onboarding_done IS NULL;

-- Логирование
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция 002: Добавлено поле onboarding_done в таблицу users';
END $$;