// ============================================
// Auth Helper для Telegram Mini App
// Description: Функции для авторизации через Telegram
// Created: 2025-12-15
// ============================================

import { supabase } from './supabaseClient';

const TELEGRAM_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`;

export interface User {
  id: string;
  telegram_id: number;
  name: string;
  role: 'barista' | 'admin';
  created_at: string;
}

export interface TelegramAuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Авторизация пользователя через Telegram ID
 * @param telegram_id - ID пользователя в Telegram
 * @param name - Полное имя пользователя
 * @param username - Username в Telegram (опционально)
 * @returns Объект пользователя или ошибка
 */
export async function telegramAuth(
  telegram_id: number,
  name: string,
  username?: string
): Promise<TelegramAuthResponse> {
  try {
    const response = await fetch(TELEGRAM_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        telegram_id,
        name,
        username,
      }),
    });

    const data: TelegramAuthResponse = await response.json();

    if (data.success && data.user) {
      // Сохраняем пользователя в localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('telegram_id', data.user.telegram_id.toString());
      
      return data;
    } else {
      console.error('Ошибка авторизации:', data.error);
      return data;
    }
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
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
 * Выйти из системы (очистить localStorage)
 */
export function logout(): void {
  localStorage.removeItem('user');
  localStorage.removeItem('user_id');
  localStorage.removeItem('telegram_id');
}

/**
 * Автоматическая авторизация через Telegram WebApp
 * Вызывается при запуске Mini App
 */
export async function autoAuthFromTelegram(): Promise<TelegramAuthResponse> {
  const tg = window.Telegram?.WebApp;
  
  if (!tg) {
    return {
      success: false,
      error: 'Telegram WebApp API недоступен',
    };
  }

  const user = tg.initDataUnsafe?.user;
  
  if (!user || !user.id) {
    return {
      success: false,
      error: 'Не удалось получить данные пользователя из Telegram',
    };
  }

  // Собираем имя
  const name = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ') || 'Без имени';

  // Авторизуемся
  return await telegramAuth(
    user.id,
    name,
    user.username
  );
}

/**
 * Хук для React компонентов
 * @example
 * const { user, loading, error } = useAuth();
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

