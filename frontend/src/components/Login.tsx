// ============================================
// Login Component - Страница входа
// Description: Форма входа для веб-версии приложения
// Created: 2025-12-18
// ============================================

import React, { useState } from 'react';
import { signIn } from '../lib/auth';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success && result.user) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = (role: 'admin' | 'barista') => {
    if (role === 'admin') {
      setEmail('admin@belka.coffee');
      setPassword('BelkaAdmin2024');
    } else {
      setEmail('barista@belka.coffee');
      setPassword('BelkaBarista2024');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">☕</div>
          <h1>Belka Coffee</h1>
          <p>Система управления графиком работы</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@belka.coffee"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="login-divider">
          <span>Тестовые аккаунты</span>
        </div>

        <div className="test-accounts">
          <button
            type="button"
            className="test-account-btn admin"
            onClick={() => fillTestCredentials('admin')}
            disabled={loading}
          >
            👨‍💼 Войти как админ
          </button>
          <button
            type="button"
            className="test-account-btn barista"
            onClick={() => fillTestCredentials('barista')}
            disabled={loading}
          >
            ☕ Войти как бариста
          </button>
        </div>

        <div className="login-footer">
          <p>
            <strong>Админ:</strong> admin@belka.coffee / BelkaAdmin2024<br />
            <strong>Бариста:</strong> barista@belka.coffee / BelkaBarista2024
          </p>
        </div>
      </div>
    </div>
  );
};

