// ============================================
// Main App Component
// Description: Главный компонент Telegram Mini App
// Created: 2025-12-18
// ============================================

import { useEffect, useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { autoAuthFromTelegram, getCurrentUser, logout, type User } from './lib/auth';
import { AvailabilityCalendar } from './components/AvailabilityCalendar';
import { AvailabilityOverview } from './components/AvailabilityOverview';
import { ScheduleGenerator } from './components/ScheduleGenerator';
import { ScheduleView } from './components/ScheduleView';
import './App.css';
import './components/AvailabilityCalendar.css';
import './components/AvailabilityOverview.css';
import './components/ScheduleGenerator.css';
import './components/ScheduleView.css';

function App() {
  const { webApp, user: tgUser } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'availability' | 'schedule' | 'profile'>('availability');

  // Авторизация при загрузке
  useEffect(() => {
    const init = async () => {
      // Проверяем есть ли пользователь в localStorage
      const existingUser = getCurrentUser();
      if (existingUser) {
        setUser(existingUser);
        setLoading(false);
        return;
      }

      // Если нет, пробуем авторизоваться через Telegram
      try {
        const result = await autoAuthFromTelegram();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          setError(result.error || 'Не удалось авторизоваться');
        }
      } catch (err) {
        console.error('Ошибка авторизации:', err);
        setError('Произошла ошибка при авторизации');
      } finally {
        setLoading(false);
      }
    };

    init();

    // Настройка Telegram WebApp
    if (webApp) {
      webApp.ready();
      webApp.expand();
      
      // Настройка главной кнопки
      webApp.MainButton.setText('Сохранить доступность');
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const handleLogout = () => {
    logout();
    setUser(null);
    if (webApp) {
      webApp.close();
    }
  };

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="app-container error">
        <div className="error-card">
          <h2>❌ Ошибка</h2>
          <p>{error || 'Не удалось загрузить приложение'}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="user-info">
            <div className="avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h3>{user.name}</h3>
              <span className={`role-badge ${user.role}`}>
                {user.role === 'admin' ? '👑 Администратор' : '☕ Бариста'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Выйти">
            🚪
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <button
          className={`nav-btn ${view === 'availability' ? 'active' : ''}`}
          onClick={() => setView('availability')}
        >
          📅 Доступность
        </button>
        <button
          className={`nav-btn ${view === 'schedule' ? 'active' : ''}`}
          onClick={() => setView('schedule')}
        >
          📆 График
        </button>
        <button
          className={`nav-btn ${view === 'profile' ? 'active' : ''}`}
          onClick={() => setView('profile')}
        >
          👤 Профиль
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {view === 'availability' && (
          <>
            {user.role === 'admin' ? (
              <AvailabilityOverview />
            ) : (
              <AvailabilityCalendar
                onSave={() => {
                  console.log('Доступность сохранена');
                }}
              />
            )}
          </>
        )}

        {view === 'schedule' && (
          <>
            {user.role === 'admin' ? (
              <>
                <ScheduleGenerator
                  onGenerate={() => {
                    console.log('График сгенерирован');
                  }}
                />
                <ScheduleView />
              </>
            ) : (
              <ScheduleView />
            )}
          </>
        )}

        {view === 'profile' && (
          <div className="profile-view">
            <h2>👤 Мой профиль</h2>
            <div className="profile-card">
              <div className="profile-item">
                <span className="label">Имя:</span>
                <span className="value">{user.name}</span>
              </div>
              <div className="profile-item">
                <span className="label">Роль:</span>
                <span className="value">
                  {user.role === 'admin' ? 'Администратор' : 'Бариста'}
                </span>
              </div>
              <div className="profile-item">
                <span className="label">Telegram ID:</span>
                <span className="value">{user.telegram_id}</span>
              </div>
              <div className="profile-item">
                <span className="label">Дата регистрации:</span>
                <span className="value">
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>

            {tgUser && (
              <div className="telegram-info">
                <h3>📱 Telegram</h3>
                <div className="profile-item">
                  <span className="label">Username:</span>
                  <span className="value">@{tgUser.username || 'не указан'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Язык:</span>
                  <span className="value">{tgUser.language_code || 'не указан'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Belka Coffee © 2025</p>
        <p className="version">v1.0.0 • Этап 2</p>
      </footer>
    </div>
  );
}

export default App;
