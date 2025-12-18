// ============================================
// UserManagement Component
// Description: Управление пользователями (бариста)
// Created: 2025-12-18
// ============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User } from '../../types';
import './UserManagement.css';

interface UserFormData {
  telegram_id: number;
  name: string;
  role: 'barista' | 'admin';
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    telegram_id: 0,
    name: '',
    role: 'barista',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setShowAddForm(true);
    setEditingUser(null);
    setFormData({
      telegram_id: 0,
      name: '',
      role: 'barista',
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowAddForm(true);
    setFormData({
      telegram_id: user.telegram_id,
      name: user.name,
      role: user.role,
    });
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({
      telegram_id: 0,
      name: '',
      role: 'barista',
    });
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.telegram_id) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      if (editingUser) {
        // Обновление существующего пользователя
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            role: formData.role,
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        alert('✅ Пользователь обновлён');
      } else {
        // Создание нового пользователя
        const { error } = await supabase.from('users').insert({
          telegram_id: formData.telegram_id,
          name: formData.name,
          role: formData.role,
        });

        if (error) throw error;

        alert('✅ Пользователь добавлен');
      }

      handleCancelForm();
      loadUsers();
    } catch (err: any) {
      console.error('Ошибка сохранения пользователя:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${user.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);

      if (error) throw error;

      alert('✅ Пользователь удалён');
      loadUsers();
    } catch (err: any) {
      console.error('Ошибка удаления пользователя:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleChangeRole = async (user: User, newRole: 'barista' | 'admin') => {
    if (!confirm(`Изменить роль ${user.name} на ${newRole === 'admin' ? 'администратор' : 'бариста'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      alert('✅ Роль изменена');
      loadUsers();
    } catch (err: any) {
      console.error('Ошибка изменения роли:', err);
      alert(`❌ Ошибка: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="user-management loading">
        <div className="spinner"></div>
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <div className="um-header">
        <div>
          <h2>👥 Управление пользователями</h2>
          <p className="um-subtitle">Всего пользователей: {users.length}</p>
        </div>
        <button onClick={handleAddUser} className="btn btn-primary">
          ➕ Добавить пользователя
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="user-form-modal">
          <div className="user-form">
            <h3>{editingUser ? '✏️ Редактировать пользователя' : '➕ Добавить пользователя'}</h3>

            <div className="form-group">
              <label>
                Telegram ID <span className="required">*</span>
              </label>
              <input
                type="number"
                value={formData.telegram_id || ''}
                onChange={(e) => setFormData({ ...formData, telegram_id: Number(e.target.value) })}
                disabled={!!editingUser}
                placeholder="123456789"
              />
              {editingUser && (
                <small className="form-hint">Telegram ID нельзя изменить</small>
              )}
            </div>

            <div className="form-group">
              <label>
                Имя <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>

            <div className="form-group">
              <label>
                Роль <span className="required">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'barista' | 'admin' })}
              >
                <option value="barista">Бариста</option>
                <option value="admin">Администратор</option>
              </select>
            </div>

            <div className="form-actions">
              <button onClick={handleCancelForm} className="btn btn-secondary">
                Отмена
              </button>
              <button onClick={handleSaveUser} className="btn btn-primary">
                {editingUser ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="users-list">
        {users.length === 0 ? (
          <div className="empty-state">
            <p>📭 Пользователей пока нет</p>
            <button onClick={handleAddUser} className="btn btn-primary">
              ➕ Добавить первого пользователя
            </button>
          </div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="telegram-id">{user.telegram_id}</td>
                    <td className="user-name">{user.name}</td>
                    <td className="user-role">
                      <span className={`role-badge role-${user.role}`}>
                        {user.role === 'admin' ? '👑 Администратор' : '☕ Бариста'}
                      </span>
                    </td>
                    <td className="created-date">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="user-actions">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="action-btn edit"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      {user.role === 'barista' ? (
                        <button
                          onClick={() => handleChangeRole(user, 'admin')}
                          className="action-btn promote"
                          title="Сделать администратором"
                        >
                          👑
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChangeRole(user, 'barista')}
                          className="action-btn demote"
                          title="Снять права администратора"
                        >
                          ☕
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="action-btn delete"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="users-stats">
        <div className="stat-item">
          <span className="stat-icon">☕</span>
          <span className="stat-label">Бариста:</span>
          <span className="stat-value">{users.filter(u => u.role === 'barista').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">👑</span>
          <span className="stat-label">Администраторы:</span>
          <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
        </div>
      </div>
    </div>
  );
};

