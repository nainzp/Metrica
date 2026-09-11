# Checklist de Implementación: Fase 6 (SDD)

## Backend
- [x] **T6.1**: Crear DTOs de herramientas (`dto/herramientas.dto.ts`).
- [x] **T6.2**: Implementar `HerramientasService` con lógica de respaldo completo (`JSZip` + manifiesto + soportes).
- [x] **T6.3**: Implementar métodos de conteo y purga segura atómica de datos de prueba (`esDatoPrueba = true`) con backup previo.
- [x] **T6.4**: Implementar `HerramientasController` y endpoints REST protegidos.
- [x] **T6.5**: Configurar tarea programada a las 02:00 AM para backup automático y retención de 30 días.
- [x] **T6.6**: Registrar `HerramientasModule` en `AppModule`.
- [x] **T6.7**: Escribir pruebas unitarias en `herramientas.service.spec.ts`.

## Frontend
- [x] **T6.8**: Crear vista `apps/web/src/paginas/Administracion/Herramientas.tsx`.
- [x] **T6.9**: Implementar sección de Copias de Seguridad con botón de generación y tabla de descargas.
- [x] **T6.10**: Implementar sección de Purga con conteo en vivo y modal de doble confirmación.
- [x] **T6.11**: Registrar ruta `/admin/herramientas` en `rutas.tsx` y enlace en `BarraLateral.tsx`.

## Verificación
- [x] **T6.12**: Ejecutar suite de pruebas unitarias Jest (`npm --workspace=apps/api run test`).
- [x] **T6.13**: Compilar frontend (`npm --workspace=apps/web run build`).
- [x] **T6.14**: Ejecutar suite E2E de Fase 6 (`scratch/test-fase6-e2e.js`).
