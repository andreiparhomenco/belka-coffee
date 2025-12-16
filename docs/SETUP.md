# 🚀 Инструкция по настройке Belka Coffee

## 1. Настройка Supabase

### 1.1 Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите **"New Project"**
3. Заполните:
   - **Name:** belka-coffee
   - **Database Password:** (сохраните его!)
   - **Region:** выберите ближайший (например, Europe - Frankfurt)
4. Нажмите **"Create new project"**
5. Ожидайте ~2 минуты пока проект инициализируется

### 1.2 Получение API Keys

1. В панели Supabase откройте **Settings → API**
2. Скопируйте:
   - **Project URL** → это будет `VITE_SUPABASE_URL`
   - **anon public** key → это будет `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → это будет `SUPABASE_SERVICE_ROLE_KEY` (храните в секрете!)

3. Добавьте эти значения в `frontend/.env`:

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 Применение миграций

```bash
# Установить Supabase CLI (если ещё не установлен)
npm install -g supabase

# Логин
supabase login

# Связать проект (вместо your-project-ref укажите ваш ID проекта)
supabase link --project-ref your-project-ref

# Применить миграции (будет доступно на Этапе 1)
supabase db push
```

---

## 2. Настройка Telegram Bot

### 2.1 Создание бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   ```
   Вы: /newbot
   BotFather: Alright, a new bot. How are we going to call it?
   
   Вы: Belka Coffee Bot
   BotFather: Good. Now let's choose a username for your bot.
   
   Вы: belka_coffee_bot (должен заканчиваться на _bot)
   BotFather: Done! Congratulations on your new bot.
   ```

4. BotFather отправит вам **Token**. Сохраните его!
   ```
   Use this token to access the HTTP API:
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

5. Добавьте в `.env`:
   ```env
   VITE_BOT_USERNAME=belka_coffee_bot
   BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

### 2.2 Настройка Menu Button (после деплоя)

После того как задеплоите frontend на Vercel, вернитесь к BotFather:

```
/setmenubutton
→ выберите вашего бота
→ URL: https://your-app.vercel.app
→ Text: Открыть приложение
```

### 2.3 Настройка команд

```
/setcommands
→ выберите вашего бота
→ отправьте:

start - Запустить приложение
help - Помощь
availability - Моя доступность
schedule - Мой график
salary - Моя зарплата
```

---

## 3. Настройка Vercel

### 3.1 Создание проекта

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите **"Add New..." → Project**
3. Импортируйте репозиторий с GitHub
4. Настройте:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3.2 Environment Variables

В настройках проекта добавьте:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_BOT_USERNAME = belka_coffee_bot
```

### 3.3 Deploy

1. Нажмите **"Deploy"**
2. Ожидайте ~2 минуты
3. Получите URL (например, `belka-coffee.vercel.app`)
4. Вернитесь в BotFather и настройте Menu Button (см. п. 2.2)

---

## 4. Локальная разработка

### 4.1 Запуск Frontend

```bash
cd frontend
npm run dev
```

Откройте: http://localhost:5173

### 4.2 Локальный Supabase (опционально)

```bash
supabase start
```

Это запустит локальную версию Supabase на портах:
- API: http://localhost:54321
- Studio: http://localhost:54323
- PostgreSQL: localhost:54322

### 4.3 Тестирование

```bash
cd frontend

# Unit тесты
npm run test

# С UI
npm run test:ui

# Coverage
npm run test:coverage
```

---

## 5. Проверка настройки

### ✅ Checklist

- [ ] Supabase проект создан
- [ ] API keys скопированы в `.env`
- [ ] Telegram бот создан
- [ ] Bot Token добавлен в `.env`
- [ ] Frontend запускается локально
- [ ] Vercel проект создан
- [ ] Environment Variables настроены в Vercel
- [ ] Frontend задеплоен на Vercel
- [ ] Menu Button настроен в боте

### 🧪 Тестирование

1. Откройте бота в Telegram
2. Нажмите Menu Button
3. Должно открыться Mini App с вашим приложением

---

## 6. Troubleshooting

### Проблема: "Failed to load env variables"

**Решение:** Проверьте что файл `.env` находится в папке `frontend/` и содержит все необходимые переменные.

### Проблема: "Failed to fetch from Supabase"

**Решение:** 
1. Проверьте правильность `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
2. Проверьте что проект Supabase активен (не спящий режим)
3. Проверьте настройки CORS в Supabase

### Проблема: Telegram Mini App не открывается

**Решение:**
1. Убедитесь что URL в Menu Button правильный (https, не http)
2. Проверьте что сайт доступен (откройте в браузере)
3. Попробуйте перезапустить бота: `/start`

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте [документацию Supabase](https://supabase.com/docs)
2. Проверьте [документацию Telegram Bot API](https://core.telegram.org/bots/webapps)
3. Создайте issue в репозитории проекта

