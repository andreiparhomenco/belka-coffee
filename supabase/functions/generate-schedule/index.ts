// ============================================
// Edge Function: Generate Schedule
// Description: Генерация графика смен на основе доступности
// Created: 2025-12-18
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { generateSchedule, generateOptimizedSchedule } from "./algorithm.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateScheduleRequest {
  week_start: string; // ISO date string
  options?: {
    maxHoursPerBarista?: number;
    minHoursPerBarista?: number;
    preferredBalance?: number;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { week_start, options }: GenerateScheduleRequest = await req.json();

    if (!week_start) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'week_start обязателен',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Создаём Supabase клиент
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Шаг 1: Загружаем шаблон работы кофейни
    const { data: shopTemplate, error: shopError } = await supabase
      .from('shop_template')
      .select('day_of_week, hour')
      .eq('is_active', true);

    if (shopError) throw shopError;

    // Шаг 2: Загружаем всех бариста
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'barista');

    if (usersError) throw usersError;

    // Шаг 3: Загружаем доступность всех бариста
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .select('user_id, day_of_week, hour')
      .eq('week_start', week_start);

    if (availError) throw availError;

    // Шаг 4: Группируем доступность по бариста
    const baristasMap = new Map();
    users?.forEach(user => {
      baristasMap.set(user.id, {
        user_id: user.id,
        user_name: user.name,
        slots: [],
      });
    });

    availability?.forEach(slot => {
      const barista = baristasMap.get(slot.user_id);
      if (barista) {
        barista.slots.push({
          day: slot.day_of_week,
          hour: slot.hour,
        });
      }
    });

    const baristas = Array.from(baristasMap.values());
    const shopSlots = shopTemplate?.map(s => ({
      day: s.day_of_week,
      hour: s.hour,
    })) || [];

    // Шаг 5: Генерируем график
    const result = options
      ? generateOptimizedSchedule(baristas, shopSlots, options)
      : generateSchedule(baristas, shopSlots);

    // Шаг 6: Проверяем существующие смены за эту неделю
    const { data: existingShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id')
      .eq('week_start', week_start)
      .neq('status', 'cancelled');

    if (shiftsError) throw shiftsError;

    if (existingShifts && existingShifts.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Для недели ${week_start} уже существует график (${existingShifts.length} смен). Удалите его перед генерацией нового.`,
          result,
        }),
        {
          status: 409, // Conflict
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Шаг 7: Сохраняем сгенерированные смены в БД
    if (result.shifts.length > 0) {
      const shiftsToInsert = result.shifts.map(shift => ({
        user_id: shift.user_id,
        week_start,
        day_of_week: shift.day,
        hour: shift.hour,
        status: 'planned',
        created_by: null, // TODO: добавить user_id из auth
      }));

      const { error: insertError } = await supabase
        .from('shifts')
        .insert(shiftsToInsert);

      if (insertError) throw insertError;
    }

    // Успешный ответ
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          ...result,
          week_start,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-schedule:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Внутренняя ошибка сервера',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* ============================================
 * ИСПОЛЬЗОВАНИЕ:
 * ============================================
 * 
 * POST https://jcrjcglfzrhcghiqfltp.supabase.co/functions/v1/generate-schedule
 * 
 * Body:
 * {
 *   "week_start": "2025-01-13",
 *   "options": {
 *     "maxHoursPerBarista": 40,
 *     "minHoursPerBarista": 10,
 *     "preferredBalance": 0.9
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "result": {
 *     "shifts": [...],
 *     "coverage": 98.5,
 *     "balance": 0.95,
 *     "stats": { ... },
 *     "warnings": [],
 *     "week_start": "2025-01-13",
 *     "generated_at": "2025-01-15T10:00:00Z"
 *   }
 * }
 * 
 * ============================================
 * ЛОГИКА:
 * ============================================
 * 
 * 1. Загружает шаблон работы кофейни
 * 2. Загружает всех бариста и их доступность
 * 3. Запускает алгоритм распределения смен
 * 4. Проверяет нет ли уже графика на эту неделю
 * 5. Сохраняет смены в таблицу shifts со статусом 'planned'
 * 6. Возвращает результат с статистикой
 * 
 * ============================================
 */

