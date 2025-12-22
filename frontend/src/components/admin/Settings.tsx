// ============================================
// Settings Component
// Description: Настройки системы
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Settings.css';

interface ShopTemplateSlot {
  id: string;
  day_of_week: number;
  hour: number;
  is_active: boolean;
}

interface DaySchedule {
  day_of_week: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  is_active: boolean;
}

interface SystemSettings {
  minHoursPerBarista: number;
  maxHoursPerBarista: number;
  hourlyRate: number;
  notificationsEnabled: boolean;
  autoGenerateSchedule: boolean;
  scheduleGenerationDay: number;
}

const DAYS_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const Settings: React.FC = () => {
  const [shopTemplateSlots, setShopTemplateSlots] = useState<ShopTemplateSlot[]>([]);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    minHoursPerBarista: 20,
    maxHoursPerBarista: 40,
    hourlyRate: 200,
    notificationsEnabled: true,
    autoGenerateSchedule: false,
    scheduleGenerationDay: 5, // Пятница
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загрузка всех слотов шаблона кофейни
      const { data: slots, error: slotsError } = await supabase
        .from('shop_template')
        .select('*')
        .order('day_of_week')
        .order('hour');

      if (slotsError) throw slotsError;

      setShopTemplateSlots(slots || []);

      // Конвертируем слоты в расписание по дням (группируем)
      const schedules: DaySchedule[] = [];
      for (let day = 0; day <= 6; day++) {
        const daySlots = (slots || []).filter(s => s.day_of_week === day && s.is_active);
        if (daySlots.length > 0) {
          const hours = daySlots.map(s => s.hour).sort((a, b) => a - b);
          const minHour = Math.min(...hours);
          const maxHour = Math.max(...hours);
          
          schedules.push({
            day_of_week: day,
            start_hour: minHour,
            start_minute: 0, // Начало всегда с :00
            end_hour: maxHour,
            end_minute: 30, // По умолчанию конец в :30 (последний слот + 30 минут)
            is_active: true,
          });
        } else {
          schedules.push({
            day_of_week: day,
            start_hour: 8,
            start_minute: 0,
            end_hour: 20,
            end_minute: 30,
            is_active: false,
          });
        }
      }
      setDaySchedules(schedules);

      // Загрузка системных настроек
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        setSystemSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDaySchedule = (dayOfWeek: number, field: 'start_hour' | 'start_minute' | 'end_hour' | 'end_minute' | 'is_active', value: number | boolean) => {
    setDaySchedules(prev =>
      prev.map(schedule =>
        schedule.day_of_week === dayOfWeek
          ? { ...schedule, [field]: value }
          : schedule
      )
    );
  };

  const handleSaveDaySchedule = async (dayOfWeek: number) => {
    setSaving(true);
    try {
      const schedule = daySchedules.find(s => s.day_of_week === dayOfWeek);
      if (!schedule) throw new Error('Расписание не найдено');

      // Удаляем все старые слоты для этого дня
      const { error: deleteError } = await supabase
        .from('shop_template')
        .delete()
        .eq('day_of_week', dayOfWeek);

      if (deleteError) throw deleteError;

      // Если день активен, создаем новые слоты
      if (schedule.is_active) {
        const newSlots = [];
        
        // Определяем последний час с учетом минут
        // Если конец в 20:30, то последний слот - 20:00
        // Если конец в 21:00, то последний слот - 20:00
        const lastHour = schedule.end_minute > 0 ? schedule.end_hour : schedule.end_hour - 1;
        
        for (let hour = schedule.start_hour; hour <= lastHour; hour++) {
          newSlots.push({
            day_of_week: dayOfWeek,
            hour: hour,
            is_active: true,
          });
        }

        if (newSlots.length > 0) {
          const { error: insertError } = await supabase
            .from('shop_template')
            .insert(newSlots);

          if (insertError) throw insertError;
        }
      }

      setSaveStatus(`✅ ${DAYS_FULL[dayOfWeek]} сохранено`);
      setTimeout(() => setSaveStatus(null), 2000);

      // Перезагружаем данные
      await loadSettings();
    } catch (err: any) {
      console.error('Ошибка сохранения расписания:', err);
      alert(`❌ Ошибка: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = () => {
    try {
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      setSaveStatus('✅ Системные настройки сохранены');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      console.error('Ошибка сохранения настроек:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="settings loading">
        <div className="spinner"></div>
        <p>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="settings">
      {/* Header */}
      <div className="settings-header">
        <h2>⚙️ Настройки системы</h2>
        <p className="settings-subtitle">Настройка графика работы и параметров системы</p>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className="alert alert-success">
          {saveStatus}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Shop Template Settings */}
      <div className="settings-section">
        <h3>🏪 График работы кофейни</h3>
        <p className="section-description">
          Настройте часы работы кофейни для каждого дня недели. Например: 8:00 - 20:30
        </p>

        <div className="shop-template-list">
          {DAYS_FULL.map((dayName, index) => {
            const dayOfWeek = index;
            const schedule = daySchedules.find((s) => s.day_of_week === dayOfWeek);

            if (!schedule) return null;

            return (
              <div key={dayOfWeek} className="template-item">
                <div className="template-day">
                  <strong>{dayName}</strong>
                </div>

                <div className="template-controls">
                  <div className="template-active">
                    <label>
                      <input
                        type="checkbox"
                        checked={schedule.is_active}
                        onChange={(e) =>
                          handleUpdateDaySchedule(dayOfWeek, 'is_active', e.target.checked)
                        }
                      />
                      <span>Работает</span>
                    </label>
                  </div>

                  {schedule.is_active && (
                    <div className="template-hours">
                      <label>С:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={schedule.start_hour}
                        onChange={(e) =>
                          handleUpdateDaySchedule(dayOfWeek, 'start_hour', Number(e.target.value))
                        }
                        className="hour-input"
                      />
                      <span>:</span>
                      <select
                        value={schedule.start_minute}
                        onChange={(e) =>
                          handleUpdateDaySchedule(dayOfWeek, 'start_minute', Number(e.target.value))
                        }
                        className="minute-input"
                      >
                        <option value={0}>00</option>
                        <option value={30}>30</option>
                      </select>
                      
                      <label style={{ marginLeft: '12px' }}>До:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={schedule.end_hour}
                        onChange={(e) =>
                          handleUpdateDaySchedule(dayOfWeek, 'end_hour', Number(e.target.value))
                        }
                        className="hour-input"
                      />
                      <span>:</span>
                      <select
                        value={schedule.end_minute}
                        onChange={(e) =>
                          handleUpdateDaySchedule(dayOfWeek, 'end_minute', Number(e.target.value))
                        }
                        className="minute-input"
                      >
                        <option value={0}>00</option>
                        <option value={30}>30</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => handleSaveDaySchedule(dayOfWeek)}
                    disabled={saving}
                    className="btn btn-primary btn-sm"
                  >
                    {saving ? '⏳' : '💾'} Сохранить
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="info-box">
          <p>💡 <strong>Подсказка:</strong> Теперь вы можете указать точное время с минутами. Например: с 8:00 до 20:30</p>
        </div>
      </div>

      {/* System Settings */}
      <div className="settings-section">
        <h3>🔧 Системные параметры</h3>
        <p className="section-description">
          Настройте параметры алгоритма распределения смен и уведомлений
        </p>

        <div className="system-settings-form">
          <div className="form-row">
            <label>Минимум часов на бариста (в неделю):</label>
            <input
              type="number"
              min="0"
              max="168"
              value={systemSettings.minHoursPerBarista}
              onChange={(e) =>
                setSystemSettings({ ...systemSettings, minHoursPerBarista: Number(e.target.value) })
              }
            />
          </div>

          <div className="form-row">
            <label>Максимум часов на бариста (в неделю):</label>
            <input
              type="number"
              min="0"
              max="168"
              value={systemSettings.maxHoursPerBarista}
              onChange={(e) =>
                setSystemSettings({ ...systemSettings, maxHoursPerBarista: Number(e.target.value) })
              }
            />
          </div>

          <div className="form-row">
            <label>Ставка (₽/час):</label>
            <input
              type="number"
              min="0"
              value={systemSettings.hourlyRate}
              onChange={(e) =>
                setSystemSettings({ ...systemSettings, hourlyRate: Number(e.target.value) })
              }
            />
          </div>

          <div className="form-row checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={systemSettings.notificationsEnabled}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, notificationsEnabled: e.target.checked })
                }
              />
              <span>Отправлять уведомления в Telegram</span>
            </label>
          </div>

          <div className="form-row checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={systemSettings.autoGenerateSchedule}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, autoGenerateSchedule: e.target.checked })
                }
              />
              <span>Автоматическая генерация графика</span>
            </label>
          </div>

          {systemSettings.autoGenerateSchedule && (
            <div className="form-row">
              <label>День недели для генерации (1 = Понедельник, 7 = Воскресенье):</label>
              <select
                value={systemSettings.scheduleGenerationDay}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, scheduleGenerationDay: Number(e.target.value) })
                }
              >
                {DAYS_FULL.map((day, index) => (
                  <option key={index} value={index + 1}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-actions">
            <button onClick={handleSaveSystemSettings} className="btn btn-primary">
              💾 Сохранить системные настройки
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="settings-info">
        <h4>ℹ️ Информация</h4>
        <ul>
          <li>Изменения в графике работы кофейни применятся при следующей генерации графика</li>
          <li>Минимум и максимум часов используются алгоритмом для балансировки нагрузки</li>
          <li>Уведомления отправляются бариста при назначении новых смен и напоминаниях</li>
          <li>Автоматическая генерация запускается в указанный день недели в 00:00</li>
        </ul>
      </div>
    </div>
  );
};

