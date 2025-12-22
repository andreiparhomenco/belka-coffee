-- ============================================
-- Создание аккаунтов для 9 бариста (ИСПРАВЛЕНО)
-- Дата: 2025-12-22
-- ============================================

-- ВАЖНО: Выполните этот скрипт в Supabase SQL Editor

-- ============================================
-- 1. Ёля (eolya@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Проверяем, существует ли пользователь
  SELECT id INTO user_id FROM auth.users WHERE email = 'eolya@belka.coffee';
  
  IF user_id IS NULL THEN
    -- Создаем пользователя в auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'eolya@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Ёля"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    -- Создаем запись в public.users
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'eolya@belka.coffee', 'Ёля', 'barista');
    
    RAISE NOTICE 'Пользователь Ёля создан';
  ELSE
    RAISE NOTICE 'Пользователь Ёля уже существует';
  END IF;
END $$;

-- ============================================
-- 2. Рома (roma@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'roma@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'roma@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Рома"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'roma@belka.coffee', 'Рома', 'barista');
    
    RAISE NOTICE 'Пользователь Рома создан';
  ELSE
    RAISE NOTICE 'Пользователь Рома уже существует';
  END IF;
END $$;

-- ============================================
-- 3. Лада (lada@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'lada@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'lada@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Лада"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'lada@belka.coffee', 'Лада', 'barista');
    
    RAISE NOTICE 'Пользователь Лада создан';
  ELSE
    RAISE NOTICE 'Пользователь Лада уже существует';
  END IF;
END $$;

-- ============================================
-- 4. Марк (mark@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'mark@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'mark@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Марк"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'mark@belka.coffee', 'Марк', 'barista');
    
    RAISE NOTICE 'Пользователь Марк создан';
  ELSE
    RAISE NOTICE 'Пользователь Марк уже существует';
  END IF;
END $$;

-- ============================================
-- 5. Алина (alina@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'alina@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'alina@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Алина"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'alina@belka.coffee', 'Алина', 'barista');
    
    RAISE NOTICE 'Пользователь Алина создан';
  ELSE
    RAISE NOTICE 'Пользователь Алина уже существует';
  END IF;
END $$;

-- ============================================
-- 6. Оля (olya@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'olya@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'olya@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Оля"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'olya@belka.coffee', 'Оля', 'barista');
    
    RAISE NOTICE 'Пользователь Оля создан';
  ELSE
    RAISE NOTICE 'Пользователь Оля уже существует';
  END IF;
END $$;

-- ============================================
-- 7. Лера (lera@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'lera@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'lera@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Лера"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'lera@belka.coffee', 'Лера', 'barista');
    
    RAISE NOTICE 'Пользователь Лера создан';
  ELSE
    RAISE NOTICE 'Пользователь Лера уже существует';
  END IF;
END $$;

-- ============================================
-- 8. Мир (mir@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'mir@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'mir@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Мир"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'mir@belka.coffee', 'Мир', 'barista');
    
    RAISE NOTICE 'Пользователь Мир создан';
  ELSE
    RAISE NOTICE 'Пользователь Мир уже существует';
  END IF;
END $$;

-- ============================================
-- 9. Настя (nastya@belka.coffee)
-- ============================================
DO $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'nastya@belka.coffee';
  
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'nastya@belka.coffee',
      crypt('Belka2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Настя"}',
      false, ''
    ) RETURNING id INTO user_id;
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, 'nastya@belka.coffee', 'Настя', 'barista');
    
    RAISE NOTICE 'Пользователь Настя создан';
  ELSE
    RAISE NOTICE 'Пользователь Настя уже существует';
  END IF;
END $$;

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

