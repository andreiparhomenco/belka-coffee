// ============================================
// Reports Component Tests
// Description: Тесты для компонента Reports
// Created: 2025-12-18
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Reports } from '../Reports';
import { supabase } from '../../../lib/supabaseClient';

// Mock Supabase
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Reports', () => {
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
          order: vi.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    render(<Reports />);
    expect(screen.getByText(/Загрузка отчётов/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать еженедельный отчёт', async () => {
    const mockUsers = [
      { id: '1', name: 'Бариста 1', role: 'barista' },
    ];

    const mockShifts = [
      {
        id: '1',
        user_id: '1',
        status: 'confirmed',
        day_of_week: 1,
        hour: 9,
        week_start: '2025-12-15',
      },
      {
        id: '2',
        user_id: '1',
        status: 'completed',
        day_of_week: 2,
        hour: 10,
        week_start: '2025-12-15',
      },
    ];

    const mockReports = [
      {
        id: '1',
        shift_id: '2',
        turnover: 5000,
        notes: 'Test',
      },
    ];

    const mockShopTemplate = [
      { id: '1', day_of_week: 1, open_hour: 9, close_hour: 20, is_active: true },
    ];

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'shifts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: mockShifts,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'shift_reports') {
        return {
          select: vi.fn().mockResolvedValue({
            data: mockReports,
            error: null,
          }),
        };
      }
      if (table === 'shop_template') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockShopTemplate,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    });

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('📊 Отчёты и аналитика')).toBeInTheDocument();
    });

    // Проверка еженедельного отчёта
    expect(screen.getByText(/Сводка за неделю/i)).toBeInTheDocument();
  });

  it('должен переключаться между типами отчётов', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('📊 Отчёты и аналитика')).toBeInTheDocument();
    });

    const baristaReportButton = screen.getByText(/Отчёт по бариста/i);
    await userEvent.click(baristaReportButton);

    expect(screen.getByText(/Экспорт в CSV/i)).toBeInTheDocument();

    const turnoverReportButton = screen.getByText(/Отчёт по выручке/i);
    await userEvent.click(turnoverReportButton);

    expect(screen.getByText(/Отчёт по выручке/i)).toBeInTheDocument();
  });

  it('должен обрабатывать ошибки загрузки', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Test error' },
          }),
        }),
      }),
    });

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить отчёты/i)).toBeInTheDocument();
    });
  });

  it('должен переключать недели', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('📊 Отчёты и аналитика')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Следующая/i);
    await userEvent.click(nextButton);

    expect(mockSupabaseFrom).toHaveBeenCalled();
  });
});

