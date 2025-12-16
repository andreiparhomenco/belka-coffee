import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

/**
 * Hook для работы с Telegram WebApp API
 */
export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    WebApp.ready();
    WebApp.expand();
    
    // Настройка темы
    if (WebApp.colorScheme === 'dark') {
      document.body.classList.add('dark-theme');
    }

    setIsReady(true);

    return () => {
      // Cleanup
    };
  }, []);

  return {
    webApp: WebApp,
    user: WebApp.initDataUnsafe.user,
    isReady,
    colorScheme: WebApp.colorScheme,
    themeParams: WebApp.themeParams,
    
    // Методы
    showAlert: (message: string) => WebApp.showAlert(message),
    showConfirm: (message: string) => WebApp.showConfirm(message),
    close: () => WebApp.close(),
    openLink: (url: string) => WebApp.openLink(url),
  };
}

