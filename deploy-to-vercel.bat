@echo off
echo.
echo ============================================
echo   Belka Coffee - Deploy to Vercel
echo ============================================
echo.

echo Step 1: Login to Vercel...
echo (Browser will open for authentication)
echo.
vercel login

echo.
echo ============================================
echo Step 2: Deploy to Vercel...
echo ============================================
echo.

cd /d D:\Cursor\belka\frontend
vercel --prod

echo.
echo ============================================
echo   Deploy Complete!
echo ============================================
echo.
echo Copy the Production URL and configure it in @BotFather:
echo /mybots - @belka_coffee_bot - Bot Settings - Menu Button
echo.

pause


