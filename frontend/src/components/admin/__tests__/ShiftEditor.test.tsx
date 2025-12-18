// ============================================
// ShiftEditor Component Tests
// Description: Тесты для компонента ShiftEditor
// Created: 2025-12-18
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShiftEditor } from '../ShiftEditor';
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

describe('ShiftEditor', () => {
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

    render(<ShiftEditor />);
    expect(screen.getByText(/Загрузка смен/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать сетку смен', async () => {
    const mockShifts = [
      {
        id: '1',
        user_id: '1',
        day_of_week: 1,
        hour: 9,
        status: 'confirmed',
        week_start: '2025-12-15',
      },
      {
        id: '2',
        user_id: '2',
        day_of_week: 2,
        hour: 10,
        status: 'planned',
        week_start: '2025-12-15',
      },
    ];

    const mockUsers = [
      { id: '1', name: 'Бариста 1', role: 'barista' },
      { id: '2', name: 'Бариста 2', role: 'barista' },
    ];

    mockSupabaseFrom.mockImplementation((table: string) => {
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
      return {
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    });

    render(<ShiftEditor />);

    await waitFor(() => {
      expect(screen.getByText('✏️ Редактор смен')).toBeInTheDocument();
    });

    // Проверка статистики
    expect(screen.getByText(/Всего смен:/i)).toBeInTheDocument();
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

    render(<ShiftEditor />);

    await waitFor(() => {
      expect(screen.getByText('✏️ Редактор смен')).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Следующая/i);
    await userEvent.click(nextButton);

    expect(mockSupabaseFrom).toHaveBeenCalled();
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

    render(<ShiftEditor />);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить данные/i)).toBeInTheDocument();
    });
  });

  it('должен отображать инструкцию', async () => {
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

    render(<ShiftEditor />);

    await waitFor(() => {
      expect(screen.getByText('✏️ Редактор смен')).toBeInTheDocument();
    });

    expect(screen.getByText(/Нажмите на любую ячейку/i)).toBeInTheDocument();
  });
});

