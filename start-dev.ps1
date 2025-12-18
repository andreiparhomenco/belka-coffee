# ============================================
# Belka Coffee - Dev Server Startup Script
# Description: Запуск dev сервера для тестирования
# Created: 2025-12-18
# ============================================

Write-Host "🚀 Запуск Belka Coffee Dev Server..." -ForegroundColor Cyan
Write-Host ""

# Переход в директорию frontend
Set-Location -Path "D:\Cursor\belka\frontend"

Write-Host "📂 Директория: D:\Cursor\belka\frontend" -ForegroundColor Green
Write-Host ""

# Проверка наличия node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "📦 node_modules не найдены. Устанавливаем зависимости..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Проверка .env файла
if (!(Test-Path ".env")) {
    Write-Host "⚠️  ВНИМАНИЕ: Файл .env не найден!" -ForegroundColor Red
    Write-Host "   Создайте .env файл с переменными Supabase" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "✅ Все готово!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Dev сервер запускается на http://localhost:5173/" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Запуск dev сервера
npm run dev

