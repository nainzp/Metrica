# Tareas de Implementación: Fase 5 (SDD Checklist)

## Backend
- [x] **T5.1**: Crear `TableroModule`, `TableroService` y `TableroController` en `apps/api/src/tablero/`.
- [x] **T5.2**: Implementar lógica de `obtenerResumenEjecutivo` integrando el motor de cálculos puros y promedio simple (RN-09, RN-10).
- [x] **T5.3**: Implementar `obtenerCurvaAvance` proyectando acumulados de enero a diciembre.
- [x] **T5.4**: Implementar `obtenerDesgloseAreas` y `obtenerAlertasCriticas`.
- [x] **T5.5**: Crear `ObservacionesModule`, `ObservacionesService` y `ObservacionesController` para CU-04.
- [x] **T5.6**: Crear `ExportacionModule` con `ExportacionService` utilizando `exceljs` para la descarga de la matriz de metas.
- [x] **T5.7**: Registrar módulos en `AppModule` y escribir pruebas unitarias en `tablero.service.spec.ts`.

## Frontend
- [x] **T5.8**: Crear vista `apps/web/src/paginas/Tablero/TableroPrincipal.tsx` con tarjetas de indicadores de cabecera.
- [x] **T5.9**: Implementar componentes de gráficas Recharts (Curva planeado vs ejecutado y Barras por área).
- [x] **T5.10**: Integrar bandeja de alertas críticas y listas accionables.
- [x] **T5.11**: Implementar funcionalidad de **Modo Presentación** (Fullscreen con layout limpio).
- [x] **T5.12**: Conectar pestaña "Observaciones" en `FichaMeta.tsx` al nuevo módulo backend.
- [x] **T5.13**: Conectar botones de exportación Excel en el cliente.

## Verificación
- [x] **T5.14**: Ejecutar suite de pruebas Jest (`npm --workspace=apps/api run test`).
- [x] **T5.15**: Ejecutar compilación de frontend (`npm --workspace=apps/web run build`).
- [x] **T5.16**: Ejecutar script de prueba E2E de Tablero y Exportación (`scratch/test-fase5-e2e.js`).
