-- ============================================
-- Migration: 008 - Row Level Security Setup
-- Description: Настройка политик безопасности для всех таблиц
-- Created: 2025-12-15
-- ============================================

-- ============================================
-- RLS для таблицы users
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Все могут читать базовую информацию о пользователях
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

-- Только админы могут создавать пользователей
CREATE POLICY "Only admins can create users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Только админы могут изменять роли
CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Только админы могут удалять пользователей
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы shop_template
-- ============================================

ALTER TABLE shop_template ENABLE ROW LEVEL SECURITY;

-- Все могут читать шаблон
CREATE POLICY "Everyone can read shop template"
  ON shop_template FOR SELECT
  USING (true);

-- Только админы могут изменять шаблон
CREATE POLICY "Only admins can manage shop template"
  ON shop_template FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы availability
-- ============================================

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свою доступность
CREATE POLICY "Baristas can view own availability"
  ON availability FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут добавлять свою доступность
CREATE POLICY "Baristas can insert own availability"
  ON availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Бариста могут обновлять свою доступность
CREATE POLICY "Baristas can update own availability"
  ON availability FOR UPDATE
  USING (user_id = auth.uid());

-- Бариста могут удалять свою доступность
CREATE POLICY "Baristas can delete own availability"
  ON availability FOR DELETE
  USING (user_id = auth.uid());

-- Админы могут делать всё
CREATE POLICY "Admins can manage all availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы shifts
-- ============================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свои смены
CREATE POLICY "Baristas can view own shifts"
  ON shifts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут обновлять статус своих смен (подтверждение)
CREATE POLICY "Baristas can confirm own shifts"
  ON shifts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('confirmed', 'completed')
  );

-- Админы могут управлять всеми сменами
CREATE POLICY "Admins can manage all shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Защита от редактирования прошлых смен (кроме админов)
CREATE POLICY "Cannot edit past shifts"
  ON shifts FOR UPDATE
  USING (
    week_start >= CURRENT_DATE - INTERVAL '7 days'
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы shift_reports
-- ============================================

ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свои отчёты
CREATE POLICY "Baristas can view own reports"
  ON shift_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_reports.shift_id
      AND shifts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут создавать отчёты только для своих смен
CREATE POLICY "Baristas can create own reports"
  ON shift_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_reports.shift_id
      AND shifts.user_id = auth.uid()
      AND shifts.status IN ('confirmed', 'planned')
    )
  );

-- Бариста не могут редактировать уже отправленные отчёты
-- Только админы могут редактировать отчёты
CREATE POLICY "Only admins can update reports"
  ON shift_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Админы видят все отчёты
CREATE POLICY "Admins can view all reports"
  ON shift_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы salaries
-- ============================================

ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свою зарплату
CREATE POLICY "Baristas can view own salary"
  ON salaries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Только система (через service_role) может создавать/обновлять зарплаты
-- RLS не применяется к service_role key

-- Админы могут управлять зарплатами
CREATE POLICY "Admins can manage salaries"
  ON salaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы audit_log
-- ============================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Только админы видят audit log
CREATE POLICY "Only admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Система может записывать в audit log (через триггеры)
-- RLS не применяется к SECURITY DEFINER функциям

-- ============================================
-- Функция для проверки прав доступа
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_barista()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'barista'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- КОММЕНТАРИИ К ПОЛИТИКАМ
-- ============================================

COMMENT ON POLICY "Users can read all users" ON users IS 
  'Все пользователи могут видеть базовую информацию о других пользователях';

COMMENT ON POLICY "Baristas can view own availability" ON availability IS 
  'Бариста видят только свою доступность, админы видят всё';

COMMENT ON POLICY "Cannot edit past shifts" ON shifts IS 
  'Защита от редактирования смен старше недели (кроме админов)';

COMMENT ON POLICY "Only admins can update reports" ON shift_reports IS 
  'Отчёты нельзя редактировать после отправки (только админы могут)';

