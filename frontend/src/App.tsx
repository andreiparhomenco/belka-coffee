// ============================================
// Main App Component
// Description: Главный компонент веб-приложения
// Updated: 2025-12-18 - Переход на веб-версию (без Telegram)
// ============================================

import { useEffect, useState } from 'react';
import { checkSession, getCurrentUser, signOut, type User } from './lib/auth';
import { Login } from './components/Login';
import { AvailabilityCalendar } from './components/AvailabilityCalendar';
import { AvailabilityOverview } from './components/AvailabilityOverview';
import { ScheduleGenerator } from './components/ScheduleGenerator';
import { ScheduleView } from './components/ScheduleView';
import { Dashboard, UserManagement, ShiftEditor, Reports, Settings } from './components/admin';
import './App.css';
import './components/AvailabilityCalendar.css';
import './components/AvailabilityOverview.css';
import './components/ScheduleGenerator.css';
import './components/ScheduleView.css';
import './components/admin/Dashboard.css';
import './components/admin/UserManagement.css';
import './components/admin/ShiftEditor.css';
import './components/admin/Reports.css';
import './components/admin/Settings.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'availability' | 'schedule' | 'users' | 'editor' | 'reports' | 'settings' | 'profile'>(
    'availability'
  );

  // Установка начального view в зависимости от роли
  useEffect(() => {
    if (user && user.role === 'admin' && view === 'availability') {
      setView('dashboard');
    }
  }, [user]);

  // Проверка сессии при загрузке
  useEffect(() => {
    const init = async () => {
      // Проверяем есть ли пользователь в localStorage
      const existingUser = getCurrentUser();
      if (existingUser) {
        setUser(existingUser);
        setLoading(false);
        return;
      }

      // Проверяем сессию в Supabase
      const result = await checkSession();
      if (result.success && result.user) {
        setUser(result.user);
      }
      
      setLoading(false);
    };

    init();
  }, []);

  const handleLoginSuccess = () => {
    const user = getCurrentUser();
    if (user) {
      setUser(user);
      // Устанавливаем начальный view в зависимости от роли
      if (user.role === 'admin') {
        setView('dashboard');
      } else {
        setView('availability');
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setView('availability');
  };

  // Если загрузка - показываем спиннер
  if (loading) {
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  // Если нет пользователя - показываем Login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Главное приложение
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
            🚪 Выйти
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        {user.role === 'admin' ? (
          <>
            <button
              className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              📊 Панель
            </button>
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
              className={`nav-btn ${view === 'users' ? 'active' : ''}`}
              onClick={() => setView('users')}
            >
              👥 Бариста
            </button>
            <button
              className={`nav-btn ${view === 'editor' ? 'active' : ''}`}
              onClick={() => setView('editor')}
            >
              ✏️ Редактор
            </button>
            <button
              className={`nav-btn ${view === 'reports' ? 'active' : ''}`}
              onClick={() => setView('reports')}
            >
              📊 Отчёты
            </button>
            <button
              className={`nav-btn ${view === 'settings' ? 'active' : ''}`}
              onClick={() => setView('settings')}
            >
              ⚙️ Настройки
            </button>
            <button
              className={`nav-btn ${view === 'profile' ? 'active' : ''}`}
              onClick={() => setView('profile')}
            >
              👤 Профиль
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {view === 'dashboard' && user.role === 'admin' && <Dashboard />}

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

        {view === 'users' && user.role === 'admin' && <UserManagement />}

        {view === 'editor' && user.role === 'admin' && <ShiftEditor />}

        {view === 'reports' && user.role === 'admin' && <Reports />}

        {view === 'settings' && user.role === 'admin' && <Settings />}

        {view === 'profile' && (
          <div className="profile-view">
            <h2>👤 Мой профиль</h2>
            <div className="profile-card">
              <div className="profile-item">
                <span className="label">Имя:</span>
                <span className="value">{user.name}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email:</span>
                <span className="value">{user.email}</span>
              </div>
              <div className="profile-item">
                <span className="label">Роль:</span>
                <span className="value">
                  {user.role === 'admin' ? '👑 Администратор' : '☕ Бариста'}
                </span>
              </div>
              <div className="profile-item">
                <span className="label">Дата регистрации:</span>
                <span className="value">
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Belka Coffee © 2025</p>
        <p className="version">v1.0.0 MVP • Веб-версия</p>
      </footer>
    </div>
  );
}

export default App;
