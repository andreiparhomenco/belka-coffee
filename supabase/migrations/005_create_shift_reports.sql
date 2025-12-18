-- ============================================
-- Migration: 005 - Create Shift Reports Table
-- Description: Отчёты бариста после завершения смены
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы отчётов о сменах
CREATE TABLE IF NOT EXISTS shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE UNIQUE NOT NULL,
  turnover NUMERIC(10,2) CHECK (turnover >= 0) NOT NULL,
  confirmed_hours NUMERIC(4,2) CHECK (confirmed_hours > 0 AND confirmed_hours <= 24) NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_by UUID REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_shift_reports_shift 
  ON shift_reports(shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_reports_submitted_at 
  ON shift_reports(submitted_at DESC);

-- Комментарии
COMMENT ON TABLE shift_reports IS 'Отчёты бариста после завершения смены';
COMMENT ON COLUMN shift_reports.id IS 'Уникальный идентификатор отчёта';
COMMENT ON COLUMN shift_reports.shift_id IS 'ID смены (уникальный - один отчёт на смену)';
COMMENT ON COLUMN shift_reports.turnover IS 'Оборот за смену в рублях';
COMMENT ON COLUMN shift_reports.confirmed_hours IS 'Фактически отработанные часы';
COMMENT ON COLUMN shift_reports.notes IS 'Заметки к отчёту';
COMMENT ON COLUMN shift_reports.submitted_at IS 'Дата и время отправки отчёта';
COMMENT ON COLUMN shift_reports.submitted_by IS 'Кто отправил отчёт';

-- Триггер: автоматическое обновление статуса смены при создании отчёта
CREATE OR REPLACE FUNCTION update_shift_status_on_report()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shifts 
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = NEW.shift_id
    AND status != 'completed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_reports_update_shift_status
  AFTER INSERT ON shift_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_status_on_report();

-- Функция для получения статистики по отчётам за неделю
CREATE OR REPLACE FUNCTION get_week_reports_stats(p_week_start DATE)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_shifts INT,
  completed_shifts INT,
  pending_reports INT,
  total_hours NUMERIC,
  total_turnover NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COUNT(DISTINCT s.id)::INT AS total_shifts,
    COUNT(DISTINCT sr.id)::INT AS completed_shifts,
    (COUNT(DISTINCT s.id) - COUNT(DISTINCT sr.id))::INT AS pending_reports,
    COALESCE(SUM(sr.confirmed_hours), 0) AS total_hours,
    COALESCE(SUM(sr.turnover), 0) AS total_turnover
  FROM users u
  LEFT JOIN shifts s ON u.id = s.user_id 
    AND s.week_start = p_week_start 
    AND s.status != 'cancelled'
  LEFT JOIN shift_reports sr ON s.id = sr.shift_id
  WHERE u.role = 'barista'
  GROUP BY u.id, u.name
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;

