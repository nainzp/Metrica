# Especificación Técnica: Fase 7 — Despliegue en Producción, Scripts y Pulido Final (Sección 11.7 y 13)

## 1. Propósito y Alcance
Esta fase culmina la construcción integral del sistema MÉTRICA, preparando la plataforma para su puesta en marcha en producción sobre Windows Server 2019 (Gobernación del Magdalena - Secretaría de Salud), garantizando:
1. **Monitoreo y Diagnóstico Activo (`/api/salud`)**: Endpoint estándar para balanceadores, supervisión de servicios y health check de conectividad a PostgreSQL y memoria.
2. **Scripts de Automatización Operativa (`scripts/`)**:
   - `instalar.ps1`: Aprovisionamiento automatizado de base de datos, dependencias, compilación y registro de servicio Windows con NSSM.
   - `actualizar.ps1`: Actualización con indisponibilidad menor a 5 minutos, respaldo previo, migraciones automáticas y reinicio del servicio.
   - `backup.ps1`: Ejecución programada para el Programador de Tareas de Windows (Task Scheduler) a las 02:00 AM con rotación de retención de 14 días.
   - `restaurar.ps1`: Procedimiento de contingencia y recuperación ante desastres a partir de archivos `.zip` de copia de seguridad.
   - `verificar-entorno.ps1`: Diagnóstico preventivo de prerrequisitos (Node.js LTS, PostgreSQL 16, NSSM, IIS, puertos 80/443/3000).
3. **Configuración de IIS y Reverse Proxy (`web.config`)**: Reglas de reescritura para Single Page Application (SPA) y reenvío transparente de solicitudes `/api/*` hacia el backend NestJS con ARR (Application Request Routing).
4. **Guía de Despliegue y Operaciones (`docs/DESPLIEGUE.md`)**: Manual exhaustivo para el equipo de infraestructura TIC.
5. **Pulido Visual, Textual y Responsive**: Revisión de diseño institucional (azul marino `#0B2A5B`, azul `#1E5FD9`, semáforos, Segoe UI/Inter), accesibilidad, experiencia en móvil (≥ 360px) y claridad en mensajes de error.

## 2. Requerimientos Funcionales
- **RF7.1**: Endpoint público `GET /api/salud` que retorne código HTTP 200 con `{ ok: true, version: '1.0.0', sistema: 'MÉTRICA', baseDatos: 'CONECTADO', timestamp, tiempoActivo, memoria }`.
- **RF7.2**: Scripts de PowerShell con manejo de errores robusto (`$ErrorActionPreference = "Stop"`), validación de privilegios de Administrador y logs claros.
- **RF7.3**: Configuración de `web.config` con encabezados de seguridad HTTP (HSTS, nosniff, SAMEORIGIN, XSS protection).
- **RF7.4**: Compilación y empaquetado verificado de frontend y backend sin advertencias críticas.

## 3. Criterios de Aceptación
1. `GET /api/salud` responde en menos de 200 ms indicando estado `CONECTADO` a la base de datos.
2. Todos los scripts en `scripts/` pasan validación de sintaxis en PowerShell.
3. El frontend compila incluyendo el archivo `web.config` en el directorio `dist/`.
4. El manual `docs/DESPLIEGUE.md` describe con precisión cada paso de instalación en Windows Server 2019.
5. Se conserva la integridad absoluta de las 276 metas del Plan de Acción en Salud.
