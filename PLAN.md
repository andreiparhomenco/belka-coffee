# 📋 План реализации проекта Belka Coffee

**Версия:** 1.0  
**Дата:** 15 декабря 2025  
**Статус:** В ожидании утверждения

---

## 🎯 Цель проекта

Полная автоматизация управления графиками и зарплатами бариста через Telegram Mini App

**Платформа:** Telegram Mini App  
**Frontend:** React + Vite  
**Backend:** Supabase (PostgreSQL + Edge Functions)  
**Хостинг:** Vercel

---

## 📊 Общий Timeline

| Этап | Длительность | Описание |
|------|--------------|----------|
| **Этап 0** | 1 день | Подготовка окружения |
| **Этап 1** | 2-3 дня | База данных + Auth |
| **Этап 2** | 3-4 дня | Frontend MVP (доступность) |
| **Этап 3** | 4-5 дней | Алгоритм графика |
| **Этап 4** | 5-6 дней | Админ панель |
| **Этап 5** | 3-4 дня | Смены и отчёты |
| **Этап 6** | 2-3 дня | Зарплаты |
| **Этап 7** | 2-3 дня | Уведомления |
| **Этап 8** | 2 дня | Безопасность и логи |
| **Этап 9** | 3-4 дня | E2E тестирование |
| **Этап 10** | 2-3 дня | Оптимизация и деплой |

**Общая длительность:** 29-38 дней (1-1.5 месяца)

---

## 🧪 ЧАСТЬ 1: СТРАТЕГИЯ ТЕСТИРОВАНИЯ

### Принципы тестирования

1. **Test-Driven Development (TDD):** Тесты пишутся ДО реализации функционала
2. **Покрытие кода:** Минимум 80% для критических модулей
3. **Автоматизация:** CI/CD запускает все тесты при каждом коммите
4. **Пирамида тестирования:**
   - 70% Unit тесты
   - 20% Integration тесты
   - 10% E2E тесты

### 1.1 Тестирование Backend

#### Модуль: База данных (Schema)

**Unit тесты:**
- ✅ Создание таблиц с правильными типами данных
- ✅ Проверка внешних ключей и связей
- ✅ Проверка constraints (hour от 0 до 23, turnover >= 0)
- ✅ Проверка уникальности (telegram_id, availability slots)

**Тестовые кейсы:**
```sql
-- TC-DB-001: Создать пользователя с корректными данными
INSERT INTO users (telegram_id, name, role) VALUES (123456, 'Иван', 'barista');
-- Ожидание: success

-- TC-DB-002: Попытка создать дубликат telegram_id
INSERT INTO users (telegram_id, name, role) VALUES (123456, 'Мария', 'barista');
-- Ожидание: ERROR - duplicate key

-- TC-DB-003: Создать availability с hour = 25
INSERT INTO availability (user_id, week_start, day_of_week, hour) 
VALUES (..., '2025-01-13', 0, 25);
-- Ожидание: ERROR - check constraint violation

-- TC-DB-004: Каскадное удаление
DELETE FROM users WHERE id = '...';
-- Ожидание: все связанные availability, shifts удалены
```

---

#### Модуль: Row Level Security (RLS)

**Security тесты:**
- ✅ Бариста видит только свои данные
- ✅ Бариста НЕ может читать данные других бариста
- ✅ Админ видит все данные всех пользователей
- ✅ Неавторизованный пользователь получает пустой результат

**Тестовые кейсы:**
```javascript
// TC-RLS-001: Бариста пытается прочитать availability другого бариста
await supabase.from('availability')
  .select()
  .eq('user_id', 'other_user_id');
// Ожидание: [] (пустой массив)

// TC-RLS-002: Админ читает все shifts
await supabase.from('shifts').select();
// Ожидание: все смены всех бариста

// TC-RLS-003: Бариста пытается UPDATE чужую смену
await supabase.from('shifts')
  .update({ status: 'completed' })
  .eq('id', 'other_user_shift_id');
// Ожидание: 0 rows updated или ошибка
```

---

#### Модуль: API Functions

**Функция: `submitAvailability(userId, weekStart, slots[])`**

**Unit тесты:**
- ✅ Успешное сохранение доступности
- ✅ Валидация: slots содержат только часы 0-23
- ✅ Валидация: weekStart не в прошлом
- ✅ Перезапись старой доступности для той же недели
- ✅ Защита от SQL injection

**Тестовые кейсы:**
```javascript
// TC-API-001: Корректные данные
await submitAvailability('user-123', '2025-01-13', [
  { day: 0, hour: 8 },
  { day: 0, hour: 9 },
  { day: 1, hour: 10 }
]);
// Ожидание: { success: true, slotsCreated: 3 }

// TC-API-002: Невалидный час
await submitAvailability('user-123', '2025-01-13', [
  { day: 0, hour: 25 }
]);
// Ожидание: { error: 'Invalid hour: 25' }

// TC-API-003: Прошлая дата
await submitAvailability('user-123', '2024-01-01', [...]);
// Ожидание: { error: 'Cannot set availability for past weeks' }
```

---

**Функция: `generateSchedule(weekStart)`**

**Unit тесты:**
- ✅ Все слоты из шаблона назначены (если достаточно бариста)
- ✅ Бариста назначен только на часы, когда он доступен
- ✅ Распределение часов относительно равномерное (перекос ≤ 30%)
- ✅ Слоты с меньшим количеством доступных бариста обрабатываются первыми
- ✅ Производительность: обработка 100 бариста + 168 слотов < 5 сек

**Тестовые кейсы:**
```javascript
// TC-ALGO-001: Идеальный сценарий (все слоты закрыты)
// Входные данные:
const baristas = [
  { id: '1', available: [8,9,10,11,12] },
  { id: '2', available: [10,11,12,13,14] },
  { id: '3', available: [8,9,10] }
];
const template = [8,9,10,11,12,13,14]; // 7 слотов
const result = await generateSchedule('2025-01-13');
// Ожидание: 
// - uncoveredSlots: 0
// - baristaLoads: { '1': 5, '2': 5, '3': 3 } (или близко)

// TC-ALGO-002: Недостаточно бариста
const baristas = [{ id: '1', available: [8,9] }];
const template = [8,9,10,11,12];
const result = await generateSchedule('2025-01-13');
// Ожидание: uncoveredSlots: 3 (10,11,12 не закрыты)

// TC-ALGO-003: Приоритизация сложных слотов
const baristas = [
  { id: '1', available: [8,9,10] },
  { id: '2', available: [8,9] }
];
// Слот 10:00 имеет только 1 бариста → обрабатывается первым
```

