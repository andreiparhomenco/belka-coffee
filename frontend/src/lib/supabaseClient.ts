import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Отсутствуют переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY. ' +
    'Проверьте файл .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных
export type Database = {
  users: {
    id: string;
    telegram_id: number;
    name: string;
    role: 'barista' | 'admin';
    created_at: string;
  };
  availability: {
    id: string;
    user_id: string;
    week_start: string;
    day_of_week: number;
    hour: number;
    created_at: string;
  };
  shifts: {
    id: string;
    user_id: string;
    week_start: string;
    day_of_week: number;
    hour: number;
    status: 'planned' | 'confirmed' | 'completed';
    created_at: string;
    updated_at: string;
  };
  shift_reports: {
    id: string;
    shift_id: string;
    turnover: number;
    confirmed_hours: number;
    submitted_at: string;
  };
  salaries: {
    id: string;
    user_id: string;
    week_start: string;
    total_hours: number;
    total_turnover: number;
    salary: number;
    calculated_at: string;
  };
};

