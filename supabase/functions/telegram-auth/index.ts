// ============================================
// Edge Function: Telegram Auth
// Description: Авторизация пользователей через Telegram ID
// Created: 2025-12-15
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramAuthRequest {
  telegram_id: number;
  name: string;
  username?: string;
}

interface AuthResponse {
  success: boolean;
  user?: any;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Получаем данные из Telegram
    const { telegram_id, name, username }: TelegramAuthRequest = await req.json();

    // Валидация
    if (!telegram_id || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'telegram_id и name обязательны',
        } as AuthResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Создаём Supabase клиент с service_role для обхода RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Проверяем существует ли пользователь
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = not found, это нормально
      console.error('Error selecting user:', selectError);
      throw selectError;
    }

    let user;

    if (existingUser) {
      // Пользователь существует - обновляем имя если изменилось
      if (existingUser.name !== name) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user:', updateError);
          throw updateError;
        }

        user = updatedUser;
      } else {
        user = existingUser;
      }
    } else {
      // Создаём нового пользователя с ролью 'barista' по умолчанию
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id,
          name,
          role: 'barista', // По умолчанию все новые пользователи - бариста
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting user:', insertError);
        throw insertError;
      }

      user = newUser;
    }

    // Логирование в audit_log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: existingUser ? 'LOGIN' : 'REGISTER',
      table_name: 'users',
      new_data: {
        telegram_id,
        name,
        username,
        timestamp: new Date().toISOString(),
      },
    });

    // Возвращаем успешный ответ
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          name: user.name,
          role: user.role,
          created_at: user.created_at,
        },
      } as AuthResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in telegram-auth:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Внутренняя ошибка сервера',
      } as AuthResponse),
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
 * POST https://jcrjcglfzrhcghiqfltp.supabase.co/functions/v1/telegram-auth
 * 
 * Body:
 * {
 *   "telegram_id": 123456789,
 *   "name": "Иван Петров",
 *   "username": "ivan_petrov"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "id": "uuid-here",
 *     "telegram_id": 123456789,
 *     "name": "Иван Петров",
 *     "role": "barista",
 *     "created_at": "2025-01-15T10:00:00.000Z"
 *   }
 * }
 * 
 * ============================================
 * ЛОГИКА:
 * ============================================
 * 
 * 1. Принимает telegram_id и name из Telegram Mini App
 * 2. Проверяет существует ли пользователь в БД
 * 3. Если существует - обновляет имя (если изменилось)
 * 4. Если не существует - создаёт с ролью 'barista'
 * 5. Логирует действие в audit_log
 * 6. Возвращает данные пользователя
 * 
 * ============================================
 * БЕЗОПАСНОСТЬ:
 * ============================================
 * 
 * - Использует service_role key для обхода RLS
 * - Все новые пользователи по умолчанию 'barista'
 * - Смена роли на 'admin' только через SQL админом
 * - Логирование всех входов в audit_log
 * 
 * ============================================
 */