---

**Функция: `submitShiftReport(shiftId, turnover, confirmedHours)`**

**Unit тесты:**
- ✅ Оборот > 0
- ✅ Часы > 0
- ✅ Статус смены меняется на "completed"
- ✅ Нельзя отправить отчёт для будущей смены
- ✅ Нельзя отправить отчёт дважды (idempotency)

**Тестовые кейсы:**
```javascript
// TC-REPORT-001: Корректный отчёт
await submitShiftReport('shift-123', 15000, 1.5);
// Ожидание: 
// - shift_reports создан
// - shifts.status = 'completed'

// TC-REPORT-002: Отрицательный оборот
await submitShiftReport('shift-123', -5000, 1);
// Ожидание: { error: 'Turnover must be positive' }

// TC-REPORT-003: Будущая смена
await submitShiftReport('future-shift-id', 10000, 1);
// Ожидание: { error: 'Cannot report future shifts' }

// TC-REPORT-004: Повторная отправка
await submitShiftReport('shift-123', 15000, 1);
await submitShiftReport('shift-123', 20000, 1); // дубликат
// Ожидание: { error: 'Report already submitted' }
```

---

**Функция: `calculateSalary(userId, weekStart)`**

**Unit тесты:**
- ✅ Формула: (hours × 150) + (turnover × 0.05)
- ✅ Учитываются только completed смены
- ✅ Результат сохраняется в таблицу salaries
- ✅ Пересчёт заменяет старое значение (upsert)

**Тестовые кейсы:**
```javascript
// TC-SALARY-001: Простой расчёт
// Входные данные:
// - 10 часов отработано
// - оборот 50000₽
const result = await calculateSalary('user-123', '2025-01-13');
// Ожидание: salary = (10 × 150) + (50000 × 0.05) = 4000₽

// TC-SALARY-002: Только completed смены
// Смены: [completed: 5ч, planned: 3ч, completed: 2ч]
// Ожидание: учитываются только 5 + 2 = 7 часов

// TC-SALARY-003: Нет completed смен
// Ожидание: salary = 0
```

---

### 1.2 Тестирование Frontend

#### Модуль: AvailabilitySelector

**Component тесты (React Testing Library + Vitest):**
- ✅ Рендерится 7 дней недели
- ✅ Каждый день отображает часы согласно шаблону
- ✅ Клик по часу выделяет его
- ✅ Повторный клик снимает выделение
- ✅ Кнопка "Сохранить" активна только если выбран ≥1 час
- ✅ После сохранения данные отправляются на backend

**Тестовые кейсы:**
```javascript
// TC-AVAIL-001: Выбор часов активирует кнопку
import { render, screen, fireEvent } from '@testing-library/react';

test('выбор часов активирует кнопку сохранения', () => {
  render(<AvailabilitySelector />);
  
  const hourButton = screen.getByTestId('hour-0-8');
  fireEvent.click(hourButton);
  
  const saveButton = screen.getByText('Сохранить');
  expect(saveButton).not.toBeDisabled();
});

// TC-AVAIL-002: Без выбора кнопка неактивна
test('без выбора часов кнопка неактивна', () => {
  render(<AvailabilitySelector />);
  const saveButton = screen.getByText('Сохранить');
  expect(saveButton).toBeDisabled();
});

// TC-AVAIL-003: Повторный клик снимает выделение
test('повторный клик снимает выделение', () => {
  render(<AvailabilitySelector />);
  const hourButton = screen.getByTestId('hour-0-8');
  
  fireEvent.click(hourButton);
  expect(hourButton).toHaveClass('selected');
  
  fireEvent.click(hourButton);
  expect(hourButton).not.toHaveClass('selected');
});

// TC-AVAIL-004: Сохранение отправляет данные
test('сохранение отправляет данные на backend', async () => {
  const mockSave = vi.fn();
  render(<AvailabilitySelector onSave={mockSave} />);
  
  fireEvent.click(screen.getByTestId('hour-0-8'));
  fireEvent.click(screen.getByText('Сохранить'));
  
  await waitFor(() => {
    expect(mockSave).toHaveBeenCalledWith([{ day: 0, hour: 8 }]);
  });
});
```

---

#### Модуль: ScheduleView (график бариста)

**Component тесты:**
- ✅ Отображаются только смены текущего пользователя
- ✅ Смены отсортированы по дате и времени
- ✅ Статус смены отображается правильно
- ✅ Пустой список если нет смен

**Тестовые кейсы:**
```javascript
// TC-SCHEDULE-001: Отображение смен
test('отображаются смены пользователя', () => {
  const shifts = [
    { id: '1', day: 0, hour: 8, status: 'planned' },
    { id: '2', day: 1, hour: 10, status: 'planned' }
  ];
  render(<ScheduleView shifts={shifts} />);
  
  expect(screen.getAllByTestId('shift-card')).toHaveLength(2);
});

// TC-SCHEDULE-002: Пустой список
test('сообщение при отсутствии смен', () => {
  render(<ScheduleView shifts={[]} />);
  expect(screen.getByText('У вас пока нет смен')).toBeInTheDocument();
});
```

---

#### Модуль: ActiveShift (текущая смена)

**Component тесты:**
- ✅ Отображается только во время смены (±15 минут)
- ✅ Таймер обновляется каждую минуту
- ✅ Кнопка "Я на смене" доступна один раз
- ✅ После клика статус меняется

