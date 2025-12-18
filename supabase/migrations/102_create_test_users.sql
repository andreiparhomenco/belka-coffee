-- ================================================
-- Создание тестовых пользователей для MVP
-- ================================================

-- Важно: Эти пользователи должны быть созданы через Supabase Auth!
-- Этот файл только для справки и синхронизации с таблицей users

-- После создания через Auth, добавим записи в таблицу users:

-- Админ
INSERT INTO users (id, email, name, role, telegram_id, telegram_username)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- UUID будет заменён на реальный после создания в Auth
  'admin@belka.coffee',
  'Андрей Пархоменко (Админ)',
  'admin',
  NULL, -- Больше не используем Telegram
  NULL
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin',
  name = 'Андрей Пархоменко (Админ)';

-- Бариста
INSERT INTO users (id, email, name, role, telegram_id, telegram_username)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- UUID будет заменён на реальный после создания в Auth
  'barista@belka.coffee',
  'Бариста Тестовый',
  'barista',
  NULL,
  NULL
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'barista';

-- Примечание:
-- Реальное создание пользователей будет через Supabase Dashboard или Auth API
-- с паролями:
-- admin@belka.coffee: BelkaAdmin2024
-- barista@belka.coffee: BelkaBarista2024

