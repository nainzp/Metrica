# ==============================================================================
# METRICA - Script de Instalacion y Puesta en Marcha en Produccion
# Windows Server 2019 - IIS 10 + Node.js + PostgreSQL 16
# ==============================================================================
[CmdletBinding()]
param(
    [string]$RutaBase = "C:\Desarrollos\Metrica",
    [int]$PuertoApi = 3000,
    [string]$NombreServicio = "MetricaApi",
    [string]$NombreSitioIIS = "MetricaWeb"
)

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  METRICA - INICIANDO INSTALACION EN PRODUCCION                             " -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Validar Administrador
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[ERROR] Este script requiere privilegios de Administrador. Ejecute PowerShell como Administrador." -ForegroundColor Red
    exit 1
}

# 2. Creacion de Directorios Estructurados
$rutas = @(
    "$RutaBase\soportes",
    "$RutaBase\backups",
    "$RutaBase\logs"
)

foreach ($r in $rutas) {
    if (-not (Test-Path $r)) {
        New-Item -Path $r -ItemType Directory -Force | Out-Null
        Write-Host "[OK] Directorio creado: $r" -ForegroundColor Green
    }
}

# 3. Validar .env en Backend
$envPath = "$RutaBase\apps\api\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "[ALERTA] No se encontro $envPath. Creando plantilla..." -ForegroundColor Yellow
    $jwtSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
    $envLines = @(
        "PORT=$PuertoApi",
        "NODE_ENV=production",
        "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/metrica?schema=public",
        "JWT_SECRETO=$jwtSecret",
        "RUTA_SOPORTES=$RutaBase\soportes",
        "RUTA_BACKUPS=$RutaBase\backups",
        "RUTA_LOGS=$RutaBase\logs",
        "URL_PUBLICA=http://localhost:5173",
        "CORREO_ACTIVO=false"
    )
    $envLines | Set-Content -Path $envPath -Encoding utf8
    Write-Host "[OK] Archivo .env configurado con JWT generado aleatoriamente." -ForegroundColor Green
}

# 4. Instalacion de Dependencias Monorepo
Write-Host ""
Write-Host "[1/5] Instalando dependencias de Node.js..." -ForegroundColor Yellow
Set-Location -Path $RutaBase
& npm ci --prefer-offline 2>&1 | Out-Host

# 5. Despliegue de Base de Datos y Semillas Prisma
Write-Host ""
Write-Host "[2/5] Aplicando esquema de base de datos PostgreSQL..." -ForegroundColor Yellow
Set-Location -Path "$RutaBase\apps\api"
& npx prisma generate 2>&1 | Out-Host
& npx prisma db push --skip-generate 2>&1 | Out-Host

# 6. Compilacion de Backend y Frontend
Write-Host ""
Write-Host "[3/5] Compilando Backend NestJS..." -ForegroundColor Yellow
& npm run build 2>&1 | Out-Host

Write-Host ""
Write-Host "[4/5] Compilando Frontend React + Vite..." -ForegroundColor Yellow
Set-Location -Path "$RutaBase\apps\web"
& npm run build 2>&1 | Out-Host

# 7. Configuracion de Servicio Windows mediante NSSM
Write-Host ""
Write-Host "[5/5] Configurando Servicio Windows de Alta Disponibilidad ($NombreServicio)..." -ForegroundColor Yellow
$nodeExe = (Get-Command node).Source
$distMain = "$RutaBase\apps\api\dist\main.js"

$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    & nssm stop $NombreServicio 2>$null
    & nssm remove $NombreServicio confirm 2>$null
    & nssm install $NombreServicio "$nodeExe" "$distMain"
    & nssm set $NombreServicio AppDirectory "$RutaBase\apps\api"
    & nssm set $NombreServicio AppStdout "$RutaBase\logs\api-stdout.log"
    & nssm set $NombreServicio AppStderr "$RutaBase\logs\api-stderr.log"
    & nssm set $NombreServicio Start SERVICE_AUTO_START
    & nssm set $NombreServicio AppRestartDelay 3000
    & nssm start $NombreServicio
    Write-Host "[OK] Servicio Windows $NombreServicio registrado y arrancado con NSSM." -ForegroundColor Green
} else {
    Write-Host "[INFO] NSSM no encontrado. Para registrar como servicio use nssm o sc.exe." -ForegroundColor Gray
}

# 8. Verificacion de Salud
Start-Sleep -Seconds 3
try {
    $salud = Invoke-RestMethod -Uri "http://localhost:$PuertoApi/api/salud" -TimeoutSec 5 -ErrorAction Stop
    if ($salud.ok) {
        Write-Host ""
        Write-Host "==============================================================================" -ForegroundColor Green
        Write-Host "  INSTALACION COMPLETADA EXITOSAMENTE                                         " -ForegroundColor Green
        Write-Host "  Sistema: $($salud.sistema) v$($salud.version)                                " -ForegroundColor Green
        Write-Host "  Base de Datos: $($salud.baseDatos.estado)" -ForegroundColor Green
        Write-Host "  API disponible en: http://localhost:$PuertoApi/api/salud                    " -ForegroundColor Green
        Write-Host "==============================================================================" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "[INFO] Verifique la API en: http://localhost:$PuertoApi/api/salud" -ForegroundColor Gray
}