**Тестовые кейсы:**
```javascript
// TC-ACTIVE-001: Смена отображается в нужное время
test('смена отображается во время её выполнения', () => {
  vi.setSystemTime(new Date('2025-01-13T08:05:00'));
  const shift = { start: '08:00', end: '09:00' };
  
  render(<ActiveShift shift={shift} />);
  expect(screen.getByText('Ваша смена сейчас')).toBeInTheDocument();
});

// TC-ACTIVE-002: Смена не отображается вне времени
test('смена не отображается вне времени', () => {
  vi.setSystemTime(new Date('2025-01-13T07:30:00'));
  const shift = { start: '08:00', end: '09:00' };
  
  render(<ActiveShift shift={shift} />);
  expect(screen.queryByText('Ваша смена сейчас')).not.toBeInTheDocument();
});
```

---

#### Модуль: ShiftReportForm (завершение смены)

**Component тесты:**
- ✅ Валидация: оборот > 0
- ✅ Валидация: только цифры
- ✅ Подтверждённые часы предзаполнены
- ✅ После отправки форма закрывается

**Тестовые кейсы:**
```javascript
// TC-REPORT-001: Успешная отправка
test('успешная отправка отчёта', async () => {
  const mockSubmit = vi.fn();
  render(<ShiftReportForm onSubmit={mockSubmit} />);
  
  fireEvent.change(screen.getByLabelText('Оборот (₽):'), { 
    target: { value: '15000' } 
  });
  fireEvent.click(screen.getByText('Отправить'));
  
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({ turnover: 15000, hours: 1 });
  });
});

// TC-REPORT-002: Валидация отрицательного оборота
test('ошибка при отрицательном обороте', () => {
  render(<ShiftReportForm />);
  
  const input = screen.getByLabelText('Оборот (₽):');
  fireEvent.change(input, { target: { value: '-5000' } });
  
  expect(screen.getByText('Оборот должен быть положительным')).toBeInTheDocument();
});
```

---

#### Модуль: AdminScheduleGrid (админ панель)

**Component тесты:**
- ✅ Таблица отображает все дни и часы
- ✅ Цвет ячейки: 🟥 (не закрыт), 🟩 (закрыт)
- ✅ Клик по ячейке открывает модальное окно
- ✅ Назначение бариста обновляет ячейку

**Тестовые кейсы:**
```javascript
// TC-ADMIN-001: Статус "График готов"
test('статус отображается правильно', () => {
  const schedule = [
    { day: 0, hour: 8, assigned: true },
    { day: 0, hour: 9, assigned: true }
  ];
  render(<AdminScheduleGrid schedule={schedule} />);
  
  expect(screen.getByText('✅ График готов')).toBeInTheDocument();
});

// TC-ADMIN-002: Незакрытые слоты
test('показывает количество незакрытых слотов', () => {
  const schedule = [
    { day: 0, hour: 8, assigned: true },
    { day: 0, hour: 9, assigned: false }
  ];
  render(<AdminScheduleGrid schedule={schedule} />);
  
  expect(screen.getByText('❌ Есть незакрытые слоты (1)')).toBeInTheDocument();
});

// TC-ADMIN-003: Открытие модалки при клике
test('клик по ячейке открывает модальное окно', () => {
  render(<AdminScheduleGrid />);
  
  const cell = screen.getByTestId('slot-0-8');
  fireEvent.click(cell);
  
  expect(screen.getByText('Доступные бариста')).toBeInTheDocument();
});
```

---

#### Модуль: SalariesTable (зарплаты)

**Component тесты:**
- ✅ Таблица со всеми бариста
- ✅ Колонки: имя, часы, оборот, зарплата
- ✅ Итоговая строка корректна
- ✅ Экспорт в CSV работает

**Тестовые кейсы:**
```javascript
// TC-SALARY-001: Отображение данных
test('таблица отображает всех бариста', () => {
  const salaries = [
    { name: 'Иван', hours: 10, turnover: 50000, salary: 4000 },
    { name: 'Мария', hours: 8, turnover: 30000, salary: 2700 }
  ];
  render(<SalariesTable salaries={salaries} />);
  
  expect(screen.getByText('Иван')).toBeInTheDocument();
  expect(screen.getByText('4000')).toBeInTheDocument();
});

// TC-SALARY-002: Итоговая строка
test('итоговая строка рассчитывается правильно', () => {
  const salaries = [
    { salary: 4000 },
    { salary: 2700 }
  ];
  render(<SalariesTable salaries={salaries} />);
  
  expect(screen.getByText('6700')).toBeInTheDocument();
});

// TC-SALARY-003: Экспорт в CSV
test('экспорт в CSV', async () => {
  const mockExport = vi.fn();
  render(<SalariesTable onExport={mockExport} />);
  
  fireEvent.click(screen.getByText('Экспорт в CSV'));
  
  await waitFor(() => {
    expect(mockExport).toHaveBeenCalled();
  });
});
```

---

### 1.3 End-to-End тесты (Playwright)

**Сценарий E2E-001: Полный flow бариста**
```javascript
test('бариста: доступность → график → смена → зарплата', async ({ page }) => {
  // 1. Вход в Mini App
  await page.goto('https://t.me/belka_bot/app');
  await page.waitForSelector('[data-testid="home"]');
  
  // 2. Заполнить доступность
  await page.click('text=Моя доступность');
  await page.click('[data-testid="hour-0-8"]'); // Пн 8:00
  await page.click('[data-testid="hour-0-9"]'); // Пн 9:00
  await page.click('[data-testid="hour-1-10"]'); // Вт 10:00
  await page.click('button:has-text("Сохранить")');
  await expect(page.locator('.success')).toBeVisible();
  
  // 3. Проверить график (после того как админ сгенерировал)
  await page.click('text=Мой график');
  const shifts = page.locator('[data-testid="shift-card"]');
  await expect(shifts).toHaveCount(3);
  
  // 4. Mock текущего времени до конца смены
  await page.evaluate(() => {
    Date.now = () => new Date('2025-01-13T09:05:00').getTime();
  });
  await page.reload();
  
  // 5. Заполнить оборот
  await expect(page.locator('text=Завершение смены')).toBeVisible();
  await page.fill('[data-testid="turnover"]', '12000');
  await page.click('button:has-text("Отправить")');
  
  // 6. Проверить зарплату
  await page.click('text=Моя зарплата');
  await expect(page.locator('.salary-amount')).toContainText('900'); // (1.5ч × 150) + (12000 × 0.05)
});
```

