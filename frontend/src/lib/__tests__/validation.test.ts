// ============================================
// Tests для validation.ts
// Description: Unit тесты для валидации доступности
// Created: 2025-12-18
// ============================================

import { describe, it, expect } from 'vitest';
import {
  validateAvailability,
  isWeekInFuture,
  isWeekInRange,
  getAvailabilityRecommendations,
  formatValidationErrors,
  type TimeSlot,
} from '../validation';

describe('Validation Tests', () => {
  // ============================================
  // ТЕСТ 1: Валидация пустого массива
  // ============================================

  it('should warn about empty availability', () => {
    const result = validateAvailability([], new Map());

    expect(result.isValid).toBe(true); // Нет ошибок, только предупреждение
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('не выбрали ни одного часа');
  });

  // ============================================
  // ТЕСТ 2: Валидация корректных слотов
  // ============================================

  it('should validate correct slots', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 8 },
      { day: 0, hour: 9 },
      { day: 1, hour: 10 },
    ];

    const shopTemplate = new Map([
      ['0-8', true],
      ['0-9', true],
      ['1-10', true],
    ]);

    const result = validateAvailability(slots, shopTemplate);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  // ============================================
  // ТЕСТ 3: Обнаружение неверного дня недели
  // ============================================

  it('should detect invalid day_of_week', () => {
    const slots: TimeSlot[] = [
      { day: 7, hour: 8 }, // Неверный день
    ];

    const result = validateAvailability(slots, new Map());

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Неверный день недели');
  });

  // ============================================
  // ТЕСТ 4: Обнаружение неверного часа
  // ============================================

  it('should detect invalid hour', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 24 }, // Неверный час
    ];

    const result = validateAvailability(slots, new Map());

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Неверный час');
  });

  // ============================================
  // ТЕСТ 5: Обнаружение дубликатов
  // ============================================

  it('should detect duplicate slots', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 8 },
      { day: 0, hour: 8 }, // Дубликат
    ];

    const shopTemplate = new Map([['0-8', true]]);

    const result = validateAvailability(slots, shopTemplate);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Обнаружены дублирующиеся слоты');
  });

  // ============================================
  // ТЕСТ 6: Обнаружение слотов вне рабочих часов
  // ============================================

  it('should detect slots outside shop hours', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 8 },
      { day: 0, hour: 23 }, // Кофейня закрыта
    ];

    const shopTemplate = new Map([['0-8', true]]); // Только 8:00 открыто

    const result = validateAvailability(slots, shopTemplate);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('кофейня закрыта');
  });

  // ============================================
  // ТЕСТ 7: Предупреждение о малом количестве часов
  // ============================================

  it('should warn about too few hours', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 8 },
      { day: 0, hour: 9 },
    ];

    const shopTemplate = new Map([
      ['0-8', true],
      ['0-9', true],
    ]);

    const result = validateAvailability(slots, shopTemplate);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('Выбрано мало часов'))).toBe(true);
  });

  // ============================================
  // ТЕСТ 8: Предупреждение о большом количестве часов
  // ============================================

  it('should warn about too many hours', () => {
    const slots: TimeSlot[] = Array.from({ length: 50 }, (_, i) => ({
      day: Math.floor(i / 7),
      hour: i % 24,
    }));

    const shopTemplate = new Map(
      slots.map(s => [`${s.day}-${s.hour}`, true])
    );

    const result = validateAvailability(slots, shopTemplate);

    expect(result.warnings.some(w => w.includes('Выбрано много часов'))).toBe(true);
  });

  // ============================================
  // ТЕСТ 9: Проверка недели в будущем
  // ============================================

  it('should check if week is in future', () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(isWeekInFuture(today)).toBe(true);
    expect(isWeekInFuture(nextWeek)).toBe(true);
    expect(isWeekInFuture(lastWeek)).toBe(false);
  });

  // ============================================
  // ТЕСТ 10: Проверка диапазона недели
  // ============================================

  it('should check if week is in range', () => {
    const today = new Date();
    const twoWeeksAhead = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const fiveWeeksAhead = new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000);

    expect(isWeekInRange(today, 4)).toBe(true);
    expect(isWeekInRange(twoWeeksAhead, 4)).toBe(true);
    expect(isWeekInRange(fiveWeeksAhead, 4)).toBe(false);
  });

  // ============================================
  // ТЕСТ 11: Рекомендации для пустого массива
  // ============================================

  it('should provide recommendations for empty availability', () => {
    const recommendations = getAvailabilityRecommendations([]);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toContain('Выберите часы');
  });

  // ============================================
  // ТЕСТ 12: Рекомендации для оптимального количества
  // ============================================

  it('should recommend optimal hours', () => {
    const slots: TimeSlot[] = Array.from({ length: 20 }, (_, i) => ({
      day: Math.floor(i / 3),
      hour: 8 + (i % 12),
    }));

    const recommendations = getAvailabilityRecommendations(slots);

    expect(recommendations.some(r => r.includes('Отлично'))).toBe(true);
  });

  // ============================================
  // ТЕСТ 13: Рекомендация добавить утренние часы
  // ============================================

  it('should recommend morning hours', () => {
    const slots: TimeSlot[] = Array.from({ length: 10 }, (_, i) => ({
      day: 0,
      hour: 14 + i, // Только послеобеденные
    }));

    const recommendations = getAvailabilityRecommendations(slots);

    expect(recommendations.some(r => r.includes('утренние'))).toBe(true);
  });

  // ============================================
  // ТЕСТ 14: Форматирование ошибок
  // ============================================

  it('should format validation errors', () => {
    const result = {
      isValid: false,
      errors: ['Ошибка 1', 'Ошибка 2'],
      warnings: ['Предупреждение 1'],
    };

    const formatted = formatValidationErrors(result);

    expect(formatted).toContain('❌ Ошибки:');
    expect(formatted).toContain('Ошибка 1');
    expect(formatted).toContain('⚠️ Предупреждения:');
    expect(formatted).toContain('Предупреждение 1');
  });

  // ============================================
  // ТЕСТ 15: Предупреждение об одном дне
  // ============================================

  it('should warn about single day selection', () => {
    const slots: TimeSlot[] = [
      { day: 0, hour: 8 },
      { day: 0, hour: 9 },
      { day: 0, hour: 10 },
    ];

    const shopTemplate = new Map([
      ['0-8', true],
      ['0-9', true],
      ['0-10', true],
    ]);

    const result = validateAvailability(slots, shopTemplate);

    expect(result.warnings.some(w => w.includes('только один день'))).toBe(true);
  });
});

