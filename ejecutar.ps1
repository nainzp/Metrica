# METRICA - Lanzador para PowerShell
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   METRICA - Monitoreo y Evaluacion de Metas (PAS 2026)               " -ForegroundColor Cyan
Write-Host "   Secretaria de Salud Departamental del Magdalena                    " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$RutaBase = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RutaBase) { $RutaBase = Get-Location }
Set-Location $RutaBase

Write-Host "[1/3] Iniciando Backend API (NestJS en http://localhost:3000)..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList '/k', "cd /d `"$RutaBase`" && npm --workspace=apps/api run start:dev"

Write-Host "[2/3] Iniciando Frontend Web (Vite React en http://localhost:5173)..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList '/k', "cd /d `"$RutaBase`" && npm --workspace=apps/web run dev"

Write-Host "[3/3] Esperando inicializacion de servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

Write-Host "Abriendo METRICA en el navegador predeterminado..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Los servicios se estan ejecutando en ventanas independientes:"
Write-Host "   - Frontend Web : http://localhost:5173"
Write-Host "   - Backend API  : http://localhost:3000/api"
Write-Host "   - Swagger Docs : http://localhost:3000/api/docs"
Write-Host ""
Write-Host " Para detener los servicios, simplemente cierra las ventanas abiertas."
Write-Host "======================================================================" -ForegroundColor Cyan
