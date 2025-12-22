// ============================================
// ScheduleView Component
// Description: Просмотр сгенерированного графика
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUser } from '../lib/auth';
import { getWeekStart } from '../lib/helpers';

interface Shift {
  id: string;
  user_id: string;
  user_name: string;
  day_of_week: number;
  hour: number;
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
}

interface ScheduleViewProps {
  weekStart?: Date | string;
  onEdit?: (shiftId: string) => void;
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  weekStart = new Date(),
  onEdit,
}) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // getWeekStart возвращает строку (YYYY-MM-DD), создаем Date версию для отображения
  const currentWeekStart = getWeekStart(typeof weekStart === 'string' ? new Date(weekStart) : weekStart);
  const currentWeekStartDate = new Date(currentWeekStart);
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadShifts();
  }, [currentWeekStart]);

  const loadShifts = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          id,
          user_id,
          day_of_week,
          hour,
          status,
          users:user_id (name)
        `)
        .eq('week_start', currentWeekStart)
        .neq('status', 'cancelled')
        .order('day_of_week')
        .order('hour');

      if (error) throw error;

      const formattedShifts: Shift[] = data?.map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        user_name: s.users?.name || 'Неизвестно',
        day_of_week: s.day_of_week,
        hour: s.hour,
        status: s.status,
      })) || [];

      setShifts(formattedShifts);
    } catch (err) {
      console.error('Ошибка загрузки графика:', err);
      setError('Не удалось загрузить график');
    } finally {
      setLoading(false);
    }
  };

  const getShiftForSlot = (day: number, hour: number): Shift | undefined => {
    return shifts.find(s => s.day_of_week === day && s.hour === hour);
  };

  const getStatsForBarista = (userId: string) => {
    const baristaShifts = shifts.filter(s => s.user_id === userId);
    return {
      total: baristaShifts.length,
      confirmed: baristaShifts.filter(s => s.status === 'confirmed').length,
      planned: baristaShifts.filter(s => s.status === 'planned').length,
    };
  };

  const handleConfirmShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ status: 'confirmed' })
        .eq('id', shiftId);

      if (error) throw error;

      // Обновляем локальное состояние
      setShifts(prev =>
        prev.map(s => (s.id === shiftId ? { ...s, status: 'confirmed' as const } : s))
      );

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: '✅ Смена подтверждена',
          message: 'Смена успешно подтверждена',
          buttons: [{ type: 'ok' }],
        });
      }
    } catch (err) {
      console.error('Ошибка подтверждения:', err);
      alert('Не удалось подтвердить смену');
    }
  };

  if (loading) {
    return (
      <div className="schedule-view loading">
        <div className="spinner"></div>
        <p>Загрузка графика...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-view">
        <div className="alert alert-error">❌ {error}</div>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="schedule-view">
        <div className="empty-state">
          <h3>📅 График пуст</h3>
          <p>Для этой недели ещё не создан график смен.</p>
          {isAdmin && <p>Используйте генератор графика для создания.</p>}
        </div>
      </div>
    );
  }

  // Группируем смены по бариста
  const baristaStats = new Map<string, { name: string; stats: ReturnType<typeof getStatsForBarista> }>();
  shifts.forEach(shift => {
    if (!baristaStats.has(shift.user_id)) {
      baristaStats.set(shift.user_id, {
        name: shift.user_name,
        stats: getStatsForBarista(shift.user_id),
      });
    }
  });

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>📅 График смен</h2>
        <p className="week-info">
          Неделя: {currentWeekStartDate.toLocaleDateString('ru-RU')}
        </p>
      </div>

      {/* Статистика по бариста */}
      <div className="barista-summary">
        <h3>👥 Статистика</h3>
        <div className="summary-grid">
          {Array.from(baristaStats.values()).map(({ name, stats }) => (
            <div key={name} className="summary-card">
              <div className="summary-name">{name}</div>
              <div className="summary-stats">
                <span className="stat-item">
                  Всего: <strong>{stats.total}</strong>
                </span>
                <span className="stat-item confirmed">
                  ✓ {stats.confirmed}
                </span>
                <span className="stat-item planned">
                  ⏳ {stats.planned}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Сетка графика */}
      <div className="schedule-grid">
        <div className="grid-header-row">
          <div className="hour-header">Час</div>
          {DAYS.map(day => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>

        {HOURS.map(hour => (
          <div key={hour} className="grid-row">
            <div className="hour-label">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {DAYS.map((_, day) => {
              const shift = getShiftForSlot(day, hour);

              return (
                <div
                  key={`${day}-${hour}`}
                  className={`grid-cell ${shift ? 'has-shift' : 'empty'} ${
                    shift?.status === 'confirmed' ? 'confirmed' : ''
                  } ${selectedShift?.id === shift?.id ? 'selected' : ''}`}
                  onClick={() => shift && setSelectedShift(shift)}
                >
                  {shift && (
                    <div className="shift-info">
                      <span className="barista-name">{shift.user_name}</span>
                      {shift.status === 'confirmed' && <span className="check">✓</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Детали выбранной смены */}
      {selectedShift && (
        <div className="shift-details">
          <h3>📍 Детали смены</h3>
          <div className="details-content">
            <p>
              <strong>Бариста:</strong> {selectedShift.user_name}
            </p>
            <p>
              <strong>День:</strong> {DAYS[selectedShift.day_of_week]}
            </p>
            <p>
              <strong>Время:</strong> {selectedShift.hour.toString().padStart(2, '0')}:00
            </p>
            <p>
              <strong>Статус:</strong>{' '}
              <span className={`status-badge ${selectedShift.status}`}>
                {selectedShift.status === 'planned' && '⏳ Запланировано'}
                {selectedShift.status === 'confirmed' && '✅ Подтверждено'}
                {selectedShift.status === 'completed' && '✔️ Завершено'}
              </span>
            </p>

            {!isAdmin && user?.id === selectedShift.user_id && selectedShift.status === 'planned' && (
              <button
                onClick={() => handleConfirmShift(selectedShift.id)}
                className="btn btn-primary"
              >
                ✅ Подтвердить смену
              </button>
            )}

            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(selectedShift.id)}
                className="btn btn-secondary"
              >
                ✏️ Редактировать
              </button>
            )}
          </div>
        </div>
      )}

      <div className="legend">
        <div className="legend-item">
          <span className="legend-color has-shift"></span>
          <span>Назначена смена</span>
        </div>
        <div className="legend-item">
          <span className="legend-color confirmed"></span>
          <span>Подтверждено</span>
        </div>
        <div className="legend-item">
          <span className="legend-color empty"></span>
          <span>Пусто</span>
        </div>
      </div>
    </div>
  );
};

