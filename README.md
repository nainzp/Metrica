# MÉTRICA — Monitoreo y Evaluación de Targets, Resultados e Indicadores para el Cumplimiento de Acciones

**Gobernación del Magdalena · Secretaría de Salud Departamental**  
*Seguimiento al Plan de Acción en Salud (PAS) — Vigencia 2026*  
*Desarrollado con el estándar metodológico INGNOVATICS Consultores S.A.S.*

---

## 📌 Descripción General

**MÉTRICA** es una plataforma web integral diseñada para la Secretaría de Salud del Departamento del Magdalena para realizar el monitoreo, seguimiento, control operativo y evaluación en tiempo real de las **276 metas** del Plan de Acción en Salud (PAS 2026), articuladas en 6 áreas misionales y 21 componentes de salud pública.

### Características Principales:
- **Tablero de Control Gerencial**: Indicadores ejecutivos en tiempo real, semaforización tricolor institucional (verde ≥ 90%, amarillo 70–89%, rojo < 70%), curvas de avance físico vs. planeado acumulado, desgloses por área y componente.
- **Plan de Metas**: Programación mensual lineal o personalizada (12 meses), reporte de valor ejecutado y costo presupuestal con trazabilidad de auditoría.
- **Gestión Operativa de Tareas y Agenda**: Ciclo de vida de tareas (Programada, En Curso, Vencida, Finalizada), control de traslapes/cruces de horarios, evidencias documentales con soporte obligatorio y agenda de presencia de la Secretaria de Salud.
- **Estructura y Usuarios**: Gestión de áreas, componentes y asignación de líderes, soporte para rol Contratista con fecha fin de contrato y control de desactivación con asignaciones activas (Regla RN-26).
- **Herramientas Administrativas**: Importador Excel con previsualización, purga controlada de datos de prueba con doble confirmación, y generador de copias de seguridad (.zip con SQL dump + soportes + manifiesto).
- **Monitoreo de Salud**: Endpoint `/api/salud` para diagnóstico continuo de conectividad a base de datos y memoria.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, TanStack React Query.
- **Backend**: NestJS 10, TypeScript, Prisma ORM, JWT, Bcrypt, Schedule (Cron jobs), ExcelJS, Puppeteer.
- **Base de Datos**: PostgreSQL 16 (modelo relacional de alta integridad).
- **Entorno de Producción**: Windows Server 2019, Internet Information Services (IIS 10) + URL Rewrite 2.1 + ARR 3.0, NSSM (Windows Service).

---

## 🚀 Inicio Rápido en Desarrollo (5 Minutos)

### Prerrequisitos
- Node.js 20 LTS o superior
- PostgreSQL 16
- Git

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/nainzp/Metrica.git
cd Metrica
npm install
```

### 2. Configurar Variables de Entorno
Crear el archivo `apps/api/.env` basándose en `apps/api/.env.ejemplo`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/metrica?schema=public"
JWT_SECRETO="tu_clave_secreta_jwt_minimo_32_caracteres_aleatorios"
RUTA_SOPORTES="./soportes"
RUTA_BACKUPS="./backups"
RUTA_LOGS="./logs"
URL_PUBLICA="http://localhost:5173"
CORREO_ACTIVO=false
```

### 3. Base de Datos y Semillas Iniciales
```bash
cd apps/api
npx prisma db push
npx prisma db seed
cd ../..
```

### 4. Iniciar Servidores de Desarrollo
```bash
# Iniciar frontend y backend en paralelo
npm run dev
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)
- **Documentación Swagger / OpenAPI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Diagnóstico de Salud**: [http://localhost:3000/api/salud](http://localhost:3000/api/salud)

### Credenciales de Acceso por Defecto:
- **Usuario Administrador**: `admin@magdalena.gov.co`
- **Contraseña Inicial**: `Admin2026*!`

---

## 📂 Estructura del Monorepo

```
Metrica/
├── .github/skills/         # Agentes y habilidades especializadas
├── .specify/               # Especificaciones y configuración del toolkit Spec-Kit
├── apps/
│   ├── api/                # Backend NestJS + Prisma ORM
│   │   ├── prisma/         # Esquema relacional, migraciones y semillas
│   │   └── src/            # Módulos de negocio (metas, tareas, tablero, etc.)
│   └── web/                # Frontend React 18 + Vite + Tailwind CSS
│       ├── public/         # web.config (IIS), favicon.svg y recursos estáticos
│       └── src/            # Páginas, componentes UI, clientes API y hooks
├── datos/                  # Cargas iniciales del Plan de Acción en Salud
├── docs/                   # Documentación funcional, manual de despliegue y decisiones
│   ├── REQUERIMIENTOS_METRICA.md
│   ├── DESPLIEGUE.md
│   └── DECISIONES.md
├── scripts/                # Scripts de automatización PowerShell para Windows Server
│   ├── verificar-entorno.ps1
│   ├── instalar.ps1
│   ├── actualizar.ps1
│   ├── backup.ps1
│   └── restaurar.ps1
└── specs/                  # Especificaciones de ingeniería por fase (Fase 1 a 7)
```

---

## 📖 Manual de Despliegue en Producción

Para el aprovisionamiento, puesta en marcha y mantenimiento en **Windows Server 2019 con IIS**, consulte la guía detallada en:
👉 [**docs/DESPLIEGUE.md**](docs/DESPLIEGUE.md)

---

## 📄 Licencia y Confidencialidad

Propiedad exclusiva de la **Gobernación del Magdalena - Secretaría de Salud**.  
Desarrollado y suministrado por **INGNOVATICS Consultores S.A.S.**  
Todos los derechos reservados © 2026.
