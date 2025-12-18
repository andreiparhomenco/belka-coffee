-- ============================================
-- Migration: 007 - Create Audit Log Table
-- Description: Журнал всех изменений в системе для безопасности
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы аудита
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_audit_log_user 
  ON audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table 
  ON audit_log(table_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_record 
  ON audit_log(record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_created 
  ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON audit_log(action, table_name);

-- Комментарии
COMMENT ON TABLE audit_log IS 'Журнал всех изменений в системе';
COMMENT ON COLUMN audit_log.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN audit_log.user_id IS 'ID пользователя, совершившего действие';
COMMENT ON COLUMN audit_log.action IS 'Тип действия: INSERT/UPDATE/DELETE';
COMMENT ON COLUMN audit_log.table_name IS 'Название таблицы';
COMMENT ON COLUMN audit_log.record_id IS 'ID изменённой записи';
COMMENT ON COLUMN audit_log.old_data IS 'Старые данные (JSON)';
COMMENT ON COLUMN audit_log.new_data IS 'Новые данные (JSON)';
COMMENT ON COLUMN audit_log.ip_address IS 'IP адрес пользователя';
COMMENT ON COLUMN audit_log.user_agent IS 'User Agent браузера';
COMMENT ON COLUMN audit_log.created_at IS 'Время действия';

-- Функция для логирования изменений
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data
    ) VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (
      user_id,
      action,
      table_name,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Применение триггеров аудита к важным таблицам
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_shifts
  AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_shift_reports
  AFTER INSERT OR UPDATE OR DELETE ON shift_reports
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_salaries
  AFTER INSERT OR UPDATE OR DELETE ON salaries
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Функция для очистки старых логов (старше 6 месяцев)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log 
  WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Функция для получения истории изменений записи
CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS TABLE (
  action TEXT,
  user_name TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    COALESCE(u.name, 'System') AS user_name,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_log al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;

