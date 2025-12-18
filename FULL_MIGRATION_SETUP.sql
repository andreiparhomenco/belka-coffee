-- ================================================
-- ПОЛНЫЙ СКРИПТ МИГРАЦИИ БАЗЫ ДАННЫХ
-- Belka Coffee - Веб версия
-- ================================================
-- 
-- ИНСТРУКЦИЯ:
-- 1. Откройте SQL Editor в Supabase
-- 2. Скопируйте ВЕСЬ этот файл
-- 3. Вставьте в SQL Editor
-- 4. Нажмите "Run" ▶️
--
-- ================================================

-- ============================================
-- 001: Создание таблицы пользователей
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,  -- Сделаем необязательным сразу
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('barista', 'admin')) DEFAULT 'barista' NOT NULL,
  email TEXT UNIQUE,  -- Добавляем сразу для веб-версии
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

-- ============================================
-- 002: Создание таблицы шаблона работы кофейни
-- ============================================

CREATE TABLE IF NOT EXISTS shop_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(day_of_week, hour)
);

CREATE INDEX IF NOT EXISTS idx_shop_template_active 
  ON shop_template(is_active, day_of_week, hour)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shop_template_day 
  ON shop_template(day_of_week);

-- Вставка примерного шаблона работы кофейни
INSERT INTO shop_template (day_of_week, hour, is_active)
SELECT 
  day,
  hour,
  true
FROM 
  generate_series(0, 4) AS day,
  generate_series(8, 19) AS hour
UNION ALL
SELECT 
  day,
  hour,
  true
FROM 
  generate_series(5, 6) AS day,
  generate_series(9, 17) AS hour
ON CONFLICT (day_of_week, hour) DO NOTHING;

-- ============================================
-- 003: Создание таблицы доступности бариста
-- ============================================

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, week_start, day_of_week, hour)
);

CREATE INDEX IF NOT EXISTS idx_availability_user_week 
  ON availability(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_availability_week 
  ON availability(week_start);

CREATE INDEX IF NOT EXISTS idx_availability_slot 
  ON availability(week_start, day_of_week, hour);

CREATE INDEX IF NOT EXISTS idx_availability_week_day_hour 
  ON availability(week_start, day_of_week, hour)
  INCLUDE (user_id);

-- ============================================
-- 004: Создание таблицы смен
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_shifts_user_week 
  ON shifts(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_shifts_week_status 
  ON shifts(week_start, status);

CREATE INDEX IF NOT EXISTS idx_shifts_slot 
  ON shifts(week_start, day_of_week, hour);

CREATE INDEX IF NOT EXISTS idx_shifts_user_status 
  ON shifts(user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_unique_slot 
  ON shifts(week_start, day_of_week, hour)
  WHERE status != 'cancelled';

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 005: Создание таблицы отчётов по сменам
-- ============================================

CREATE TABLE IF NOT EXISTS shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_reports_shift ON shift_reports(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_user ON shift_reports(user_id);

CREATE TRIGGER shift_reports_updated_at
  BEFORE UPDATE ON shift_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 006: Создание таблицы зарплат
-- ============================================

CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  hours_worked DECIMAL(10, 2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'approved', 'paid')) DEFAULT 'draft' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_salaries_user ON salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_salaries_period ON salaries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_salaries_status ON salaries(status);

CREATE TRIGGER salaries_updated_at
  BEFORE UPDATE ON salaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 007: Создание таблицы аудита
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- 008: Настройка Row Level Security (RLS)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Политики для users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

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

-- Политики для shop_template (все могут читать, только админы изменять)
CREATE POLICY "Anyone can view shop template"
  ON shop_template FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify shop template"
  ON shop_template FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

-- Политики для availability
CREATE POLICY "Users can manage their own availability"
  ON availability FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id::text = auth.uid()::text OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can view all availability"
  ON availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

-- Политики для shifts
CREATE POLICY "Users can view their own shifts"
  ON shifts FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id::text = auth.uid()::text OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can manage all shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

-- Политики для остальных таблиц (аналогично)
CREATE POLICY "Users can view their own reports"
  ON shift_reports FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id::text = auth.uid()::text OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can manage all reports"
  ON shift_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own salaries"
  ON salaries FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id::text = auth.uid()::text OR email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Admins can manage all salaries"
  ON salaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE (id::text = auth.uid()::text OR email = auth.jwt()->>'email')
      AND role = 'admin'
    )
  );

-- ================================================
-- ✅ МИГРАЦИЯ ЗАВЕРШЕНА!
-- Теперь создайте пользователей через Authentication
-- ================================================

