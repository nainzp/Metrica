# MÉTRICA — Manual de Instalación, Despliegue y Operaciones en Producción

**Gobernación del Magdalena · Secretaría de Salud**  
*Sistema de Monitoreo y Evaluación de Targets, Resultados e Indicadores para el Cumplimiento de Acciones (PAS 2026)*  
*Elaborado por INGNOVATICS Consultores S.A.S. · Versión 1.0 · Septiembre 2026*

---

## 1. Visión General de la Arquitectura

MÉTRICA está diseñado para ejecutarse de forma nativa y eficiente en el entorno institucional de la Gobernación del Magdalena:

```
                                  [ Navegadores de Usuarios ]
                                (Edge, Chrome, Firefox, Safari)
                                               │
                                               │ HTTPS (443)
                                               ▼
                              ┌──────────────────────────────────┐
                              │  Internet Information Services   │
                              │             (IIS 10)             │
                              │    URL Rewrite 2.1 + ARR 3.0     │
                              └────────────────┬─────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │                                               │
                       ▼                                               ▼
          [ Frontend SPA Estático ]                       [ Proxy Inverso Local ]
            React 18 + Vite + SPA                           http://localhost:3000
           Directorio: D:\metrica\web                                 │
                                                                       ▼
                                                       ┌───────────────────────────────┐
                                                       │   Servicio Windows NSSM       │
                                                       │      "MetricaApi"             │
                                                       │   Node.js 20 LTS + NestJS     │
                                                       └───────────────┬───────────────┘
                                                                       │
                                                       ┌───────────────┴───────────────┐
                                                       ▼                               ▼
                                             [ PostgreSQL 16 Local ]          [ Almacenamiento Local ]
                                             Base de datos: "metrica"         - Soportes: D:\metrica\soportes
                                             Puerto: 5432                     - Backups:  D:\metrica\backups
                                                                              - Logs:     D:\metrica\logs
```

---

## 2. Requisitos del Servidor

