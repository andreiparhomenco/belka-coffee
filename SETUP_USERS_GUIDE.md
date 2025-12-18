# 👥 СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ

Пошаговая инструкция для создания тестовых аккаунтов в Supabase.

---

## 🎯 ШАГ 1: Применить миграции

### Откройте SQL Editor:
```
https://supabase.com/dashboard/project/jcrjcglfzrhcghiqfltp/editor
```

### Выполните миграции:

#### 1.1. Добавить email поддержку (101_add_email_auth.sql):

```sql
-- Добавляем колонку email
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Делаем telegram_id необязательным
ALTER TABLE users 
ALTER COLUMN telegram_id DROP NOT NULL;

-- Индекс для поиска
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Обновляем RLS политики
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Новые политики с email
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (
    auth.uid()::text = id::text OR
    auth.jwt()->>'email' = email
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (
    auth.uid()::text = id::text OR
    auth.jwt()->>'email' = email
  );

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );
```

Нажмите **Run** ▶️

---

## 🎯 ШАГ 2: Создать пользователей в Auth

### Откройте Authentication:
```
https://supabase.com/dashboard/project/jcrjcglfzrhcghiqfltp/auth/users
```

### 2.1. Создать админа:

1. Нажмите **"Add user"** → **"Create new user"**
2. Заполните:
   ```
   Email: admin@belka.coffee
   Password: BelkaAdmin2024
   ☑️ Auto Confirm User (ВАЖНО!)
   ```
3. Нажмите **"Create user"**
4. **Скопируйте UUID** пользователя (понадобится на следующем шаге)

### 2.2. Создать бариста:

1. Снова **"Add user"** → **"Create new user"**
2. Заполните:
   ```
   Email: barista@belka.coffee
   Password: BelkaBarista2024
   ☑️ Auto Confirm User (ВАЖНО!)
   ```
3. Нажмите **"Create user"**
4. **Скопируйте UUID** пользователя

---

## 🎯 ШАГ 3: Связать Auth с таблицей users

### Вернитесь в SQL Editor:
```
https://supabase.com/dashboard/project/jcrjcglfzrhcghiqfltp/editor
```

### 3.1. Получить UUID пользователей:

```sql
SELECT id, email FROM auth.users WHERE email IN ('admin@belka.coffee', 'barista@belka.coffee');
```

Вы увидите что-то типа:
```
id: 12345678-1234-1234-1234-123456789abc  |  email: admin@belka.coffee
id: 87654321-4321-4321-4321-cba987654321  |  email: barista@belka.coffee
```

### 3.2. Создать/обновить записи в таблице users:

**Замените UUID на реальные из предыдущего запроса!**

```sql
-- Админ
INSERT INTO users (id, email, name, role, telegram_id)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ UUID
  'admin@belka.coffee',
  'Андрей Пархоменко (Админ)',
  'admin',
  NULL
)
ON CONFLICT (email) 
DO UPDATE SET 
  id = EXCLUDED.id,
  role = 'admin',
  name = 'Андрей Пархоменко (Админ)';

-- Бариста
INSERT INTO users (id, email, name, role, telegram_id)
VALUES (
  '87654321-4321-4321-4321-cba987654321', -- ⚠️ ЗАМЕНИТЕ НА РЕАЛЬНЫЙ UUID
  'barista@belka.coffee',
  'Бариста Тестовый',
  'barista',
  NULL
)
ON CONFLICT (email) 
DO UPDATE SET 
  id = EXCLUDED.id,
  role = 'barista';
```

Нажмите **Run** ▶️

---

## 🎯 ШАГ 4: Проверить результат

### 4.1. Проверить таблицу users:

```sql
SELECT id, email, name, role FROM users WHERE email IN ('admin@belka.coffee', 'barista@belka.coffee');
```

Должно показать:
```
✅ admin@belka.coffee    | Андрей Пархоменко (Админ) | admin
✅ barista@belka.coffee  | Бариста Тестовый          | barista
```

### 4.2. Проверить Auth:

```sql
SELECT id, email FROM auth.users WHERE email IN ('admin@belka.coffee', 'barista@belka.coffee');
```

Должно показать 2 пользователей с UUID.

---

## ✅ ГОТОВО!

Теперь можно войти в приложение:

```powershell
cd D:\Cursor\belka\frontend
npm run dev
```

Откройте: **http://localhost:5174**

**Тестовые аккаунты:**
- 👨‍💼 **Админ**: `admin@belka.coffee` / `BelkaAdmin2024`
- ☕ **Бариста**: `barista@belka.coffee` / `BelkaBarista2024`

---

## 🔍 TROUBLESHOOTING

### Ошибка "Invalid login credentials":
- ✅ Убедитесь что **"Auto Confirm User"** был включён при создании
- ✅ Проверьте правильность email/password
- ✅ Попробуйте пересоздать пользователя

### Ошибка "Профиль не найден":
- ✅ Убедитесь что UUID в таблице `users` совпадают с `auth.users`
- ✅ Выполните запросы из Шага 3 заново
- ✅ Проверьте что `id` в обеих таблицах одинаковые

### Не работают RLS политики:
- ✅ Убедитесь что миграция 101_add_email_auth.sql была выполнена
- ✅ Проверьте что политики созданы без ошибок
- ✅ Перезапустите приложение

---

## 📝 ДОПОЛНИТЕЛЬНО

### Добавить ещё пользователей:

1. **Authentication** → **Add user**
2. Создайте пользователя с любым email/password
3. Скопируйте его UUID
4. Добавьте запись в таблицу `users`:

```sql
INSERT INTO users (id, email, name, role, telegram_id)
VALUES (
  'СКОПИРОВАННЫЙ_UUID',
  'новый-email@example.com',
  'Имя Фамилия',
  'barista', -- или 'admin'
  NULL
);
```

---

Всё готово для тестирования! 🚀

