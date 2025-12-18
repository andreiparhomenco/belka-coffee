// ============================================
// UserManagement Component Tests
// Description: Тесты для компонента UserManagement
// Created: 2025-12-18
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagement } from '../UserManagement';
import { supabase } from '../../../lib/supabaseClient';

// Mock Supabase
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock window.alert and window.confirm
(global as any).alert = vi.fn();
(global as any).confirm = vi.fn(() => true);

// Remove unused console warnings
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('UserManagement', () => {
  const mockSupabaseFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any) = mockSupabaseFrom;
  });

  it('должен отображать загрузку при инициализации', () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      }),
    });

    render(<UserManagement />);
    expect(screen.getByText(/Загрузка пользователей/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать список пользователей', async () => {
    const mockUsers = [
      {
        id: '1',
        telegram_id: 12345,
        name: 'Иван Иванов',
        role: 'barista',
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        telegram_id: 54321,
        name: 'Пётр Петров',
        role: 'admin',
        created_at: '2025-01-02T00:00:00Z',
      },
    ];

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Иван Иванов')).toBeInTheDocument();
      expect(screen.getByText('Пётр Петров')).toBeInTheDocument();
    });

    expect(screen.getByText(/Всего пользователей: 2/i)).toBeInTheDocument();
  });

  it('должен показывать пустое состояние', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Пользователей пока нет/i)).toBeInTheDocument();
    });
  });

  it('должен открывать форму добавления пользователя', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Пользователей пока нет/i)).toBeInTheDocument();
    });

    const addButton = screen.getAllByText(/Добавить/i)[0];
    await userEvent.click(addButton);

    expect(screen.getByText(/Добавить пользователя/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('123456789')).toBeInTheDocument();
  });

  it('должен добавлять нового пользователя', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Пользователей пока нет/i)).toBeInTheDocument();
    });

    const addButton = screen.getAllByText(/Добавить/i)[0];
    await userEvent.click(addButton);

    // Заполнение формы
    const telegramIdInput = screen.getByPlaceholderText('123456789');
    const nameInput = screen.getByPlaceholderText('Иван Иванов');

    await userEvent.type(telegramIdInput, '12345');
    await userEvent.type(nameInput, 'Тест Тестов');

    const saveButton = screen.getByText('Добавить');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
    });
  });

  it('должен обрабатывать ошибки загрузки', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Test error' },
        }),
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить список пользователей/i)).toBeInTheDocument();
    });
  });

  it('должен отображать статистику по ролям', async () => {
    const mockUsers = [
      {
        id: '1',
        telegram_id: 12345,
        name: 'Бариста 1',
        role: 'barista',
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        telegram_id: 54321,
        name: 'Бариста 2',
        role: 'barista',
        created_at: '2025-01-02T00:00:00Z',
      },
      {
        id: '3',
        telegram_id: 67890,
        name: 'Админ',
        role: 'admin',
        created_at: '2025-01-03T00:00:00Z',
      },
    ];

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Бариста:/i)).toBeInTheDocument();
      expect(screen.getByText(/Администраторы:/i)).toBeInTheDocument();
    });
  });
});

