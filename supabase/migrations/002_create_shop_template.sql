-- ============================================
-- Migration: 002 - Create Shop Template Table
-- Description: Шаблон рабочих часов кофейни (какие часы работает кофейня)
-- Created: 2025-12-15
-- ============================================

-- Создание таблицы шаблона работы кофейни
CREATE TABLE IF NOT EXISTS shop_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(day_of_week, hour)
);

-- Индекс для быстрой фильтрации активных слотов
CREATE INDEX IF NOT EXISTS idx_shop_template_active 
  ON shop_template(is_active, day_of_week, hour)
  WHERE is_active = true;

-- Индекс для запросов по дню недели
CREATE INDEX IF NOT EXISTS idx_shop_template_day 
  ON shop_template(day_of_week);

-- Комментарии
COMMENT ON TABLE shop_template IS 'Шаблон рабочих часов кофейни по дням недели';
COMMENT ON COLUMN shop_template.id IS 'Уникальный идентификатор слота';
COMMENT ON COLUMN shop_template.day_of_week IS 'День недели: 0=Понедельник, 6=Воскресенье';
COMMENT ON COLUMN shop_template.hour IS 'Час работы (0-23)';
COMMENT ON COLUMN shop_template.is_active IS 'Активен ли этот слот';
COMMENT ON COLUMN shop_template.created_at IS 'Дата создания записи';

-- Вставка примерного шаблона работы кофейни
-- Понедельник-Пятница: 8:00 - 20:00
-- Суббота-Воскресенье: 9:00 - 18:00
INSERT INTO shop_template (day_of_week, hour, is_active)
SELECT 
  day,
  hour,
  true
FROM 
  generate_series(0, 4) AS day, -- Пн-Пт
  generate_series(8, 19) AS hour -- 8:00-19:00
UNION ALL
SELECT 
  day,
  hour,
  true
FROM 
  generate_series(5, 6) AS day, -- Сб-Вс
  generate_series(9, 17) AS hour -- 9:00-17:00
ON CONFLICT (day_of_week, hour) DO NOTHING;

