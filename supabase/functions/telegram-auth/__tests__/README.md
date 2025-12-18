# 🧪 Тесты для telegram-auth Edge Function

## Описание

Unit и интеграционные тесты для Edge Function авторизации через Telegram.

---

## 🚀 Запуск тестов

### Локально (с Supabase CLI)

```bash
# Запустить локальный Supabase
supabase start

# Установить переменные окружения
export SUPABASE_ANON_KEY=your_anon_key

# Запустить тесты
deno test --allow-all supabase/functions/telegram-auth/__tests__/index.test.ts
```

### В CI/CD

```yaml
# .github/workflows/test.yml
name: Test Edge Functions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
      - name: Run tests
        run: deno test --allow-all supabase/functions/telegram-auth/__tests__/
```

---

## 📋 Список тестов

| № | Тест | Описание |
|---|------|----------|
| 1 | Создание пользователя | Новый пользователь с ролью barista |
| 2 | Повторный вход | Возврат существующего пользователя |
| 3 | Обновление имени | Изменение имени при повторном входе |
| 4 | Валидация telegram_id | Ошибка при отсутствии telegram_id |
| 5 | Валидация name | Ошибка при отсутствии name |
| 6 | CORS preflight | Обработка OPTIONS запроса |
| 7 | Audit log | Проверка записи в audit_log |
| 8 | Производительность | Множественные concurrent запросы |

---

## ✅ Ожидаемые результаты

```
running 8 tests from ./index.test.ts
test should create new user with barista role ... ok (245ms)
test should return existing user on second login ... ok (123ms)
test should update name if changed ... ok (156ms)
test should return error if telegram_id is missing ... ok (89ms)
test should return error if name is missing ... ok (87ms)
test should handle CORS preflight OPTIONS request ... ok (45ms)
test should log auth to audit_log ... ok (178ms)
test should handle multiple concurrent requests ... ok (567ms)

ok | 8 passed | 0 failed (1.49s)
```

---

## 🔧 Mock данные

```typescript
const mockTelegramData = {
  telegram_id: 999888777,
  name: "Тест Тестович",
  username: "test_user",
};
```

---

## ⚠️ Важно

- Тесты требуют запущенный локальный Supabase
- Используйте тестовую базу данных, не продакшен!
- Тестовые данные автоматически очищаются

---

## 📊 Coverage

Для проверки покрытия кода тестами:

```bash
deno test --coverage=coverage --allow-all
deno coverage coverage --lcov > coverage.lcov
```

Цель: **80%+ coverage**

---

**Создано:** 15 декабря 2025  
**Версия:** 1.0  
**Проект:** Belka Coffee

