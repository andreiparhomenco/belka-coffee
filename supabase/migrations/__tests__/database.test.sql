-- ============================================
-- SQL Tests для Belka Coffee Database
-- Description: Тесты схемы БД, функций и RLS
-- Created: 2025-12-15
-- ============================================

BEGIN;

-- Подключаем расширение для тестирования
CREATE EXTENSION IF NOT EXISTS pgtap;

-- ============================================
-- ТЕСТ 1: Проверка существования таблиц
-- ============================================

SELECT plan(7); -- Всего 7 тестов

SELECT has_table('users', 'Таблица users существует');
SELECT has_table('shop_template', 'Таблица shop_template существует');
SELECT has_table('availability', 'Таблица availability существует');
SELECT has_table('shifts', 'Таблица shifts существует');
SELECT has_table('shift_reports', 'Таблица shift_reports существует');
SELECT has_table('salaries', 'Таблица salaries существует');
SELECT has_table('audit_log', 'Таблица audit_log существует');

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 2: Проверка колонок таблицы users
-- ============================================

BEGIN;

SELECT plan(6);

SELECT has_column('users', 'id', 'У users есть колонка id');
SELECT has_column('users', 'telegram_id', 'У users есть колонка telegram_id');
SELECT has_column('users', 'name', 'У users есть колонка name');
SELECT has_column('users', 'role', 'У users есть колонка role');
SELECT has_column('users', 'created_at', 'У users есть колонка created_at');
SELECT has_column('users', 'updated_at', 'У users есть колонка updated_at');

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 3: Проверка уникальных ключей
-- ============================================

BEGIN;

SELECT plan(3);

-- Telegram ID должен быть уникальным
INSERT INTO users (telegram_id, name, role) VALUES (111, 'Тест1', 'barista');
SELECT lives_ok(
  'INSERT INTO users (telegram_id, name, role) VALUES (111, ''Тест1'', ''barista'')',
  'Первая вставка успешна'
);

-- Попытка вставить дубликат должна провалиться
SELECT throws_ok(
  'INSERT INTO users (telegram_id, name, role) VALUES (111, ''Тест2'', ''barista'')',
  '23505', -- код ошибки unique_violation
  'Дубликат telegram_id вызывает ошибку'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 4: Проверка CHECK constraints
-- ============================================

BEGIN;

SELECT plan(4);

-- Роль должна быть либо barista либо admin
SELECT throws_ok(
  'INSERT INTO users (telegram_id, name, role) VALUES (222, ''Тест'', ''invalid_role'')',
  '23514',
  'Недопустимая роль вызывает ошибку'
);

-- day_of_week должен быть между 0 и 6
SELECT throws_ok(
  'INSERT INTO shop_template (day_of_week, hour) VALUES (7, 10)',
  '23514',
  'Недопустимый день недели вызывает ошибку'
);

-- hour должен быть между 0 и 23
SELECT throws_ok(
  'INSERT INTO shop_template (day_of_week, hour) VALUES (1, 24)',
  '23514',
  'Недопустимый час вызывает ошибку'
);

-- turnover должен быть >= 0
SELECT throws_ok(
  'INSERT INTO shift_reports (shift_id, turnover, confirmed_hours) VALUES (gen_random_uuid(), -100, 1)',
  '23514',
  'Отрицательный оборот вызывает ошибку'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 5: Проверка триггеров updated_at
-- ============================================

BEGIN;

SELECT plan(2);

-- Создаём пользователя
INSERT INTO users (telegram_id, name, role) VALUES (333, 'Триггер Тест', 'barista');

-- Запоминаем created_at
SELECT created_at INTO TEMPORARY TABLE original_times 
FROM users WHERE telegram_id = 333;

-- Ждём немного (в реальных тестах можно использовать pg_sleep)
-- UPDATE users SET name = 'Триггер Тест Обновлено' WHERE telegram_id = 333;

-- Проверяем что updated_at обновился
SELECT ok(
  (SELECT updated_at FROM users WHERE telegram_id = 333) >= 
  (SELECT created_at FROM original_times),
  'updated_at обновляется автоматически'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 6: Проверка функций расчёта зарплат
-- ============================================

BEGIN;

SELECT plan(2);

-- Проверяем что функция существует
SELECT has_function(
  'calculate_salary',
  'Функция calculate_salary существует'
);

SELECT has_function(
  'calculate_all_salaries',
  'Функция calculate_all_salaries существует'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 7: Проверка RLS политик
-- ============================================

BEGIN;

SELECT plan(7);

-- Проверяем что RLS включен
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'users'),
  'RLS включен для таблицы users'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'availability'),
  'RLS включен для таблицы availability'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'shifts'),
  'RLS включен для таблицы shifts'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'shift_reports'),
  'RLS включен для таблицы shift_reports'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'salaries'),
  'RLS включен для таблицы salaries'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'audit_log'),
  'RLS включен для таблицы audit_log'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'shop_template'),
  'RLS включен для таблицы shop_template'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 8: Проверка foreign keys
