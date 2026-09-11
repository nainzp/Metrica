# Especificación Técnica: Fase 6 — Herramientas de Administración, Purga y Backups (CU-15, CU-16, CU-17)

## 1. Propósito y Alcance
Esta fase habilita las capacidades operativas de nivel administrativo necesarias antes de la puesta en marcha en producción:
1. **Purga Segura de Datos de Prueba (CU-16)**: Eliminación controlada y atómica de todas las entidades marcadas con `esDatoPrueba = true` garantizando:
   - Respaldo automático obligatorio previo a la purga.
   - Doble confirmación administrativa (palabra clave "BORRAR" y contraseña de administrador).
   - Inviolabilidad de la bitácora forense de auditoría y datos reales del plan.
   - Eliminación física de archivos de soporte asociados a registros de prueba.
2. **Gestión Integral de Copias de Seguridad (CU-17)**: Generación, listado y descarga de paquetes `.zip` conteniendo:
   - Respaldo estructurado de base de datos (dump SQL / exportación JSON completa).
   - Directorio de archivos físicos de soporte.
   - `manifiesto.json` con metadatos de integridad, versión, conteos y timestamps.
   - Tarea programada diaria a las 02:00 AM con política de retención.
3. **Población de Datos de Prueba Controlada (`seed-prueba`)**: Generación y marcado explícito de datos de demostración para verificar la purga.
4. **Visor y Centro de Control Frontend (`/admin/herramientas`)**: Interfaz para administración de parámetros, ejecución de backups y purga controlada.

## 2. Requerimientos Funcionales
- **RF6.1**: Endpoint `GET /api/herramientas/datos-prueba/conteo` que reporte el número exacto de registros de prueba en `meta`, `reporte_mensual`, `tarea`, `soporte` y `usuario`.
- **RF6.2**: Endpoint `POST /api/herramientas/datos-prueba/borrar` restringido a `ADMINISTRADOR`, que verifique la contraseña del usuario actual y la palabra de confirmación `BORRAR`.
- **RF6.3**: Ejecución automática de un backup completo antes de proceder con el borrado.
- **RF6.4**: Borrado en orden de integridad referencial respetando llaves foráneas y borrado de archivos físicos en disco.
- **RF6.5**: Endpoint `POST /api/herramientas/backups/generar` para generar copias completas en `datos/backups/`.
- **RF6.6**: Endpoint `GET /api/herramientas/backups` para listar copias de seguridad existentes.
- **RF6.7**: Endpoint `GET /api/herramientas/backups/:nombre/descargar` para descarga protegida por streaming de archivos `.zip`.
- **RF6.8**: Endpoint `DELETE /api/herramientas/backups/:nombre` para eliminación de copias antiguas.
- **RF6.9**: Cron job nocturno a las 02:00 AM para creación de backup automático diario y depuración de copias con más de 30 días de antigüedad.

## 3. Criterios de Aceptación
1. Intentar purgar con contraseña incorrecta o palabra diferente a "BORRAR" retorna 400 Bad Request o 401 Unauthorized sin tocar ningún dato.
2. Tras la purga, ningún registro real (`esDatoPrueba = false`) sufre modificaciones o eliminación.
3. La copia de seguridad previa se genera con éxito en el directorio `datos/backups/` y puede ser leída como un archivo ZIP válido con su `manifiesto.json`.
4. El registro de auditoría almacena el evento de purga con el detalle del administrador ejecutor.
