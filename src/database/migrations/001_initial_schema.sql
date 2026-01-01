-- =============================================================================
-- Travel Rules Bot - Initial Database Schema
-- Version: 1.0 MVP
-- Created: 2026-01-01
-- =============================================================================

-- Удаляем таблицы если они существуют (для повторного запуска)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS rules CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- =============================================================================
-- СПРАВОЧНЫЕ ТАБЛИЦЫ (LOOKUP TABLES)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Таблица: COUNTRIES (Страны)
-- Назначение: Справочник поддерживаемых стран
-- Записей в MVP: 6
-- -----------------------------------------------------------------------------
CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),  -- ISO код (IT, TR, AE, TH, ES, DE)
  name_en TEXT NOT NULL,                                 -- Название на английском
  name_ru TEXT NOT NULL,                                 -- Название на русском
  emoji TEXT NOT NULL,                                   -- Флаг эмодзи (🇮🇹)
  priority INTEGER DEFAULT 99,                           -- Порядок отображения
  enabled BOOLEAN DEFAULT TRUE,                          -- Включена ли страна
  created_at TIMESTAMP DEFAULT NOW()
);

-- Комментарий для документации
COMMENT ON TABLE countries IS 'Справочник поддерживаемых стран для MVP';
COMMENT ON COLUMN countries.code IS 'ISO 3166-1 alpha-2 код страны';
COMMENT ON COLUMN countries.priority IS 'Порядок отображения (меньше = выше)';

-- Вставляем 6 стран для MVP
INSERT INTO countries (code, name_en, name_ru, emoji, priority) VALUES
  ('IT', 'Italy', 'Италия', '🇮🇹', 1),
  ('TR', 'Turkey', 'Турция', '🇹🇷', 2),
  ('AE', 'UAE', 'ОАЭ', '🇦🇪', 3),
  ('TH', 'Thailand', 'Таиланд', '🇹🇭', 4),
  ('ES', 'Spain', 'Испания', '🇪🇸', 5),
  ('DE', 'Germany', 'Германия', '🇩🇪', 6);

-- -----------------------------------------------------------------------------
-- Таблица: CATEGORIES (Категории правил)
-- Назначение: Справочник категорий для организации правил
-- Записей в MVP: 5
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id TEXT PRIMARY KEY,              -- Уникальный ID (transport, alcohol_smoking, etc.)
  name_en TEXT NOT NULL,            -- Название на английском
  name_ru TEXT NOT NULL,            -- Название на русском
  emoji TEXT NOT NULL,              -- Иконка эмодзи (🚗)
  description_en TEXT,              -- Описание на английском
  description_ru TEXT,              -- Описание на русском
  priority INTEGER DEFAULT 99,     -- Порядок отображения
  enabled BOOLEAN DEFAULT TRUE,    -- Включена ли категория
  created_at TIMESTAMP DEFAULT NOW()
);

-- Комментарий для документации
COMMENT ON TABLE categories IS 'Категории правил (транспорт, алкоголь, дроны и т.д.)';

-- Вставляем 5 категорий для MVP
INSERT INTO categories (id, name_en, name_ru, emoji, priority) VALUES
  ('transport', 'Transport & Driving', 'Транспорт и вождение', '🚗', 1),
  ('alcohol_smoking', 'Alcohol & Smoking', 'Алкоголь и курение', '🍺', 2),
  ('drones', 'Drones', 'Дроны', '🚁', 3),
  ('medications', 'Medications', 'Лекарства', '💊', 4),
  ('cultural', 'Cultural & Religious Norms', 'Культурные и религиозные нормы', '🕌', 5);

