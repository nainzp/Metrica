# Spec 04: Tareas Operativas, Soportes, Agenda y Presencia de Despacho

## Resumen
Gestión del plan operativo de actividades vinculadas a metas (CU-07, CU-08, CU-09, CU-10), subida y descarga de archivos de soporte hasta 20 MB (RN-22), detección de cruces de agenda sin bloqueo (RN-27), ventana de reapertura de 5 días (RN-23), gestión de presencia de la Secretaria de Salud (RN-28, RN-29) y calendario interactivo (RN-30).

## Criterios de Aceptación (Verificados)
- [x] Tareas vinculadas únicamente a metas `ABIERTA` o `CUMPLIDA`, con horario en un solo día (RN-20).
- [x] Verificación de cruces de agenda (`POST /api/tareas/verificar-cruces`) detectando colisiones sin bloquear.
- [x] Finalización obligatoria con >= 1 archivo de soporte y observación >= 5 caracteres (RN-22).
- [x] Reapertura restringida a 5 días posteriores con motivo justificado (RN-23).
- [x] Cancelación justificada con bitácora de auditoría (RN-24) excluyendo la tarea del avance operativo (RN-04).
- [x] Confirmación y declinación con motivo formal de la presencia de la Secretaria (RN-28, RN-29, RN-35).
- [x] Agenda del Despacho y matriz semanal de recursos logísticos (`GET /api/agenda/recursos-semana`).
- [x] Cron nocturno (00:05) para transición automática a `EN_CURSO` o `VENCIDA` (RN-21).
- [x] Serialización global de BigInt para `tamanoBytes`.
- [x] Suite de pruebas Jest (`tareas.service.spec.ts`, 16/16) y suite E2E (`test-fase4-e2e.js`, 31/31).
