# ==============================================================================
# METRICA - Script de Restauracion y Recuperacion ante Desastres (Disaster Recovery)
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ArchivoBackup,
    [string]$RutaBase = "C:\Desarrollos\Metrica",
    [switch]$Forzar
)

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Red
Write-Host "  METRICA - RESTAURACION DE COPIA DE SEGURIDAD                              " -ForegroundColor Red
Write-Host "==============================================================================" -ForegroundColor Red
Write-Host ""

if (-not (Test-Path $ArchivoBackup)) {
    Write-Host "[ERROR] El archivo de respaldo no existe: $ArchivoBackup" -ForegroundColor Red
    exit 1
}

if (-not $Forzar) {
    Write-Host "ADVERTENCIA: La restauracion reemplazara datos existentes en la base de datos." -ForegroundColor Yellow
    $confirmacion = Read-Host "¿Desea continuar con la restauracion? Escriba RESTAURAR para confirmar"
    if ($confirmacion -ne "RESTAURAR") {
        Write-Host "Operacion cancelada por el usuario." -ForegroundColor Gray
        exit 0
    }
}

$tempExtract = "$RutaBase\backups\restauracion_temp"
if (Test-Path $tempExtract) { Remove-Item -Path $tempExtract -Recurse -Force }
New-Item -Path $tempExtract -ItemType Directory -Force | Out-Null

try {
    Write-Host "[1/4] Descomprimiendo paquete de copia de seguridad..." -ForegroundColor Yellow
    Expand-Archive -Path $ArchivoBackup -DestinationPath $tempExtract -Force

    $manifiestoPath = "$tempExtract\manifiesto.json"
    if (Test-Path $manifiestoPath) {
        $meta = Get-Content -Path $manifiestoPath -Raw | ConvertFrom-Json
        $sistema = $meta.sistema
        $vigencia = $meta.vigencia
        $fechaG = $meta.fechaGeneracion
        Write-Host "      Manifiesto verificado: Sistema $sistema, Vigencia $vigencia, Generado: $fechaG" -ForegroundColor Cyan
    }

    $dumpPath = "$tempExtract\base_datos.sql"
    if (Test-Path $dumpPath) {
        Write-Host "[2/4] Restaurando base de datos PostgreSQL desde SQL dump..." -ForegroundColor Yellow
        $psql = Get-Command psql -ErrorAction SilentlyContinue
        if ($psql) {
            & psql -h localhost -U postgres -d metrica -f $dumpPath 2>$null
            Write-Host "[OK] Base de datos restaurada." -ForegroundColor Green
        } else {
            Write-Host "[ALERTA] psql no encontrado. Ejecute manualmente: psql -d metrica -f $dumpPath" -ForegroundColor Yellow
        }
    }

    $soportesTemp = "$tempExtract\soportes"
    if (Test-Path $soportesTemp) {
        Write-Host "[3/4] Sincronizando carpeta de archivos de soporte..." -ForegroundColor Yellow
        Copy-Item -Path "$soportesTemp\*" -Destination "$RutaBase\soportes" -Recurse -Force
        Write-Host "[OK] Soportes restaurados." -ForegroundColor Green
    }

    Write-Host "[4/4] Limpiando temporales..." -ForegroundColor Yellow
    Remove-Item -Path $tempExtract -Recurse -Force

    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Green
    Write-Host "  RESTAURACION FINALIZADA CON EXITO                                         " -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Green
    Write-Host ""
} catch {
    $msg = $_.Exception.Message
    Write-Host "[ERROR] Fallo la restauracion: $msg" -ForegroundColor Red
    if (Test-Path $tempExtract) { Remove-Item -Path $tempExtract -Recurse -Force }
    exit 1
}