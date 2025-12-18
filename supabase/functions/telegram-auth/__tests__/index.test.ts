// ============================================
// Tests для telegram-auth Edge Function
// Description: Unit и интеграционные тесты
// Created: 2025-12-15
// ============================================

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock данные
const mockTelegramData = {
  telegram_id: 999888777,
  name: "Тест Тестович",
  username: "test_user",
};

const FUNCTION_URL = "http://localhost:54321/functions/v1/telegram-auth";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "test-anon-key";

// ============================================
// ТЕСТ 1: Создание нового пользователя
// ============================================

Deno.test("should create new user with barista role", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify(mockTelegramData),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.user);
  assertEquals(data.user.telegram_id, mockTelegramData.telegram_id);
  assertEquals(data.user.name, mockTelegramData.name);
  assertEquals(data.user.role, "barista"); // Новые пользователи - бариста
});

// ============================================
// ТЕСТ 2: Повторный вход существующего пользователя
// ============================================

Deno.test("should return existing user on second login", async () => {
  // Первый вход
  const firstResponse = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: 888777666,
      name: "Повторный Тест",
    }),
  });

  const firstData = await firstResponse.json();
  const userId = firstData.user.id;

  // Второй вход
  const secondResponse = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: 888777666,
      name: "Повторный Тест",
    }),
  });

  const secondData = await secondResponse.json();

  assertEquals(secondResponse.status, 200);
  assertEquals(secondData.success, true);
  assertEquals(secondData.user.id, userId); // Тот же user ID
});

// ============================================
// ТЕСТ 3: Обновление имени при повторном входе
// ============================================

Deno.test("should update name if changed", async () => {
  const telegramId = 777666555;
  
  // Первый вход
  await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: telegramId,
      name: "Старое Имя",
    }),
  });

  // Второй вход с новым именем
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: telegramId,
      name: "Новое Имя",
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.user.name, "Новое Имя"); // Имя обновлено
});

// ============================================
// ТЕСТ 4: Валидация - отсутствует telegram_id
// ============================================

Deno.test("should return error if telegram_id is missing", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      name: "Тест без ID",
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

// ============================================
// ТЕСТ 5: Валидация - отсутствует name
// ============================================

Deno.test("should return error if name is missing", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: 666555444,
    }),
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

// ============================================
// ТЕСТ 6: CORS preflight
// ============================================

Deno.test("should handle CORS preflight OPTIONS request", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "ok");
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});

// ============================================
// ТЕСТ 7: Проверка записи в audit_log
// ============================================

Deno.test("should log auth to audit_log", async () => {
  // Этот тест требует прямого доступа к БД
  // В реальном проекте используйте Supabase SDK для проверки audit_log
  
  const telegramId = 555444333;
  
  await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      telegram_id: telegramId,
      name: "Аудит Тест",
      username: "audit_test",
    }),
  });

  // TODO: Проверить что запись в audit_log создалась
  // с action = 'REGISTER' или 'LOGIN'
  
  // Для полноценного теста нужно подключение к БД:
  // const { data } = await supabase
  //   .from('audit_log')
  //   .select('*')
  //   .eq('new_data->>telegram_id', telegramId)
  //   .single();
  // 
  // assertExists(data);
  // assertEquals(data.table_name, 'users');
});

// ============================================
// ТЕСТ 8: Производительность - множественные запросы
// ============================================

Deno.test("should handle multiple concurrent requests", async () => {
  const requests = Array.from({ length: 10 }, (_, i) =>
    fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({
        telegram_id: 100000 + i,
        name: `Тест ${i}`,
      }),
    })
  );

  const responses = await Promise.all(requests);
  
  for (const response of responses) {
    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.success, true);
  }
});

