# 🚀 ДЕПЛОЙ НА VERCEL - ПОШАГОВО

## 📋 План:

1. ✅ Подготовить проект
2. ✅ Задеплоить на Vercel
3. ✅ Настроить @BotFather
4. ✅ Добавить вас как админа
5. ✅ Открыть через Telegram

---

## 🎯 **ШАГ 1: Деплой на Vercel**

### Установить Vercel CLI:

```powershell
npm install -g vercel
```

### Залогиниться:

```powershell
vercel login
```

### Задеплоить:

```powershell
cd D:\Cursor\belka\frontend
vercel
```

**Следуйте инструкциям:**
- Setup and deploy? **Yes**
- Which scope? **Ваш аккаунт**
- Link to existing project? **No**
- Project name? **belka-coffee**
- Directory? **./` (текущая)**
- Override settings? **No**

---

## 🌐 **ШАГ 2: Получить Production URL**

После деплоя вы получите URL типа:
```
https://belka-coffee.vercel.app
```

Или запустите:
```powershell
vercel --prod
```

---

## 🤖 **ШАГ 3: Настроить @BotFather**

### 1. Откройте Telegram → **@BotFather**

### 2. Команда:
```
/mybots
```

### 3. Выберите: `@belka_coffee_bot`

### 4. Bot Settings → Menu Button → Edit menu button URL

### 5. Вставьте ваш Vercel URL:
```
https://belka-coffee.vercel.app
```

### 6. Текст кнопки:
```
Открыть приложение
```

---

## 👤 **ШАГ 4: Добавить себя как админа**

### Вариант А: Через SQL (в Supabase)

1. Откройте: https://supabase.com/dashboard/project/jcrjcglfzrhcghiqfltp
2. SQL Editor → New Query
3. Вставьте:

```sql
INSERT INTO users (telegram_id, name, role, telegram_username)
VALUES (
  999999999,
  'Андрей Пархоменко',
  'admin',
  'AndreiParhomenko'
)
ON CONFLICT (telegram_id) 
DO UPDATE SET 
  role = 'admin',
  telegram_username = 'AndreiParhomenko';
```

4. Run

### Вариант Б: Через Supabase Table Editor

1. Откройте Table Editor
2. Таблица: `users`
3. Insert → Add row:
   - telegram_id: `999999999`
   - name: `Андрей Пархоменко`
   - role: `admin`
   - telegram_username: `AndreiParhomenko`

---

## 📱 **ШАГ 5: Открыть через Telegram**

1. В Telegram найдите: `@belka_coffee_bot`
2. Нажмите кнопку **Menu** (☰)
3. Выберите: `Открыть приложение`
4. **Готово!** 🎉

---

## ✅ **Что будет:**

- ✅ Автоматическая авторизация через Telegram
- ✅ Ваше имя и фото из профиля
- ✅ Роль: Администратор (8 вкладок)
- ✅ Русский текст отображается правильно
- ✅ Все функции работают

---

## 🎭 **Добавление других пользователей:**

### Через UI (в будущем):

В админ панели → **👥 Бариста** → **➕ Добавить пользователя**

### Через SQL (сейчас):

```sql
-- Добавить бариста по username
INSERT INTO users (telegram_id, name, role, telegram_username)
VALUES (
  0, -- будет обновлен при первом входе
  'Имя Фамилия',
  'barista',
  'telegram_username'
);
```

---

## 🔧 **Настройки Environment Variables в Vercel:**

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Добавьте:
   - `VITE_SUPABASE_URL` = `https://jcrjcglfzrhcghiqfltp.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_55fEkUzyTswveKoQRbyopA_H0Abc7bi`
   - `VITE_BOT_USERNAME` = `belka_coffee_bot`

---

## 🆘 **Если что-то не работает:**

### Кракозябры все ещё:
- Очистите кэш: Settings → Advanced → Clear browsing data

### Не авторизуется:
- Проверьте что открываете через Telegram, а не в браузере

### Нет прав админа:
- Проверьте таблицу `users` в Supabase
- Убедитесь что `role` = `admin`

---

## 📊 **Команды:**

```powershell
# Установить Vercel
npm install -g vercel

# Логин
vercel login

# Деплой
cd D:\Cursor\belka\frontend
vercel --prod

# Проверить URL
vercel ls
```

---

## 🎯 **Checklist:**

```
□ 1. Установлен Vercel CLI
□ 2. Залогинились в Vercel
□ 3. Задеплоили проект
□ 4. Получили Production URL
□ 5. Настроили @BotFather
□ 6. Добавили себя в БД как admin
□ 7. Открыли бота в Telegram
□ 8. Нажали Menu Button
□ 9. Приложение открылось!
□ 10. Русский текст отображается!
```

---

**Создано:** AI Assistant  
**Дата:** 18 декабря 2025  
**Проект:** Belka Coffee - Telegram Mini App


