# Plan de Arquitectura: Fase 6

## 1. Módulos y Servicios Backend
- `apps/api/src/herramientas/`:
  - `herramientas.module.ts`: Módulo registrado en `AppModule` integrando `PrismaService`, `AuditoriaModule` y `ConfigModule`.
  - `herramientas.service.ts`: Lógica de negocio para backup (`JSZip`, exportación de tablas, manifiesto, empaquetado de soportes), conteo de datos de prueba y purga atómica con transacción Prisma.
  - `herramientas.controller.ts`: Endpoints REST con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(RolUsuario.ADMINISTRADOR)`.
  - `dto/herramientas.dto.ts`: Validación con `class-validator` para purga (`palabraConfirmacion`, `contrasena`).
  - `herramientas.service.spec.ts`: Pruebas unitarias en Jest.

## 2. Componentes Frontend
- `apps/web/src/paginas/Administracion/Herramientas.tsx`:
  - Panel de Copias de Seguridad (Generar, Lista, Descargar, Eliminar).
  - Panel de Purga Segura (Conteo en vivo, advertencia visual, modal de doble confirmación con contraseña y palabra clave).
  - Panel de Inyección de Datos de Prueba (para demostración o pruebas antes de producción).
- Actualización de navegación en `rutas.tsx` y enlace en `BarraLateral.tsx`.

## 3. Verificación
- Pruebas unitarias de `HerramientasService`.
- Prueba E2E en `scratch/test-fase6-e2e.js` que inyecte datos de prueba, cuente, genere backup, ejecute purga y verifique la integridad de los datos reales.
