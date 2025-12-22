-- ============================================
-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ ТЕСТА
-- После этого вход должен работать
-- ============================================

-- ВРЕМЕННО отключить RLS на таблице users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Проверка: показать всех пользователей
SELECT 
  email,
  name,
  role,
  'Пароль: ' || 
    CASE 
      WHEN role = 'admin' THEN 'BelkaAdmin2024'
      ELSE 'Belka2024'
    END as password_info
FROM public.users
ORDER BY role DESC, name;

-- Проверка: есть ли пользователи в auth.users
SELECT 
  au.email,
  au.email_confirmed_at IS NOT NULL as confirmed,
  pu.name,
  pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@belka.coffee'
ORDER BY au.email;

