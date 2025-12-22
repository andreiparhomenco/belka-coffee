-- ============================================
-- Проверка и исправление пользователей
-- ============================================

-- 1. ПРОВЕРКА: Есть ли пользователи в auth.users?
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%@belka.coffee'
ORDER BY email;

-- 2. ПРОВЕРКА: Есть ли пользователи в public.users?
SELECT 
  email,
  name,
  role,
  created_at
FROM public.users
WHERE role IN ('admin', 'barista')
ORDER BY email;

-- 3. ПРОВЕРКА: Есть ли несоответствия?
-- Найти пользователей в auth.users, которых нет в public.users
SELECT 
  au.email,
  au.id,
  'Есть в auth, НЕТ в public' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@belka.coffee'
  AND pu.id IS NULL;

-- 4. ИСПРАВЛЕНИЕ: Добавить недостающих пользователей в public.users
INSERT INTO public.users (id, email, name, role, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1)
  ) as name,
  'barista' as role,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@belka.coffee'
  AND pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. ФИНАЛЬНАЯ ПРОВЕРКА: Показать всех пользователей
SELECT 
  pu.email,
  pu.name,
  pu.role,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  pu.created_at
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
WHERE pu.role IN ('admin', 'barista')
ORDER BY pu.role DESC, pu.name;

