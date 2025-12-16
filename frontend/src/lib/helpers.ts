import { startOfWeek, format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Получить понедельник текущей недели в формате YYYY-MM-DD
 */
export function getWeekStart(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

/**
 * Форматировать дату для отображения
 */
export function formatDate(date: string | Date, formatStr: string = 'dd.MM.yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: ru });
}

/**
 * Получить название дня недели
 */
export function getDayName(dayIndex: number): string {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return days[dayIndex] || '';
}

/**
 * Проверка, является ли пользователь администратором
 */
export function isAdmin(role: string): boolean {
  return role === 'admin';
}

/**
 * Форматирование суммы в рублях
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Расчёт зарплаты по формуле: (hours × 150) + (turnover × 0.05)
 */
export function calculateSalary(hours: number, turnover: number): number {
  return hours * 150 + turnover * 0.05;
}

