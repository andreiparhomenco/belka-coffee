@echo off
echo.
echo ============================================
echo   ngrok Tunnel для Belka Coffee
echo ============================================
echo.

echo Запуск ngrok tunnel на порт 5174...
echo.
echo После запуска скопируйте HTTPS URL
echo и настройте его в @BotFather
echo.
echo ============================================
echo.

cd /d D:\Cursor\belka\ngrok-v3-stable-windows-amd64
ngrok.exe http 5174 --log=stdout

pause