### 2.1 Especificaciones de Hardware (Servidor Existente)
- **Sistema Operativo**: Windows Server 2019 Standard o Datacenter (64 bits).
- **Procesador**: 6 núcleos (o superior).
- **Memoria RAM**: 64 GB de RAM (el sistema opera con alta holgura; memoria estimada en producción < 2 GB).
- **Disco Duro**: Mínimo 100 GB libres en unidad de datos (`D:\` o partición designada).

### 2.2 Requisitos de Software
1. **Node.js**: Versión 20.x LTS (descargar desde [nodejs.org](https://nodejs.org/)).
2. **PostgreSQL**: Versión 16.x (descargar desde [postgresql.org](https://www.postgresql.org/download/windows/)). Incluir herramientas de cliente (`pg_dump`, `psql`) en el PATH del sistema.
3. **NSSM (Non-Sucking Service Manager)**: Descargar `nssm.exe` de 64 bits y ubicarlo en `C:\Windows\System32` o agregar al PATH.
4. **Internet Information Services (IIS 10)** con los siguientes módulos adicionales de Microsoft:
   - **URL Rewrite Module 2.1**
   - **Application Request Routing (ARR) 3.0**
5. **Git para Windows**: Versión 2.40+ para clonación y despliegues controlados.

---

## 3. Estructura de Directorios en Servidor

Se recomienda estandarizar el despliegue en la unidad `D:\metrica` (o `C:\Desarrollos\Metrica` según particionamiento):

```
D:\metrica\
  ├── app\                 // Código fuente y monorepo (apps/api, apps/web)
  ├── web\                 // Archivos estáticos compilados de producción (dist/)
  ├── soportes\            // Almacenamiento seguro de archivos adjuntos y evidencias (fuera de la raíz web)
  ├── backups\             // Copias de seguridad automáticas y programadas (.zip)
  └── logs\                // Bitácoras de salida del servicio Windows y backups
```

---

## 4. Procedimiento de Instalación Paso a Paso

### Paso 1: Configurar IIS y Módulos
1. En **Server Manager** -> **Add Roles and Features**, habilitar el rol **Web Server (IIS)** con:
   - Common HTTP Features (Default Document, Directory Browsing, HTTP Errors, Static Content).
   - Performance (Static Content Compression, Dynamic Content Compression).
   - Security (Request Filtering).
2. Instalar **URL Rewrite 2.1** y **Application Request Routing (ARR) 3.0**.
3. En IIS Manager:
   - Seleccionar el servidor -> **Application Request Routing Cache** -> **Server Proxy Settings**.
   - Marcar la casilla **Enable proxy** y hacer clic en **Apply**.

### Paso 2: Configurar PostgreSQL 16
1. Instalar PostgreSQL 16 con codificación UTF-8.
2. Abrir `pgAdmin` o terminal de `psql` como usuario `postgres`:
   ```sql
   CREATE DATABASE metrica WITH ENCODING 'UTF8' LC_COLLATE = 'Spanish_Colombia.1252' LC_CTYPE = 'Spanish_Colombia.1252';
   CREATE USER metrica_app WITH PASSWORD 'ClaveSeguraProd2026*#';
   GRANT ALL PRIVILEGES ON DATABASE metrica TO metrica_app;
   ```
3. Otorgar permisos sobre el esquema `public`:
   ```sql
   \c metrica
   GRANT ALL ON SCHEMA public TO metrica_app;
   ```

### Paso 3: Clonar el Repositorio y Configurar Variables de Entorno
1. Abrir PowerShell como Administrador:
   ```powershell
   New-Item -Path "D:\metrica\soportes", "D:\metrica\backups", "D:\metrica\logs", "D:\metrica\web" -ItemType Directory -Force
   git clone <URL_REPOSITORIO> D:\metrica\app
   ```
2. Crear y configurar el archivo de variables de entorno en `D:\metrica\app\apps\api\.env`:
   ```env
   PORT=3000
   NODE_ENV=production
   DATABASE_URL="postgresql://metrica_app:ClaveSeguraProd2026*#@localhost:5432/metrica?schema=public"
   JWT_SECRETO="c7a8e9f2b1d4c6a8e0f3a5d7c9e1b3f5a7d9c1e3b5f7a9d1c3e5b7f9a1d3c5e7"
   RUTA_SOPORTES="D:\metrica\soportes"
   RUTA_BACKUPS="D:\metrica\backups"
   RUTA_LOGS="D:\metrica\logs"
   URL_PUBLICA="https://metrica.magdalena.gov.co"
   CORREO_ACTIVO=false
   ```

### Paso 4: Despliegue de Base de Datos y Compilación
Ejecutar desde `D:\metrica\app`:
```powershell
cd D:\metrica\app
npm ci --prefer-offline

# Aplicar modelo Prisma y semillas reales del Plan de Acción en Salud
cd apps\api
npx prisma generate
npx prisma db push
npx prisma db seed
npm run build

# Compilar interfaz gráfica Web
cd ..\web
npm run build

# Copiar artefactos web al directorio de producción de IIS
Copy-Item -Path D:\metrica\app\apps\web\dist\* -Destination D:\metrica\web -Recurse -Force
```

### Paso 5: Registrar el Servicio Windows con NSSM
Para garantizar alta disponibilidad y reinicio automático en caso de fallo o reinicio del servidor:
```powershell
$nodeExe = (Get-Command node).Source
nssm install MetricaApi "$nodeExe" "D:\metrica\app\apps\api\dist\main.js"
nssm set MetricaApi AppDirectory "D:\metrica\app\apps\api"
nssm set MetricaApi AppStdout "D:\metrica\logs\api-stdout.log"
nssm set MetricaApi AppStderr "D:\metrica\logs\api-stderr.log"
nssm set MetricaApi Start SERVICE_AUTO_START
nssm set MetricaApi AppRestartDelay 3000
nssm start MetricaApi
```

### Paso 6: Configurar Sitio Web en IIS con HTTPS
1. En IIS Manager -> **Sites** -> **Add Website**:
   - **Site name**: `MetricaWeb`
   - **Physical path**: `D:\metrica\web`
   - **Binding**: Type `https`, Port `443`, seleccionar el certificado SSL institucional (`*.magdalena.gov.co`).
2. Verificar que el archivo `web.config` esté en `D:\metrica\web\web.config`. Contiene:
   - Reescritura inversa de `/api/*` hacia `http://localhost:3000/api/*`.
   - Reescritura de rutas SPA hacia `index.html`.
   - Encabezados de seguridad HTTP (XSS, Clickjacking, MIME sniffing).
3. Redirección HTTP a HTTPS: Configurar regla en IIS o enlace puerto 80 hacia 443.

### Paso 7: Configurar Backup Nocturno en el Programador de Tareas
Para cumplir con la política institucional de copias de seguridad diarias a las 02:00 AM:
1. Abrir **Task Scheduler** (Programador de tareas).
2. Crear tarea básica:
   - **Nombre**: `Metrica_Backup_Diario`
   - **Desencadenador**: Diariamente a las 02:00:00 AM.
   - **Acción**: Iniciar un programa.
     - **Programa/script**: `powershell.exe`
     - **Argumentos**: `-ExecutionPolicy Bypass -File "D:\metrica\app\scripts\backup.ps1" -RutaBase "D:\metrica" -DiasRetencion 14`
   - **Seguridad**: Ejecutar tanto si el usuario inició sesión como si no, con los privilegios más altos (`SYSTEM` o cuenta de servicio).

---

## 5. Verificación de Puesta en Marcha

Para certificar que el sistema está completamente operativo:

1. **Prueba de Salud del API**:
   Abrir navegador o ejecutar comando:
   ```powershell
   Invoke-RestMethod -Uri "https://metrica.magdalena.gov.co/api/salud"
   ```
   Respuesta esperada:
   ```json
   {
     "ok": true,
     "sistema": "MÉTRICA",
     "entidad": "Gobernación del Magdalena - Secretaría de Salud",
     "version": "1.0.0",
     "vigencia": "2026",
     "baseDatos": {
       "estado": "CONECTADO",
       "latenciaMs": 4
     },
     "memoria": { "rssMb": 85.3, "heapUsedMb": 42.1 }
   }
   ```

2. **Acceso Inicial del Administrador**:
   - Ingresar a: `https://metrica.magdalena.gov.co`
   - Usuario: `admin@magdalena.gov.co`
   - Contraseña inicial: `Admin2026*!`
   - Realizar cambio de contraseña en el primer inicio de sesión.
   - Verificar la carga completa de las **276 metas del Plan de Acción en Salud** en el Tablero de Control y el Plan de Metas.

---

## 6. Manual de Operaciones y Mantenimiento

### 6.1 Actualizaciones de Código (Downtime < 5 minutos)
Ejecutar el script automatizado:
```powershell
powershell -ExecutionPolicy Bypass -File "D:\metrica\app\scripts\actualizar.ps1" -RutaBase "D:\metrica"
```
El script automáticamente:
1. Genera un backup preventivo previo.
2. Detiene el servicio de API.
3. Sincroniza paquetes npm.
4. Aplica migraciones pendientes de Prisma.
5. Recompila backend y frontend.
6. Reactiva el servicio y verifica salud.

### 6.2 Restauración ante Desastres (Disaster Recovery)
En caso de fallo catastrófico de hardware o contingencia mayor:
```powershell
powershell -ExecutionPolicy Bypass -File "D:\metrica\app\scripts\restaurar.ps1" -ArchivoBackup "D:\metrica\backups\backup_metrica_2026-09-11.zip" -RutaBase "D:\metrica"
```

### 6.3 Diagnóstico y Revisión de Bitácoras (Logs)
- Bitácora de salida de API: `D:\metrica\logs\api-stdout.log`
- Bitácora de errores de API: `D:\metrica\logs\api-stderr.log`
- Bitácora de copias de seguridad: `D:\metrica\logs\backup.log`
- Bitácora de auditoría inmutable: Consultable en tiempo real desde la interfaz web (`Administración -> Auditoría`).
