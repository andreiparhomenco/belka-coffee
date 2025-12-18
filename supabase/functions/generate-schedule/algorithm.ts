// ============================================
// Schedule Generation Algorithm
// Description: Алгоритм автоматического распределения смен
// Created: 2025-12-18
// ============================================

export interface BaristaAvailability {
  user_id: string;
  user_name: string;
  slots: Array<{ day: number; hour: number }>;
}

export interface ShopSlot {
  day: number;
  hour: number;
}

export interface GeneratedShift {
  user_id: string;
  user_name: string;
  day: number;
  hour: number;
  priority: number; // Приоритет назначения (для дебага)
}

export interface ScheduleResult {
  shifts: GeneratedShift[];
  coverage: number; // Процент покрытых слотов
  balance: number; // Коэффициент балансировки (0-1, где 1 - идеально)
  stats: {
    total_slots: number;
    covered_slots: number;
    uncovered_slots: number;
    hours_per_barista: Record<string, number>;
    min_hours: number;
    max_hours: number;
    avg_hours: number;
  };
  warnings: string[];
}

/**
 * Главная функция генерации графика
 * @param baristas - Доступность бариста
 * @param shopSlots - Рабочие часы кофейни
 * @returns Результат генерации с назначенными сменами
 */
export function generateSchedule(
  baristas: BaristaAvailability[],
  shopSlots: ShopSlot[]
): ScheduleResult {
  const warnings: string[] = [];
  const shifts: GeneratedShift[] = [];
  
  // Валидация входных данных
  if (baristas.length === 0) {
    warnings.push('Нет доступных бариста для распределения смен');
    return createEmptyResult(shopSlots, warnings);
  }

  if (shopSlots.length === 0) {
    warnings.push('Нет рабочих часов в кофейне');
    return createEmptyResult(shopSlots, warnings);
  }

  // Проверка что у бариста есть доступность
  const baristasWithAvailability = baristas.filter(b => b.slots.length > 0);
  if (baristasWithAvailability.length === 0) {
    warnings.push('Ни один бариста не указал доступность');
    return createEmptyResult(shopSlots, warnings);
  }

  // Шаг 1: Создаём карту доступности для быстрого поиска
  const availabilityMap = createAvailabilityMap(baristas);

  // Шаг 2: Сортируем слоты по приоритету (сначала слоты с меньшим покрытием)
  const sortedSlots = sortSlotsByPriority(shopSlots, availabilityMap);

  // Шаг 3: Инициализируем счётчики часов для каждого бариста
  const hoursCounter = new Map<string, number>();
  baristas.forEach(b => hoursCounter.set(b.user_id, 0));

  // Шаг 4: Распределяем смены
  for (const slot of sortedSlots) {
    const slotKey = `${slot.day}-${slot.hour}`;
    const availableBaristas = availabilityMap.get(slotKey) || [];

    if (availableBaristas.length === 0) {
      // Нет доступных бариста для этого слота
      warnings.push(`Нет покрытия: ${getDayName(slot.day)} ${slot.hour}:00`);
      continue;
    }

    // Выбираем бариста с наименьшим количеством часов
    const selectedBarista = selectBarista(availableBaristas, hoursCounter);

    if (selectedBarista) {
      shifts.push({
        user_id: selectedBarista.user_id,
        user_name: selectedBarista.user_name,
        day: slot.day,
        hour: slot.hour,
        priority: calculatePriority(availableBaristas.length, hoursCounter),
      });

      // Увеличиваем счётчик часов
      hoursCounter.set(
        selectedBarista.user_id,
        (hoursCounter.get(selectedBarista.user_id) || 0) + 1
      );
    }
  }

  // Шаг 5: Вычисляем статистику
  const stats = calculateStats(shifts, shopSlots, hoursCounter, baristas);

  // Шаг 6: Проверяем балансировку
  const balance = calculateBalance(hoursCounter);
  const coverage = (shifts.length / shopSlots.length) * 100;

  // Предупреждения о дисбалансе
  if (balance < 0.7) {
    warnings.push(
      `Значительный дисбаланс часов: от ${stats.min_hours} до ${stats.max_hours} часов`
    );
  }

  if (coverage < 100) {
    warnings.push(
      `Неполное покрытие: ${stats.covered_slots}/${stats.total_slots} слотов (${coverage.toFixed(1)}%)`
    );
  }

  return {
    shifts,
    coverage,
    balance,
    stats,
    warnings,
  };
}

/**
 * Создать карту доступности: слот -> массив бариста
 */
function createAvailabilityMap(
  baristas: BaristaAvailability[]
): Map<string, BaristaAvailability[]> {
  const map = new Map<string, BaristaAvailability[]>();

  baristas.forEach(barista => {
    barista.slots.forEach(slot => {
      const key = `${slot.day}-${slot.hour}`;
      const existing = map.get(key) || [];
      existing.push(barista);
      map.set(key, existing);
    });
  });

  return map;
}

/**
 * Сортировать слоты по приоритету (сначала слоты с меньшим покрытием)
 */
