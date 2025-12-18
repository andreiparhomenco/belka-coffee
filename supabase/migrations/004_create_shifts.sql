-- ============================================
-- Migration: 004 - Create Shifts Table
-- Description: Назначенные смены бариста
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы смен
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  status TEXT CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')) DEFAULT 'planned' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id),
  notes TEXT
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_shifts_user_week 
  ON shifts(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_shifts_week_status 
  ON shifts(week_start, status);

CREATE INDEX IF NOT EXISTS idx_shifts_slot 
  ON shifts(week_start, day_of_week, hour);

CREATE INDEX IF NOT EXISTS idx_shifts_user_status 
  ON shifts(user_id, status);

-- Составной индекс для проверки конфликтов
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_unique_slot 
  ON shifts(week_start, day_of_week, hour)
  WHERE status != 'cancelled';

-- Триггер для обновления updated_at
CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Комментарии
COMMENT ON TABLE shifts IS 'Назначенные смены бариста';
COMMENT ON COLUMN shifts.id IS 'Уникальный идентификатор смены';
COMMENT ON COLUMN shifts.user_id IS 'ID бариста';
COMMENT ON COLUMN shifts.week_start IS 'Дата начала недели';
COMMENT ON COLUMN shifts.day_of_week IS 'День недели: 0=Понедельник';
COMMENT ON COLUMN shifts.hour IS 'Час начала смены (0-23)';
COMMENT ON COLUMN shifts.status IS 'Статус: planned/confirmed/completed/cancelled';
COMMENT ON COLUMN shifts.created_by IS 'Кто создал смену (для аудита)';
COMMENT ON COLUMN shifts.notes IS 'Заметки к смене';

-- Функция для получения активных смен
CREATE OR REPLACE FUNCTION get_active_shifts(p_week_start DATE)
RETURNS TABLE (
  shift_id UUID,
  user_id UUID,
  user_name TEXT,
  day_of_week INT,
  hour INT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    u.name,
    s.day_of_week,
    s.hour,
    s.status
  FROM shifts s
  JOIN users u ON s.user_id = u.id
  WHERE s.week_start = p_week_start
    AND s.status != 'cancelled'
  ORDER BY s.day_of_week, s.hour;
END;
$$ LANGUAGE plpgsql;

