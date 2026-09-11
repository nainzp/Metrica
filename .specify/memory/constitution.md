# Constitución del Proyecto MÉTRICA

Sistema de **Monitoreo y Evaluación de Targets, Resultados e Indicadores para el Cumplimiento de Acciones**  
**Gobernación del Magdalena · Secretaría de Salud Departamental**  
Conforme a la especificación normativa institucional [REQUERIMIENTOS_METRICA.md](file:///c:/Desarrollos/Metrica/docs/REQUERIMIENTOS_METRICA.md).

---

## Principios Fundamentales

### I. Desarrollo Guiado por Especificación (Zero Vibe-Coding)
Toda funcionalidad, endpoint, pantalla o cálculo debe derivarse formalmente de la especificación técnica y las reglas normativas institucionales. Ningún componente de código se implementa de manera heurística o sin criterios de aceptación explícitos y verificables. Los cambios arquitectónicos requieren actualización previa de la especificación correspondiente.

### II. Integridad de las Reglas Normativas de Negocio (RN-01 a RN-35)
1. **Motor de Cálculos Matemáticos Puros (`apps/api/src/comun/calculos/`)**:
   - Todas las fórmulas matemáticas (acumulados, avance de indicador, avance planeado, semaforización tricolor, avance operativo de tareas y agregaciones globales) son **funciones puras e independientes de base de datos**.
   - **Promedio Simple Inmutable (RN-09, RN-10)**: Todos los cálculos agregados a nivel de componente, área y global departamental utilizan promedio aritmético simple sobre las metas activas (`ABIERTA` y `CUMPLIDA`). No se permite ponderación presupuestal arbitraria en el avance físico.
   - **Semaforización Automática (RN-03)**:
     - Verde: Avance Indicador >= Avance Planeado (Brecha >= 0).
     - Amarillo: Avance Indicador < Avance Planeado pero dentro del umbral de 15 puntos porcentuales (Brecha entre -15 y < 0).
     - Rojo: Brecha < -15 puntos porcentuales, o cuando la fecha actual ha superado la `fechaCorte` (30/11/2026) sin alcanzar el 100%.
   - **Cobertura de Pruebas**: El motor de cálculos debe mantener una cobertura unitaria mínima del 95% con referencias explícitas a cada regla normativa.

### III. Invariantes de Arquitectura y Pila Tecnológica
- **Monorepo**: npm workspaces gestionando:
  - `apps/api`: NestJS 10, Node.js 20 LTS, TypeScript 5, Prisma ORM 5.
  - `apps/web`: React 18, Vite 6, TypeScript 5, Tailwind CSS 3, Lucide React, Recharts.
  - `datos`: Almacenamiento seguro de archivos fuente (`Metas_Plan_Salud.xlsx`) y directorio de soportes fuera de la raíz web (`datos/soportes/`).
  - `docs`: Especificación normativa, bitácora de decisiones (`DECISIONES.md`) y manuales de despliegue.
- **Base de Datos**: PostgreSQL 16 (esquema `metrica`).
  - 18 tablas normalizadas con claves foráneas, índices de rendimiento y constraints.
  - Soporte global de serialización BigInt: `(BigInt.prototype).toJSON = function() { return Number(this); }` obligatorio para campos de tamaño de archivos y auditoría.
- **Servidor de Producción Destino**: Windows Server 2019 Standard nativo (IIS 10 + URL Rewrite / ARR como Reverse Proxy, y servicio de Windows mediante NSSM para Node.js).

### IV. Estándares de Código, Nomenclatura e Identidad Visual
- **Lenguaje de Identificadores**: Todo el código, nombres de entidades, tablas, campos de base de datos, DTOs, endpoints y variables se escribe en **español estricto sin tildes ni eñes** (e.g., `reporteMensual`, `fechaCorte`, `Usuario`, `Meta`, `Tarea`, `valorEjecutado`).
- **TypeScript Estricto**: Prohibido el uso indiscriminado de `any`. Todo payload, DTO y respuesta debe contar con tipos o interfaces declaradas.
- **Identidad Visual Oficial (Gobernación del Magdalena)**:
  - Azul Marino Profundo: `#0B2A5B` (Navbar, encabezados principales, botones primarios).
  - Azul Institucional: `#1E5FD9` (Interacciones, enlaces, bordes activos).
  - Azul Hielo / Fondo: `#E8F0FB` (Fondo de contenedores, tarjetas activas).
  - Verde Esmeralda (Cumplimiento / Éxito): `#2BB673` / `#16A34A`.
  - Ámbar Institucional (Alerta / En Proceso): `#F5A623` / `#D97706`.
  - Rojo Carmesí (Crítico / Vencido): `#E5484D` / `#DC2626`.

### V. Seguridad, Alcance y Bitácora Inmutable (RN-34, RN-35)
- **Control de Acceso por Alcance (`AlcanceGuard`)**:
  - `ADMINISTRADOR` / `SECRETARIA`: Alcance Global (todas las áreas y metas).
  - `LIDER_AREA`: Alcance departamental de su área (SP, PLA, PRE, ASE, EMD, DES).
  - `LIDER_COMPONENTE`: Alcance restringido a su componente temático.
  - `FUNCIONARIO`: Alcance exclusivo sobre sus metas y tareas asignadas.
- **Auditoría Append-Only (RN-34)**:
  - Todo cambio sobre metas, reprogramaciones, reportes, correcciones, tareas y presencia se registra obligatoriamente en la tabla `auditoria` con usuario, acción, timestamp, IP y snapshot JSON de datos antes y después.
  - Prohibida la eliminación física no controlada de registros operativos.
- **Almacenamiento y Archivos de Soporte (RN-22)**:
  - Límite innegociable de 20 MB por archivo.
  - Validación de extensiones permitidas (`pdf`, `jpg`, `jpeg`, `png`, `xlsx`, `xls`, `docx`, `doc`) y tipo MIME.
  - Descarga mediante streams autenticados con verificación de permisos de lectura.

### VI. Disciplina de Verificación y Compilación Continua
- Cada fase y funcionalidad debe contar con:
  1. Pruebas unitarias en Jest (`npm --workspace=apps/api run test`).
  2. Pruebas de integración E2E con PostgreSQL real y API en vivo (`scratch/test-*.js`).
  3. Compilación limpia de TypeScript sin errores (`tsc && vite build` en frontend, `nest build` en backend).

---

## Gobernanza y Enmiendas

- La presente Constitución prevalece sobre cualquier decisión individual o práctica informal de codificación.
- Cualquier modificación a los principios aquí plasmados requiere justificación técnica fundamentada, plan de migración y validación contra los requerimientos normativos del departamento del Magdalena.

**Versión**: 1.0.0 | **Ratificada**: 2026-09-11 | **Ámbito**: Proyecto MÉTRICA (Gobernación del Magdalena)
