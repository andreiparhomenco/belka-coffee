// ============================================
// Dashboard Component Tests
// Description: Тесты для компонента Dashboard
// Created: 2025-12-18
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { supabase } from '../../../lib/supabaseClient';

// Mock Supabase
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Dashboard', () => {
  const mockSupabaseFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any) = mockSupabaseFrom;
  });

  it('должен отображать загрузку при инициализации', () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        }),
        order: vi.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      }),
    });

    render(<Dashboard />);
    expect(screen.getByText(/Загрузка статистики/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать статистику', async () => {
    const mockUsers = [
      { id: '1', name: 'Бариста 1', role: 'barista' },
      { id: '2', name: 'Бариста 2', role: 'barista' },
    ];

    const mockShifts = [
      { id: '1', user_id: '1', status: 'confirmed', day_of_week: 1, hour: 9 },
      { id: '2', user_id: '1', status: 'planned', day_of_week: 1, hour: 10 },
      { id: '3', user_id: '2', status: 'confirmed', day_of_week: 2, hour: 9 },
    ];

    const mockShopTemplate = [
      { id: '1', day_of_week: 1, open_hour: 9, close_hour: 20 },
      { id: '2', day_of_week: 2, open_hour: 9, close_hour: 20 },
    ];

    const mockAvailability = [
      { user_id: '1', week_start: '2025-12-15', day_of_week: 1, hour: 9 },
      { user_id: '1', week_start: '2025-12-15', day_of_week: 1, hour: 10 },
    ];

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockUsers,
              error: null,
            }),
          }),
        };
      }
      if (table === 'shifts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                data: mockShifts,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'shop_template') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockShopTemplate,
              error: null,
            }),
          }),
        };
      }
      if (table === 'availability') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockAvailability,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      };
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('📊 Панель администратора')).toBeInTheDocument();
    });

    // Проверка статистики
    expect(screen.getByText('2')).toBeInTheDocument(); // Всего бариста
    expect(screen.getByText('3')).toBeInTheDocument(); // Всего смен
    expect(screen.getByText(/Подтверждено/i)).toBeInTheDocument();
  });

  it('должен переключать недели', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
          order: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('📊 Панель администратора')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Следующая/i);
    await userEvent.click(nextButton);

    expect(mockSupabaseFrom).toHaveBeenCalled();
  });

  it('должен отображать предупреждения', async () => {
    const mockUsers = [{ id: '1', name: 'Бариста 1', role: 'barista' }];
    const mockShifts = [
      { id: '1', user_id: '1', status: 'planned', day_of_week: 1, hour: 9 },
    ];
    const mockShopTemplate = [
      { id: '1', day_of_week: 1, open_hour: 9, close_hour: 20 },
      { id: '2', day_of_week: 2, open_hour: 9, close_hour: 20 },
    ];

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockUsers,
              error: null,
            }),
          }),
        };
      }
      if (table === 'shifts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                data: mockShifts,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'shop_template') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockShopTemplate,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('📊 Панель администратора')).toBeInTheDocument();
    });

    // Должны быть предупреждения
    expect(screen.getByText(/Требуют внимания/i)).toBeInTheDocument();
  });

  it('должен обрабатывать ошибки загрузки', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            data: null,
            error: { message: 'Test error' },
          }),
        }),
      }),
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить статистику/i)).toBeInTheDocument();
    });
  });
});

