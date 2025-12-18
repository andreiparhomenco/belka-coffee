-- ============================================
-- Add Andrei as Admin
-- Description: Добавление @AndreiParhomenko как администратора
-- Created: 2025-12-18
-- ============================================

-- Добавить пользователя Andrei Parhomenko как админа
-- Telegram username: @AndreiParhomenko
INSERT INTO users (telegram_id, name, role, telegram_username)
VALUES (
  999999999, -- временный ID, будет обновлен при первом входе
  'Андрей Пархоменко',
  'admin',
  'AndreiParhomenko'
)
ON CONFLICT (telegram_id) 
DO UPDATE SET 
  role = 'admin',
  telegram_username = 'AndreiParhomenko',
  updated_at = NOW();

-- Добавить индекс для быстрого поиска по username
CREATE INDEX IF NOT EXISTS idx_users_telegram_username 
ON users(telegram_username);


