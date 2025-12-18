@echo off
echo.
echo ============================================
echo   Belka Coffee - Dev Server Startup
echo ============================================
echo.

cd /d D:\Cursor\belka\frontend

echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo.
echo Checking .env file...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with Supabase credentials
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Starting Dev Server...
echo   URL: http://localhost:5173/
echo ============================================
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause

