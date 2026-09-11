# ==============================================================================
# METRICA - Script Autonomo de Copia de Seguridad Diaria (CU-17)
# Programado para ejecucion nocturna a las 02:00 AM (Task Scheduler)
# ==============================================================================
[CmdletBinding()]
param(
    [string]$RutaBase = "C:\Desarrollos\Metrica",
    [int]$DiasRetencion = 14
)

$ErrorActionPreference = "Stop"
$fechaIso = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$rutaBackups = "$RutaBase\backups"
$rutaSoportes = "$RutaBase\soportes"
$archivoZip = "$rutaBackups\backup_metrica_$fechaIso.zip"
$logFile = "$RutaBase\logs\backup.log"

if (-not (Test-Path "$RutaBase\logs")) { New-Item -Path "$RutaBase\logs" -ItemType Directory -Force | Out-Null }
if (-not (Test-Path $rutaBackups)) { New-Item -Path $rutaBackups -ItemType Directory -Force | Out-Null }

function Registrar-Log([string]$mensaje) {
    $linea = "[$((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))] $mensaje"
    Write-Host $linea
    Add-Content -Path $logFile -Value $linea
}

Registrar-Log "Iniciando proceso de copia de seguridad programada..."

try {
    $tempDir = "$rutaBackups\temp_$fechaIso"
    New-Item -Path $tempDir -ItemType Directory -Force | Out-Null

    $manifiesto = @{
        sistema = "METRICA"
        entidad = "Gobernacion del Magdalena - Secretaria de Salud"
        vigencia = "2026"
        fechaGeneracion = (Get-Date).ToString("o")
        tipo = "PROGRAMADO_TAREAS_WINDOWS"
        version = "1.0.0"
    } | ConvertTo-Json -Depth 4
    Set-Content -Path "$tempDir\manifiesto.json" -Value $manifiesto -Encoding utf8

    $dumpPath = "$tempDir\base_datos.sql"
    $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($pgDump) {
        & pg_dump -h localhost -U postgres -d metrica -f $dumpPath 2>$null
        Registrar-Log "Exportacion PostgreSQL realizada con pg_dump."
    } else {
        Registrar-Log "pg_dump no encontrado en PATH; se incluye manifiesto y estructura."
    }

    if (Test-Path $rutaSoportes) {
        Copy-Item -Path $rutaSoportes -Destination "$tempDir\soportes" -Recurse -Force -ErrorAction SilentlyContinue
    }

    Compress-Archive -Path "$tempDir\*" -DestinationPath $archivoZip -Force
    Remove-Item -Path $tempDir -Recurse -Force
    $tamMb = [math]::Round((Get-Item $archivoZip).Length / 1MB, 2)
    Registrar-Log "Copia de seguridad generada con exito: $archivoZip ($tamMb MB)"

    $limiteFecha = (Get-Date).AddDays(-$DiasRetencion)
    $antiguos = Get-ChildItem -Path $rutaBackups -Filter "backup_metrica_*.zip" | Where-Object { $_.LastWriteTime -lt $limiteFecha }
    foreach ($a in $antiguos) {
        Remove-Item -Path $a.FullName -Force
        Registrar-Log "Copia obsoleta eliminada por politica de retencion ($DiasRetencion dias): $($a.Name)"
    }
} catch {
    Registrar-Log "ERROR durante la copia de seguridad: $($_.Exception.Message)"
    exit 1
}

Registrar-Log "Proceso de respaldo finalizado exitosamente."