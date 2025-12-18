// ============================================
// Reports Component
// Description: Детальные отчёты и аналитика
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getWeekStart, formatDate } from '../../lib/helpers';
import './Reports.css';

interface BaristaReport {
  userId: string;
  name: string;
  totalHours: number;
  confirmedHours: number;
  completedHours: number;
  totalTurnover: number;
  avgTurnoverPerHour: number;
  confirmationRate: number;
}

interface WeeklySummary {
  totalShifts: number;
  confirmedShifts: number;
  completedShifts: number;
  totalTurnover: number;
  avgTurnover: number;
  coverageRate: number;
}

export const Reports: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [reportType, setReportType] = useState<'weekly' | 'barista' | 'turnover'>('weekly');
  const [baristaReports, setBaristaReports] = useState<BaristaReport[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentWeekStart = getWeekStart(selectedWeek);

  useEffect(() => {
    loadReports();
  }, [currentWeekStart]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const weekStartDate = typeof currentWeekStart === 'string' 
        ? new Date(currentWeekStart) 
        : currentWeekStart;
      const weekStartStr = weekStartDate.toISOString().split('T')[0];

      const [usersRes, shiftsRes, reportsRes, shopTemplateRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'barista').order('name'),
        supabase.from('shifts').select('*').eq('week_start', weekStartStr).neq('status', 'cancelled'),
        supabase.from('shift_reports').select('*'),
        supabase.from('shop_template').select('id').eq('is_active', true),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (shiftsRes.error) throw shiftsRes.error;
      if (reportsRes.error) throw reportsRes.error;
      if (shopTemplateRes.error) throw shopTemplateRes.error;

      const users = usersRes.data || [];
      const shifts = shiftsRes.data || [];
      const reports = reportsRes.data || [];
      const shopSlots = shopTemplateRes.data || [];

      // Расчёт отчёта по бариста
      const baristaReportsData: BaristaReport[] = users.map((user) => {
        const userShifts = shifts.filter((s) => s.user_id === user.id);
        const confirmedShifts = userShifts.filter((s) => s.status === 'confirmed');
        const completedShifts = userShifts.filter((s) => s.status === 'completed');

        // Выручка по завершённым сменам
        const shiftIds = completedShifts.map((s) => s.id);
        const userReports = reports.filter((r) => shiftIds.includes(r.shift_id));
        const totalTurnover = userReports.reduce((sum, r) => sum + (r.turnover || 0), 0);

        return {
          userId: user.id,
          name: user.name,
          totalHours: userShifts.length,
          confirmedHours: confirmedShifts.length,
          completedHours: completedShifts.length,
          totalTurnover,
          avgTurnoverPerHour: completedShifts.length > 0 ? totalTurnover / completedShifts.length : 0,
          confirmationRate: userShifts.length > 0 ? (confirmedShifts.length / userShifts.length) * 100 : 0,
        };
      });

      setBaristaReports(baristaReportsData.sort((a, b) => b.totalHours - a.totalHours));

      // Общая сводка по неделе
      const confirmedShifts = shifts.filter((s) => s.status === 'confirmed');
      const completedShifts = shifts.filter((s) => s.status === 'completed');
      const allReports = reports.filter((r) =>
        shifts.some((s) => s.id === r.shift_id)
      );
      const totalTurnover = allReports.reduce((sum, r) => sum + (r.turnover || 0), 0);

      setWeeklySummary({
        totalShifts: shifts.length,
        confirmedShifts: confirmedShifts.length,
        completedShifts: completedShifts.length,
        totalTurnover,
        avgTurnover: completedShifts.length > 0 ? totalTurnover / completedShifts.length : 0,
        coverageRate: shopSlots.length > 0 ? (shifts.length / shopSlots.length) * 100 : 0,
      });
    } catch (err) {
      console.error('Ошибка загрузки отчётов:', err);
      setError('Не удалось загрузить отчёты');
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

  const exportToCSV = () => {
    if (!baristaReports.length) return;

    const headers = ['Имя', 'Всего часов', 'Подтверждено', 'Завершено', 'Выручка', 'Средняя выручка/час', 'Процент подтверждения'];
    const rows = baristaReports.map((b) => [
      b.name,
      b.totalHours,
      b.confirmedHours,
      b.completedHours,
      b.totalTurnover.toFixed(2),
      b.avgTurnoverPerHour.toFixed(2),
      `${b.confirmationRate.toFixed(1)}%`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = typeof currentWeekStart === 'string' 
      ? currentWeekStart 
      : currentWeekStart.toISOString().split('T')[0];
    link.download = `report_${dateStr}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="reports loading">
        <div className="spinner"></div>
        <p>Загрузка отчётов...</p>
      </div>
    );
  }

  return (
    <div className="reports">
      {/* Header */}
      <div className="reports-header">
        <h2>📊 Отчёты и аналитика</h2>
        <p className="reports-subtitle">Детальная статистика по неделям и бариста</p>
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

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Report Type Selector */}
      <div className="report-type-selector">
        <button
          className={reportType === 'weekly' ? 'active' : ''}
          onClick={() => setReportType('weekly')}
        >
          📅 Еженедельный отчёт
        </button>
        <button
          className={reportType === 'barista' ? 'active' : ''}
          onClick={() => setReportType('barista')}
        >
          👥 Отчёт по бариста
        </button>
        <button
          className={reportType === 'turnover' ? 'active' : ''}
          onClick={() => setReportType('turnover')}
        >
          💰 Отчёт по выручке
        </button>
      </div>

      {/* Weekly Summary Report */}
      {reportType === 'weekly' && weeklySummary && (
        <div className="weekly-report">
          <h3>📅 Сводка за неделю</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">📅</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.totalShifts}</div>
                <div className="summary-label">Всего смен</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">✅</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.confirmedShifts}</div>
                <div className="summary-label">Подтверждено</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">🏁</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.completedShifts}</div>
                <div className="summary-label">Завершено</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.totalTurnover.toFixed(2)} ₽</div>
                <div className="summary-label">Общая выручка</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.avgTurnover.toFixed(2)} ₽</div>
                <div className="summary-label">Средняя выручка/час</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <div className="summary-value">{weeklySummary.coverageRate.toFixed(1)}%</div>
                <div className="summary-label">Покрытие</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barista Report */}
      {reportType === 'barista' && (
        <div className="barista-report">
          <div className="report-actions">
            <h3>👥 Отчёт по бариста</h3>
            <button onClick={exportToCSV} className="btn btn-primary">
              📥 Экспорт в CSV
            </button>
          </div>

          <div className="barista-table-container">
            <table className="barista-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Всего часов</th>
                  <th>Подтверждено</th>
                  <th>Завершено</th>
                  <th>Выручка</th>
                  <th>Средняя выручка/час</th>
                  <th>Процент подтверждения</th>
                </tr>
              </thead>
              <tbody>
                {baristaReports.map((barista) => (
                  <tr key={barista.userId}>
                    <td className="barista-name">{barista.name}</td>
                    <td>{barista.totalHours} ч</td>
                    <td>{barista.confirmedHours} ч</td>
                    <td>{barista.completedHours} ч</td>
                    <td className="turnover">{barista.totalTurnover.toFixed(2)} ₽</td>
                    <td className="avg-turnover">{barista.avgTurnoverPerHour.toFixed(2)} ₽</td>
                    <td>
                      <div className="progress-wrapper">
                        <div className="progress-bar-mini">
                          <div
                            className="progress-fill-mini"
                            style={{ width: `${barista.confirmationRate}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{barista.confirmationRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Turnover Report */}
      {reportType === 'turnover' && (
        <div className="turnover-report">
          <h3>💰 Отчёт по выручке</h3>
          <div className="turnover-chart">
            {baristaReports.map((barista) => (
              <div key={barista.userId} className="turnover-bar-container">
                <div className="turnover-label">{barista.name}</div>
                <div className="turnover-bar-wrapper">
                  <div
                    className="turnover-bar"
                    style={{
                      width: `${(barista.totalTurnover / Math.max(...baristaReports.map((b) => b.totalTurnover), 1)) * 100}%`,
                    }}
                  >
                    <span className="turnover-value">{barista.totalTurnover.toFixed(2)} ₽</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

