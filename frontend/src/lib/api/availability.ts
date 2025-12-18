// ============================================
// Availability API
// Description: API функции для работы с доступностью
// Created: 2025-12-18
// ============================================

import { supabase } from '../supabaseClient';
import { validateAvailability, type TimeSlot } from '../validation';

export interface AvailabilitySlot {
  id?: string;
  user_id: string;
  week_start: string; // ISO date string
  day_of_week: number;
  hour: number;
  created_at?: string;
}

export interface SaveAvailabilityParams {
  user_id: string;
  week_start: Date;
  slots: TimeSlot[];
}

export interface GetAvailabilityParams {
  user_id: string;
  week_start: Date;
}

export interface GetAllAvailabilityParams {
  week_start: Date;
}

/**
 * Сохранить доступность бариста
 * @param params - Параметры сохранения
 * @returns Результат операции
 */
export async function saveAvailability(params: SaveAvailabilityParams) {
  const { user_id, week_start, slots } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    // Удаляем старую доступность
    const { error: deleteError } = await supabase
      .from('availability')
      .delete()
      .eq('user_id', user_id)
      .eq('week_start', weekStartStr);

    if (deleteError) throw deleteError;

    // Если нет слотов, просто возвращаем успех
    if (slots.length === 0) {
      return { success: true, count: 0 };
    }

    // Вставляем новую доступность
    const records: Omit<AvailabilitySlot, 'id' | 'created_at'>[] = slots.map(slot => ({
      user_id,
      week_start: weekStartStr,
      day_of_week: slot.day,
      hour: slot.hour,
    }));

    const { error: insertError, data } = await supabase
      .from('availability')
      .insert(records)
      .select();

    if (insertError) throw insertError;

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Ошибка сохранения доступности:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Получить доступность бариста
 * @param params - Параметры запроса
 * @returns Массив слотов доступности
 */
export async function getAvailability(params: GetAvailabilityParams) {
  const { user_id, week_start } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start', weekStartStr)
      .order('day_of_week')
      .order('hour');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Ошибка загрузки доступности:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      data: [],
    };
  }
}

/**
 * Получить доступность всех бариста
 * @param params - Параметры запроса
 * @returns Массив слотов всех бариста
 */
export async function getAllAvailability(params: GetAllAvailabilityParams) {
  const { week_start } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('availability')
      .select(`
        *,
        users:user_id (
          id,
          name,
          role
        )
      `)
      .eq('week_start', weekStartStr)
      .order('day_of_week')
      .order('hour');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Ошибка загрузки доступности всех бариста:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      data: [],
    };
  }
}

/**
 * Удалить доступность за неделю
 * @param params - Параметры удаления
 * @returns Результат операции
 */
export async function deleteAvailability(params: GetAvailabilityParams) {
  const { user_id, week_start } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('user_id', user_id)
      .eq('week_start', weekStartStr);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления доступности:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Получить статистику доступности за неделю
 * @param params - Параметры запроса
 * @returns Статистика по бариста
 */
export async function getAvailabilityStats(params: GetAllAvailabilityParams) {
  const { week_start } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    // Получаем всех бариста
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'barista')
      .order('name');

    if (usersError) throw usersError;

    // Получаем доступность
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .select('user_id, day_of_week, hour')
      .eq('week_start', weekStartStr);

    if (availError) throw availError;

    // Подсчитываем статистику
    const stats = users?.map(user => {
      const userSlots = availability?.filter(a => a.user_id === user.id) || [];
      
      const dayStats = new Map<number, number>();
      userSlots.forEach(slot => {
        dayStats.set(slot.day_of_week, (dayStats.get(slot.day_of_week) || 0) + 1);
      });

      return {
        user_id: user.id,
        user_name: user.name,
        total_hours: userSlots.length,
        days_available: dayStats.size,
        by_day: Object.fromEntries(dayStats),
      };
    });

    return { success: true, stats: stats || [] };
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      stats: [],
    };
  }
}

/**
 * Проверить покрытие слотов
 * @param params - Параметры запроса
 * @returns Карта покрытия (слот -> количество бариста)
 */
export async function getCoverageMap(params: GetAllAvailabilityParams) {
  const { week_start } = params;
  const weekStartStr = week_start.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('availability')
      .select('day_of_week, hour, user_id')
      .eq('week_start', weekStartStr);

    if (error) throw error;

    // Создаём карту покрытия
    const coverageMap = new Map<string, number>();
    data?.forEach(slot => {
      const key = `${slot.day_of_week}-${slot.hour}`;
      coverageMap.set(key, (coverageMap.get(key) || 0) + 1);
    });

    // Находим слоты с недостаточным покрытием
    const lowCoverage: Array<{ day: number; hour: number; count: number }> = [];
    const noCoverage: Array<{ day: number; hour: number }> = [];

    // Проверяем все возможные слоты (0-6 дней, 0-23 часа)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const count = coverageMap.get(key) || 0;
        
        if (count === 0) {
          noCoverage.push({ day, hour });
        } else if (count === 1) {
          lowCoverage.push({ day, hour, count });
        }
      }
    }

    return {
      success: true,
      coverageMap: Object.fromEntries(coverageMap),
      lowCoverage,
      noCoverage,
    };
  } catch (error) {
    console.error('Ошибка получения карты покрытия:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      coverageMap: {},
      lowCoverage: [],
      noCoverage: [],
    };
  }
}