**Сценарий E2E-002: Админ формирует график**
```javascript
test('админ: генерация графика → ручное редактирование', async ({ page }) => {
  // 1. Вход как админ
  await page.goto('https://t.me/belka_bot/app');
  
  // 2. Перейти в админ панель
  await page.click('text=Админ панель');
  await page.click('text=График по слотам');
  
  // 3. Запустить автогенерацию
  await page.click('button:has-text("Сгенерировать график")');
  await page.waitForSelector('.generation-complete');
  
  // 4. Проверить статус
  const status = page.locator('.week-status');
  await expect(status).toContainText('✅ График готов');
  
  // 5. Вручную назначить бариста на слот
  await page.click('[data-testid="slot-0-8"]'); // Пн 8:00
  await page.click('text=Иван Петров');
  await page.click('button:has-text("Назначить")');
  
  // 6. Проверить что ячейка обновилась
  const cell = page.locator('[data-testid="slot-0-8"]');
  await expect(cell).toHaveClass(/filled/);
  await expect(cell).toContainText('Иван Петров');
});
```

**Сценарий E2E-003: Уведомления**
```javascript
test('бариста получает уведомление о смене', async ({ page, context }) => {
  // 1. Создать смену на завтра
  // (выполняется админом или через API)
  
  // 2. Mock времени: -24 часа до смены
  await page.evaluate(() => {
    Date.now = () => new Date('2025-01-12T08:00:00').getTime();
  });
  
  // 3. Запустить cron job (вручную для теста)
  await fetch('https://your-edge-function/send-reminders', { method: 'POST' });
  
  // 4. Проверить что сообщение отправлено
  // (требует mock Telegram Bot API)
  const messages = await getTelegramMessages(12345); // telegram_id
  expect(messages).toContainEqual(
    expect.objectContaining({
      text: expect.stringContaining('ваша смена завтра')
    })
  );
});
```

---

### 1.4 Тестирование уведомлений

**Integration тесты для Telegram Bot:**

```javascript
// TC-BOT-001: Напоминание за 24 часа
test('отправка напоминания за 24 часа до смены', async () => {
  const mockBot = vi.fn();
  const shift = { telegram_id: 12345, date: '2025-01-14', hour: 8 };
  
  await sendShiftReminder(shift, mockBot);
  
  expect(mockBot).toHaveBeenCalledWith(
    12345,
    expect.stringContaining('ваша смена завтра в 8:00')
  );
});

// TC-BOT-002: Уведомление в начале смены
test('уведомление в момент начала смены', async () => {
  vi.setSystemTime(new Date('2025-01-13T08:00:00'));
  const shift = { telegram_id: 12345, start: '08:00' };
  
  await sendShiftStart(shift);
  
  expect(mockBot).toHaveBeenCalledWith(
    12345,
    '🟢 Ваша смена началась! Не забудьте отметиться в приложении.'
  );
});

// TC-BOT-003: Напоминание о незаполненном обороте
test('напоминание если оборот не заполнен через 2 часа', async () => {
  const shift = {
    telegram_id: 12345,
    end: '09:00',
    report: null
  };
  vi.setSystemTime(new Date('2025-01-13T11:00:00')); // +2 часа
  
  await sendTurnoverReminder(shift);
  
  expect(mockBot).toHaveBeenCalledWith(
    12345,
    expect.stringContaining('Не забудьте заполнить оборот')
  );
});
```

---

### 1.5 Performance тесты

**Load Testing (Artillery / k6):**

```yaml
# load-test.yml
config:
  target: 'https://your-api.supabase.co'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 запросов в секунду
    - duration: 120
      arrivalRate: 50 # 50 запросов в секунду

scenarios:
  - name: "Генерация графика"
    flow:
      - post:
          url: "/functions/v1/generate-schedule"
          json:
            weekStart: "2025-01-13"
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: "assignments"
  
  - name: "Чтение графика"
    flow:
      - get:
          url: "/rest/v1/shifts?week_start=eq.2025-01-13"
          headers:
            apikey: "${API_KEY}"
```

**Метрики:**
- ✅ p50 response time < 200ms
- ✅ p95 response time < 500ms
- ✅ p99 response time < 1000ms
- ✅ Error rate < 1%

**Тестовые кейсы:**
```javascript
// TC-PERF-001: Генерация графика для большой кофейни
test('генерация для 100 бариста и 168 слотов', async () => {
  const start = Date.now();
  await generateSchedule('2025-01-13');
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(5000); // < 5 секунд
});

// TC-PERF-002: Одновременные запросы
test('50 бариста одновременно открывают график', async () => {
  const promises = Array(50).fill().map(() => 
    fetch('/api/shifts?user_id=...').then(r => r.json())
  );
  
  const start = Date.now();
  await Promise.all(promises);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(2000); // < 2 секунды для всех
});
```

---

## 🚀 ЧАСТЬ 2: ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

---

## ЭТАП 0: Подготовка окружения (1 день)

### Задачи

1. ✅ **Создать проект на Supabase**
   - Зарегистрироваться на supabase.com
   - Создать новый проект "belka-coffee"
   - Получить API keys (anon, service_role)

2. ✅ **Создать Telegram бота**
   - Открыть @BotFather в Telegram
   - Команда `/newbot`
   - Получить Bot Token
   - Настроить Menu Button → Web App URL (заполнится после деплоя)

3. ✅ **Настроить репозиторий**
   ```bash
   git clone https://github.com/andreiparhomenco/belka-coffee.git
   cd belka-coffee
   ```
   
   Или создать с нуля:
   ```bash
   mkdir belka-coffee
   cd belka-coffee
   git init
   git remote add origin https://github.com/andreiparhomenco/belka-coffee.git
   ```

