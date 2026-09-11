# Plan Técnico: Fase 5 — Tableros, Observaciones y Exportación

## 1. Arquitectura de Módulos

```
apps/api/src/
├── tablero/
│   ├── dto/tablero.dto.ts
│   ├── tablero.service.ts
│   ├── tablero.controller.ts
│   └── tablero.module.ts
├── observaciones/
│   ├── dto/observaciones.dto.ts
│   ├── observaciones.service.ts
│   ├── observaciones.controller.ts
│   └── observaciones.module.ts
└── exportacion/
    ├── exportacion.service.ts
    ├── exportacion.controller.ts
    └── exportacion.module.ts
```

## 2. Endpoints y Contratos de Datos

### 2.1 Tablero de Control (`TableroController`)
- `GET /api/tablero/resumen`:
  - Retorna `TableroResumenDto`: `avanceGlobalFisico`, `avanceGlobalPlaneado`, `semaforoGlobal`, `distribucionSemaforos`, `financiero: { programado, ejecutado, porcentaje }`, `metasTotales`, `metasCumplidas`.
- `GET /api/tablero/curva`:
  - Retorna `CurvaMensualDto[]`: Array de 12 meses con `mes`, `nombreMes`, `planeadoAcumulado`, `ejecutadoAcumulado`, `esMesActual`, `esFechaCorte`.
- `GET /api/tablero/desglose-areas`:
  - Retorna estadísticas por área y desglose de componentes.
- `GET /api/tablero/alertas-criticas`:
  - Retorna metas rojas, metas sin reporte mensual y tareas operativas vencidas.

### 2.2 Observaciones del Despacho (`ObservacionesController`)
- `POST /api/observaciones`:
  - Body: `{ metaId?: string, tareaId?: string, texto: string }`.
  - Roles: `SECRETARIA`, `ASISTENTE_DESPACHO`, `ADMINISTRADOR`.
- `POST /api/observaciones/:id/atender`:
  - Body: `{ respuesta: string }`.
  - Roles: Responsable de la meta/tarea, Líderes y Administrador.

### 2.3 Exportación Oficial (`ExportacionController`)
- `GET /api/exportacion/metas/excel`:
  - Usa `exceljs` para crear libro con 2 hojas: "Resumen Gerencial" y "Matriz 276 Metas".
  - Encabezados con color institucional azul marino (`#0B2A5B`), fuentes Calibri/Segoe UI, formato de moneda COP y porcentajes con 1 decimal.

## 3. Frontend (`apps/web/src/paginas/Tablero/`)
- `TableroControl.tsx`: Dashboard principal responsive.
- `componentes/GraficaCurvaAvance.tsx`: Gráfica Recharts de área y líneas con tooltip estilizado.
- `componentes/GraficaBarrasAreas.tsx`: Barras de avance por área con colores semafóricos.
- `componentes/BandejaAlertasCriticas.tsx`: Tarjetas colapsables de atención inmediata.
- `componentes/ModoPresentacion.tsx`: Vista maximizada para proyector.
