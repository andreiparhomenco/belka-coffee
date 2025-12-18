-- ============================================
-- Migration: 006 - Create Salaries Table
-- Description: Рассчитанные зарплаты бариста по неделям
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы зарплат
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  total_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_turnover NUMERIC(12,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  turnover_percentage NUMERIC(3,2) NOT NULL DEFAULT 0.05,
  salary NUMERIC(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, week_start)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_salaries_user_week 
  ON salaries(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_salaries_week 
  ON salaries(week_start);

CREATE INDEX IF NOT EXISTS idx_salaries_unpaid 
  ON salaries(is_paid, week_start)
  WHERE is_paid = false;

-- Комментарии
COMMENT ON TABLE salaries IS 'Рассчитанные зарплаты бариста по неделям';
COMMENT ON COLUMN salaries.id IS 'Уникальный идентификатор';
COMMENT ON COLUMN salaries.user_id IS 'ID бариста';
COMMENT ON COLUMN salaries.week_start IS 'Дата начала недели';
COMMENT ON COLUMN salaries.total_hours IS 'Общее количество отработанных часов';
COMMENT ON COLUMN salaries.total_turnover IS 'Общий оборот за неделю';
COMMENT ON COLUMN salaries.hourly_rate IS 'Ставка за час (по умолчанию 150₽)';
COMMENT ON COLUMN salaries.turnover_percentage IS 'Процент от оборота (по умолчанию 5%)';
COMMENT ON COLUMN salaries.salary IS 'Итоговая зарплата: (hours × rate) + (turnover × %)';
COMMENT ON COLUMN salaries.is_paid IS 'Выплачена ли зарплата';
COMMENT ON COLUMN salaries.calculated_at IS 'Дата расчёта';
COMMENT ON COLUMN salaries.paid_at IS 'Дата выплаты';

-- Функция для расчёта зарплаты
CREATE OR REPLACE FUNCTION calculate_salary(
  p_user_id UUID,
  p_week_start DATE
) RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_hours NUMERIC,
  total_turnover NUMERIC,
  salary NUMERIC
) AS $$
DECLARE
  v_hours NUMERIC;
  v_turnover NUMERIC;
  v_salary NUMERIC;
  v_hourly_rate NUMERIC := 150.00;
  v_turnover_pct NUMERIC := 0.05;
BEGIN
  -- Подсчёт часов и оборота из завершённых смен
  SELECT 
    COALESCE(SUM(sr.confirmed_hours), 0),
    COALESCE(SUM(sr.turnover), 0)
  INTO v_hours, v_turnover
  FROM shifts s
  INNER JOIN shift_reports sr ON s.id = sr.shift_id
  WHERE s.user_id = p_user_id
    AND s.week_start = p_week_start
    AND s.status = 'completed';
  
  -- Расчёт зарплаты: (часы × 150) + (оборот × 0.05)
  v_salary := (v_hours * v_hourly_rate) + (v_turnover * v_turnover_pct);
  
  -- Вставка или обновление записи
  INSERT INTO salaries (
    user_id,
    week_start,
    total_hours,
    total_turnover,
    hourly_rate,
    turnover_percentage,
    salary
  ) VALUES (
    p_user_id,
    p_week_start,
    v_hours,
    v_turnover,
    v_hourly_rate,
    v_turnover_pct,
    v_salary
  )
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET
    total_hours = EXCLUDED.total_hours,
    total_turnover = EXCLUDED.total_turnover,
    salary = EXCLUDED.salary,
    calculated_at = NOW();
  
  -- Возврат результата
  RETURN QUERY
  SELECT 
    p_user_id,
    u.name,
    v_hours,
    v_turnover,
    v_salary
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчёта зарплат всем бариста за неделю
CREATE OR REPLACE FUNCTION calculate_all_salaries(p_week_start DATE)
RETURNS SETOF salaries AS $$
BEGIN
  -- Рассчитать зарплату для всех бариста
  PERFORM calculate_salary(id, p_week_start)
  FROM users
  WHERE role = 'barista';
  
  -- Вернуть все рассчитанные зарплаты
  RETURN QUERY
  SELECT * FROM salaries
  WHERE week_start = p_week_start
  ORDER BY salary DESC;
END;
$$ LANGUAGE plpgsql;

