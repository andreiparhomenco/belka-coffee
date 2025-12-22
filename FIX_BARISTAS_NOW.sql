-- ============================================
-- БЫСТРОЕ ИСПРАВЛЕНИЕ: Создать бариста СЕЙЧАС
-- ============================================

-- Шаг 1: Удалить старые попытки (если есть)
DELETE FROM auth.users WHERE email LIKE '%@belka.coffee' AND email != 'admin@belka.coffee';
DELETE FROM public.users WHERE role = 'barista';

-- Шаг 2: Создать всех 9 бариста одним запросом
-- Сначала в auth.users
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  email,
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  ('{"name":"' || name || '"}')::jsonb,
  false,
  ''
FROM (VALUES
  ('eolya@belka.coffee', 'Ёля'),
  ('roma@belka.coffee', 'Рома'),
  ('lada@belka.coffee', 'Лада'),
  ('mark@belka.coffee', 'Марк'),
  ('alina@belka.coffee', 'Алина'),
  ('olya@belka.coffee', 'Оля'),
  ('lera@belka.coffee', 'Лера'),
  ('mir@belka.coffee', 'Мир'),
  ('nastya@belka.coffee', 'Настя')
) AS baristas(email, name);

-- Шаг 3: Добавить в public.users
INSERT INTO public.users (id, email, name, role, created_at)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'name',
  'barista',
  au.created_at
FROM auth.users au
WHERE au.email LIKE '%@belka.coffee' 
  AND au.email != 'admin@belka.coffee';

-- Шаг 4: ПРОВЕРКА - Показать всех созданных пользователей
SELECT 
  pu.email,
  pu.name,
  pu.role,
  'Пароль: Belka2024' as password_hint
FROM public.users pu
WHERE pu.role = 'barista'
ORDER BY pu.name;