4. ✅ **Инициализировать Frontend**
   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install
   npm install @supabase/supabase-js
   npm install @twa-dev/sdk
   ```

5. ✅ **Настроить Vercel**
   - Зарегистрироваться на vercel.com
   - Импортировать GitHub репозиторий
   - Настроить Environment Variables

### Структура проекта

```
belka-coffee/
├── frontend/               # React Mini App
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── supabase/
│   ├── migrations/         # SQL миграции
│   ├── functions/          # Edge Functions
│   └── config.toml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                   # Документация
├── .env.example
├── .gitignore
├── README.md
└── PLAN.md                 # Этот файл
```

### Файлы для создания

**`.env.example`:**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Telegram
VITE_BOT_USERNAME=belka_coffee_bot

# Telegram Bot (для backend)
BOT_TOKEN=your-bot-token
```

**`README.md`:**
```markdown
# Belka Coffee - Графики и зарплаты бариста

Telegram Mini App для управления графиками работы и расчёта зарплат бариста.

## Быстрый старт

1. Клонировать репозиторий
2. Скопировать `.env.example` → `.env`
3. Заполнить переменные окружения
4. Установить зависимости: `npm install`
5. Запустить dev сервер: `npm run dev`

## Технологии

- Frontend: React + Vite + TypeScript
- Backend: Supabase (PostgreSQL + Edge Functions)
- Hosting: Vercel
- Уведомления: Telegram Bot API
```

### Критерии готовности (Definition of Done)

- ✅ Supabase проект создан, API keys получены
- ✅ Telegram бот создан, token сохранён
- ✅ Репозиторий на GitHub с базовой структурой
- ✅ Frontend запускается локально (`npm run dev`)
- ✅ Vercel проект создан и связан с GitHub
- ✅ `.env.example` с документированными переменными
- ✅ README.md с инструкциями

---

## ЭТАП 1: База данных + Auth (2-3 дня)

### 1.1 Database Schema

#### Создание миграций

**Файл: `supabase/migrations/001_create_users.sql`**
```sql
-- Таблица пользователей
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('barista', 'admin')) DEFAULT 'barista',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по telegram_id
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Комментарии
COMMENT ON TABLE users IS 'Пользователи системы (бариста и администраторы)';
COMMENT ON COLUMN users.telegram_id IS 'ID пользователя в Telegram';
COMMENT ON COLUMN users.role IS 'Роль: barista или admin';
```

**Файл: `supabase/migrations/002_create_shop_template.sql`**
```sql
-- Шаблон работы кофейни (какие часы работает кофейня)
CREATE TABLE shop_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL, -- 0 = Пн, 6 = Вс
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week, hour)
);

-- Индекс для быстрой фильтрации активных слотов
CREATE INDEX idx_shop_template_active ON shop_template(is_active, day_of_week, hour);

COMMENT ON TABLE shop_template IS 'Шаблон рабочих часов кофейни';
```

**Файл: `supabase/migrations/003_create_availability.sql`**
```sql
-- Доступность бариста
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- Понедельник недели
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start, day_of_week, hour)
);

-- Индексы
CREATE INDEX idx_availability_user_week ON availability(user_id, week_start);
CREATE INDEX idx_availability_week ON availability(week_start);

COMMENT ON TABLE availability IS 'Доступность бариста по часам';
COMMENT ON COLUMN availability.week_start IS 'Понедельник недели (для группировки)';
```

**Файл: `supabase/migrations/004_create_shifts.sql`**
```sql
-- Смены бариста
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  hour INT CHECK (hour BETWEEN 0 AND 23) NOT NULL,
  status TEXT CHECK (status IN ('planned', 'confirmed', 'completed')) DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_shifts_user_week ON shifts(user_id, week_start);
CREATE INDEX idx_shifts_week_status ON shifts(week_start, status);
CREATE INDEX idx_shifts_slot ON shifts(week_start, day_of_week, hour);

COMMENT ON TABLE shifts IS 'Назначенные смены бариста';
COMMENT ON COLUMN shifts.status IS 'planned - назначена, confirmed - бариста отметился, completed - завершена с отчётом';
```

**Файл: `supabase/migrations/005_create_shift_reports.sql`**
```sql
-- Отчёты о сменах
CREATE TABLE shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE UNIQUE NOT NULL,
  turnover NUMERIC(10,2) CHECK (turnover >= 0) NOT NULL,
  confirmed_hours NUMERIC(4,2) CHECK (confirmed_hours > 0) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс
CREATE INDEX idx_shift_reports_shift ON shift_reports(shift_id);

COMMENT ON TABLE shift_reports IS 'Отчёты бариста после завершения смены';
COMMENT ON COLUMN shift_reports.turnover IS 'Оборот за смену (₽)';
COMMENT ON COLUMN shift_reports.confirmed_hours IS 'Фактически отработанные часы';
```

**Файл: `supabase/migrations/006_create_salaries.sql`**
```sql
-- Зарплаты
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  total_hours NUMERIC(5,2) NOT NULL,
  total_turnover NUMERIC(12,2) NOT NULL,
  salary NUMERIC(10,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Индексы
CREATE INDEX idx_salaries_user_week ON salaries(user_id, week_start);
CREATE INDEX idx_salaries_week ON salaries(week_start);

COMMENT ON TABLE salaries IS 'Рассчитанные зарплаты бариста по неделям';
COMMENT ON COLUMN salaries.salary IS 'Итоговая зарплата: (hours × 150) + (turnover × 0.05)';
```

**Файл: `supabase/migrations/007_create_audit_log.sql`**
```sql
-- Лог изменений (для безопасности)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Журнал всех изменений в системе';
```

#### Применение миграций

```bash
# Установить Supabase CLI
npm install -g supabase

# Логин
supabase login

# Связать с проектом
supabase link --project-ref your-project-ref

# Применить миграции
supabase db push
```

---

### 1.2 Row Level Security (RLS)

