// ============================================
// Dashboard Component
// Description: Главная панель администратора
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getWeekStart, formatDate } from '../../lib/helpers';

interface DashboardStats {
  totalBaristas: number;
  totalShifts: number;
  confirmedShifts: number;
  pendingShifts: number;
  weekCoverage: number;
  activeUsers: number;
}

interface BaristaStats {
  id: string;
  name: string;
  totalHours: number;
  confirmedHours: number;
  availabilityFilled: boolean;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBaristas: 0,
    totalShifts: 0,
    confirmedShifts: 0,
    pendingShifts: 0,
    weekCoverage: 0,
    activeUsers: 0,
  });
  const [baristaStats, setBaristaStats] = useState<BaristaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  const currentWeekStart = getWeekStart(selectedWeek);

  useEffect(() => {
    loadDashboardData();
  }, [currentWeekStart]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const weekStartDate = typeof currentWeekStart === 'string' 
        ? new Date(currentWeekStart) 
        : currentWeekStart;
      const weekStartStr = weekStartDate.toISOString().split('T')[0];

      // Загрузка общей статистики
      const [usersRes, shiftsRes, shopTemplateRes, availabilityRes] = await Promise.all([
        // Пользователи
        supabase.from('users').select('id, name').eq('role', 'barista'),
        
        // Смены
        supabase.from('shifts').select('id, status, user_id').eq('week_start', weekStartStr).neq('status', 'cancelled'),
        
        // Шаблон кофейни
        supabase.from('shop_template').select('id').eq('is_active', true),
        
        // Доступность
        supabase.from('availability').select('user_id').eq('week_start', weekStartStr),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (shiftsRes.error) throw shiftsRes.error;
      if (shopTemplateRes.error) throw shopTemplateRes.error;
      if (availabilityRes.error) throw availabilityRes.error;

      const users = usersRes.data || [];
      const shifts = shiftsRes.data || [];
      const shopSlots = shopTemplateRes.data || [];
      const availability = availabilityRes.data || [];

      // Подсчёт статистики
      const confirmedShifts = shifts.filter(s => s.status === 'confirmed').length;
      const pendingShifts = shifts.filter(s => s.status === 'planned').length;
      const weekCoverage = shopSlots.length > 0 ? (shifts.length / shopSlots.length) * 100 : 0;

      // Уникальные пользователи с доступностью
      const usersWithAvailability = new Set(availability.map(a => a.user_id));

      setStats({
        totalBaristas: users.length,
        totalShifts: shifts.length,
        confirmedShifts,
        pendingShifts,
        weekCoverage: Math.round(weekCoverage),
        activeUsers: usersWithAvailability.size,
      });

      // Статистика по бариста
      const baristaStatsData: BaristaStats[] = users.map(user => {
        const userShifts = shifts.filter(s => s.user_id === user.id);
        const confirmedUserShifts = userShifts.filter(s => s.status === 'confirmed');
        
        return {
          id: user.id,
          name: user.name,
          totalHours: userShifts.length,
          confirmedHours: confirmedUserShifts.length,
          availabilityFilled: usersWithAvailability.has(user.id),
        };
      });

      setBaristaStats(baristaStatsData.sort((a, b) => b.totalHours - a.totalHours));

    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="spinner"></div>
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="alert alert-error">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📊 Панель администратора</h1>
        <p className="subtitle">Общая статистика и управление системой</p>
      </div>

      {/* Week Selector */}
      <div className="week-selector">
        <button onClick={goToPreviousWeek} className="btn btn-secondary">
          ← Предыдущая
        </button>
        <div className="week-info">
          <strong>Неделя:</strong> {formatDate(currentWeekStart)} -{' '}
          {formatDate(new Date(new Date(currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000))}
        </div>
        <button onClick={goToCurrentWeek} className="btn btn-secondary">
          Текущая
        </button>
        <button onClick={goToNextWeek} className="btn btn-secondary">
          Следующая →
        </button>
      </div>

      {/* Main Stats */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalBaristas}</div>
            <div className="stat-label">Всего бариста</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalShifts}</div>
            <div className="stat-label">Смен назначено</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.confirmedShifts}</div>
            <div className="stat-label">Подтверждено</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingShifts}</div>
            <div className="stat-label">Ожидают</div>
          </div>
        </div>

        <div className="stat-card coverage">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{stats.weekCoverage}%</div>
            <div className="stat-label">Покрытие недели</div>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeUsers}</div>
            <div className="stat-label">Заполнили доступность</div>
          </div>
        </div>
      </div>

      {/* Coverage Progress */}
      <div className="coverage-section">
        <h3>📊 Покрытие недели</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${stats.weekCoverage}%` }}
          >
            {stats.weekCoverage}%
          </div>
        </div>
        <p className="progress-info">
          {stats.totalShifts} смен назначено, {stats.confirmedShifts} подтверждено
        </p>
      </div>

      {/* Barista Stats */}
      <div className="barista-stats-section">
        <h3>👥 Статистика по бариста</h3>
        <div className="barista-table">
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Всего часов</th>
                <th>Подтверждено</th>
                <th>Доступность</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {baristaStats.map(barista => (
                <tr key={barista.id}>
                  <td className="barista-name">{barista.name}</td>
                  <td className="total-hours">{barista.totalHours} ч</td>
                  <td className="confirmed-hours">{barista.confirmedHours} ч</td>
                  <td className="availability">
                    {barista.availabilityFilled ? (
                      <span className="badge badge-success">✅ Заполнена</span>
                    ) : (
                      <span className="badge badge-warning">⚠️ Не заполнена</span>
                    )}
                  </td>
                  <td className="status">
                    {barista.confirmedHours === barista.totalHours && barista.totalHours > 0 ? (
                      <span className="badge badge-success">✅ Все подтверждены</span>
                    ) : barista.totalHours === 0 ? (
                      <span className="badge badge-neutral">➖ Нет смен</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Ожидают подтверждения</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Быстрые действия</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span className="action-icon">🤖</span>
            <span className="action-label">Сгенерировать график</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">👥</span>
            <span className="action-label">Управление бариста</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">✏️</span>
            <span className="action-label">Редактировать смены</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📊</span>
            <span className="action-label">Отчёты</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Настройки</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">🔄</span>
            <span className="action-label">Обновить данные</span>
          </button>
        </div>
      </div>

      {/* Warnings */}
      {(stats.pendingShifts > 0 || stats.weekCoverage < 100 || stats.activeUsers < stats.totalBaristas) && (
        <div className="warnings-section">
          <h3>⚠️ Требуют внимания</h3>
          <ul className="warnings-list">
            {stats.pendingShifts > 0 && (
              <li className="warning-item">
                <span className="warning-icon">⏳</span>
                <span>{stats.pendingShifts} смен ожидают подтверждения от бариста</span>
              </li>
            )}
            {stats.weekCoverage < 100 && (
              <li className="warning-item">
                <span className="warning-icon">📉</span>
                <span>Покрытие недели {stats.weekCoverage}% - не все слоты назначены</span>
              </li>
            )}
            {stats.activeUsers < stats.totalBaristas && (
              <li className="warning-item">
                <span className="warning-icon">👥</span>
                <span>
                  {stats.totalBaristas - stats.activeUsers} бариста не заполнили доступность
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

