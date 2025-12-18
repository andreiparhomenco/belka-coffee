# 🧪 Frontend Tests

## Описание

Unit тесты для frontend компонентов и утилит проекта Belka Coffee.

---

## 🚀 Запуск тестов

```bash
# Запустить все тесты
cd frontend
npm test

# Запустить с watch mode (для разработки)
npm test -- --watch

# Запустить с coverage
npm test -- --coverage

# Запустить только тесты auth
npm test auth
```

---

## 📋 Структура тестов

```
frontend/src/
├── lib/
│   ├── auth.ts
│   ├── helpers.ts
│   ├── supabaseClient.ts
│   └── __tests__/
│       ├── auth.test.ts        # Тесты авторизации
│       ├── helpers.test.ts     # Тесты утилит (TODO)
│       └── README.md
├── hooks/
│   └── __tests__/
│       └── useTelegram.test.ts # Тесты хуков (TODO)
└── components/
    └── __tests__/
        └── App.test.tsx        # Тесты компонентов (TODO)
```

---

## 📊 Покрытие тестами

### Текущее покрытие:

| Файл | Coverage | Тесты |
|------|----------|-------|
| `auth.ts` | ✅ 100% | 12 тестов |
| `helpers.ts` | ⏳ TODO | - |
| `useTelegram.ts` | ⏳ TODO | - |
| `App.tsx` | ⏳ TODO | - |

### Цель: **80%+ coverage**

---

## 🧪 Тесты для auth.ts

### Список тестов:

1. ✅ `telegramAuth` - успешная авторизация
2. ✅ `telegramAuth` - ошибка API
3. ✅ `getCurrentUser` - пользователь существует
4. ✅ `getCurrentUser` - пользователь отсутствует
5. ✅ `getCurrentUser` - некорректный JSON
6. ✅ `isAdmin` - проверка роли админа
7. ✅ `isBarista` - проверка роли бариста
8. ✅ `logout` - очистка данных
9. ✅ `autoAuthFromTelegram` - успешная авторизация
10. ✅ `autoAuthFromTelegram` - недоступен Telegram API
11. ✅ `useAuthStatus` - авторизованный пользователь
12. ✅ `useAuthStatus` - неавторизованный пользователь

---

## 🔧 Технологии

- **Vitest** - test runner
- **@testing-library/react** - тестирование React компонентов
- **@testing-library/user-event** - симуляция пользовательских действий
- **jsdom** - симуляция DOM окружения

---

## ✅ Пример успешного вывода

```
 ✓ frontend/src/lib/__tests__/auth.test.ts (12)
   ✓ Auth Helper Tests (12)
     ✓ should successfully authenticate user
     ✓ should handle API error
     ✓ should get current user from localStorage
     ✓ should return null if no user in localStorage
     ✓ should return null if JSON is invalid
     ✓ should return true for admin user
     ✓ should return true for barista user
     ✓ should clear localStorage on logout
     ✓ should auto-auth from Telegram WebApp
     ✓ should fail if Telegram WebApp API is unavailable
     ✓ should return correct auth status for authenticated user
     ✓ should return correct auth status for non-authenticated user

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  10:00:00
   Duration  567ms
```

---

## 🐛 Troubleshooting

### Ошибка: "Cannot find module"

```bash
# Переустановите зависимости
npm install
```

### Ошибка: "localStorage is not defined"

Убедитесь что в `setup.ts` есть mock для localStorage:

```typescript
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});
```

### Ошибка: "window.Telegram is undefined"

Mock добавлен в `setup.ts`:

```typescript
global.window = {
  Telegram: {
    WebApp: { /* ... */ },
  },
};
```

---

## 📝 TODO: Следующие тесты

### helpers.test.ts
- [ ] `getWeekStart()` - начало недели
- [ ] `formatDate()` - форматирование даты
- [ ] `formatTime()` - форматирование времени
- [ ] `getTelegramUser()` - получение данных из Telegram
- [ ] `isToday()` - проверка сегодняшней даты
- [ ] `isCurrentShift()` - проверка текущей смены

### useTelegram.test.ts
- [ ] Хук возвращает правильные данные
- [ ] Обработка отсутствия Telegram API
- [ ] Событие ready вызывается

### App.test.tsx (E2E)
- [ ] Приложение рендерится
- [ ] Авторизация работает
- [ ] Навигация между страницами

---

## 🚀 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

**Создано:** 15 декабря 2025  
**Версия:** 1.0  
**Проект:** Belka Coffee