-- =============================================================================
-- ОСНОВНЫЕ ТАБЛИЦЫ (CORE TABLES)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Таблица: USERS (Пользователи бота)
-- Назначение: Хранение информации о пользователях Telegram
-- Записей: растёт с каждым новым пользователем
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  -- Идентификация
  id BIGINT PRIMARY KEY,                    -- Telegram User ID (уникальный)
  username TEXT,                            -- @username (может быть NULL)
  first_name TEXT,                          -- Имя пользователя
  last_name TEXT,                           -- Фамилия (опционально)
  
  -- Настройки
  language_code TEXT DEFAULT 'en',          -- Язык интерфейса (en/ru)
  
  -- Premium подписка
  is_premium BOOLEAN DEFAULT FALSE,         -- Есть ли премиум
  premium_until TIMESTAMP,                  -- До какой даты действует премиум
  
  -- Статистика использования
  total_searches INTEGER DEFAULT 0,         -- Сколько раз искал
  total_views INTEGER DEFAULT 0,            -- Сколько правил просмотрел
  
  -- Последняя активность (для аналитики)
  last_country TEXT,                        -- Последняя выбранная страна
  last_category TEXT,                       -- Последняя выбранная категория
  
  -- Временные метки
  created_at TIMESTAMP DEFAULT NOW(),       -- Когда зарегистрировался
  last_active TIMESTAMP DEFAULT NOW(),      -- Последняя активность
  
  -- Мягкое удаление (soft delete)
  deleted_at TIMESTAMP,                     -- NULL = активен, NOT NULL = удалён
  
  -- Ограничения
  CONSTRAINT users_language_check CHECK (language_code IN ('en', 'ru'))
);

-- Комментарии для документации
COMMENT ON TABLE users IS 'Пользователи Telegram-бота';
COMMENT ON COLUMN users.id IS 'Telegram User ID (используется как первичный ключ)';
COMMENT ON COLUMN users.deleted_at IS 'Мягкое удаление: NULL = активен, NOT NULL = удалён';

-- Индексы для быстрого поиска
CREATE INDEX idx_users_language ON users(language_code);
CREATE INDEX idx_users_premium ON users(is_premium, premium_until) WHERE is_premium = TRUE;
CREATE INDEX idx_users_last_active ON users(last_active);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Таблица: SESSIONS (Сессии пользователей)
-- Назначение: Хранение текущего состояния пользователя в боте
-- Записей: по одной на каждого активного пользователя
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
  -- Связь с пользователем
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Данные сессии (гибкая структура)
  data JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Временные метки
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Комментарии для документации
COMMENT ON TABLE sessions IS 'Текущее состояние пользователя в боте (что выбрал, где находится)';
COMMENT ON COLUMN sessions.data IS 'JSON с текущим состоянием: выбранная страна, категория, шаг onboarding и т.д.';

-- Индекс для очистки старых сессий
CREATE INDEX idx_sessions_updated ON sessions(updated_at);

-- Триггер для автообновления updated_at
CREATE OR REPLACE FUNCTION update_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_update_timestamp
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_timestamp();

-- -----------------------------------------------------------------------------
-- Таблица: RULES (Правила и законы)
-- Назначение: Основной контент - правила для путешественников
-- Записей в MVP: 360 (6 стран × 5 категорий × 12 правил)
-- -----------------------------------------------------------------------------
CREATE TABLE rules (
  -- Уникальный идентификатор правила
  id TEXT PRIMARY KEY,  -- Формат: IT_TRANSPORT_001, TR_ALCOHOL_002, etc.
  
  -- Классификация
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  category TEXT NOT NULL REFERENCES categories(id),
  
  -- Область действия (для MVP всегда 'national')
  scope_level TEXT NOT NULL DEFAULT 'national'
    CHECK (scope_level IN ('national', 'regional', 'city', 'landmark')),
  
  -- Серьёзность нарушения
  severity TEXT NOT NULL 
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Штрафы
  fine_min INTEGER,                         -- Минимальный штраф (в евро)
  fine_max INTEGER,                         -- Максимальный штраф (в евро)
  fine_currency CHAR(3) DEFAULT 'EUR',      -- Валюта (ISO 4217)
  fine_additional TEXT,                     -- Доп. инфо о штрафах
  
  -- Контент (мультиязычный) - ГЛАВНОЕ ПОЛЕ!
  content JSONB NOT NULL,
  -- Структура:
  -- {
  --   "en": {
  --     "title": "International Driving Permit Required",
  --     "description": "Brief description...",
  --     "details": "Detailed explanation...",
  --     "exceptions": "Exceptions if any...",
  --     "scope_note": "Where exactly this applies..."
  --   },
  --   "ru": {
  --     "title": "Требуется международное водительское удостоверение",
  --     "description": "Краткое описание...",
  --     ...
  --   }
  -- }
  
  -- Источники (массив ссылок)
  sources JSONB NOT NULL,
  -- Структура:
  -- [
  --   {
  --     "title": "Italian Ministry of Transport",
  --     "url": "https://...",
  --     "type": "official"
  --   },
  --   ...
  -- ]
  
  -- Метаданные
  last_verified_at TIMESTAMP DEFAULT NOW(),  -- Когда последний раз проверяли актуальность
  views INTEGER DEFAULT 0,                   -- Сколько раз просмотрели
  
  -- Полнотекстовый поиск (автогенерируемые поля)
  search_vector_en TSVECTOR,                 -- Индекс для поиска на английском
  search_vector_ru TSVECTOR,                 -- Индекс для поиска на русском
  
  -- Временные метки
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,                      -- Мягкое удаление
  
  -- Проверки
  CONSTRAINT rules_fine_check CHECK (fine_min IS NULL OR fine_max IS NULL OR fine_min <= fine_max)
);

