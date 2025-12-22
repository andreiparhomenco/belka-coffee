-- ============================================
-- Создание аккаунтов для 9 бариста
-- Дата: 2025-12-22
-- ============================================

-- ВАЖНО: Выполните этот скрипт в Supabase SQL Editor
-- Логины: имя@belka.coffee
-- Пароли: Belka2024 (временный пароль для всех)

-- ============================================
-- 1. Ёля
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'eolya@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Ёля"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'eolya@belka.coffee',
  'Ёля',
  'barista'
FROM auth.users
WHERE email = 'eolya@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. Рома
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'roma@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Рома"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'roma@belka.coffee',
  'Рома',
  'barista'
FROM auth.users
WHERE email = 'roma@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. Лада
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'lada@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Лада"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'lada@belka.coffee',
  'Лада',
  'barista'
FROM auth.users
WHERE email = 'lada@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 4. Марк
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mark@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Марк"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'mark@belka.coffee',
  'Марк',
  'barista'
FROM auth.users
WHERE email = 'mark@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 5. Алина
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'alina@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Алина"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'alina@belka.coffee',
  'Алина',
  'barista'
FROM auth.users
WHERE email = 'alina@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 6. Оля
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'olya@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Оля"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'olya@belka.coffee',
  'Оля',
  'barista'
FROM auth.users
WHERE email = 'olya@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 7. Лера
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'lera@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Лера"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'lera@belka.coffee',
  'Лера',
  'barista'
FROM auth.users
WHERE email = 'lera@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 8. Мир
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mir@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Мир"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'mir@belka.coffee',
  'Мир',
  'barista'
FROM auth.users
WHERE email = 'mir@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 9. Настя
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'nastya@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Настя"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  'nastya@belka.coffee',
  'Настя',
  'barista'
FROM auth.users
WHERE email = 'nastya@belka.coffee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ПРОВЕРКА: Посмотреть всех созданных бариста
-- ============================================
SELECT 
  u.email,
  u.name,
  u.role,
  u.created_at
FROM public.users u
WHERE u.role = 'barista'
ORDER BY u.name;

