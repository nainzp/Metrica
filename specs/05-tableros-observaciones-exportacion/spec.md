# Especificación: Fase 5 — Tableros de Control Gerencial, Observaciones y Exportación Oficial

**Feature**: Tablero Ejecutivo, Curvas de Avance, Observaciones del Despacho y Exportación Oficial  
**Módulo**: `tablero`, `observaciones`, `exportacion`  
**Normativa**: CU-04, CU-11, CU-12, RN-03, RN-09, RN-10, RN-30, RN-34  

---

## 1. Declaración de Propósito (Why & What)
El propósito de esta fase es proporcionar a la Secretaria de Salud Departamental y al equipo directivo un **tablero de mando gerencial en tiempo real** que consolide el estado de las 276 metas del PAS 2026. Resuelve la necesidad de visibilidad estratégica mediante indicadores agregados, curvas de ejecución planeada vs real, alertas tempranas de metas críticas y generación de reportes oficiales (Excel y PDF) con la identidad gráfica de la Gobernación del Magdalena.

---

## 2. Historias de Usuario

### US-01: Tablero de Mando Ejecutivo (Secretaria y Directivos)
**Como** Secretaria de Salud Departamental,  
**Quiero** visualizar en una sola pantalla el avance físico global, el semáforo departamental, la ejecución presupuestal y las metas críticas en rojo,  
**Para** tomar decisiones oportunas y dirigir los comités de seguimiento con información veraz y consolidada.

### US-02: Curva de Avance Planeado vs Ejecutado
**Como** Líder de Planeación,  
**Quiero** analizar la gráfica de avance acumulado mes a mes comparando lo planeado contra lo ejecutado con respecto a la fecha de corte (30 de noviembre de 2026),  
**Para** evaluar la trayectoria de cumplimiento y proyectar el cierre de vigencia.

### US-03: Desglose y Navegación por Áreas y Componentes
**Como** Líder de Área,  
**Quiero** consultar el rendimiento de mi dependencia y hacer drill-down a los componentes y metas individuales,  
**Para** identificar qué componentes presentan retrasos y demandan refuerzo operativo.

### US-04: Observaciones Formales del Despacho
**Como** Secretaria de Salud,  
**Quiero** emitir observaciones formales directamente sobre cualquier meta o tarea operativa y recibir respuesta justificada del responsable,  
**Para** mantener trazabilidad institucional de los requerimientos emitidos desde el Despacho.

### US-05: Modo Presentación para Comités Directivos
**Como** Asistente de Despacho,  
**Quiero** activar un modo de pantalla completa con tipografía optimizada y navegación simplificada,  
**Para** proyectar el tablero durante reuniones con el Gobernador y el gabinete departamental.

### US-06: Exportación Oficial de Metas (Excel y PDF)
**Como** Funcionario o Líder,  
**Quiero** descargar una matriz completa en Excel con el estado de las 276 metas y exportar informes en PDF,  
**Para** cumplir con requerimientos de órganos de control y auditorías internas.

---

## 3. Criterios de Aceptación (Verificables)

### Criterios de Backend
- [ ] `GET /api/tablero/resumen`:
  - Retorna avance global físico calculado mediante promedio simple inmutable (RN-09, RN-10).
  - Retorna avance planeado consolidado a la fecha actual.
  - Retorna distribución exacta de semáforos: verde, amarillo, rojo.
  - Retorna presupuesto total programado, ejecutado y porcentaje financiero acumulado.
  - Conteo de tareas operativas por estado (finalizadas, en curso, vencidas).
- [ ] `GET /api/tablero/curva`:
  - Serie de 12 meses (enero-diciembre) con valor planeado acumulado, ejecutado acumulado y bandera de mes actual/corte.
- [ ] `GET /api/tablero/areas`:
  - Rendimiento por cada una de las 6 áreas con semáforo promedio y conteo de metas.
- [ ] `GET /api/tablero/alertas`:
  - Metas en rojo, metas abiertas sin reporte del mes vencido, tareas vencidas y sobrecostos.
- [ ] Módulo `observaciones` (`POST /api/observaciones`, `POST /api/observaciones/:id/atender`):
  - Creación con rol SECRETARIA/ADMIN, notificación inmediata al responsable, y respuesta obligatoria para cierre.
- [ ] Módulo `exportacion` (`GET /api/exportacion/metas.xlsx`, `GET /api/exportacion/tablero.pdf`):
  - Generación con `exceljs` aplicando estilos institucionales y descarga streaming.

### Criterios de Frontend
- [ ] Vista principal `apps/web/src/paginas/Tablero/TableroControl.tsx`:
  - 4 KPI cards con anillos circulares de progreso SVG y paleta oficial.
  - Gráfica Recharts interactiva de curvas (Planeado vs Ejecutado) con línea vertical en noviembre.
  - Gráfica de barras horizontales por área con selector para filtrar o ver componentes.
  - Tabla de alertas críticas con navegación directa a la ficha de la meta.
  - Botón de **Modo Presentación** con soporte para Fullscreen API y tema de alto contraste.
- [ ] Componente de Observaciones integrado en `FichaMeta.tsx` con hilo de conversación formal.
- [ ] Botones de exportación instantánea en barra superior del Tablero.
