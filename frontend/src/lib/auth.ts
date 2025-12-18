// ============================================
// Auth Helper для веб-приложения
// Description: Функции для авторизации через email/password
// Updated: 2025-12-18 - Переход на веб-версию (без Telegram)
// ============================================

import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'barista' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Вход через email и пароль
 * @param email - Email пользователя
 * @param password - Пароль
 * @returns Объект пользователя или ошибка
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔐 Попытка входа:', email);
    console.log('📦 Supabase клиент:', supabase ? 'OK' : 'НЕТ');
    
    // 1. Авторизация через Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('📊 Результат Auth:', { authData, authError });

    if (authError) {
      console.error('❌ Ошибка авторизации:', authError);
      return {
        success: false,
        error: authError.message === 'Invalid login credentials' 
          ? 'Неверный email или пароль'
          : authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Не удалось получить данные пользователя',
      };
    }

    // 2. Получаем профиль из таблицы users
    console.log('📝 Получаем профиль для:', email);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('email', email)
      .single();

    console.log('👤 Данные профиля:', { userData, userError });

    if (userError || !userData) {
      console.error('❌ Ошибка получения профиля:', userError);
      return {
        success: false,
        error: 'Профиль пользователя не найден',
      };
    }

    // 3. Сохраняем в localStorage
    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      created_at: userData.created_at,
    };

    localStorage.setItem('user', JSON.stringify(user));
    
    console.log('✅ Вход успешен!', user);
    
    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('💥 Критическая ошибка при входе:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Регистрация нового пользователя (для будущего расширения)
 * @param email - Email
 * @param password - Пароль
 * @param name - Имя
 * @returns Результат регистрации
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    // 1. Создание пользователя в Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Не удалось создать пользователя',
      };
    }

    // 2. Создание профиля в таблице users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role: 'barista', // По умолчанию новые пользователи - бариста
      })
      .select()
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'Не удалось создать профиль',
      };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      created_at: userData.created_at,
    };

    localStorage.setItem('user', JSON.stringify(user));

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Выход из системы
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    // Всё равно очищаем localStorage
    localStorage.removeItem('user');
  }
}

/**
 * Получить текущего пользователя из localStorage
 * @returns Объект пользователя или null
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Проверить является ли пользователь администратором
 * @returns true если пользователь админ
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Проверить является ли пользователь бариста
 * @returns true если пользователь бариста
 */
export function isBarista(): boolean {
  const user = getCurrentUser();
  return user?.role === 'barista';
}

/**
 * Проверить сессию и восстановить пользователя
 * Вызывается при загрузке приложения
 */
export async function checkSession(): Promise<AuthResponse> {
  try {
    // Проверяем сессию в Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // Нет активной сессии - очищаем localStorage
      localStorage.removeItem('user');
      return {
        success: false,
        error: 'Нет активной сессии',
      };
    }

    // Есть сессия - получаем профиль
    const email = session.user.email;
    if (!email) {
      return {
        success: false,
        error: 'Email не найден в сессии',
      };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return {
        success: false,
        error: 'Профиль не найден',
      };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      created_at: userData.created_at,
    };

    localStorage.setItem('user', JSON.stringify(user));

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Хук для React компонентов
 * @example
 * const { user, isAuthenticated, isAdmin } = useAuthStatus();
 */
export function useAuthStatus() {
  const user = getCurrentUser();
  
  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isBarista: user?.role === 'barista',
  };
}