-- Комментарии для документации
COMMENT ON TABLE rules IS 'Правила и законы для путешественников (основной контент бота)';
COMMENT ON COLUMN rules.id IS 'Уникальный код: COUNTRY_CATEGORY_NUMBER (например: IT_TRANSPORT_001)';
COMMENT ON COLUMN rules.content IS 'Мультиязычный контент в формате JSONB';
COMMENT ON COLUMN rules.sources IS 'Массив источников информации';
COMMENT ON COLUMN rules.search_vector_en IS 'Автогенерируемый индекс для полнотекстового поиска (английский)';

-- Индексы для быстрого поиска
CREATE INDEX idx_rules_country ON rules(country_code);
CREATE INDEX idx_rules_category ON rules(category);
CREATE INDEX idx_rules_country_category ON rules(country_code, category);
CREATE INDEX idx_rules_severity ON rules(severity);
CREATE INDEX idx_rules_scope ON rules(scope_level);
CREATE INDEX idx_rules_views ON rules(views DESC);

-- GIN индексы для полнотекстового поиска (самые важные!)
CREATE INDEX idx_rules_search_en ON rules USING GIN(search_vector_en);
CREATE INDEX idx_rules_search_ru ON rules USING GIN(search_vector_ru);

-- GIN индекс для поиска по JSON
CREATE INDEX idx_rules_content ON rules USING GIN(content);