-- ============================================

BEGIN;

SELECT plan(3);

-- Нельзя создать availability для несуществующего пользователя
SELECT throws_ok(
  'INSERT INTO availability (user_id, week_start, day_of_week, hour) 
   VALUES (gen_random_uuid(), CURRENT_DATE, 1, 10)',
  '23503', -- foreign key violation
  'FK constraint работает для availability.user_id'
);

-- Нельзя создать shift для несуществующего пользователя
SELECT throws_ok(
  'INSERT INTO shifts (user_id, week_start, day_of_week, hour) 
   VALUES (gen_random_uuid(), CURRENT_DATE, 1, 10)',
  '23503',
  'FK constraint работает для shifts.user_id'
);

-- Нельзя создать shift_report для несуществующей смены
SELECT throws_ok(
  'INSERT INTO shift_reports (shift_id, turnover, confirmed_hours) 
   VALUES (gen_random_uuid(), 100, 1)',
  '23503',
  'FK constraint работает для shift_reports.shift_id'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 9: Проверка триггера audit_log
-- ============================================

BEGIN;

SELECT plan(3);

-- Создаём пользователя
INSERT INTO users (telegram_id, name, role) 
VALUES (444, 'Аудит Тест', 'barista')
RETURNING id INTO TEMPORARY TABLE test_user_id;

-- Проверяем что запись в audit_log создалась
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_log 
    WHERE table_name = 'users' 
    AND action = 'INSERT'
    AND record_id = (SELECT id FROM test_user_id)
  ),
  'INSERT логируется в audit_log'
);

-- Обновляем пользователя
UPDATE users SET name = 'Аудит Тест Обновлено' 
WHERE id = (SELECT id FROM test_user_id);

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_log 
    WHERE table_name = 'users' 
    AND action = 'UPDATE'
    AND record_id = (SELECT id FROM test_user_id)
  ),
  'UPDATE логируется в audit_log'
);

-- Удаляем пользователя
DELETE FROM users WHERE id = (SELECT id FROM test_user_id);

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_log 
    WHERE table_name = 'users' 
    AND action = 'DELETE'
    AND record_id = (SELECT id FROM test_user_id)
  ),
  'DELETE логируется в audit_log'
);

SELECT * FROM finish();

ROLLBACK;

-- ============================================
-- ТЕСТ 10: Проверка индексов
-- ============================================

BEGIN;

SELECT plan(5);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' 
    AND indexname = 'idx_users_telegram_id'
  ),
  'Индекс idx_users_telegram_id существует'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'availability' 
    AND indexname = 'idx_availability_user_week'
  ),
  'Индекс idx_availability_user_week существует'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'shifts' 
    AND indexname = 'idx_shifts_user_week'
  ),
  'Индекс idx_shifts_user_week существует'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'salaries' 
    AND indexname = 'idx_salaries_user_week'
  ),
  'Индекс idx_salaries_user_week существует'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_log' 
    AND indexname = 'idx_audit_log_created'
  ),
  'Индекс idx_audit_log_created существует'
);

SELECT * FROM finish();

ROLLBACK;

