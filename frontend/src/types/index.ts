/**
 * Типы для приложения Belka Coffee
 */

export type UserRole = 'barista' | 'admin';

export interface User {
  id: string;
  telegram_id: number;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface AvailabilitySlot {
  id?: string;
  user_id?: string;
  week_start: string;
  day_of_week: number; // 0-6 (Пн-Вс)
  hour: number; // 0-23
  created_at?: string;
}

export interface Shift {
  id: string;
  user_id: string;
  week_start: string;
  day_of_week: number;
  hour: number;
  status: 'planned' | 'confirmed' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ShiftReport {
  id: string;
  shift_id: string;
  turnover: number;
  confirmed_hours: number;
  submitted_at: string;
}

export interface Salary {
  id: string;
  user_id: string;
  week_start: string;
  total_hours: number;
  total_turnover: number;
  salary: number;
  calculated_at: string;
}

export interface ShopTemplate {
  id: string;
  day_of_week: number;
  hour: number;
  is_active: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface GenerateScheduleResponse {
  success: boolean;
  totalSlots: number;
  assignedSlots: number;
  uncoveredSlots: number;
  baristaLoads: Record<string, number>;
}

