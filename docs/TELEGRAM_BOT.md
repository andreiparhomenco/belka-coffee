# 🤖 Telegram Bot - Детальная настройка

## Создание бота

### Шаг 1: Создание через BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Введите название: `Belka Coffee Bot`
4. Введите username: `belka_coffee_bot` (должен заканчиваться на `_bot`)
5. Сохраните полученный **Token**

### Шаг 2: Настройка описания

```
/setdescription
→ выберите бота
→ введите:

Система управления графиками и зарплатами для бариста Belka Coffee. 
Заполняйте доступность, получайте смены, отмечайтесь на работе и отслеживайте зарплату.
```

### Шаг 3: Настройка короткого описания

```
/setabouttext
→ выберите бота
→ введите:

Графики и зарплаты для бариста ☕
```

### Шаг 4: Настройка команд

```
/setcommands
→ выберите бота
→ введите:

start - Запустить приложение
help - Помощь и инструкции
availability - Указать доступность
schedule - Посмотреть график
salary - Моя зарплата
admin - Админ панель (только для админов)
```

### Шаг 5: Настройка Menu Button

**После деплоя frontend на Vercel:**

```
/setmenubutton
→ выберите бота
→ введите URL: https://belka-coffee.vercel.app (или ваш URL после деплоя)
→ введите текст: Открыть приложение
```

### Шаг 6: Настройка изображения

```
/setuserpic
→ выберите бота
→ загрузите изображение (логотип Belka Coffee)
```

---

## Интеграция с Mini App

### Проверка initData

Telegram передаёт данные через `window.Telegram.WebApp.initData`. Эти данные нужно валидировать на backend:

```typescript
// Пример валидации в Edge Function
import { createHmac } from 'crypto';

function validateTelegramData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}
```

### Получение данных пользователя

```typescript
// Frontend
import WebApp from '@twa-dev/sdk';

const user = WebApp.initDataUnsafe.user;
console.log(user.id); // Telegram ID
console.log(user.first_name);
console.log(user.username);
```

---

## Уведомления через Bot

### Настройка бота для отправки сообщений

**Файл: `supabase/functions/telegram-bot/index.ts`**

```typescript
const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  
  return response.json();
}

// Использование
await sendMessage(123456789, '⏰ Напоминание: ваша смена завтра в 8:00');
```

### Типы уведомлений

#### 1. Напоминание о смене (за 24 часа)

```typescript
async function sendShiftReminder(telegramId: number, shift: Shift) {
  const message = `
⏰ <b>Напоминание о смене</b>

📅 Дата: ${formatDate(shift.date)}
🕐 Время: ${shift.hour}:00 - ${shift.hour + 1}:00

Не забудьте отметиться в приложении!
  `.trim();
  
  await sendMessage(telegramId, message);
}
```

#### 2. Уведомление о начале смены

```typescript
async function sendShiftStart(telegramId: number) {
  const message = `
🟢 <b>Ваша смена началась!</b>

Не забудьте отметиться в приложении.
  `.trim();
  
  await sendMessage(telegramId, message);
}
```

#### 3. Напоминание о заполнении оборота

```typescript
async function sendTurnoverReminder(telegramId: number, shift: Shift) {
  const message = `
📊 <b>Заполните оборот</b>

Вы завершили смену ${formatDate(shift.date)} в ${shift.hour}:00, но не заполнили оборот.

Пожалуйста, откройте приложение и введите данные.
  `.trim();
  
  await sendMessage(telegramId, message);
}
```

#### 4. Уведомление админу о незакрытых слотах

```typescript
async function sendUncoveredSlotsAlert(adminTelegramId: number, count: number) {
  const message = `
❌ <b>Внимание!</b>

На следующей неделе ${count} незакрытых слотов.

Откройте админ панель для назначения бариста.
  `.trim();
  
  await sendMessage(adminTelegramId, message);
}
```

---

## Cron Jobs для уведомлений

### Настройка в Supabase

**Файл: `supabase/functions/cron-reminders/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Получить смены на завтра
  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      id,
      hour,
      users!inner(telegram_id, name)
    `)
    .eq('week_start', getWeekStart(tomorrow))
    .eq('day_of_week', tomorrow.getDay())
    .eq('status', 'planned');

  // Отправить напоминания
  for (const shift of shifts || []) {
    await sendShiftReminder(shift.users.telegram_id, shift);
  }

  return new Response(JSON.stringify({ sent: shifts?.length || 0 }));
});
```

### Настройка расписания

В Supabase Dashboard:
1. Перейдите в **Database → Cron Jobs**
2. Создайте новый job:

```sql
SELECT cron.schedule(
  'send-shift-reminders',
  '0 10 * * *', -- Каждый день в 10:00
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cron-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Inline кнопки

### Добавление кнопок к сообщениям

```typescript
async function sendMessageWithButtons(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Подтвердить',
              callback_data: 'confirm_shift',
            },
            {
              text: '❌ Отменить',
              callback_data: 'cancel_shift',
            },
          ],
          [
            {
              text: '📱 Открыть приложение',
              web_app: { url: 'https://belka-coffee.vercel.app' },
            },
          ],
        ],
      },
    }),
  });
}
```

### Обработка callback

```typescript
// Webhook handler
serve(async (req) => {
  const update = await req.json();
  
  if (update.callback_query) {
    const callbackData = update.callback_query.data;
    const chatId = update.callback_query.message.chat.id;
    
    if (callbackData === 'confirm_shift') {
      // Подтвердить смену
      await confirmShift(update.callback_query.from.id);
      await sendMessage(chatId, '✅ Смена подтверждена!');
    }
  }
  
  return new Response('ok');
});
```

---

## Тестирование бота

### Локальное тестирование

```bash
# Отправить тестовое сообщение
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": YOUR_TELEGRAM_ID,
    "text": "Тестовое сообщение"
  }'
```

### Получить свой Telegram ID

1. Откройте [@userinfobot](https://t.me/userinfobot)
2. Отправьте `/start`
3. Бот пришлёт ваш ID

---

## Безопасность

### ✅ Checklist

- [ ] Bot Token хранится в environment variables
- [ ] initData валидируется на backend
- [ ] Используется HTTPS для webhook
- [ ] Rate limiting настроен
- [ ] Логи не содержат токенов

### Защита от спама

```typescript
const rateLimiter = new Map<number, number>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const lastRequest = rateLimiter.get(userId) || 0;
  
  if (now - lastRequest < 1000) {
    return false; // Слишком частые запросы
  }
  
  rateLimiter.set(userId, now);
  return true;
}
```

---

## Troubleshooting

### Бот не отвечает

1. Проверьте что Bot Token правильный
2. Проверьте что бот не заблокирован пользователем
3. Проверьте логи Edge Functions

### Webhook не работает

1. Проверьте URL webhook:
   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
   ```

2. Удалите webhook (если нужно):
   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
   ```

### Mini App не открывается

1. Проверьте что URL в Menu Button правильный (HTTPS)
2. Проверьте что сайт доступен
3. Очистите кэш Telegram: Settings → Data and Storage → Clear Cache

