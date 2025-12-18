# ============================================
# Belka Coffee - Test Runner Script
# Description: Запуск тестов проекта
# Created: 2025-12-18
# ============================================

param(
    [string]$Filter = "",
    [switch]$Coverage,
    [switch]$Watch
)

Write-Host "🧪 Запуск тестов Belka Coffee..." -ForegroundColor Cyan
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

# Формирование команды
$command = "npm test"

if ($Filter) {
    $command += " -- $Filter"
    Write-Host "🔍 Фильтр: $Filter" -ForegroundColor Yellow
}

if ($Coverage) {
    $command += " -- --coverage"
    Write-Host "📊 С покрытием кода" -ForegroundColor Yellow
}

if ($Watch) {
    $command += " -- --watch"
    Write-Host "👀 Режим наблюдения" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Запуск тестов
Invoke-Expression $command

Write-Host ""
Write-Host "✅ Тесты завершены!" -ForegroundColor Green
Write-Host ""

# Примеры использования
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📚 Примеры использования:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Все тесты:" -ForegroundColor Gray
Write-Host "  .\run-tests.ps1" -ForegroundColor White
Write-Host ""
Write-Host "  # Конкретный компонент:" -ForegroundColor Gray
Write-Host "  .\run-tests.ps1 -Filter 'Dashboard'" -ForegroundColor White
Write-Host ""
Write-Host "  # С покрытием:" -ForegroundColor Gray
Write-Host "  .\run-tests.ps1 -Coverage" -ForegroundColor White
Write-Host ""
Write-Host "  # Режим наблюдения:" -ForegroundColor Gray
Write-Host "  .\run-tests.ps1 -Watch" -ForegroundColor White
Write-Host ""

