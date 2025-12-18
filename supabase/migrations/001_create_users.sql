-- ============================================
-- Migration: 001 - Create Users Table
-- Description: Таблица пользователей (бариста и администраторы)
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('barista', 'admin')) DEFAULT 'barista' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Индекс для фильтрации по роли
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Комментарии для документации
COMMENT ON TABLE users IS 'Пользователи системы: бариста и администраторы';
COMMENT ON COLUMN users.id IS 'Уникальный идентификатор пользователя (UUID)';
COMMENT ON COLUMN users.telegram_id IS 'ID пользователя в Telegram (уникальный)';
COMMENT ON COLUMN users.name IS 'Полное имя пользователя';
COMMENT ON COLUMN users.role IS 'Роль пользователя: barista или admin';
COMMENT ON COLUMN users.created_at IS 'Дата и время создания записи';
COMMENT ON COLUMN users.updated_at IS 'Дата и время последнего обновления';

-- Вставка тестовых данных для разработки (закомментировано для продакшена)
-- INSERT INTO users (telegram_id, name, role) VALUES
--   (123456789, 'Админ Тестовый', 'admin'),
--   (987654321, 'Бариста Иван', 'barista'),
--   (111222333, 'Бариста Мария', 'barista');