-- Функция для автоматического обновления search vectors
CREATE OR REPLACE FUNCTION update_rule_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаём search vector для английского
  -- Извлекаем title и description из JSONB и объединяем
  NEW.search_vector_en := 
    to_tsvector('english', 
      COALESCE(NEW.content->'en'->>'title', '') || ' ' ||
      COALESCE(NEW.content->'en'->>'description', '') || ' ' ||
      COALESCE(NEW.content->'en'->>'details', '')
    );
  
  -- Создаём search vector для русского
  NEW.search_vector_ru := 
    to_tsvector('russian', 
      COALESCE(NEW.content->'ru'->>'title', '') || ' ' ||
      COALESCE(NEW.content->'ru'->>'description', '') || ' ' ||
      COALESCE(NEW.content->'ru'->>'details', '')
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Комментарий
COMMENT ON FUNCTION update_rule_search_vectors() IS 
  'Автоматически создаёт search vectors для английского и русского языков из JSONB content';

-- Триггер: вызывается при INSERT или UPDATE правила
CREATE TRIGGER rules_search_update
  BEFORE INSERT OR UPDATE OF content ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_search_vectors();

-- -----------------------------------------------------------------------------
-- Таблица: ANALYTICS_EVENTS (События аналитики)
-- Назначение: Отслеживание действий пользователей для аналитики
-- Записей: растёт быстро (каждое действие = запись)
-- -----------------------------------------------------------------------------
CREATE TABLE analytics_events (
  -- Идентификатор события
  id SERIAL PRIMARY KEY,
  
  -- Связь с пользователем (может быть NULL для анонимных событий)
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Тип события
  event_type TEXT NOT NULL,
  -- Возможные значения:
  -- 'user_started', 'language_selected', 'country_selected',
  -- 'category_selected', 'rule_viewed', 'search_performed',
  -- 'feedback_submitted', 'premium_purchased', etc.
  
  -- Дополнительные данные о событии
  event_data JSONB,
  -- Примеры:
  -- {"country": "IT", "category": "transport"}
  -- {"rule_id": "IT_TRANSPORT_001", "search_query": "driving"}
  -- {"feedback_type": "helpful", "rule_id": "..."}
  
  -- Временная метка
  created_at TIMESTAMP DEFAULT NOW()
);

-- Комментарии
COMMENT ON TABLE analytics_events IS 'События пользователей для аналитики и улучшения бота';
COMMENT ON COLUMN analytics_events.event_type IS 'Тип события (user_started, rule_viewed и т.д.)';
COMMENT ON COLUMN analytics_events.event_data IS 'Дополнительные данные о событии в JSON формате';

-- Индексы для аналитики
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_data ON analytics_events USING GIN(event_data);

-- -----------------------------------------------------------------------------
-- Таблица: FEEDBACK (Отзывы и отчёты)
-- Назначение: Сбор обратной связи от пользователей
-- Записей: растёт медленно (только когда пользователь оставляет отзыв)
-- -----------------------------------------------------------------------------
CREATE TABLE feedback (
  -- Идентификатор отзыва
  id SERIAL PRIMARY KEY,
  
  -- Кто оставил отзыв
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  
  -- О каком правиле отзыв (может быть NULL для общего отзыва)
  rule_id TEXT REFERENCES rules(id) ON DELETE SET NULL,
  
  -- Тип отзыва
  feedback_type TEXT NOT NULL
    CHECK (feedback_type IN ('helpful', 'not_helpful', 'outdated', 'incorrect', 'suggestion', 'general')),
  
  -- Сообщение от пользователя
  message TEXT,
  
  -- Контакт для связи (опционально)
  user_contact TEXT,
  
  -- Статус обработки
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  
  -- Приоритет (1 = срочно, 10 = не срочно)
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Кто обработал
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  
  -- Временные метки
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Комментарии
COMMENT ON TABLE feedback IS 'Обратная связь от пользователей (отзывы, жалобы, предложения)';
COMMENT ON COLUMN feedback.feedback_type IS 'helpful = полезно, not_helpful = бесполезно, outdated = устарело';
COMMENT ON COLUMN feedback.priority IS 'Приоритет обработки: 1 (срочно) - 10 (не срочно)';

-- Индексы для админ-панели
CREATE INDEX idx_feedback_status ON feedback(status, priority, created_at);
CREATE INDEX idx_feedback_rule ON feedback(rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX idx_feedback_user ON feedback(user_id) WHERE user_id IS NOT NULL;

-- Триггер для автообновления updated_at
CREATE TRIGGER feedback_update_timestamp
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_timestamp();

-- =============================================================================
-- VIEWS (Представления для удобных запросов)
-- =============================================================================

-- Представление: активные правила (не удалённые)
CREATE VIEW active_rules AS
SELECT * FROM rules WHERE deleted_at IS NULL;

COMMENT ON VIEW active_rules IS 'Все активные (не удалённые) правила';

-- Представление: активные пользователи (не удалённые)
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

COMMENT ON VIEW active_users IS 'Все активные (не удалённые) пользователи';

-- =============================================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =============================================================================

-- Вывод информации о созданных объектах
DO $$
BEGIN
  RAISE NOTICE '✅ База данных успешно инициализирована!';
  RAISE NOTICE '📊 Создано таблиц: 7 (countries, categories, users, sessions, rules, analytics_events, feedback)';
  RAISE NOTICE '📈 Создано индексов: 20+';
  RAISE NOTICE '⚙️  Создано функций: 2';
  RAISE NOTICE '🎯 Создано триггеров: 3';
  RAISE NOTICE '👁️  Создано представлений: 2';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Готово! Можно начинать работу с ботом!';
END $$;