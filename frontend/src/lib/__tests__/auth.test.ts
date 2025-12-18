// ============================================
// Tests для auth.ts
// Description: Unit тесты для auth helper
// Created: 2025-12-15
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  telegramAuth,
  getCurrentUser,
  isAdmin,
  isBarista,
  logout,
  autoAuthFromTelegram,
  useAuthStatus,
} from '../auth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

describe('Auth Helper Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ============================================
  // ТЕСТ 1: telegramAuth - успешная авторизация
  // ============================================

  it('should successfully authenticate user', async () => {
    const mockUser = {
      id: 'uuid-123',
      telegram_id: 123456789,
      name: 'Тест Тестович',
      role: 'barista' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        user: mockUser,
      }),
    });

    const result = await telegramAuth(123456789, 'Тест Тестович');

    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    expect(localStorage.getItem('user_id')).toBe(mockUser.id);
    expect(localStorage.getItem('telegram_id')).toBe('123456789');
  });

  // ============================================
  // ТЕСТ 2: telegramAuth - ошибка API
  // ============================================

  it('should handle API error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Database connection failed',
      }),
    });

    const result = await telegramAuth(123456789, 'Тест Тестович');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection failed');
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ============================================
  // ТЕСТ 3: getCurrentUser - пользователь существует
  // ============================================

  it('should get current user from localStorage', () => {
    const mockUser = {
      id: 'uuid-123',
      telegram_id: 123456789,
      name: 'Тест Тестович',
      role: 'admin' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    localStorage.setItem('user', JSON.stringify(mockUser));

    const user = getCurrentUser();

    expect(user).toEqual(mockUser);
  });

  // ============================================
  // ТЕСТ 4: getCurrentUser - пользователь отсутствует
  // ============================================

  it('should return null if no user in localStorage', () => {
    const user = getCurrentUser();
    expect(user).toBeNull();
  });

  // ============================================
  // ТЕСТ 5: getCurrentUser - некорректный JSON
  // ============================================

  it('should return null if JSON is invalid', () => {
    localStorage.setItem('user', 'invalid-json');

    const user = getCurrentUser();
    expect(user).toBeNull();
  });

  // ============================================
  // ТЕСТ 6: isAdmin - пользователь админ
  // ============================================

  it('should return true for admin user', () => {
    const mockUser = {
      id: 'uuid-123',
      telegram_id: 123456789,
      name: 'Админ',
      role: 'admin' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    localStorage.setItem('user', JSON.stringify(mockUser));

    expect(isAdmin()).toBe(true);
    expect(isBarista()).toBe(false);
  });

  // ============================================
  // ТЕСТ 7: isBarista - пользователь бариста
  // ============================================

  it('should return true for barista user', () => {
    const mockUser = {
      id: 'uuid-123',
      telegram_id: 123456789,
      name: 'Бариста',
      role: 'barista' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    localStorage.setItem('user', JSON.stringify(mockUser));

    expect(isBarista()).toBe(true);
    expect(isAdmin()).toBe(false);
  });

  // ============================================
  // ТЕСТ 8: logout - очистка данных
  // ============================================

  it('should clear localStorage on logout', () => {
    localStorage.setItem('user', JSON.stringify({ id: '123' }));
    localStorage.setItem('user_id', '123');
    localStorage.setItem('telegram_id', '456');

    logout();

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
    expect(localStorage.getItem('telegram_id')).toBeNull();
  });

  // ============================================
  // ТЕСТ 9: autoAuthFromTelegram - успешно
  // ============================================

  it('should auto-auth from Telegram WebApp', async () => {
    // Mock Telegram WebApp
    (global as any).window = {
      Telegram: {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 987654321,
              first_name: 'Иван',
              last_name: 'Петров',
              username: 'ivan_petrov',
            },
          },
        },
      },
    };

    const mockUser = {
      id: 'uuid-789',
      telegram_id: 987654321,
      name: 'Иван Петров',
      role: 'barista' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        user: mockUser,
      }),
    });

    const result = await autoAuthFromTelegram();

    expect(result.success).toBe(true);
    expect(result.user).toEqual(mockUser);
  });

  // ============================================
  // ТЕСТ 10: autoAuthFromTelegram - Telegram API недоступен
  // ============================================

  it('should fail if Telegram WebApp API is unavailable', async () => {
    (global as any).window = {};

    const result = await autoAuthFromTelegram();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Telegram WebApp API недоступен');
  });

  // ============================================
  // ТЕСТ 11: useAuthStatus - пользователь авторизован
  // ============================================

  it('should return correct auth status for authenticated user', () => {
    const mockUser = {
      id: 'uuid-123',
      telegram_id: 123456789,
      name: 'Тест',
      role: 'admin' as const,
      created_at: '2025-01-15T10:00:00Z',
    };

    localStorage.setItem('user', JSON.stringify(mockUser));

    const status = useAuthStatus();

    expect(status.isAuthenticated).toBe(true);
    expect(status.isAdmin).toBe(true);
    expect(status.isBarista).toBe(false);
    expect(status.user).toEqual(mockUser);
  });

  // ============================================
  // ТЕСТ 12: useAuthStatus - пользователь не авторизован
  // ============================================

  it('should return correct auth status for non-authenticated user', () => {
    const status = useAuthStatus();

    expect(status.isAuthenticated).toBe(false);
    expect(status.isAdmin).toBe(false);
    expect(status.isBarista).toBe(false);
    expect(status.user).toBeNull();
  });
});

