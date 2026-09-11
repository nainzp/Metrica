# Plan de Implementación: Fase 7 — Despliegue en Producción y Scripts

## Tareas Principales
1. **Módulo de Salud (/api/salud)**:
   - Crear `apps/api/src/salud/salud.controller.ts`, `salud.service.ts` y `salud.module.ts`.
   - Incorporar en `app.module.ts`.
   - Verificar respuesta con estado de Prisma/PostgreSQL, memoria y uptime.
2. **Scripts Operativos en PowerShell (scripts/)**:
   - Crear `scripts/verificar-entorno.ps1`
   - Crear `scripts/instalar.ps1`
   - Crear `scripts/actualizar.ps1`
   - Crear `scripts/backup.ps1`
   - Crear `scripts/restaurar.ps1`
3. **Configuración de IIS (web.config)**:
   - Crear `apps/web/public/web.config` con reglas de URL Rewrite y ARR.
4. **Manual de Despliegue**:
   - Crear `docs/DESPLIEGUE.md` detallando paso a paso para Windows Server 2019.
5. **Pulido Visual y Textos**:
   - Verificación de textos sin tecnicismos en español.
   - Revisión responsive de navegación y tablas.
6. **Compilación y Verificación E2E**:
   - Compilación general (`npm run build` en api y web).
   - Test automatizado de salud, sintaxis de scripts y funcionamiento.
