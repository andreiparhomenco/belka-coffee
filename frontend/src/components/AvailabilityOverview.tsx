// ============================================
// AvailabilityOverview Component
// Description: Просмотр доступности всех бариста (для админа)
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getWeekStart } from '../lib/helpers';

interface BaristaAvailability {
  user_id: string;
  user_name: string;
  availability: Map<string, boolean>; // key: "day-hour"
  total_hours: number;
}

interface AvailabilityOverviewProps {
  weekStart?: Date | string;
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const AvailabilityOverview: React.FC<AvailabilityOverviewProps> = ({
  weekStart = new Date(),
}) => {
  const [baristas, setBaristas] = useState<BaristaAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const currentWeekStart = getWeekStart(typeof weekStart === 'string' ? new Date(weekStart) : weekStart);

  useEffect(() => {
    loadAvailability();
  }, [currentWeekStart]);

  const loadAvailability = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем всех бариста
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'barista')
        .order('name');

      if (usersError) throw usersError;

      // Загружаем доступность для всех бариста
      const { data: availability, error: availError } = await supabase
        .from('availability')
        .select('user_id, day_of_week, hour')
        .eq('week_start', currentWeekStart.toISOString().split('T')[0]);

      if (availError) throw availError;

      // Группируем доступность по пользователям
      const baristaMap = new Map<string, BaristaAvailability>();

      users?.forEach(user => {
        baristaMap.set(user.id, {
          user_id: user.id,
          user_name: user.name,
          availability: new Map(),
          total_hours: 0,
        });
      });

      availability?.forEach(slot => {
        const barista = baristaMap.get(slot.user_id);
        if (barista) {
          const key = `${slot.day_of_week}-${slot.hour}`;
          barista.availability.set(key, true);
          barista.total_hours++;
        }
      });

      setBaristas(Array.from(baristaMap.values()));
    } catch (err) {
      console.error('Ошибка загрузки доступности:', err);
      setError('Не удалось загрузить доступность бариста');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBaristas = (day: number, hour: number): string[] => {
    return baristas
      .filter(b => b.availability.get(`${day}-${hour}`))
      .map(b => b.user_name);
  };

  const getCoverageColor = (count: number): string => {
    if (count === 0) return 'coverage-none';
    if (count === 1) return 'coverage-low';
    if (count === 2) return 'coverage-medium';
    return 'coverage-good';
  };

  if (loading) {
    return (
      <div className="availability-overview loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="availability-overview">
        <div className="alert alert-error">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="availability-overview">
      <div className="overview-header">
        <h2>👥 Доступность бариста</h2>
        <p className="week-info">
          Неделя: {currentWeekStart.toLocaleDateString('ru-RU')} -{' '}
          {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
        </p>
      </div>

      {/* Статистика по бариста */}
      <div className="barista-stats">
        <h3>📊 Статистика</h3>
        <div className="stats-grid">
          {baristas.map(barista => (
            <div key={barista.user_id} className="stat-card">
              <div className="stat-name">{barista.user_name}</div>
              <div className="stat-value">{barista.total_hours} ч</div>
            </div>
          ))}
        </div>
      </div>

      {/* Тепловая карта покрытия */}
      <div className="coverage-heatmap">
        <h3>🔥 Карта покрытия</h3>
        <div className="heatmap-grid">
          <div className="heatmap-header-row">
            <div className="hour-header">Час</div>
            {DAYS.map(day => (
              <div key={day} className="day-header">
                {day}
              </div>
            ))}
          </div>

          {HOURS.map(hour => (
            <div key={hour} className="heatmap-row">
              <div className="hour-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {DAYS.map((_, day) => {
                const available = getAvailableBaristas(day, hour);
                const count = available.length;
                const isSelected = selectedDay === day && selectedHour === hour;

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`heatmap-cell ${getCoverageColor(count)} ${
                      isSelected ? 'selected' : ''
                    }`}
                    onClick={() => {
                      setSelectedDay(day);
                      setSelectedHour(hour);
                    }}
                    title={`${DAYS[day]} ${hour}:00 - ${count} бариста`}
                  >
                    <span className="count">{count}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="heatmap-legend">
          <div className="legend-item">
            <span className="legend-color coverage-none"></span>
            <span>Нет покрытия</span>
          </div>
          <div className="legend-item">
            <span className="legend-color coverage-low"></span>
            <span>1 бариста</span>
          </div>
          <div className="legend-item">
            <span className="legend-color coverage-medium"></span>
            <span>2 бариста</span>
          </div>
          <div className="legend-item">
            <span className="legend-color coverage-good"></span>
            <span>3+ бариста</span>
          </div>
        </div>
      </div>

      {/* Детали выбранного слота */}
      {selectedDay !== null && selectedHour !== null && (
        <div className="slot-details">
          <h3>
            📍 {DAYS[selectedDay]} {selectedHour.toString().padStart(2, '0')}:00
          </h3>
          <div className="available-baristas">
            {getAvailableBaristas(selectedDay, selectedHour).length > 0 ? (
              <>
                <p>Доступны:</p>
                <ul>
                  {getAvailableBaristas(selectedDay, selectedHour).map(name => (
                    <li key={name}>✅ {name}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="no-coverage">❌ Нет доступных бариста</p>
            )}
          </div>
        </div>
      )}

      {/* Детальная таблица по бариста */}
      <div className="barista-table">
        <h3>📋 Детальная информация</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Бариста</th>
                <th>Всего часов</th>
                <th>Пн</th>
                <th>Вт</th>
                <th>Ср</th>
                <th>Чт</th>
                <th>Пт</th>
                <th>Сб</th>
                <th>Вс</th>
              </tr>
            </thead>
            <tbody>
              {baristas.map(barista => (
                <tr key={barista.user_id}>
                  <td className="barista-name">{barista.user_name}</td>
                  <td className="total-hours">{barista.total_hours}</td>
                  {DAYS.map((_, day) => {
                    const dayHours = HOURS.filter(hour =>
                      barista.availability.get(`${day}-${hour}`)
                    ).length;
                    return (
                      <td key={day} className="day-hours">
                        {dayHours > 0 ? dayHours : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

