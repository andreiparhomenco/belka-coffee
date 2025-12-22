// ============================================
// ShiftEditor Component
// Description: Ручное редактирование смен администратором
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Shift, User } from '../../types';
import { getWeekStart, formatDate } from '../../lib/helpers';
import './ShiftEditor.css';

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

interface ShiftCell {
  dayOfWeek: number;
  hour: number;
  shift: Shift | null;
}

export const ShiftEditor: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shopHours, setShopHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<ShiftCell | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const currentWeekStart = getWeekStart(selectedWeek);

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const weekStartDate = typeof currentWeekStart === 'string' 
        ? new Date(currentWeekStart) 
        : currentWeekStart;
      const weekStartStr = weekStartDate.toISOString().split('T')[0];

      const [shiftsRes, usersRes, shopTemplateRes] = await Promise.all([
        supabase
          .from('shifts')
          .select('*')
          .eq('week_start', weekStartStr)
          .neq('status', 'cancelled'),
        
        supabase
          .from('users')
          .select('*')
          .eq('role', 'barista')
          .order('name'),
        
        supabase
          .from('shop_template')
          .select('hour')
          .eq('is_active', true)
          .order('hour'),
      ]);

      if (shiftsRes.error) throw shiftsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (shopTemplateRes.error) throw shopTemplateRes.error;

      setShifts(shiftsRes.data || []);
      setUsers(usersRes.data || []);
      
      // Извлекаем уникальные часы работы кофейни
      const hours = Array.from(new Set(shopTemplateRes.data?.map(slot => slot.hour) || [])).sort((a, b) => a - b);
      setShopHours(hours.length > 0 ? hours : Array.from({ length: 24 }, (_, i) => i));
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (dayOfWeek: number, hour: number) => {
    const existingShift = shifts.find(
      (s) => s.day_of_week === dayOfWeek && s.hour === hour
    );

    setSelectedCell({ dayOfWeek, hour, shift: existingShift || null });
    setShowAssignModal(true);
    setSelectedUserId(existingShift?.user_id || '');
  };

  const handleAssignShift = async () => {
    if (!selectedCell || !selectedUserId) {
      alert('Выберите бариста');
      return;
    }

    try {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];

      if (selectedCell.shift) {
        // Обновляем существующую смену
        const { error } = await supabase
          .from('shifts')
          .update({ user_id: selectedUserId })
          .eq('id', selectedCell.shift.id);

        if (error) throw error;
      } else {
        // Создаём новую смену
        const { error } = await supabase.from('shifts').insert({
          user_id: selectedUserId,
          week_start: weekStartStr,
          day_of_week: selectedCell.dayOfWeek,
          hour: selectedCell.hour,
          status: 'planned',
        });

        if (error) throw error;
      }

      alert('✅ Смена назначена');
      setShowAssignModal(false);
      setSelectedCell(null);
      loadData();
    } catch (err: any) {
      console.error('Ошибка назначения смены:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedCell?.shift) return;

    if (!confirm('Удалить эту смену?')) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', selectedCell.shift.id);

      if (error) throw error;

      alert('✅ Смена удалена');
      setShowAssignModal(false);
      setSelectedCell(null);
      loadData();
    } catch (err: any) {
      console.error('Ошибка удаления смены:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : 'Неизвестно';
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
      <div className="shift-editor loading">
        <div className="spinner"></div>
        <p>Загрузка смен...</p>
      </div>
    );
  }

  return (
    <div className="shift-editor">
      {/* Header */}
      <div className="se-header">
        <h2>✏️ Редактор смен</h2>
        <p className="se-subtitle">Ручное управление графиком работы</p>
      </div>

      {/* Week Selector */}
      <div className="week-selector">
        <button onClick={goToPreviousWeek} className="btn btn-secondary">
          ← Предыдущая
        </button>
        <div className="week-info">
          <strong>Неделя:</strong> {formatDate(currentWeekStart)} -{' '}
          {formatDate(new Date(new Date(typeof currentWeekStart === 'string' ? currentWeekStart : currentWeekStart).getTime() + 6 * 24 * 60 * 60 * 1000))}
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

      {/* Instructions */}
      <div className="instructions">
        <p>💡 <strong>Инструкция:</strong> Нажмите на любую ячейку, чтобы назначить или изменить смену</p>
        {shopHours.length > 0 && (
          <p className="shop-hours-info">
            🏪 <strong>Часы работы:</strong> {shopHours[0]}:00 - {shopHours[shopHours.length - 1] + 1}:00
          </p>
        )}
      </div>

      {/* Schedule Grid */}
      <div className="schedule-grid-container">
        <div className="schedule-grid">
          {/* Header with days */}
          <div className="grid-header">
            <div className="hour-cell header-cell">Час</div>
            {DAYS.map((day, idx) => (
              <div key={idx} className="day-cell header-cell">
                {day}
              </div>
            ))}
          </div>

          {/* Rows for each hour */}
          {shopHours.length > 0 ? (
            shopHours.map((hour) => (
              <div key={hour} className="grid-row">
                <div className="hour-cell">{hour}:00</div>
                {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                  const shift = shifts.find(
                    (s) => s.day_of_week === dayOfWeek && s.hour === hour
                  );

                  return (
                    <div
                      key={dayOfWeek}
                      className={`shift-cell ${shift ? 'has-shift' : 'empty'} ${
                        shift?.status === 'confirmed' ? 'confirmed' : ''
                      }`}
                      onClick={() => handleCellClick(dayOfWeek, hour)}
                    >
                      {shift && (
                        <div className="shift-info">
                          <div className="barista-name">{getUserName(shift.user_id)}</div>
                          <div className="shift-status">
                            {shift.status === 'confirmed' ? '✅' : '⏳'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>⚠️ Настройте график работы кофейни в разделе "Настройки"</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedCell && (
        <div className="assign-modal">
          <div className="modal-content">
            <h3>
              {selectedCell.shift ? '✏️ Редактировать смену' : '➕ Назначить смену'}
            </h3>
            <p className="modal-info">
              <strong>День:</strong> {DAYS[selectedCell.dayOfWeek - 1]}, <strong>Час:</strong>{' '}
              {selectedCell.hour}:00
            </p>

            {selectedCell.shift && (
              <div className="current-shift-info">
                <p>
                  <strong>Текущий бариста:</strong> {getUserName(selectedCell.shift.user_id)}
                </p>
                <p>
                  <strong>Статус:</strong>{' '}
                  {selectedCell.shift.status === 'confirmed' ? '✅ Подтверждено' : '⏳ Ожидает'}
                </p>
              </div>
            )}

            <div className="form-group">
              <label>Выберите бариста:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Выберите --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCell(null);
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              {selectedCell.shift && (
                <button onClick={handleDeleteShift} className="btn btn-danger">
                  🗑️ Удалить
                </button>
              )}
              <button onClick={handleAssignShift} className="btn btn-primary">
                {selectedCell.shift ? 'Сохранить' : 'Назначить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="editor-stats">
        <div className="stat-item">
          <span className="stat-label">Всего смен:</span>
          <span className="stat-value">{shifts.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Подтверждено:</span>
          <span className="stat-value success">
            {shifts.filter((s) => s.status === 'confirmed').length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Ожидают:</span>
          <span className="stat-value warning">
            {shifts.filter((s) => s.status === 'planned').length}
          </span>
        </div>
      </div>
    </div>
  );
};

