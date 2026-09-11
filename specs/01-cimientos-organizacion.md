# Spec 01: Cimientos, Monorepo y Estructura Organizacional

## Resumen
Establece la infraestructura del proyecto monorepo, modelo relacional en PostgreSQL 16 con Prisma ORM, autenticación JWT con control de roles y alcance (CU-01, CU-02), y diseño base responsive con la paleta de la Gobernación del Magdalena.

## Criterios de Aceptación (Verificados)
- [x] Monorepo estructurado con npm workspaces (`apps/api`, `apps/web`, `datos`, `docs`, `scripts`).
- [x] Base de datos PostgreSQL con esquema `metrica` y 18 tablas normalizadas.
- [x] Semilla normativa con 6 áreas, 21 componentes de SP, 19 tipos de notificación y 7 roles de usuario.
- [x] Autenticación JWT con refresh token en cookie httpOnly y hash bcrypt (costo 12).
- [x] Control de alcance de datos por rol (`AlcanceGuard`) y bitácora de auditoría append-only (`RN-34`).
- [x] Frontend React con layout colapsable, estado de sesión global y panel de administración de usuarios y estructura.
