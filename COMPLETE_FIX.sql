-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ: Создание бариста + RLS
-- Выполните этот скрипт целиком
-- ============================================

-- ============================================
-- ЧАСТЬ 1: Очистка и пересоздание бариста
-- ============================================

-- Удалить старых бариста
DELETE FROM public.users WHERE role = 'barista';
DELETE FROM auth.users WHERE email LIKE '%@belka.coffee' AND email != 'admin@belka.coffee';

-- Создать всех 9 бариста в auth.users
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

-- Добавить в public.users
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

-- ============================================
-- ЧАСТЬ 2: Исправление RLS политик
-- ============================================

-- Удалить все старые политики
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Only admins can create users" ON public.users;
DROP POLICY IF EXISTS "Only admins can update users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Включить RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- НОВЫЕ ПОЛИТИКИ (без рекурсии)

-- 1. ВСЕ авторизованные пользователи могут ЧИТАТЬ всех
CREATE POLICY "authenticated_read_all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Пользователи могут обновлять только свой профиль
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Только сервис может создавать/удалять (для админ-панели нужна отдельная логика)
CREATE POLICY "service_full_access"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ЧАСТЬ 3: Проверка
-- ============================================

-- Показать всех пользователей
SELECT 
  pu.email,
  pu.name,
  pu.role,
  au.email_confirmed_at IS NOT NULL as confirmed,
  'Логин: ' || pu.email || ', Пароль: ' || 
    CASE 
      WHEN pu.role = 'admin' THEN 'BelkaAdmin2024'
      ELSE 'Belka2024'
    END as credentials
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
ORDER BY pu.role DESC, pu.name;

-- Проверить что ID совпадают
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN au.id = pu.id THEN 1 END) as matched_ids,
  COUNT(CASE WHEN au.id IS NULL OR pu.id IS NULL THEN 1 END) as mismatched
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@belka.coffee' OR pu.email LIKE '%@belka.coffee';

