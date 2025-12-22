// ============================================
// ScheduleGenerator Component
// Description: Компонент для генерации графика (админ)
// Created: 2025-12-18
// ============================================

import React, { useState } from 'react';
import { getWeekStart } from '../lib/helpers';

interface ScheduleGeneratorProps {
  weekStart?: Date | string;
  onGenerate?: (result: any) => void;
}

export const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({
  weekStart = new Date(),
  onGenerate,
}) => {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxHours, setMaxHours] = useState(40);
  const [minHours, setMinHours] = useState(10);

  // getWeekStart возвращает строку (YYYY-MM-DD), создаем Date версию для отображения
  const currentWeekStart = getWeekStart(typeof weekStart === 'string' ? new Date(weekStart) : weekStart);
  const currentWeekStartDate = new Date(currentWeekStart);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            week_start: currentWeekStart,
            options: {
              maxHoursPerBarista: maxHours,
              minHoursPerBarista: minHours,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        
        // Уведомление Telegram
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showPopup({
            title: '✅ График создан',
            message: `Сгенерировано ${data.result.shifts.length} смен с покрытием ${data.result.coverage.toFixed(1)}%`,
            buttons: [{ type: 'ok' }],
          });
        }

        if (onGenerate) {
          onGenerate(data.result);
        }
      } else {
        setError(data.error || 'Не удалось сгенерировать график');
      }
    } catch (err) {
      console.error('Ошибка генерации:', err);
      setError('Произошла ошибка при генерации графика');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="schedule-generator">
      <div className="generator-header">
        <h2>🤖 Генерация графика</h2>
        <p className="week-info">
          Неделя: {currentWeekStartDate.toLocaleDateString('ru-RU')}
        </p>
      </div>

      <div className="generator-options">
        <h3>⚙️ Настройки</h3>
        
        <div className="option-group">
          <label htmlFor="maxHours">
            Максимум часов на бариста:
          </label>
          <input
            id="maxHours"
            type="number"
            min="10"
            max="60"
            value={maxHours}
            onChange={(e) => setMaxHours(Number(e.target.value))}
            className="input"
          />
        </div>

        <div className="option-group">
          <label htmlFor="minHours">
            Минимум часов на бариста:
          </label>
          <input
            id="minHours"
            type="number"
            min="0"
            max="40"
            value={minHours}
            onChange={(e) => setMinHours(Number(e.target.value))}
            className="input"
          />
        </div>

        <div className="info-box">
          <p>ℹ️ Алгоритм автоматически:</p>
          <ul>
            <li>✅ Учитывает доступность бариста</li>
            <li>✅ Балансирует часы между всеми</li>
            <li>✅ Покрывает все рабочие слоты</li>
            <li>✅ Приоритизирует слоты с меньшим покрытием</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="generation-result">
          <h3>📊 Результат генерации</h3>
          
          <div className="result-stats">
            <div className="stat-card">
              <div className="stat-label">Сгенерировано смен</div>
              <div className="stat-value">{result.shifts.length}</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Покрытие</div>
              <div className="stat-value">{result.coverage.toFixed(1)}%</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Балансировка</div>
              <div className="stat-value">
                {(result.balance * 100).toFixed(0)}%
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Непокрытых слотов</div>
              <div className="stat-value uncovered">
                {result.stats.uncovered_slots}
              </div>
            </div>
          </div>

          <div className="hours-distribution">
            <h4>Распределение часов:</h4>
            <ul>
              {Object.entries(result.stats.hours_per_barista).map(([name, hours]: [string, any]) => (
                <li key={name}>
                  {name}: <strong>{hours}</strong> часов
                </li>
              ))}
            </ul>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="warnings">
              <h4>⚠️ Предупреждения:</h4>
              <ul>
                {result.warnings.map((warning: string, index: number) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="generator-actions">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary btn-large"
        >
          {generating ? '⏳ Генерация...' : '🚀 Сгенерировать график'}
        </button>
        
        {result && (
          <p className="success-message">
            ✅ График успешно сохранён в базу данных
          </p>
        )}
      </div>
    </div>
  );
};