**Файл: `supabase/migrations/008_setup_rls.sql`**
```sql
-- ============================================
-- RLS для таблицы users
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Все могут читать базовую информацию о пользователях
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

-- Только админы могут изменять роли
CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы availability
-- ============================================
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свою доступность
CREATE POLICY "Baristas can view own availability"
  ON availability FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут добавлять свою доступность
CREATE POLICY "Baristas can insert own availability"
  ON availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Бариста могут удалять свою доступность
CREATE POLICY "Baristas can delete own availability"
  ON availability FOR DELETE
  USING (user_id = auth.uid());

-- Админы могут делать всё
CREATE POLICY "Admins can manage all availability"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы shifts
-- ============================================
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свои смены
CREATE POLICY "Baristas can view own shifts"
  ON shifts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут обновлять статус своих смен (подтверждение)
CREATE POLICY "Baristas can confirm own shifts"
  ON shifts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('confirmed', 'completed')
  );

-- Админы могут управлять всеми сменами
CREATE POLICY "Admins can manage all shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы shift_reports
-- ============================================
ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свои отчёты
CREATE POLICY "Baristas can view own reports"
  ON shift_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_reports.shift_id
      AND shifts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Бариста могут создавать отчёты только для своих смен
CREATE POLICY "Baristas can create own reports"
  ON shift_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts
      WHERE shifts.id = shift_reports.shift_id
      AND shifts.user_id = auth.uid()
    )
  );

-- Админы видят все отчёты
CREATE POLICY "Admins can view all reports"
  ON shift_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS для таблицы salaries
-- ============================================
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- Бариста видят только свою зарплату
CREATE POLICY "Baristas can view own salary"
  ON salaries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Только система (через Edge Functions) может создавать/обновлять зарплаты
-- (RLS не применяется к service_role key)

-- ============================================
-- RLS для shop_template и audit_log
-- ============================================
ALTER TABLE shop_template ENABLE ROW LEVEL SECURITY;

-- Все могут читать шаблон
CREATE POLICY "Everyone can read shop template"
  ON shop_template FOR SELECT
  USING (true);

-- Только админы могут изменять
CREATE POLICY "Only admins can manage shop template"
  ON shop_template FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Только админы видят audit log
CREATE POLICY "Only admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

---

### 1.3 Auth через Telegram

**Файл: `supabase/functions/telegram-auth/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { initData } = await req.json();

    // Валидировать Telegram WebApp initData
    const isValid = validateTelegramData(initData, BOT_TOKEN);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid Telegram data' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Парсить данные
    const userData = parseTelegramData(initData);

    // Создать Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Получить или создать пользователя
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userData.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Пользователь не найден, создаём
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.id,
          name: `${userData.first_name} ${userData.last_name || ''}`.trim(),
          role: 'barista', // по умолчанию
        })
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    // Создать JWT токен для Supabase Auth
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${user.telegram_id}@telegram.local`, // фиктивный email
      password: BOT_TOKEN, // использовать bot token как пароль (или генерировать уникальный)
    });

    if (signInError) {
      // Если пользователь не существует в Auth, создаём
      const { data: authUser, error: signUpError } = await supabase.auth.signUp({
        email: `${user.telegram_id}@telegram.local`,
        password: BOT_TOKEN,
      });
      
      if (signUpError) throw signUpError;
      
      // Теперь залогиниться
      const { data: newSession } = await supabase.auth.signInWithPassword({
        email: `${user.telegram_id}@telegram.local`,
        password: BOT_TOKEN,
      });
      
      return new Response(JSON.stringify({
        user,
        session: newSession,
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      user,
      session,
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Auth error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// Валидация Telegram WebApp initData
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

// Парсинг данных пользователя
function parseTelegramData(initData: string) {
  const params = new URLSearchParams(initData);
  const userJson = params.get('user');
  return JSON.parse(userJson || '{}');
}
```

**Тесты для Auth:**

**Файл: `tests/unit/telegram-auth.test.ts`**
```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('TC-AUTH-001: валидация корректных данных', () => {
  const initData = 'query_id=...&user=...&hash=correct_hash';
  const isValid = validateTelegramData(initData, 'bot_token');
  assertEquals(isValid, true);
});

Deno.test('TC-AUTH-002: отклонение невалидного hash', () => {
  const initData = 'query_id=...&user=...&hash=wrong_hash';
  const isValid = validateTelegramData(initData, 'bot_token');
  assertEquals(isValid, false);
});
```

---

### Критерии готовности Этапа 1

- ✅ Все таблицы созданы и миграции применены
- ✅ RLS политики настроены и протестированы
- ✅ Edge Function `telegram-auth` развёрнута
- ✅ Unit тесты для Auth написаны и проходят
- ✅ Можно войти в систему через Telegram Mini App
- ✅ Бариста видит только свои данные
- ✅ Админ видит все данные

---

## ЭТАП 2: Frontend MVP - Выбор доступности (3-4 дня)

### 2.1 Настройка проекта

**Установка зависимостей:**
```bash
cd frontend
npm install @supabase/supabase-js
npm install @twa-dev/sdk
npm install react-router-dom
npm install date-fns
npm install vitest @testing-library/react @testing-library/jest-dom
```

**Структура файлов:**
```
frontend/src/
├── components/
│   ├── AvailabilitySelector.tsx
│   ├── HourButton.tsx
│   ├── WeekGrid.tsx
│   ├── Navigation.tsx
│   └── Layout.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useAvailability.ts
│   └── useTelegram.ts
├── lib/
│   ├── supabaseClient.ts
│   └── helpers.ts
├── pages/
│   ├── AvailabilityPage.tsx
│   ├── SchedulePage.tsx
│   └── HomePage.tsx
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

---

### 2.2 Supabase Client

**Файл: `frontend/src/lib/supabaseClient.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  users: {
    id: string;
    telegram_id: number;
    name: string;
    role: 'barista' | 'admin';
  };
  availability: {
    id: string;
    user_id: string;
    week_start: string;
    day_of_week: number;
    hour: number;
  };
  // ... другие таблицы
};
```

---

### 2.3 Auth Hook

**Файл: `frontend/src/hooks/useAuth.ts`**
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import WebApp from '@twa-dev/sdk';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получить initData от Telegram
    const initData = WebApp.initData;

    if (!initData) {
      console.error('No Telegram initData');
      setLoading(false);
      return;
    }

    // Авторизоваться через Edge Function
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          supabase.auth.setSession(data.session);
          setUser(data.user);
        }
      })
      .catch(err => console.error('Auth error:', err))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
```

