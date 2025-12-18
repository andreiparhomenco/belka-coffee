@echo off
echo.
echo ============================================
echo   Cloudflare Tunnel для Belka Coffee
echo ============================================
echo.

echo Запуск Cloudflare Tunnel на порт 5174...
echo.
echo После запуска скопируйте HTTPS URL
echo и настройте его в @BotFather
echo.
echo ============================================
echo.

cd /d D:\Cursor\belka
cloudflared.exe tunnel --url http://localhost:5174

pause


