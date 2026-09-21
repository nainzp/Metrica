@echo off
title METRICA - Lanzador del Sistema

echo ======================================================================
echo    METRICA - Monitoreo y Evaluacion de Metas (PAS 2026)
echo    Secretaria de Salud Departamental del Magdalena
echo ======================================================================
echo.

:: Verificar si Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instale Node.js 20 LTS o superior para continuar.
    echo.
    pause
    exit /b 1
)

:: Moverse al directorio del script
cd /d "%~dp0"

echo [1/3] Iniciando el Backend API (NestJS en http://localhost:3000)...
start "METRICA - Backend API [Puerto 3000]" cmd /k "npm --workspace=apps/api run start:dev"

echo [2/3] Iniciando el Frontend Web (Vite React en http://localhost:5173)...
start "METRICA - Frontend Web [Puerto 5173]" cmd /k "npm --workspace=apps/web run dev"

echo [3/3] Esperando inicializacion de servicios...
timeout /t 5 /nobreak > nul

echo.
echo Abriendo METRICA en el navegador predeterminado...
start http://localhost:5173

echo.
echo ======================================================================
echo  Los servicios se estan ejecutando en ventanas independientes:
echo    - Frontend Web : http://localhost:5173
echo    - Backend API  : http://localhost:3000/api
echo    - Swagger Docs : http://localhost:3000/api/docs
echo.
echo  Para detener los servicios, simplemente cierra las ventanas abiertas.
echo ======================================================================
echo.
pause
