# Spec 02: Metas del Plan de Salud, Motor de Cálculos y Programación

## Resumen
Carga y seguimiento de las 276 metas del Plan de Acción en Salud 2026, motor matemático de funciones puras (RN-01 a RN-10), reprogramación mensual uniforme o manual (CU-04, RN-06), asignación de responsables (CU-03) y semaforización dinámica (RN-03).

## Criterios de Aceptación (Verificados)
- [x] Carga inicial de 276 metas con validaciones de corte (30/11/2026) y vigencia 2026-2027.
- [x] Motor de cálculos puros (`apps/api/src/comun/calculos/`):
  - `calcularValorEjecutadoAcum` (cuantitativo y binario con porcentaje ponderado).
  - `calcularAvanceIndicador` (topado a 100) y `calcularAvanceIndicadorReal` (sin tope).
  - `calcularAvancePlaneado` con proyección acumulada mensual a la fecha actual.
  - `calcularSemaforoMeta` (brecha aritmética, umbral amarillo de 15 pts, rojo por fecha de corte).
  - `calcularAvanceAgregado` (promedio simple estricto según RN-09 y RN-10).
- [x] Módulo de programación mensual: distribución uniforme con absorción de residuos en el mes 12.
- [x] Ficha técnica completa de meta con visualización de curva planeada vs ejecutada.
- [x] Cobertura de pruebas unitarias Jest en `calculos.spec.ts` y `metas.service.spec.ts`.
