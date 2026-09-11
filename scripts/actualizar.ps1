# ==============================================================================
# METRICA - Script de Actualizacion Operativa (Downtime < 5 minutos)
# ==============================================================================
[CmdletBinding()]
param(
    [string]$RutaBase = "C:\Desarrollos\Metrica",
    [string]$NombreServicio = "MetricaApi"
)

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  METRICA - ACTUALIZACION DE SISTEMA                                        " -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$cronometro = [System.Diagnostics.Stopwatch]::StartNew()

# 1. Copia de Seguridad Preventiva Rapida
Write-Host "[1/6] Generando copia de seguridad previa a la actualizacion..." -ForegroundColor Yellow
try {
    & powershell -File "$RutaBase\scripts\backup.ps1" -RutaBase $RutaBase
} catch {
    Write-Host "[ALERTA] No se pudo generar backup previo automatico. Continuando..." -ForegroundColor Yellow
}

# 2. Detener Servicio de API
Write-Host "[2/6] Deteniendo servicio $NombreServicio..." -ForegroundColor Yellow
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    & nssm stop $NombreServicio 2>$null
}

# 3. Instalacion de Dependencias
Write-Host "[3/6] Sincronizando dependencias..." -ForegroundColor Yellow
Set-Location -Path $RutaBase
& npm ci --prefer-offline 2>&1 | Out-Host

# 4. Migraciones de Base de Datos
Write-Host "[4/6] Aplicando migraciones de Prisma..." -ForegroundColor Yellow
Set-Location -Path "$RutaBase\apps\api"
& npx prisma generate 2>&1 | Out-Host
& npx prisma db push --skip-generate 2>&1 | Out-Host

# 5. Compilacion
Write-Host "[5/6] Recompilando API y Web..." -ForegroundColor Yellow
& npm run build 2>&1 | Out-Host
Set-Location -Path "$RutaBase\apps\web"
& npm run build 2>&1 | Out-Host

# 6. Reiniciar Servicio
Write-Host "[6/6] Reactivando servicio de aplicacion..." -ForegroundColor Yellow
if ($nssmCmd) {
    & nssm start $NombreServicio 2>$null
}

$cronometro.Stop()
$tiempoTotal = [math]::Round($cronometro.Elapsed.TotalSeconds, 1)

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  ACTUALIZACION FINALIZADA EN $tiempoTotal SEGUNDOS                          " -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""