// ============================================
// Tests для Schedule Algorithm
// Description: Unit тесты для алгоритма распределения смен
// Created: 2025-12-18
// ============================================

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  generateSchedule,
  generateOptimizedSchedule,
  type BaristaAvailability,
  type ShopSlot,
} from "../algorithm.ts";

// ============================================
// ТЕСТ 1: Базовая генерация с одним бариста
// ============================================

Deno.test("should generate schedule for single barista", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
        { day: 0, hour: 10 },
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 },
    { day: 0, hour: 10 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 3);
  assertEquals(result.coverage, 100);
  assertEquals(result.stats.covered_slots, 3);
  assertEquals(result.stats.uncovered_slots, 0);
});

// ============================================
// ТЕСТ 2: Балансировка между несколькими бариста
// ============================================

Deno.test("should balance hours between multiple baristas", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
        { day: 0, hour: 10 },
        { day: 0, hour: 11 },
      ],
    },
    {
      user_id: "user2",
      user_name: "Бариста 2",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
        { day: 0, hour: 10 },
        { day: 0, hour: 11 },
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 },
    { day: 0, hour: 10 },
    { day: 0, hour: 11 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 4);
  assertEquals(result.stats.hours_per_barista["Бариста 1"], 2);
  assertEquals(result.stats.hours_per_barista["Бариста 2"], 2);
  assert(result.balance >= 0.9); // Должна быть хорошая балансировка
});

// ============================================
// ТЕСТ 3: Приоритет слотов с меньшим покрытием
// ============================================

Deno.test("should prioritize slots with less coverage", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
      ],
    },
    {
      user_id: "user2",
      user_name: "Бариста 2",
      slots: [
        { day: 0, hour: 9 }, // Только один слот доступен обоим
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 2);
  assertEquals(result.coverage, 100);
  
  // Слот 8:00 должен быть назначен Бариста 1 (единственный доступный)
  const shift8 = result.shifts.find(s => s.hour === 8);
  assertEquals(shift8?.user_name, "Бариста 1");
});

// ============================================
// ТЕСТ 4: Обработка непокрытых слотов
// ============================================

Deno.test("should handle uncovered slots", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 }, // Нет доступных бариста
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 1);
  assertEquals(result.coverage, 50);
  assertEquals(result.stats.uncovered_slots, 1);
  assert(result.warnings.length > 0);
  assert(result.warnings.some(w => w.includes("Нет покрытия")));
});

// ============================================
// ТЕСТ 5: Пустой массив бариста
// ============================================

Deno.test("should handle empty baristas array", () => {
  const baristas: BaristaAvailability[] = [];
  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 0);
  assertEquals(result.coverage, 0);
  assert(result.warnings.length > 0);
  assert(result.warnings.some(w => w.includes("Нет доступных бариста")));
});

// ============================================
// ТЕСТ 6: Бариста без доступности
// ============================================

Deno.test("should handle baristas without availability", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 0);
  assertEquals(result.coverage, 0);
  assert(result.warnings.some(w => w.includes("не указал доступность")));
});

// ============================================
// ТЕСТ 7: Большой график (неделя)
// ============================================

Deno.test("should generate schedule for full week", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: Array.from({ length: 50 }, (_, i) => ({
        day: Math.floor(i / 10),
        hour: 8 + (i % 10),
      })),
    },
    {
      user_id: "user2",
      user_name: "Бариста 2",
      slots: Array.from({ length: 50 }, (_, i) => ({
        day: Math.floor(i / 10),
        hour: 8 + (i % 10),
      })),
    },
    {
      user_id: "user3",
      user_name: "Бариста 3",
      slots: Array.from({ length: 50 }, (_, i) => ({
        day: Math.floor(i / 10),
        hour: 8 + (i % 10),
      })),
    },
  ];

  const shopSlots: ShopSlot[] = Array.from({ length: 84 }, (_, i) => ({
    day: Math.floor(i / 12),
    hour: 8 + (i % 12),
  }));

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.shifts.length, 84);
  assertEquals(result.coverage, 100);
  
  // Проверяем балансировку (все должны получить примерно одинаково)
  const hours1 = result.stats.hours_per_barista["Бариста 1"];
  const hours2 = result.stats.hours_per_barista["Бариста 2"];
  const hours3 = result.stats.hours_per_barista["Бариста 3"];
  
  const maxDiff = Math.max(
    Math.abs(hours1 - hours2),
    Math.abs(hours2 - hours3),
    Math.abs(hours1 - hours3)
  );
  
  assert(maxDiff <= 2); // Разница не более 2 часов
});

// ============================================
// ТЕСТ 8: Оптимизированная генерация с ограничениями
// ============================================

Deno.test("should respect max hours constraint", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: Array.from({ length: 60 }, (_, i) => ({
        day: Math.floor(i / 12),
        hour: 8 + (i % 12),
      })),
    },
  ];

  const shopSlots: ShopSlot[] = Array.from({ length: 60 }, (_, i) => ({
    day: Math.floor(i / 12),
    hour: 8 + (i % 12),
  }));

  const result = generateOptimizedSchedule(baristas, shopSlots, {
    maxHoursPerBarista: 40,
  });

  // Должно быть предупреждение о превышении лимита
  assert(result.warnings.some(w => w.includes("Нарушения ограничений")));
});

// ============================================
// ТЕСТ 9: Статистика корректна
// ============================================

Deno.test("should calculate correct statistics", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
      ],
    },
    {
      user_id: "user2",
      user_name: "Бариста 2",
      slots: [
        { day: 0, hour: 10 },
        { day: 0, hour: 11 },
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 },
    { day: 0, hour: 10 },
    { day: 0, hour: 11 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  assertEquals(result.stats.total_slots, 4);
  assertEquals(result.stats.covered_slots, 4);
  assertEquals(result.stats.avg_hours, 2);
  assertEquals(result.stats.min_hours, 2);
  assertEquals(result.stats.max_hours, 2);
});

// ============================================
// ТЕСТ 10: Коэффициент балансировки
// ============================================

Deno.test("should calculate balance coefficient correctly", () => {
  const baristas: BaristaAvailability[] = [
    {
      user_id: "user1",
      user_name: "Бариста 1",
      slots: [
        { day: 0, hour: 8 },
        { day: 0, hour: 9 },
        { day: 0, hour: 10 },
      ],
    },
    {
      user_id: "user2",
      user_name: "Бариста 2",
      slots: [
        { day: 0, hour: 11 },
      ],
    },
  ];

  const shopSlots: ShopSlot[] = [
    { day: 0, hour: 8 },
    { day: 0, hour: 9 },
    { day: 0, hour: 10 },
    { day: 0, hour: 11 },
  ];

  const result = generateSchedule(baristas, shopSlots);

  // Дисбаланс: 3 часа vs 1 час
  assert(result.balance < 1);
  assert(result.balance >= 0);
});

