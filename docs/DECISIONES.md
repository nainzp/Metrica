# Bitácora de Decisiones Arquitectónicas y Técnicas — MÉTRICA

Este archivo registra las decisiones tomadas durante la construcción del sistema según la Sección 15 del documento de requerimientos.

---

### DEC-001: Ubicación canónica de los datos de entrada
- **Fecha**: 2026-09-10
- **Contexto**: El archivo original de metas se encontraba en `docs/Metas_Plan_Salud.xlsx`, mientras que la especificación de monorepo solicita la carpeta `datos/Metas_Plan_Salud.xlsx`.
- **Decisión**: Se creó la carpeta `datos/` y se copió `Metas_Plan_Salud.xlsx` allí, preservando la copia en `docs/` para salvaguardar el paquete inicial.

### DEC-002: Puerto y configuración de desarrollo
- **Fecha**: 2026-09-10
- **Contexto**: Se requiere ejecutar la API de NestJS en el puerto 3000 y Vite en el puerto 5173 con proxy reverso para `/api`.
- **Decisión**: En desarrollo se usa Vite proxy para reenviar llamadas a `http://localhost:3000`, emulando el comportamiento que IIS ARR tendrá en producción.

### DEC-003: Arquitectura de Despliegue en Windows Server 2019
- **Fecha**: 2026-09-11
- **Contexto**: El servidor de producción corre Windows Server 2019 con IIS 10. Se requiere alta disponibilidad, reinicio automático y soporte para Single Page Application (SPA).
- **Decisión**: Se implementa arquitectura desacoplada: IIS 10 como proxy inverso frontal (URL Rewrite 2.1 + ARR 3.0) sirviendo estáticos de React y protegiendo con cabeceras de seguridad HTTP; el backend NestJS corre como Servicio de Windows gestionado con NSSM (inicio automático, reinicio ante fallos, redirección de logs).

### DEC-004: Monitoreo de Salud e Integridad (/api/salud)
- **Fecha**: 2026-09-11
- **Contexto**: Se necesita un endpoint estándar para balanceadores de carga y herramientas de monitoreo institucional sin requerir autenticación JWT.
- **Decisión**: Se implementa `SaludModule` con endpoint público `GET /api/salud` que verifica activamente la conexión a PostgreSQL con latencia milimétrica (`SELECT 1`), uso de memoria RAM (RSS, Heap) y estado de tareas cron.
