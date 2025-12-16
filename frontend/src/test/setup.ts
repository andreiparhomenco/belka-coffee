import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Расширить expect с матчерами jest-dom
expect.extend(matchers);

// Очистка после каждого теста
afterEach(() => {
  cleanup();
});

// Mock Telegram WebApp
(globalThis as any).Telegram = {
  WebApp: {
    ready: () => {},
    expand: () => {},
    close: () => {},
    showAlert: () => {},
    showConfirm: () => Promise.resolve(true),
    openLink: () => {},
    initData: '',
    initDataUnsafe: {
      user: {
        id: 123456,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      },
    },
    colorScheme: 'light' as const,
    themeParams: {},
  },
};

