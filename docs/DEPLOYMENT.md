# 🌐 Руководство по деплою

## Production Deployment

### 1. Frontend (Vercel)

#### Автоматический деплой

При каждом push в `main` ветку Vercel автоматически:
1. Собирает проект
2. Запускает тесты (если настроены)
3. Деплоит новую версию

#### Ручной деплой

```bash
cd frontend

# Установить Vercel CLI
npm install -g vercel

# Логин
vercel login

# Деплой
vercel --prod
```

### 2. Backend (Supabase Edge Functions)

#### Деплой Edge Functions

```bash
# Деплой всех функций
supabase functions deploy

# Деплой конкретной функции
supabase functions deploy telegram-auth
supabase functions deploy generate-schedule
supabase functions deploy calculate-salaries
```

#### Установка секретов

```bash
# Установить Bot Token для Edge Functions
supabase secrets set BOT_TOKEN=your-bot-token

# Проверить секреты
supabase secrets list
```

### 3. Database Migrations

#### Production миграции

```bash
# Проверить, какие миграции нужно применить
supabase db diff

# Применить миграции
supabase db push

# Откатить (если нужно)
supabase db reset
```

### 4. Telegram Bot

#### Настройка Webhook (опционально)

Если используете webhook вместо polling:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project.supabase.co/functions/v1/telegram-webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

---

## Staging Environment

### 1. Создание staging окружения

**Vercel:**
- Каждый PR автоматически получает preview URL
- Можно создать отдельный staging проект

**Supabase:**
```bash
# Создать отдельный проект для staging
# Или использовать branching (платная функция)
```

### 2. Environment Variables

**Staging `.env`:**
```env
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_BOT_USERNAME=belka_coffee_staging_bot
BOT_TOKEN=staging-bot-token
```

---

## CI/CD Pipeline

### GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm run test
          
      - name: Build
        run: |
          cd frontend
          npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

---

## Мониторинг

### 1. Vercel Analytics

Включить в настройках проекта:
- Analytics (бесплатно)
- Speed Insights
- Web Vitals

### 2. Sentry (Error Tracking)

```bash
cd frontend
npm install @sentry/react @sentry/vite-plugin
```

**Конфигурация:**

```typescript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 3. Supabase Logs

Просмотр логов:
- Перейдите в Supabase Dashboard
- Logs → Edge Functions
- Фильтруйте по функциям

---

## Rollback Strategy

### Frontend (Vercel)

```bash
# Откатить на предыдущую версию
vercel rollback
```

Или в Vercel Dashboard:
- Deployments → выбрать старую версию → Promote to Production

### Database (Supabase)

```bash
# Откатить последнюю миграцию
supabase db reset

# Применить только определённые миграции
supabase db push --include-migrations 001,002,003
```

---

## Performance Optimization

### 1. Frontend

- ✅ Code splitting
- ✅ Lazy loading
- ✅ Image optimization
- ✅ CDN (автоматически в Vercel)

### 2. Database

```sql
-- Создать индексы (уже в миграциях)
CREATE INDEX idx_shifts_user_week ON shifts(user_id, week_start);
CREATE INDEX idx_availability_week ON availability(week_start);

-- VACUUM для оптимизации
VACUUM ANALYZE;
```

### 3. Edge Functions

- Использовать кэширование
- Минимизировать запросы к БД
- Batch операции где возможно

---

## Security Checklist

- [ ] Environment variables не в git
- [ ] RLS включен на всех таблицах
- [ ] Service Role Key только на backend
- [ ] CORS настроен правильно
- [ ] Telegram initData валидируется
- [ ] Rate limiting настроен
- [ ] Logs не содержат чувствительных данных
- [ ] HTTPS везде
- [ ] Backup базы данных настроен

---

## Backup & Recovery

### Database Backup

**Автоматический (Supabase):**
- Daily backups (хранятся 7 дней на Free tier)

**Ручной:**
```bash
# Экспорт всей БД
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# Восстановление
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

### Восстановление после сбоя

1. Проверить статус сервисов (Vercel, Supabase)
2. Проверить логи ошибок
3. Откатить на последнюю рабочую версию
4. Восстановить БД из backup (если нужно)
5. Уведомить пользователей

---

## Масштабирование

### Когда нужно масштабировать?

- Frontend: >10K DAU
- Backend: >100 запросов/сек
- Database: >1GB данных, медленные запросы

### План масштабирования

**Supabase:**
- Upgrade на Pro plan ($25/month)
- Read replicas для больших нагрузок
- Connection pooling

**Vercel:**
- Pro plan ($20/month/member)
- Увеличить limits

**Оптимизация:**
- Кэширование (Redis)
- CDN для статики
- Database sharding (если >1M пользователей)

