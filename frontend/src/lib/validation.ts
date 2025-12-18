// ============================================
// Validation Helpers
// Description: Функции валидации для доступности
// Created: 2025-12-18
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TimeSlot {
  day: number;
  hour: number;
}

/**
 * Валидация выбранных слотов доступности
 * @param slots - Массив выбранных слотов
 * @param shopTemplate - Map рабочих часов кофейни
 * @returns Результат валидации с ошибками и предупреждениями
 */
export function validateAvailability(
  slots: TimeSlot[],
  shopTemplate: Map<string, boolean>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверка 1: Минимальное количество часов
  if (slots.length === 0) {
    warnings.push('Вы не выбрали ни одного часа доступности');
  }

  // Проверка 2: Слишком мало часов (меньше 10 в неделю)
  if (slots.length > 0 && slots.length < 10) {
    warnings.push(`Выбрано мало часов (${slots.length}). Рекомендуется минимум 10 часов в неделю`);
  }

  // Проверка 3: Слишком много часов (больше 40 в неделю)
  if (slots.length > 40) {
    warnings.push(`Выбрано много часов (${slots.length}). Рекомендуется максимум 40 часов в неделю`);
  }

  // Проверка 4: Валидность day_of_week
  slots.forEach((slot, index) => {
    if (slot.day < 0 || slot.day > 6) {
      errors.push(`Слот ${index + 1}: Неверный день недели (${slot.day}). Должен быть от 0 до 6`);
    }
  });

  // Проверка 5: Валидность hour
  slots.forEach((slot, index) => {
    if (slot.hour < 0 || slot.hour > 23) {
      errors.push(`Слот ${index + 1}: Неверный час (${slot.hour}). Должен быть от 0 до 23`);
    }
  });

  // Проверка 6: Дубликаты
  const uniqueSlots = new Set(slots.map(s => `${s.day}-${s.hour}`));
  if (uniqueSlots.size < slots.length) {
    errors.push('Обнаружены дублирующиеся слоты');
  }

  // Проверка 7: Слоты вне рабочих часов кофейни
  const invalidSlots: string[] = [];
  slots.forEach(slot => {
    const key = `${slot.day}-${slot.hour}`;
    if (!shopTemplate.get(key)) {
      invalidSlots.push(key);
    }
  });

  if (invalidSlots.length > 0) {
    errors.push(
      `Выбраны часы, когда кофейня закрыта: ${invalidSlots.length} слотов`
    );
  }

  // Проверка 8: Распределение по дням
  const daysMap = new Map<number, number>();
  slots.forEach(slot => {
    daysMap.set(slot.day, (daysMap.get(slot.day) || 0) + 1);
  });

  // Проверяем что есть хотя бы 2 дня
  if (daysMap.size === 1 && slots.length > 0) {
    warnings.push('Вы выбрали только один день. Рекомендуется выбрать несколько дней');
  }

  // Проверяем что нет перегрузки одного дня
  daysMap.forEach((count, day) => {
    if (count > 12) {
      warnings.push(`День ${day + 1}: Выбрано ${count} часов. Это может быть слишком много`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Проверка что слот находится в будущем
 * @param weekStart - Дата начала недели
 * @returns true если неделя в будущем или текущая
 */
export function isWeekInFuture(weekStart: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const week = new Date(weekStart);
  week.setHours(0, 0, 0, 0);
  
  return week >= today;
}

/**
 * Проверка что неделя не слишком далеко в будущем
 * @param weekStart - Дата начала недели
 * @param maxWeeksAhead - Максимальное количество недель вперёд (по умолчанию 4)
 * @returns true если неделя в допустимом диапазоне
 */
export function isWeekInRange(weekStart: Date, maxWeeksAhead: number = 4): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxWeeksAhead * 7);
  
  const week = new Date(weekStart);
  week.setHours(0, 0, 0, 0);
  
  return week <= maxDate;
}

/**
 * Получить рекомендации по улучшению доступности
 * @param slots - Массив выбранных слотов
 * @returns Массив рекомендаций
 */
export function getAvailabilityRecommendations(slots: TimeSlot[]): string[] {
  const recommendations: string[] = [];

  if (slots.length === 0) {
    recommendations.push('💡 Выберите часы когда вы можете работать');
    return recommendations;
  }

  // Проверяем распределение по дням
  const daysMap = new Map<number, number>();
  slots.forEach(slot => {
    daysMap.set(slot.day, (daysMap.get(slot.day) || 0) + 1);
  });

  // Рекомендация 1: Добавить больше дней
  if (daysMap.size < 3 && slots.length < 20) {
    recommendations.push('💡 Попробуйте добавить ещё дни для большей гибкости графика');
  }

  // Рекомендация 2: Утренние часы
  const morningSlots = slots.filter(s => s.hour >= 6 && s.hour < 12).length;
  if (morningSlots === 0 && slots.length > 5) {
    recommendations.push('💡 Рассмотрите возможность работы в утренние часы (6:00-12:00)');
  }

  // Рекомендация 3: Вечерние часы
  const eveningSlots = slots.filter(s => s.hour >= 18 && s.hour < 22).length;
  if (eveningSlots === 0 && slots.length > 5) {
    recommendations.push('💡 Вечерние часы (18:00-22:00) обычно востребованы');
  }

  // Рекомендация 4: Выходные
  const weekendSlots = slots.filter(s => s.day === 5 || s.day === 6).length;
  if (weekendSlots === 0 && slots.length > 10) {
    recommendations.push('💡 Добавьте выходные дни для увеличения часов');
  }

  // Рекомендация 5: Оптимальное количество часов
  if (slots.length >= 10 && slots.length <= 30) {
    recommendations.push('✅ Отличное количество часов для стабильного графика!');
  }

  return recommendations;
}

/**
 * Форматирование ошибок валидации для отображения
 * @param result - Результат валидации
 * @returns Отформатированная строка
 */
export function formatValidationErrors(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push('❌ Ошибки:');
    result.errors.forEach(err => parts.push(`  • ${err}`));
  }

  if (result.warnings.length > 0) {
    parts.push('⚠️ Предупреждения:');
    result.warnings.forEach(warn => parts.push(`  • ${warn}`));
  }

  return parts.join('\n');
}

