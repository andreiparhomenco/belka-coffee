// ============================================
// AvailabilityCalendar Component
// Description: Календарь для выбора доступности бариста
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUser } from '../lib/auth';
import { getWeekStart } from '../lib/helpers';

interface TimeSlot {
  day: number;
  hour: number;
  isSelected: boolean;
  isShopOpen: boolean; // Работает ли кофейня в этот час
}

interface AvailabilityCalendarProps {
  weekStart?: Date | string;
  onSave?: () => void;
}

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  weekStart = new Date(),
  onSave,
}) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [shopTemplate, setShopTemplate] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const user = getCurrentUser();
  
  // Вычисляем weekStart один раз
  const [currentWeekStart] = useState(() => 
    getWeekStart(typeof weekStart === 'string' ? new Date(weekStart) : weekStart)
  );
  const [currentWeekStartDate] = useState(() => new Date(currentWeekStart));

  // Загрузка шаблона работы кофейни
  useEffect(() => {
    loadShopTemplate();
  }, []);

  // Загрузка текущей доступности
  useEffect(() => {
    if (user) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadShopTemplate = async () => {
    try {
      console.log('📋 Загрузка шаблона работы кофейни...');
      const { data, error } = await supabase
        .from('shop_template')
        .select('day_of_week, hour, is_active')
        .eq('is_active', true);

      console.log('📋 Шаблон загружен:', { data, error });

      if (error) throw error;

      const template = new Map<string, boolean>();
      data?.forEach(slot => {
        template.set(`${slot.day_of_week}-${slot.hour}`, true);
      });

      console.log('✅ Шаблон обработан, слотов:', template.size);
      setShopTemplate(template);
    } catch (err) {
      console.error('❌ Ошибка загрузки шаблона:', err);
      setError('Не удалось загрузить график работы кофейни');
    }
  };

  const loadAvailability = async () => {
    if (!user) {
      console.log('⚠️ Нет пользователя, пропускаем загрузку');
      return;
    }

    console.log('📅 Загрузка доступности для:', { userId: user.id, weekStart: currentWeekStart });
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('availability')
        .select('day_of_week, hour')
        .eq('user_id', user.id)
        .eq('week_start', currentWeekStart);

      console.log('📅 Доступность загружена:', { data, error });

      if (error) throw error;

      // Создаём слоты для всех дней и часов
      const newSlots: TimeSlot[] = [];
      const selectedSlots = new Set(
        data?.map(slot => `${slot.day_of_week}-${slot.hour}`) || []
      );

      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          newSlots.push({
            day,
            hour,
            isSelected: selectedSlots.has(key),
            isShopOpen: shopTemplate.get(key) || false,
          });
        }
      }

      console.log('✅ Слоты созданы:', newSlots.length);
      setSlots(newSlots);
    } catch (err) {
      console.error('❌ Ошибка загрузки доступности:', err);
      setError('Не удалось загрузить вашу доступность');
    } finally {
      console.log('🏁 Загрузка завершена, loading = false');
      setLoading(false);
    }
  };

  const toggleSlot = (day: number, hour: number) => {
    setSlots(prev =>
      prev.map(slot =>
        slot.day === day && slot.hour === hour
          ? { ...slot, isSelected: !slot.isSelected }
          : slot
      )
    );
    setSuccess(false); // Сбрасываем сообщение об успехе при изменении
  };

  const selectDay = (day: number) => {
    setSlots(prev =>
      prev.map(slot =>
        slot.day === day && slot.isShopOpen
          ? { ...slot, isSelected: true }
          : slot
      )
    );
    setSuccess(false);
  };

  const deselectDay = (day: number) => {
    setSlots(prev =>
      prev.map(slot =>
        slot.day === day ? { ...slot, isSelected: false } : slot
      )
    );
    setSuccess(false);
  };

  const selectAll = () => {
    setSlots(prev =>
      prev.map(slot =>
        slot.isShopOpen ? { ...slot, isSelected: true } : slot
      )
    );
    setSuccess(false);
  };

  const deselectAll = () => {
    setSlots(prev => prev.map(slot => ({ ...slot, isSelected: false })));
    setSuccess(false);
  };

  const saveAvailability = async () => {
    if (!user) {
      setError('Необходимо авторизоваться');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Удаляем старую доступность для этой недели
      const { error: deleteError } = await supabase
        .from('availability')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', currentWeekStart.toISOString().split('T')[0]);

      if (deleteError) throw deleteError;

      // Вставляем новую доступность
      const selectedSlots = slots
        .filter(slot => slot.isSelected)
        .map(slot => ({
        user_id: user.id,
        week_start: currentWeekStart,
        day_of_week: slot.day,
        hour: slot.hour,
      }));

      if (selectedSlots.length > 0) {
        const { error: insertError } = await supabase
          .from('availability')
          .insert(selectedSlots);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      
      // Уведомление Telegram
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showPopup({
          title: '✅ Сохранено',
          message: `Доступность на неделю ${currentWeekStartDate.toLocaleDateString()} сохранена!`,
          buttons: [{ type: 'ok' }],
        });
      }

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Не удалось сохранить доступность. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedCount = (day: number) => {
    return slots.filter(slot => slot.day === day && slot.isSelected).length;
  };

  const getTotalSelectedCount = () => {
    return slots.filter(slot => slot.isSelected).length;
  };

  if (loading) {
    return (
      <div className="availability-calendar loading">
        <div className="spinner"></div>
        <p>Загрузка календаря...</p>
      </div>
    );
  }

  return (
    <div className="availability-calendar">
      <div className="calendar-header">
        <h2>📅 Моя доступность</h2>
        <p className="week-info">
          Неделя: {currentWeekStartDate.toLocaleDateString('ru-RU')} -{' '}
          {new Date(currentWeekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
        </p>
        <p className="selected-count">
          Выбрано: <strong>{getTotalSelectedCount()}</strong> часов
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ Доступность успешно сохранена!
        </div>
      )}

      <div className="calendar-controls">
        <button onClick={selectAll} className="btn btn-secondary">
          ✓ Выбрать все рабочие часы
        </button>
        <button onClick={deselectAll} className="btn btn-secondary">
          ✗ Снять все
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header-row">
          <div className="hour-header">Час</div>
          {DAYS.map((day, index) => (
            <div key={day} className="day-header">
              <div className="day-name">{day}</div>
              <div className="day-count">{getSelectedCount(index)} ч</div>
              <div className="day-controls">
                <button
                  onClick={() => selectDay(index)}
                  className="btn-mini"
                  title="Выбрать весь день"
                >
                  ✓
                </button>
                <button
                  onClick={() => deselectDay(index)}
                  className="btn-mini"
                  title="Снять весь день"
                >
                  ✗
                </button>
              </div>
            </div>
          ))}
        </div>

        {HOURS.map(hour => (
          <div key={hour} className="calendar-row">
            <div className="hour-label">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {DAYS.map((_, day) => {
              const slot = slots.find(s => s.day === day && s.hour === hour);
              if (!slot) return null;

              return (
                <div
                  key={`${day}-${hour}`}
                  className={`calendar-cell ${
                    slot.isSelected ? 'selected' : ''
                  } ${slot.isShopOpen ? 'shop-open' : 'shop-closed'}`}
                  onClick={() => slot.isShopOpen && toggleSlot(day, hour)}
                  title={
                    slot.isShopOpen
                      ? slot.isSelected
                        ? 'Нажмите чтобы снять выбор'
                        : 'Нажмите чтобы выбрать'
                      : 'Кофейня закрыта'
                  }
                >
                  {slot.isSelected && '✓'}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="calendar-footer">
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color shop-open"></span>
            <span>Кофейня работает</span>
          </div>
          <div className="legend-item">
            <span className="legend-color shop-closed"></span>
            <span>Кофейня закрыта</span>
          </div>
          <div className="legend-item">
            <span className="legend-color selected"></span>
            <span>Я доступен</span>
          </div>
        </div>

        <button
          onClick={saveAvailability}
          disabled={saving}
          className="btn btn-primary btn-large"
        >
          {saving ? '💾 Сохранение...' : '💾 Сохранить доступность'}
        </button>
      </div>
    </div>
  );
};

