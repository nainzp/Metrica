# Spec 03: Reportes Mensuales, Proyecciones, Correcciones y Notificaciones

## Resumen
Registro periódico de avances físicos y financieros (CU-05), alertas presupuestales y de sobreavance (RN-14, RN-15), correcciones auditadas con motivo (CU-06, RN-13), transiciones de estado automáticas (RN-05, RN-07) y crons automáticos de recordatorios y alertas (RN-16, RN-17).

## Criterios de Aceptación (Verificados)
- [x] `POST /api/metas/:id/reportes`: valida unicidad de reporte por año/mes y requiere justificación en metas binarias (RN-08) o sobrecostos (RN-14).
- [x] `POST /api/metas/:id/reportes/proyectar`: cálculo en vivo de nuevo acumulado, avance y semáforo proyectado.
- [x] `PATCH /api/reportes/:id`: corrección auditada con motivo obligatorio >= 5 caracteres.
- [x] Crons automáticos con `@nestjs/schedule`:
  - Días 1 y 4 (07:00): Recordatorios de reporte pendiente (RN-16).
  - Día 6 (07:00) y lunes: Alertas de reportes vencidos al Líder de Área (RN-17).
  - Diario (00:05): Cierre de metas vencidas (`CERRADA_SIN_CUMPLIR`, RN-07).
- [x] Campana interactiva de notificaciones en tiempo real y centro de notificaciones.
- [x] Suite de pruebas Jest en `reportes.service.spec.ts` (7/7 aprobadas).