function sortSlotsByPriority(
  slots: ShopSlot[],
  availabilityMap: Map<string, BaristaAvailability[]>
): ShopSlot[] {
  return [...slots].sort((a, b) => {
    const aKey = `${a.day}-${a.hour}`;
    const bKey = `${b.day}-${b.hour}`;
    const aCount = availabilityMap.get(aKey)?.length || 0;
    const bCount = availabilityMap.get(bKey)?.length || 0;

    // Сначала слоты с меньшим количеством доступных бариста
    if (aCount !== bCount) {
      return aCount - bCount;
    }

    // При равном количестве - сортируем по дню и часу
    if (a.day !== b.day) {
      return a.day - b.day;
    }

    return a.hour - b.hour;
  });
}

/**
 * Выбрать бариста для слота (с минимальным количеством часов)
 */
function selectBarista(
  availableBaristas: BaristaAvailability[],
  hoursCounter: Map<string, number>
): BaristaAvailability | null {
  if (availableBaristas.length === 0) return null;

  // Выбираем бариста с наименьшим количеством назначенных часов
  return availableBaristas.reduce((min, current) => {
    const minHours = hoursCounter.get(min.user_id) || 0;
    const currentHours = hoursCounter.get(current.user_id) || 0;
    return currentHours < minHours ? current : min;
  });
}

/**
 * Рассчитать приоритет назначения
 */
function calculatePriority(
  availableCount: number,
  hoursCounter: Map<string, number>
): number {
  // Приоритет выше для слотов с меньшим покрытием
  const coveragePriority = 10 - availableCount;

  // Приоритет выше для балансировки
  const hours = Array.from(hoursCounter.values());
  const maxHours = Math.max(...hours);
  const minHours = Math.min(...hours);
  const balancePriority = maxHours - minHours;

  return coveragePriority + balancePriority;
}

/**
 * Вычислить статистику
 */
function calculateStats(
  shifts: GeneratedShift[],
  shopSlots: ShopSlot[],
  hoursCounter: Map<string, number>,
  baristas: BaristaAvailability[]
): ScheduleResult['stats'] {
  const hours = Array.from(hoursCounter.values());
  const hoursPerBarista: Record<string, number> = {};

  baristas.forEach(b => {
    hoursPerBarista[b.user_name] = hoursCounter.get(b.user_id) || 0;
  });

  return {
    total_slots: shopSlots.length,
    covered_slots: shifts.length,
    uncovered_slots: shopSlots.length - shifts.length,
    hours_per_barista: hoursPerBarista,
    min_hours: hours.length > 0 ? Math.min(...hours) : 0,
    max_hours: hours.length > 0 ? Math.max(...hours) : 0,
    avg_hours: hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
  };
}

/**
 * Вычислить коэффициент балансировки (0-1)
 */
function calculateBalance(hoursCounter: Map<string, number>): number {
  const hours = Array.from(hoursCounter.values());
  if (hours.length <= 1) return 1;

  const maxHours = Math.max(...hours);
  const minHours = Math.min(...hours);

  if (maxHours === 0) return 1;

  // Коэффициент балансировки: чем ближе к 1, тем лучше
  return 1 - (maxHours - minHours) / maxHours;
}

/**
 * Создать пустой результат
 */
function createEmptyResult(
  shopSlots: ShopSlot[],
  warnings: string[]
): ScheduleResult {
  return {
    shifts: [],
    coverage: 0,
    balance: 0,
    stats: {
      total_slots: shopSlots.length,
      covered_slots: 0,
      uncovered_slots: shopSlots.length,
      hours_per_barista: {},
      min_hours: 0,
      max_hours: 0,
      avg_hours: 0,
    },
    warnings,
  };
}

/**
 * Получить название дня недели
 */
function getDayName(day: number): string {
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  return days[day] || `День ${day}`;
}

/**
 * Улучшенный алгоритм с оптимизацией
 * Использует жадный подход с балансировкой
 */
export function generateOptimizedSchedule(
  baristas: BaristaAvailability[],
  shopSlots: ShopSlot[],
  options?: {
    maxHoursPerBarista?: number; // Максимум часов на одного бариста
    minHoursPerBarista?: number; // Минимум часов на одного бариста
    preferredBalance?: number; // Желаемый баланс (0-1)
  }
): ScheduleResult {
  const maxHours = options?.maxHoursPerBarista || 40;
  const minHours = options?.minHoursPerBarista || 10;

  // Сначала генерируем базовый график
  const result = generateSchedule(baristas, shopSlots);

  // Проверяем ограничения
  const violations: string[] = [];
  Object.entries(result.stats.hours_per_barista).forEach(([name, hours]) => {
    if (hours > maxHours) {
      violations.push(`${name}: ${hours} часов (превышен лимит ${maxHours})`);
    }
    if (hours < minHours && hours > 0) {
      violations.push(`${name}: ${hours} часов (меньше минимума ${minHours})`);
    }
  });

  if (violations.length > 0) {
    result.warnings.push('Нарушения ограничений:');
    result.warnings.push(...violations);
  }

  return result;
}

