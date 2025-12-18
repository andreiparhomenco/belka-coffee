-- ================================================
-- Миграция: Добавление email аутентификации
-- ================================================

-- Добавляем колонку email (если её нет)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Делаем telegram_id необязательным (для веб-версии)
ALTER TABLE users 
ALTER COLUMN telegram_id DROP NOT NULL;

-- Создаём индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Обновляем RLS политики для email аутентификации
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Новые политики с поддержкой email
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

-- Админы могут управлять всеми пользователями
CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

