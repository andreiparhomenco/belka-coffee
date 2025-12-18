// ============================================
// Settings Component
// Description: Настройки системы
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Settings.css';

interface ShopTemplate {
  id: string;
  day_of_week: number;
  open_hour: number;
  close_hour: number;
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
  const [shopTemplates, setShopTemplates] = useState<ShopTemplate[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    minHoursPerBarista: 20,
    maxHoursPerBarista: 40,
    hourlyRate: 200,
    notificationsEnabled: true,
    autoGenerateSchedule: false,
    scheduleGenerationDay: 5, // Пятница
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загрузка шаблона кофейни
      const { data: templates, error: templatesError } = await supabase
        .from('shop_template')
        .select('*')
        .order('day_of_week');

      if (templatesError) throw templatesError;

      setShopTemplates(templates || []);

      // Загрузка системных настроек (в реальном приложении это может быть отдельная таблица)
      // Для демонстрации используем локальные значения
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

  const handleUpdateTemplate = async (templateId: string, field: 'open_hour' | 'close_hour' | 'is_active', value: number | boolean) => {
    try {
      const { error } = await supabase
        .from('shop_template')
        .update({ [field]: value })
        .eq('id', templateId);

      if (error) throw error;

      setShopTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, [field]: value } : t))
      );

      setSaveStatus('✅ Сохранено');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      console.error('Ошибка обновления шаблона:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleAddTemplate = async (dayOfWeek: number) => {
    try {
      const { data, error } = await supabase
        .from('shop_template')
        .insert({
          day_of_week: dayOfWeek,
          open_hour: 8,
          close_hour: 20,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setShopTemplates((prev) => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week));
      alert('✅ День добавлен');
    } catch (err: any) {
      console.error('Ошибка добавления дня:', err);
      alert(`❌ Ошибка: ${err.message}`);
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
          Настройте часы работы кофейни для каждого дня недели
        </p>

        <div className="shop-template-list">
          {DAYS_FULL.map((dayName, index) => {
            const dayOfWeek = index + 1;
            const template = shopTemplates.find((t) => t.day_of_week === dayOfWeek);

            return (
              <div key={dayOfWeek} className="template-item">
                <div className="template-day">
                  <strong>{dayName}</strong>
                </div>

                {template ? (
                  <>
                    <div className="template-hours">
                      <label>Открытие:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={template.open_hour}
                        onChange={(e) =>
                          handleUpdateTemplate(template.id, 'open_hour', Number(e.target.value))
                        }
                      />
                      <label>Закрытие:</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={template.close_hour}
                        onChange={(e) =>
                          handleUpdateTemplate(template.id, 'close_hour', Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="template-active">
                      <label>
                        <input
                          type="checkbox"
                          checked={template.is_active}
                          onChange={(e) =>
                            handleUpdateTemplate(template.id, 'is_active', e.target.checked)
                          }
                        />
                        <span>Активен</span>
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="template-empty">
                    <button
                      onClick={() => handleAddTemplate(dayOfWeek)}
                      className="btn btn-secondary btn-sm"
                    >
                      ➕ Добавить день
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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

