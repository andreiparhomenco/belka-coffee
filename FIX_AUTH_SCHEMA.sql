-- ============================================
-- ИСПРАВЛЕНИЕ: Проблема с auth схемой
-- ============================================

-- Шаг 1: Проверить структуру auth.users
SELECT 
  email,
  id,
  aud,
  role,
  email_confirmed_at IS NOT NULL as confirmed,
  encrypted_password IS NOT NULL as has_password,
  instance_id
FROM auth.users
WHERE email LIKE '%@belka.coffee'
ORDER BY email;

-- Шаг 2: Проверить, что instance_id везде одинаковый
SELECT 
  instance_id,
  COUNT(*) as count
FROM auth.users
WHERE email LIKE '%@belka.coffee'
GROUP BY instance_id;

-- Шаг 3: ИСПРАВЛЕНИЕ - Обновить instance_id на правильный
-- Сначала узнаем правильный instance_id от админа
DO $$
DECLARE
  correct_instance_id uuid;
BEGIN
  -- Берем instance_id от админа
  SELECT instance_id INTO correct_instance_id
  FROM auth.users
  WHERE email = 'admin@belka.coffee';
  
  RAISE NOTICE 'Правильный instance_id: %', correct_instance_id;
  
  -- Обновляем у всех бариста
  UPDATE auth.users
  SET instance_id = correct_instance_id
  WHERE email LIKE '%@belka.coffee' 
    AND email != 'admin@belka.coffee'
    AND instance_id != correct_instance_id;
  
  RAISE NOTICE 'Обновлено пользователей: %', (
    SELECT COUNT(*) FROM auth.users 
    WHERE email LIKE '%@belka.coffee'
  );
END $$;

-- Шаг 4: Проверить что пароли зашифрованы
SELECT 
  email,
  encrypted_password LIKE '$2%' as password_encrypted,
  LENGTH(encrypted_password) as password_length,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email LIKE '%@belka.coffee'
ORDER BY email;

-- Шаг 5: Пересоздать одного бариста для теста (Алина)
-- Удалить старую версию
DELETE FROM public.users WHERE email = 'alina@belka.coffee';
DELETE FROM auth.users WHERE email = 'alina@belka.coffee';

-- Создать заново используя правильный instance_id
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
  instance_id,  -- Берем instance_id от админа
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'alina@belka.coffee',
  crypt('Belka2024', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Алина"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
FROM auth.users
WHERE email = 'admin@belka.coffee'
LIMIT 1;

-- Добавить в public.users
INSERT INTO public.users (id, email, name, role, created_at)
SELECT 
  id,
  'alina@belka.coffee',
  'Алина',
  'barista',
  created_at
FROM auth.users
WHERE email = 'alina@belka.coffee';

-- Шаг 6: Финальная проверка
SELECT 
  'admin@belka.coffee' as test_user,
  au.instance_id as admin_instance,
  (SELECT instance_id FROM auth.users WHERE email = 'alina@belka.coffee') as alina_instance,
  au.instance_id = (SELECT instance_id FROM auth.users WHERE email = 'alina@belka.coffee') as instances_match
FROM auth.users au
WHERE au.email = 'admin@belka.coffee';

