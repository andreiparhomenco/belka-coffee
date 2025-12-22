-- ============================================
-- ФИНАЛЬНОЕ СОЗДАНИЕ ВСЕХ 9 БАРИСТА
-- С правильным instance_id как у админа
-- ============================================

-- Шаг 1: Удалить всех старых бариста (кроме Алины, она уже работает)
DELETE FROM public.users 
WHERE role = 'barista' 
AND email != 'alina@belka.coffee';

DELETE FROM auth.users 
WHERE email LIKE '%@belka.coffee' 
AND email NOT IN ('admin@belka.coffee', 'alina@belka.coffee');

-- Шаг 2: Создать всех 8 бариста с правильным instance_id
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  (SELECT instance_id FROM auth.users WHERE email = 'admin@belka.coffee'),
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
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
FROM (VALUES
  ('eolya@belka.coffee', 'Ёля'),
  ('roma@belka.coffee', 'Рома'),
  ('lada@belka.coffee', 'Лада'),
  ('mark@belka.coffee', 'Марк'),
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
  AND au.email NOT IN ('admin@belka.coffee', 'alina@belka.coffee');

-- Шаг 4: ПРОВЕРКА - Показать всех пользователей с instance_id
SELECT 
  pu.email,
  pu.name,
  pu.role,
  au.instance_id,
  (SELECT instance_id FROM auth.users WHERE email = 'admin@belka.coffee') = au.instance_id as instance_matches_admin,
  'Пароль: ' || 
    CASE 
      WHEN pu.role = 'admin' THEN 'BelkaAdmin2024'
      ELSE 'Belka2024'
    END as password_info
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
WHERE pu.email LIKE '%@belka.coffee'
ORDER BY pu.role DESC, pu.name;

-- Шаг 5: Проверить что instance_id одинаковый у всех
SELECT 
  instance_id,
  COUNT(*) as user_count,
  STRING_AGG(email, ', ' ORDER BY email) as emails
FROM auth.users
WHERE email LIKE '%@belka.coffee'
GROUP BY instance_id;

