-- ============================================
-- Migration: 003 - Create Availability Table
-- Description: Доступность бариста по часам
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы доступности бариста
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, week_start, day_of_week, hour)
);

-- Индекс для поиска доступности пользователя по неделе
CREATE INDEX IF NOT EXISTS idx_availability_user_week 
  ON availability(user_id, week_start);

-- Индекс для поиска всей доступности по неделе
CREATE INDEX IF NOT EXISTS idx_availability_week 
  ON availability(week_start);

-- Индекс для поиска по конкретному слоту
CREATE INDEX IF NOT EXISTS idx_availability_slot 
  ON availability(week_start, day_of_week, hour);

-- Составной индекс для оптимизации алгоритма распределения смен
CREATE INDEX IF NOT EXISTS idx_availability_week_day_hour 
  ON availability(week_start, day_of_week, hour)
  INCLUDE (user_id);

-- Комментарии
COMMENT ON TABLE availability IS 'Доступность бариста по часам на каждую неделю';
COMMENT ON COLUMN availability.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN availability.user_id IS 'ID бариста';
COMMENT ON COLUMN availability.week_start IS 'Дата начала недели (понедельник)';
COMMENT ON COLUMN availability.day_of_week IS 'День недели: 0=Понедельник, 6=Воскресенье';
COMMENT ON COLUMN availability.hour IS 'Час доступности (0-23)';
COMMENT ON COLUMN availability.created_at IS 'Дата создания записи';

-- Функция для автоматической очистки старой доступности (старше 4 недель)
CREATE OR REPLACE FUNCTION cleanup_old_availability()
RETURNS void AS $$
BEGIN
  DELETE FROM availability 
  WHERE week_start < CURRENT_DATE - INTERVAL '4 weeks';
END;
$$ LANGUAGE plpgsql;

-- Можно настроить cron job в Supabase для автоматической очистки

