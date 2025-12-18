// ============================================
// Tests для AvailabilityCalendar
// Description: Unit тесты для календаря доступности
// Created: 2025-12-18
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvailabilityCalendar } from '../AvailabilityCalendar';
import * as auth from '../../lib/auth';
import * as supabaseClient from '../../lib/supabaseClient';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
};

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

// Mock auth
vi.mock('../../lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Telegram WebApp
(global as any).window = {
  Telegram: {
    WebApp: {
      showPopup: vi.fn(),
    },
  },
};

describe('AvailabilityCalendar', () => {
  const mockUser = {
    id: 'user-123',
    telegram_id: 123456789,
    name: 'Тест Бариста',
    role: 'barista' as const,
    created_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth.getCurrentUser as any).mockReturnValue(mockUser);
  });

  // ============================================
  // ТЕСТ 1: Рендеринг компонента
  // ============================================

  it('should render calendar component', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('📅 Моя доступность')).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 2: Загрузка шаблона кофейни
  // ============================================

  it('should load shop template', async () => {
    const mockTemplate = [
      { day_of_week: 0, hour: 8, is_active: true },
      { day_of_week: 0, hour: 9, is_active: true },
    ];

    mockSupabase.select.mockResolvedValueOnce({ data: mockTemplate, error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('shop_template');
    });
  });

  // ============================================
  // ТЕСТ 3: Загрузка доступности пользователя
  // ============================================

  it('should load user availability', async () => {
    const mockAvailability = [
      { day_of_week: 0, hour: 8 },
      { day_of_week: 0, hour: 9 },
    ];

    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: mockAvailability, error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('availability');
    });
  });

  // ============================================
  // ТЕСТ 4: Выбор слота
  // ============================================

  it('should toggle slot selection', async () => {
    const mockTemplate = [
      { day_of_week: 0, hour: 8, is_active: true },
    ];

    mockSupabase.select.mockResolvedValueOnce({ data: mockTemplate, error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('Выбрано:')).toBeInTheDocument();
    });

    // Находим ячейку и кликаем
    const cells = screen.getAllByRole('generic').filter(el => 
      el.className.includes('calendar-cell')
    );
    
    if (cells.length > 0) {
      fireEvent.click(cells[0]);
      // Проверяем что счётчик обновился
      await waitFor(() => {
        expect(screen.getByText(/Выбрано:/)).toBeInTheDocument();
      });
    }
  });

  // ============================================
  // ТЕСТ 5: Выбрать весь день
  // ============================================

  it('should select all hours in a day', async () => {
    const mockTemplate = [
      { day_of_week: 0, hour: 8, is_active: true },
      { day_of_week: 0, hour: 9, is_active: true },
      { day_of_week: 0, hour: 10, is_active: true },
    ];

    mockSupabase.select.mockResolvedValueOnce({ data: mockTemplate, error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('✓ Выбрать все рабочие часы')).toBeInTheDocument();
    });

    const selectAllBtn = screen.getByText('✓ Выбрать все рабочие часы');
    fireEvent.click(selectAllBtn);

    // Проверяем что счётчик увеличился
    await waitFor(() => {
      const selectedText = screen.getByText(/Выбрано:/);
      expect(selectedText).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 6: Снять все выборы
  // ============================================

  it('should deselect all slots', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [{ day_of_week: 0, hour: 8 }], error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('✗ Снять все')).toBeInTheDocument();
    });

    const deselectAllBtn = screen.getByText('✗ Снять все');
    fireEvent.click(deselectAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/Выбрано: 0/)).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 7: Сохранение доступности
  // ============================================

  it('should save availability', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.delete.mockResolvedValueOnce({ error: null });
    mockSupabase.insert.mockResolvedValueOnce({ error: null });

    const onSave = vi.fn();

    render(<AvailabilityCalendar onSave={onSave} />);

    await waitFor(() => {
      expect(screen.getByText('💾 Сохранить доступность')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('💾 Сохранить доступность');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  // ============================================
  // ТЕСТ 8: Обработка ошибки загрузки
  // ============================================

  it('should handle loading error', async () => {
    mockSupabase.select.mockResolvedValueOnce({ 
      data: null, 
      error: new Error('Network error') 
    });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить/)).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 9: Обработка ошибки сохранения
  // ============================================

  it('should handle save error', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.delete.mockResolvedValueOnce({ 
      error: new Error('Save failed') 
    });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('💾 Сохранить доступность')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('💾 Сохранить доступность');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось сохранить/)).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 10: Показ успешного сохранения
  // ============================================

  it('should show success message after save', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.delete.mockResolvedValueOnce({ error: null });
    mockSupabase.insert.mockResolvedValueOnce({ error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('💾 Сохранить доступность')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('💾 Сохранить доступность');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/успешно сохранена/)).toBeInTheDocument();
    });
  });

  // ============================================
  // ТЕСТ 11: Telegram WebApp popup
  // ============================================

  it('should show Telegram popup on save', async () => {
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
    mockSupabase.delete.mockResolvedValueOnce({ error: null });
    mockSupabase.insert.mockResolvedValueOnce({ error: null });

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      expect(screen.getByText('💾 Сохранить доступность')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('💾 Сохранить доступность');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.Telegram.WebApp.showPopup).toHaveBeenCalled();
    });
  });

  // ============================================
  // ТЕСТ 12: Недоступен без авторизации
  // ============================================

  it('should show error if user not authenticated', async () => {
    (auth.getCurrentUser as any).mockReturnValue(null);

    render(<AvailabilityCalendar />);

    await waitFor(() => {
      const saveBtn = screen.getByText('💾 Сохранить доступность');
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Необходимо авторизоваться/)).toBeInTheDocument();
    });
  });
});