---

### 2.4 Компонент выбора доступности

**Файл: `frontend/src/components/AvailabilitySelector.tsx`**
```typescript
import { useState, useEffect } from 'react';
import { useAvailability } from '../hooks/useAvailability';
import { HourButton } from './HourButton';
import { getWeekStart } from '../lib/helpers';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

export function AvailabilitySelector() {
  const weekStart = getWeekStart(new Date());
  const { availability, saveAvailability, loading } = useAvailability(weekStart);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Загрузить существующую доступность
    if (availability) {
      const selectedSet = new Set(
        availability.map(a => `${a.day_of_week}-${a.hour}`)
      );
      setSelected(selectedSet);
    }
  }, [availability]);

  const toggleHour = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const newSelected = new Set(selected);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelected(newSelected);
  };

  const handleSave = async () => {
    const slots = Array.from(selected).map(key => {
      const [day, hour] = key.split('-').map(Number);
      return { day_of_week: day, hour };
    });

    await saveAvailability(weekStart, slots);
    alert('Доступность сохранена!');
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="availability-selector">
      <h2>Выберите доступные часы</h2>
      
      {DAYS.map((dayName, dayIndex) => (
        <div key={dayIndex} className="day-row">
          <div className="day-label">{dayName}</div>
          <div className="hours-grid">
            {HOURS.map(hour => (
              <HourButton
                key={hour}
                hour={hour}
                isSelected={selected.has(`${dayIndex}-${hour}`)}
                onClick={() => toggleHour(dayIndex, hour)}
                data-testid={`hour-${dayIndex}-${hour}`}
              />
            ))}
          </div>
        </div>
      ))}

      <button 
        onClick={handleSave} 
        disabled={selected.size === 0}
        className="save-button"
      >
        Сохранить
      </button>
    </div>
  );
}
```

**Файл: `frontend/src/components/HourButton.tsx`**
```typescript
interface HourButtonProps {
  hour: number;
  isSelected: boolean;
  onClick: () => void;
}

export function HourButton({ hour, isSelected, onClick, ...props }: HourButtonProps) {
  return (
    <button
      className={`hour-button ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      {...props}
    >
      {hour}:00
    </button>
  );
}
```

---

### 2.5 Availability Hook

**Файл: `frontend/src/hooks/useAvailability.ts`**
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAvailability(weekStart: string) {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [weekStart]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('week_start', weekStart);

      if (error) throw error;
      setAvailability(data || []);
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async (weekStart: string, slots: any[]) => {
    try {
      // Удалить старую доступность для этой недели
      await supabase
        .from('availability')
        .delete()
        .eq('week_start', weekStart);

      // Вставить новую
      const { error } = await supabase
        .from('availability')
        .insert(slots.map(slot => ({
          week_start: weekStart,
          day_of_week: slot.day_of_week,
          hour: slot.hour,
        })));

      if (error) throw error;
      
      // Перезагрузить
      await loadAvailability();
    } catch (err) {
      console.error('Error saving availability:', err);
      throw err;
    }
  };

  return { availability, saveAvailability, loading };
}
```

---

### 2.6 Стили (базовые)

**Файл: `frontend/src/App.css`**
```css
.availability-selector {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.day-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.day-label {
  width: 40px;
  font-weight: bold;
}

.hours-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.hour-button {
  padding: 8px 12px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.hour-button:hover {
  border-color: #4CAF50;
}

.hour-button.selected {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.save-button {
  margin-top: 24px;
  padding: 12px 32px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.save-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

---

### 2.7 Тесты

**Файл: `frontend/src/components/AvailabilitySelector.test.tsx`**
```typescript
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvailabilitySelector } from './AvailabilitySelector';

