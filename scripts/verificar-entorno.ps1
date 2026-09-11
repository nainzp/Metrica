# ==============================================================================
# METRICA - Diagnostico Preventivo de Entorno de Ejecucion (Windows Server 2019)
# Secretaria de Salud - Gobernacion del Magdalena
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  METRICA - Verificacion de Prerrequisitos de Servidor (Windows Server 2019)  " -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$todoOk = $true

# 1. Privilegios de Administrador
$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($esAdmin) {
    Write-Host "[OK] Privilegios de Administrador: HABILITADOS" -ForegroundColor Green
} else {
    Write-Host "[ALERTA] Se recomienda ejecutar PowerShell como Administrador para tareas de IIS y Servicios" -ForegroundColor Yellow
}

# 2. Node.js LTS
try {
    $nodeVersion = & node -v 2>$null
    if ($nodeVersion) {
        Write-Host "[OK] Node.js detectado: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Node.js no encontrado en PATH. Instale Node.js 20 LTS." -ForegroundColor Red
        $todoOk = $false
    }
} catch {
    Write-Host "[ERROR] Excepcion verificando Node.js" -ForegroundColor Red
    $todoOk = $false
}

# 3. npm
try {
    $npmVersion = & npm -v 2>$null
    if ($npmVersion) {
        Write-Host "[OK] npm detectado: v$npmVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] npm no disponible en PATH." -ForegroundColor Red
    $todoOk = $false
}

# 4. PostgreSQL / pg_dump
try {
    $pgDump = & pg_dump --version 2>$null
    if ($pgDump) {
        Write-Host "[OK] Herramientas PostgreSQL cliente: $pgDump" -ForegroundColor Green
    } else {
        Write-Host "[ALERTA] pg_dump no esta en el PATH del sistema. Verifique instalacion de PostgreSQL 16." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ALERTA] No se pudo invocar pg_dump directamente." -ForegroundColor Yellow
}

# 5. NSSM (Non-Sucking Service Manager)
try {
    $nssmVersion = & nssm version 2>$null
    if ($nssmVersion) {
        Write-Host "[OK] NSSM detectado: $nssmVersion" -ForegroundColor Green
    } else {
        Write-Host "[INFO] NSSM no esta en PATH global. El instalador puede requerir copia local." -ForegroundColor Gray
    }
} catch {
    Write-Host "[INFO] NSSM no detectado en PATH." -ForegroundColor Gray
}

# 6. Espacio en Disco
$unidades = Get-PSDrive -PSProvider FileSystem
foreach ($u in $unidades) {
    $gbLibres = [math]::Round($u.Free / 1GB, 2)
    $n = $u.Name
    Write-Host "[INFO] Unidad $n - $gbLibres GB libres disponibles" -ForegroundColor Gray
}

# 7. Resumen
Write-Host ""
Write-Host "------------------------------------------------------------------------------"
if ($todoOk) {
    Write-Host "Diagnostico completado con exito. El entorno esta listo para METRICA." -ForegroundColor Green
} else {
    Write-Host "Se encontraron advertencias o faltantes. Revise los puntos en rojo antes de instalar." -ForegroundColor Yellow
}
Write-Host "------------------------------------------------------------------------------"
Write-Host ""