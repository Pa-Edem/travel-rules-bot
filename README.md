# 🌍 Travel Rules Bot

Telegram-бот с проверенной информацией о законах и правилах для путешественников.

## 📋 О проекте

Travel Rules Bot помогает путешественникам избежать штрафов и неприятностей, предоставляя актуальную информацию о местных законах и культурных нормах.

### Основные возможности (MVP)

- 🗺️ **6 стран**: Италия, Турция, ОАЭ, Таиланд, Испания, Германия
- 📂 **5 категорий**: Транспорт, Алкоголь, Дроны, Медикаменты, Культурные нормы
- 🌐 **Двуязычность**: Английский и Русский
- 🔍 **Поиск**: Быстрый поиск по правилам
- 📊 **Аналитика**: Отслеживание популярных запросов

## 🚀 Быстрый старт

### Требования

- Node.js >= 22.18.0
- npm или yarn
- Telegram Bot Token (от [@BotFather](https://t.me/botfather))
- Supabase проект (база данных)

### Установка

1. **Клонируйте репозиторий**

```bash
git clone <your-repo-url>
cd travel-rules-bot
```

2. **Установите зависимости**

```bash
npm install
```

3. **Настройте переменные окружения**

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните `.env` файл своими данными:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_from_botfather

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Environment
NODE_ENV=development
```

4. **Запустите бота в режиме разработки**

```bash
npm run dev
```

Бот должен запуститься и начать слушать команды! 🎉

## 📦 Доступные скрипты

```bash
# Разработка (с hot reload)
npm run dev

# Сборка проекта
npm run build

# Запуск production версии
npm run start

# Проверка кода (linting)
npm run lint
npm run lint:fix

# Форматирование кода
npm run format
npm run format:check
```

## 🗂️ Структура проекта

```
travel-rules-bot/
├── src/
│   ├── bot/                    # Логика бота
│   │   ├── handlers/          # Обработчики команд
│   │   └── middlewares/       # Middleware (i18n, session)
│   ├── database/              # Работа с базой данных
│   │   ├── repositories/      # Repository pattern
│   │   └── migrations/        # SQL миграции
│   ├── locales/               # Переводы
│   │   ├── en/
│   │   └── ru/
│   ├── types/                 # TypeScript типы
│   ├── config/                # Конфигурация
│   └── index.ts               # Точка входа
├── dist/                      # Скомпилированный код
├── .env                       # Переменные окружения (не в Git!)
├── .env.example              # Пример переменных окружения
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Настройка Telegram Bot

### Создание бота

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям (имя бота, username)
4. Скопируйте полученный токен в `.env` файл

### Основные команды BotFather

```
/setdescription - установить описание бота
/setabouttext - текст в разделе "О боте"
/setuserpic - установить аватар бота
/setcommands - установить список команд
```

Пример команд для установки:

```
start - Начать работу с ботом
help - Справка и помощь
```

## 🗄️ Настройка Supabase

### Создание проекта

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь инициализации (~2 минуты)
4. Скопируйте URL и anon key в `.env`

### Создание таблиц

SQL-миграции для создания таблиц будут добавлены в следующих итерациях.

Необходимые таблицы:

- `countries` - страны
- `categories` - категории правил
- `rules` - правила и законы
- `users` - пользователи бота
- `analytics_events` - события аналитики

## 🧪 Тестирование бота

После запуска найдите вашего бота в Telegram и отправьте команду:

```
/start
```

Бот должен ответить приветственным сообщением!

## 📈 Дорожная карта

### ✅ Фаза 1: Setup & Foundation (текущая)

- [x] Инициализация проекта
- [x] Настройка TypeScript, ESLint, Prettier
- [x] Простейший бот с командой /start
- [ ] Подключение к Supabase
- [ ] Создание схемы БД
- [ ] Onboarding flow

### 🔄 Фаза 2: Core Development (недели 3-6)

- [ ] Навигация по странам и категориям
- [ ] Отображение правил
- [ ] Поиск
- [ ] Аналитика

### 📝 Фаза 3: Content Creation (недели 7-9)

- [ ] Написание 360 правил
- [ ] Переводы
- [ ] Верификация источников

### 🚀 Фаза 4: Deployment (недели 10-12)

- [ ] Тестирование
- [ ] Деплой на Railway/Render
- [ ] Запуск для первых пользователей

## 🛠️ Технологический стек

- **Runtime**: Node.js 22.x
- **Language**: TypeScript
- **Bot Framework**: Grammy
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Railway/Render
- **Development**: tsx (hot reload)

## 📄 Лицензия

MIT

## 👨‍💻 Разработка

Проект находится в активной разработке. Вклад приветствуется!

---

**Версия**: 0.1.0 (MVP Development)  
**Статус**: 🚧 В разработке

```
travel-rules-bot
├─ .eslintrc.json
├─ .prettierrc
├─ package.json
├─ README.md
├─ src
│  ├─ bot
│  │  ├─ handlers
│  │  │  ├─ callbacks
│  │  │  └─ commands
│  │  ├─ keyboards
│  │  └─ middlewares
│  ├─ config
│  │  ├─ constants.ts
│  │  ├─ database.ts
│  │  └─ index.ts
│  ├─ database
│  │  ├─ client.ts
│  │  ├─ migrations
│  │  │  └─ 001_initial_schema.sql
│  │  └─ repositories
│  │     └─ UserRepository.ts
│  ├─ index.ts
│  ├─ locales
│  │  ├─ en
│  │  └─ ru
│  └─ types
│     ├─ database.types.ts
│     └─ index.ts
└─ tsconfig.json

```