describe('AvailabilitySelector', () => {
  test('TC-AVAIL-001: выбор часов активирует кнопку', () => {
    render(<AvailabilitySelector />);
    
    const hourButton = screen.getByTestId('hour-0-8');
    fireEvent.click(hourButton);
    
    const saveButton = screen.getByText('Сохранить');
    expect(saveButton).not.toBeDisabled();
  });

  test('TC-AVAIL-002: без выбора кнопка неактивна', () => {
    render(<AvailabilitySelector />);
    const saveButton = screen.getByText('Сохранить');
    expect(saveButton).toBeDisabled();
  });

  test('TC-AVAIL-003: повторный клик снимает выделение', () => {
    render(<AvailabilitySelector />);
    const hourButton = screen.getByTestId('hour-0-8');
    
    fireEvent.click(hourButton);
    expect(hourButton).toHaveClass('selected');
    
    fireEvent.click(hourButton);
    expect(hourButton).not.toHaveClass('selected');
  });
});
```

---

### Критерии готовности Этапа 2

- ✅ Компонент AvailabilitySelector работает
- ✅ Можно выбрать/снять выделение часов
- ✅ Данные сохраняются в Supabase
- ✅ При повторном входе доступность загружается
- ✅ Unit тесты покрывают основные сценарии
- ✅ UI responsive и удобный

---

## ЭТАП 3: Алгоритм формирования графика (4-5 дней)

### 3.1 Edge Function

**Файл: `supabase/functions/generate-schedule/index.ts`**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { weekStart } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Получить шаблон кофейни
    const { data: template } = await supabase
      .from('shop_template')
      .select('*')
      .eq('is_active', true);

    // 2. Получить доступность всех бариста
    const { data: availability } = await supabase
      .from('availability')
      .select('user_id, day_of_week, hour')
      .eq('week_start', weekStart);

    // 3. Сформировать слоты
    const slots = template.map(t => ({
      day: t.day_of_week,
      hour: t.hour,
      availableBaristas: availability
        .filter(a => a.day_of_week === t.day_of_week && a.hour === t.hour)
        .map(a => a.user_id),
    }));

    // 4. Сортировать по количеству доступных (ASC)
    slots.sort((a, b) => a.availableBaristas.length - b.availableBaristas.length);

    // 5. Назначить бариста
    const loads = new Map<string, number>();
    const assignments = [];

    for (const slot of slots) {
      if (slot.availableBaristas.length === 0) {
        console.warn(`Слот ${slot.day} ${slot.hour} не может быть закрыт`);
        continue;
      }

      // Выбрать бариста с минимальной нагрузкой
      const barista = slot.availableBaristas.reduce((min, current) => {
        const minLoad = loads.get(min) || 0;
        const currentLoad = loads.get(current) || 0;
        return currentLoad < minLoad ? current : min;
      });

      loads.set(barista, (loads.get(barista) || 0) + 1);

      assignments.push({
        user_id: barista,
        week_start: weekStart,
        day_of_week: slot.day,
        hour: slot.hour,
        status: 'planned',
      });
    }

    // 6. Удалить старые смены и вставить новые
    await supabase
      .from('shifts')
      .delete()
      .eq('week_start', weekStart);

    const { error } = await supabase
      .from('shifts')
      .insert(assignments);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      totalSlots: slots.length,
      assignedSlots: assignments.length,
      uncoveredSlots: slots.length - assignments.length,
      baristaLoads: Object.fromEntries(loads),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

### 3.2 Тесты алгоритма

**Файл: `tests/integration/generate-schedule.test.ts`**
```typescript
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.test('TC-ALGO-001: все слоты закрыты при достаточном количестве бариста', async () => {
  // Подготовка тестовых данных
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Создать 3 бариста
  const baristas = [];
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('users').insert({
      telegram_id: 100000 + i,
      name: `Barista ${i}`,
      role: 'barista',
    }).select().single();
    baristas.push(data);
  }

  // Создать доступность (все доступны на 8-12)
  for (const barista of baristas) {
    for (let hour = 8; hour <= 12; hour++) {
      await supabase.from('availability').insert({
        user_id: barista.id,
        week_start: '2025-01-13',
        day_of_week: 0,
        hour,
      });
    }
  }

  // Создать шаблон (5 слотов)
  for (let hour = 8; hour <= 12; hour++) {
    await supabase.from('shop_template').insert({
      day_of_week: 0,
      hour,
    });
  }

  // Запустить генерацию
  const response = await fetch('http://localhost:54321/functions/v1/generate-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStart: '2025-01-13' }),
  });

  const result = await response.json();
  
  assertEquals(result.uncoveredSlots, 0);
  assertExists(result.baristaLoads);
});

Deno.test('TC-ALGO-002: распределение относительно равномерное', async () => {
  // ... (аналогично TC-ALGO-001)
  
  const loads = Object.values(result.baristaLoads);
  const max = Math.max(...loads);
  const min = Math.min(...loads);
  const deviation = (max - min) / min;
  
  assertEquals(deviation < 0.3, true); // < 30%
});
```

---

### Критерии готовности Этапа 3

- ✅ Edge Function `generate-schedule` развёрнута
- ✅ Алгоритм закрывает все слоты (при наличии бариста)
- ✅ Распределение часов равномерное
- ✅ Integration тесты проходят
- ✅ Можно запустить генерацию из админ панели

---

## ЭТАП 4: Админ панель (5-6 дней)

_Детальное описание компонентов админ панели..._

*(Дальнейшее описание этапов 4-10 аналогично детализировано, но для краткости в данном файле они представлены в сокращённом виде. Полная версия будет в отдельных документах.)*

---

## ЭТАП 5: Смены и отчёты (3-4 дня)

**Основные компоненты:**
- ActiveShift.tsx
- ShiftReportForm.tsx
- ShiftsList.tsx

**Edge Functions:**
- submit-shift-report.ts
- get-current-shift.ts

---

## ЭТАП 6: Зарплаты (2-3 дня)

**Компоненты:**
- SalariesTable.tsx
- ExportButton.tsx

**Edge Functions:**
- calculate-salaries.ts

---

## ЭТАП 7: Уведомления (2-3 дня)

**Telegram Bot:**
- bot.ts (Node.js или Deno)

**Cron Jobs:**
- send-shift-reminders.ts
- send-turnover-reminders.ts

---

## ЭТАП 8: Безопасность и логи (2 дня)

**Задачи:**
- Настроить триггеры для audit_log
- Добавить защиту от редактирования прошлого
- Проверить все RLS политики
- Security audit

---

## ЭТАП 9: E2E тестирование (3-4 дня)

**Playwright тесты:**
- Полный flow бариста
- Полный flow администратора
- Тестирование уведомлений

---

## ЭТАП 10: Оптимизация и деплой (2-3 дня)

**Задачи:**
- Code splitting
- Индексы БД
- Кэширование
- Sentry для ошибок
- Production деплой

---

## 📝 Чеклист готовности к запуску

### Backend
- [ ] Все миграции применены
- [ ] RLS политики настроены
- [ ] Edge Functions развёрнуты
- [ ] Cron jobs настроены
- [ ] Индексы созданы

### Frontend
- [ ] Mini App работает
- [ ] Auth через Telegram работает
- [ ] Все основные экраны реализованы
- [ ] Responsive дизайн

### Тестирование
- [ ] Unit тесты > 80% покрытия
- [ ] Integration тесты проходят
- [ ] E2E тесты проходят
- [ ] Performance тесты в пределах нормы

### Безопасность
- [ ] RLS проверен на всех таблицах
- [ ] Audit log работает
- [ ] Нет SQL injection уязвимостей
- [ ] CORS настроен правильно

### Деплой
- [ ] Frontend на Vercel
- [ ] Telegram Bot запущен
- [ ] Environment variables настроены
- [ ] Monitoring настроен

---

## 🎯 Следующие шаги

1. **Ознакомиться с планом**
2. **Внести правки (если нужно)**
3. **Утвердить план**
4. **Начать с Этапа 0**

---

**Автор:** AI Assistant  
**Дата создания:** 15 декабря 2025  
**Статус:** Черновик, ожидает утверждения

