-- ============================================
-- ИСПРАВЛЕНИЕ: RLS политики и структура users
-- ============================================

-- Шаг 1: Проверим структуру таблицы users
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Шаг 2: ВРЕМЕННО отключить RLS для теста
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Шаг 3: Удалить все старые политики
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Only admins can create users" ON users;
DROP POLICY IF EXISTS "Only admins can update users" ON users;
DROP POLICY IF EXISTS "Only admins can delete users" ON users;

-- Шаг 4: Создать ПРОСТЫЕ политики (без рекурсии)
-- Включить RLS обратно
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика 1: Все авторизованные могут читать всех пользователей
CREATE POLICY "Allow authenticated users to read all users"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политика 2: Пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Политика 3: Только админы могут создавать пользователей
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Политика 4: Только админы могут удалять пользователей
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Шаг 5: Проверить, что бариста существуют
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  au.email_confirmed_at IS NOT NULL as confirmed
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.role = 'barista'
ORDER BY u.name;

-- Шаг 6: Проверить связь между auth.users и public.users
SELECT 
  au.email as auth_email,
  pu.email as public_email,
  pu.name,
  pu.role,
  CASE 
    WHEN pu.id IS NULL THEN '❌ НЕТ в public.users'
    WHEN au.id IS NULL THEN '❌ НЕТ в auth.users'
    ELSE '✅ OK'
  END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@belka.coffee' OR pu.email LIKE '%@belka.coffee'
ORDER BY au.email;

