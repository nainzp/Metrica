# MÉTRICA — Documento de requerimientos del sistema

**Monitoreo y Evaluación de Targets, Resultados e Indicadores para el Cumplimiento de Acciones**
Gobernación del Magdalena · Secretaría de Salud
Elaborado por INGNOVATICS Consultores S.A.S. · Versión 1.0 · 10 de septiembre de 2026

> Este documento es la fuente de verdad para la construcción de MÉTRICA. Está escrito para ser entregado a un agente de desarrollo (Claude Code) y a un equipo humano. Toda decisión ya tomada está aquí; lo que no esté aquí se decide siguiendo la sección 15 (criterios de decisión por defecto).

---

## 0. Guía rápida para el agente de desarrollo

1. Lee completo este documento antes de escribir código. Las secciones 4 (modelo de datos), 5 (reglas de negocio) y 6 (cálculos) son normativas: el código debe implementarlas literalmente.
2. Stack fijo (sección 11): React 18 + TypeScript + Vite + Tailwind + Recharts en el frontend; NestJS + TypeScript + Prisma en el backend; PostgreSQL 16; despliegue nativo en Windows Server 2019.
3. Todo el código, identificadores, tablas, campos, rutas y comentarios van **en español** (sin tildes ni eñes en identificadores: `reporteMensual`, `fechaCorte`, `Meta`, `Tarea`). Textos de interfaz en español con tildes.
4. Estructura del repositorio en la sección 12. Un monorepo con `apps/api`, `apps/web`, `datos/` y `docs/`.
5. El archivo `datos/Metas_Plan_Salud.xlsx` (hoja `PLAN`) es la carga inicial real. El importador de la sección 9 debe leerlo tal cual, sin exigir cambios de estructura.
6. Las reglas de cálculo de la sección 6 deben tener pruebas unitarias antes de conectarse a la interfaz.
7. Plan de construcción día a día en la sección 13. Al terminar cada día, el sistema debe arrancar y la funcionalidad del día debe ser demostrable con datos reales.
8. Cuando encuentres una ambigüedad, aplica la sección 15 y deja una nota en `docs/DECISIONES.md` con fecha, contexto y decisión tomada.

---

## 1. Propósito y alcance

### 1.1 Propósito
MÉTRICA es una aplicación web para que la Secretaría de Salud del Magdalena haga seguimiento al Plan de Acción en Salud (PAS) de la vigencia 2026: 276 metas distribuidas en 6 áreas y 21 componentes, con fecha de corte de seguimiento el 30 de noviembre de 2026 y cierre de vigencia el 31 de diciembre de 2026.

El sistema resuelve tres problemas:
- El avance de las metas se consolida a mano en hojas de cálculo dispersas.
- Las evidencias de ejecución viven en correos y carpetas.
- La Secretaria no tiene una vista continua de cómo va el plan ni de qué está haciendo cada equipo.

### 1.2 Alcance del MVP (una semana de construcción)
Incluye: estructura organizacional, usuarios y roles; metas con programación y reporte mensual del indicador y del presupuesto; tareas con soportes y calendario; agenda del Despacho con confirmación de presencia; tablero de control con navegación descendente; notificaciones en la aplicación (correo desactivado por defecto y parametrizable); importador del Excel de metas; exportación a PDF y Excel; auditoría; parámetros; herramientas de administración (borrar datos de prueba y copia de seguridad).

No incluye (fase 2): inicio de sesión con el directorio institucional (SSO), sincronización con calendarios externos, recurrencia de tareas, firma electrónica, integración con sistemas financieros, aplicación móvil nativa, ponderación de metas por presupuesto, flujos de aprobación de varios niveles.

### 1.3 Contexto organizacional
- **Despacho**: Secretaria de Salud (un usuario) y un asistente que gestiona su agenda.
- **Áreas** (6): Salud Pública, Planeación, Prestación de Servicios, Aseguramiento, Emergencias y Desastres, Despacho (como área que también tiene metas).
- **Componentes** (subáreas, 21, todos en Salud Pública): Salud Ambiental, Laboratorio, PAI, ETV, Salud Mental, Nutrición, EDA-IRA, Vigilancia, Zoonosis, SSR, ECNT, TB-Lepra, Lepra, SAC, SOGC, DNT, PIC, Medicamentos, Registros, Jurídica y los que aparezcan en el Excel.
- Toda área y componente tiene un líder. 3 a 5 usuarios por área o componente.
- Correo institucional: dominio `@magdalena.gov.co`.

---

## 2. Vocabulario

| Término | Definición |
|---|---|
| **Meta** | Fila del Plan de Acción en Salud: una acción con un valor meta medible (columna `ACTIVIDAD` + `META` + `UNIDAD` del Excel). Es el nivel principal del sistema. |
| **Valor meta** | Cantidad que se debe alcanzar en la vigencia (`META 2026`). |
| **Unidad** | Forma de medir la meta: Número, Porcentaje, Documento, Días. |
| **Reporte mensual** | Registro, por meta y mes, del valor ejecutado en el mes y del costo ejecutado en el mes. Es la única forma de alimentar el avance del indicador. |
| **Avance del indicador** | Valor ejecutado acumulado ÷ valor meta. |
| **Avance planeado** | Lo que la programación dice que debía llevarse acumulado a una fecha. |
| **Avance operativo** | Tareas finalizadas ÷ tareas totales de la meta. |
| **Tarea** | Trabajo concreto que hace una persona para lograr una meta. Tiene fechas y, opcionalmente, hora, lugar y recursos (entonces también es un evento de agenda). |
| **Soporte** | Archivo que evidencia el cierre de una tarea o acompaña un reporte mensual. |
| **Fecha de corte** | Fecha hasta la cual se hace seguimiento y contra la cual se calcula el semáforo. Parámetro global (30/11/2026), ajustable por meta. |
| **Fecha oficial** | Fecha de fin que trae el PAS (`F_FIN`). Informativa. |
| **Responsable de la meta** | Usuario asignado a reportar la meta. Normalmente el líder del componente (Salud Pública) o del área (las demás). |
| **Despacho** | La Secretaria y su asistente. |
| **Bitácora de auditoría** | Registro inmutable de toda creación, modificación y eliminación relevante. |

---

## 3. Roles y permisos

### 3.1 Roles
Un usuario tiene exactamente un rol y pertenece a un área y, opcionalmente, a un componente.

| Rol (código) | Descripción | Alcance de datos |
|---|---|---|
| `SECRETARIA` | Jefe de la Secretaría. Un solo usuario. | Toda la Secretaría |
| `ASISTENTE_DESPACHO` | Gestiona la agenda de la Secretaria. | Toda la Secretaría en consulta; escritura solo en agenda |
| `LIDER_AREA` | Líder de un área. | Su área y todos sus componentes |
| `LIDER_COMPONENTE` | Líder de un componente. | Su componente |
| `FUNCIONARIO` | Miembro de un equipo. | Sus tareas; metas de su área o componente en consulta |
| `ADMINISTRADOR` | Soporte TIC. | Toda la configuración; no reporta avances |

### 3.2 Matriz de permisos

| Permiso (código) | SEC | ASIS | L_AREA | L_COMP | FUNC | ADMIN |
|---|---|---|---|---|---|---|
| `tablero.ver` | Global | Global | Área | Componente | Área (consulta) | Global |
| `metas.ver` | Global | Global | Área | Componente | Área | Global |
| `metas.editar` (datos básicos, fechas de corte por meta) | — | — | Área | — | — | Global |
| `metas.asignarResponsable` | — | — | Área | — | — | Global |
| `metas.programacion.editar` | — | — | Área | Propias | — | Global |
| `metas.reabrir` (meta cerrada o cumplida) | — | — | — | — | — | Global |
| `reportes.crear` | — | — | Propias | Propias | — | — |
| `reportes.corregir` (cualquier mes, con justificación) | — | — | Área | Mes en curso de propias | — | Global |
| `tareas.crear` | — | Solo con presencia de la Secretaria | Área | Componente | Propias | — |
| `tareas.editar` | — | Las que creó | Área | Componente | Propias no finalizadas | — |
| `tareas.finalizar` | — | — | Propias | Propias | Propias | — |
| `tareas.reabrir` (5 días) | — | — | Área | Componente | — | Global |
| `agenda.confirmarPresencia` | Sí | Sí | — | — | — | — |
| `observaciones.crear` | Sí | — | — | — | — | — |
| `observaciones.atender` | — | — | Responsable | Responsable | Responsable | — |
| `exportar.pdf` / `exportar.excel` | Global | Global | Área | Componente | — | Global |
| `admin.estructura` (áreas, componentes, usuarios) | — | — | — | — | — | Sí |
| `admin.catalogos` (unidades, poblaciones, fuentes, recursos, tipos de notificación) | — | — | — | — | — | Sí |
| `admin.parametros` | — | — | — | — | — | Sí |
| `admin.importar` | — | — | — | — | — | Sí |
| `admin.borrarDatosPrueba` | — | — | — | — | — | Sí |
| `admin.backup` | — | — | — | — | — | Sí |
| `auditoria.ver` | Sí | — | Área | — | — | Sí |

Reglas de alcance:
- "Área" significa el área del usuario y todos sus componentes. "Componente" significa solo su componente. "Propias" significa metas o tareas donde el usuario es el responsable.
- En áreas sin componentes, el `LIDER_AREA` es normalmente el responsable de las metas.
- Nada impide asignar una meta a un `FUNCIONARIO`; en ese caso el funcionario obtiene `reportes.crear` sobre esa meta.
- El backend valida permisos en cada endpoint (guard por rol + verificación de alcance sobre el recurso). El frontend solo oculta acciones; nunca es la única barrera.

---

## 4. Modelo de datos

Base de datos PostgreSQL 16. Esquema `metrica`. Nombres de tablas y campos en español, `snake_case`. Claves primarias `id` UUID (generadas con `gen_random_uuid()`). Todas las tablas tienen `creado_en`, `actualizado_en` (timestamptz) y, donde aplica, `creado_por`, `actualizado_por` (UUID de usuario). Borrado lógico solo donde se indica (`activo boolean`).

### 4.1 Diagrama de entidades

```
area 1──* componente
area 1──* usuario *──0..1 componente
usuario *──1 rol (enum)
area 1──* meta *──0..1 componente
meta *──1 usuario (responsable)          meta 1──* programacion_meta (12 filas)
meta 1──* reporte_mensual *──0..* soporte
meta 1──* tarea *──1 usuario (responsable)
tarea 1──* soporte                        tarea *──* recurso (tarea_recurso)
meta 1──* observacion ; tarea 1──* observacion
usuario 1──* notificacion
parametro (clave/valor) ; tipo_notificacion ; auditoria
catalogo: unidad_medida, poblacion_sujeto, fuente_recurso, recurso, categoria_tarea
```

### 4.2 Tablas

#### `area`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| codigo | varchar(20) unique | `SP`, `PLA`, `PRE`, `ASE`, `EMD`, `DES` |
| nombre | varchar(120) | |
| lider_id | uuid FK usuario null | |
| activo | boolean default true | |

#### `componente`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| area_id | uuid FK area | |
| codigo | varchar(20) | unique junto con area_id |
| nombre | varchar(120) | |
| lider_id | uuid FK usuario null | |
| activo | boolean | |

#### `usuario`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | varchar(150) | |
| correo | varchar(150) unique | minúsculas; validar dominio configurable (`@magdalena.gov.co` por defecto, no obligatorio) |
| hash_clave | varchar(255) | bcrypt, costo 12 |
| rol | enum rol_usuario | `SECRETARIA, ASISTENTE_DESPACHO, LIDER_AREA, LIDER_COMPONENTE, FUNCIONARIO, ADMINISTRADOR` |
| area_id | uuid FK area | obligatorio |
| componente_id | uuid FK componente null | obligatorio si rol = LIDER_COMPONENTE; permitido para FUNCIONARIO |
| cargo | varchar(120) null | |
| activo | boolean | un usuario con metas o tareas abiertas a cargo no puede desactivarse |
| recibe_correo | boolean default true | preferencia personal, aplica solo si el envío global está activo |
| ultimo_acceso | timestamptz null | |
| token_recuperacion | varchar(255) null | + `token_expira` |
| es_dato_prueba | boolean default false | ver 10.3 |

Restricción: solo puede existir un usuario activo con rol `SECRETARIA`.

#### Catálogos
`unidad_medida (id, codigo, nombre, es_binaria boolean)` — semilla: Número (no binaria), Porcentaje (no binaria), Documento (binaria), Días (no binaria).
`poblacion_sujeto (id, nombre)` — se puebla en la importación normalizando el texto del Excel.
`fuente_recurso (id, codigo, nombre)` — semilla desde el Excel: `1.2.4.2.02 / SGP-SALUD-SALUD PUBLICA`, `1.2.4.2.01 / SGP-SALUD-REGIMEN SUBSIDIADO`, `RP / RECURSOS PROPIOS`.
`recurso (id, nombre, activo)` — semilla: Sala de juntas, Auditorio, Vehículo, Refrigerios, Equipo audiovisual, Papelería, Transporte fluvial.
`categoria_tarea (id, nombre, activo)` — semilla: Reunión, Jornada, Capacitación, Visita, Documento, Gestión, Otro.

#### `meta`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| codigo | varchar(20) unique | el `ID` del Excel, como texto |
| descripcion | text | `ACTIVIDAD` del Excel |
| unidad_id | uuid FK unidad_medida | |
| valor_meta | numeric(14,2) | `META 2026`; para Porcentaje, 1 = 100 % |
| fecha_inicio | date | `F_INICIO` |
| fecha_fin_oficial | date | `F_FIN` |
| fecha_corte | date | por defecto = parámetro `fecha_corte_global`; si `fecha_fin_oficial` < parámetro, = `fecha_fin_oficial`. Editable por LIDER_AREA/ADMIN |
| area_id | uuid FK area | |
| componente_id | uuid FK componente null | |
| responsable_id | uuid FK usuario null | null ⇒ estado `PENDIENTE_COMPLETAR` |
| fuente_recurso_id | uuid FK null | |
| presupuesto_programado | numeric(16,2) null | `PRESUPUESTO`, en pesos |
| poblacion_sujeto_id | uuid FK null | |
| estado | enum estado_meta | `PENDIENTE_COMPLETAR, ABIERTA, CUMPLIDA, CERRADA_SIN_CUMPLIR` |
| distribucion_uniforme | boolean default true | false cuando el responsable editó la programación |
| observaciones_importacion | text null | advertencias de la carga |
| es_dato_prueba | boolean default false | |

Campos calculados (no se guardan; se calculan en consulta o en una vista materializada `vw_meta_avance` refrescada tras cada reporte): `valor_ejecutado_acum`, `costo_ejecutado_acum`, `avance_indicador`, `avance_planeado`, `avance_operativo`, `semaforo`, `total_tareas`, `tareas_finalizadas`, `ultimo_mes_reportado`, `tiene_observacion_pendiente`.

#### `programacion_meta`
Una fila por meta y mes de la vigencia (enero a diciembre 2026 = 12 filas). Se crea al crear o importar la meta.
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| meta_id | uuid FK | |
| anio | smallint | 2026 |
| mes | smallint | 1..12 |
| valor_programado | numeric(14,2) | valor a ejecutar **en ese mes** (no acumulado) |
| unique(meta_id, anio, mes) | | |

Generación uniforme (ver 6.2): meses entre `fecha_inicio` y `fecha_corte` reciben `valor_meta / n_meses`, con el último mes absorbiendo el redondeo; los demás meses reciben 0. Si un mes tiene reportes históricos que superan la programación, no se altera.

#### `reporte_mensual`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| meta_id | uuid FK | |
| anio, mes | smallint | unique(meta_id, anio, mes) |
| valor_ejecutado | numeric(14,2) default 0 | ejecutado **en el mes** |
| costo_ejecutado | numeric(16,2) default 0 | ejecutado **en el mes**, pesos |
| porcentaje_binario | numeric(5,2) null | solo para unidades binarias: 0..100, permite avance intermedio con justificación |
| observacion | text | obligatoria si `porcentaje_binario` entre 1 y 99, si costo acumulado > presupuesto, o si es corrección |
| origen | enum | `CARGA_INICIAL, MANUAL, CORRECCION` |
| reportado_por | uuid FK usuario | |
| reportado_en | timestamptz | |
| es_dato_prueba | boolean | |

Correcciones: no se crean filas nuevas; se actualiza la fila y la bitácora guarda `valor_anterior`, `valor_nuevo`, `motivo`.

#### `tarea`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| meta_id | uuid FK | |
| titulo | varchar(200) | |
| descripcion | text null | |
| fase | varchar(80) null | agrupador libre |
| categoria_id | uuid FK categoria_tarea null | |
| responsable_id | uuid FK usuario | |
| fecha_inicio | date | |
| fecha_fin | date | ≥ fecha_inicio |
| hora_inicio | time null | si tiene hora, `hora_fin` obligatoria y > hora_inicio |
| hora_fin | time null | |
| lugar | varchar(150) null | |
| requiere_secretaria | boolean default false | |
| estado_presencia | enum null | `PENDIENTE, CONFIRMADA, DECLINADA` (solo si requiere_secretaria) |
| motivo_declinacion | text null | |
| estado | enum estado_tarea | `PROGRAMADA, EN_CURSO, VENCIDA, FINALIZADA, CANCELADA` |
| finalizada_en | timestamptz null | |
| finalizada_por | uuid null | |
| observacion_cierre | text null | |
| reabierta_en / reabierta_por / motivo_reapertura | | |
| creado_por | uuid | |
| es_dato_prueba | boolean | |

`tarea_recurso (tarea_id, recurso_id, cantidad smallint default 1, nota varchar(150))`.

#### `soporte`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tarea_id | uuid FK null | exactamente uno de `tarea_id` / `reporte_id` no nulo |
| reporte_id | uuid FK null | |
| nombre_original | varchar(255) | |
| nombre_almacenado | varchar(255) | UUID + extensión |
| ruta | varchar(500) | relativa a `RUTA_SOPORTES` |
| tipo_mime | varchar(100) | permitidos: pdf, jpg, jpeg, png, xlsx, xls, docx, doc |
| tamano_bytes | bigint | ≤ parámetro `tamano_max_soporte_mb` |
| subido_por | uuid | |
| subido_en | timestamptz | |

#### `observacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| meta_id | uuid FK null | uno de los dos |
| tarea_id | uuid FK null | |
| texto | text | |
| autor_id | uuid | siempre la Secretaria |
| atendida | boolean default false | |
| respuesta | text null | |
| atendida_por / atendida_en | | |

#### `tipo_notificacion`
| Campo | Tipo | Notas |
|---|---|---|
| codigo | varchar(50) PK | ver sección 8 |
| nombre | varchar(120) | |
| descripcion | text | |
| es_alerta | boolean | las alertas no las puede silenciar el usuario en la aplicación |
| envia_correo | boolean default false | lo activa el administrador; solo tiene efecto si `correo_activo = true` |

#### `notificacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK | |
| tipo_codigo | varchar(50) FK | |
| titulo | varchar(200) | |
| mensaje | text | |
| enlace | varchar(300) null | ruta interna (`/metas/{id}`) |
| leida | boolean default false | |
| leida_en | timestamptz null | |
| correo_enviado | boolean default false | |
| correo_error | text null | |
| creada_en | timestamptz | |

#### `parametro`
`(clave varchar(60) PK, valor text, tipo enum(texto, numero, fecha, booleano, json), descripcion text, editable boolean)`. Semilla en sección 10.1.

#### `auditoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| fecha | timestamptz | |
| usuario_id | uuid null | null en procesos automáticos |
| accion | varchar(60) | `CREAR, ACTUALIZAR, ELIMINAR, CORREGIR_REPORTE, REABRIR_TAREA, REABRIR_META, CONFIRMAR_PRESENCIA, DECLINAR_PRESENCIA, IMPORTAR, BORRAR_DATOS_PRUEBA, BACKUP, LOGIN, LOGIN_FALLIDO, CAMBIO_PARAMETRO` |
| entidad | varchar(60) | nombre de tabla |
| entidad_id | uuid null | |
| datos_antes | jsonb null | |
| datos_despues | jsonb null | |
| motivo | text null | obligatorio en correcciones y reaperturas |
| ip | varchar(45) null | |

La tabla es de solo inserción: el rol de base de datos de la aplicación no tiene `UPDATE` ni `DELETE` sobre ella.

### 4.3 Índices
- `meta(area_id, componente_id, estado)`, `meta(responsable_id)`, `meta(codigo)`.
- `reporte_mensual(meta_id, anio, mes)` unique.
- `tarea(responsable_id, fecha_inicio, fecha_fin)`, `tarea(meta_id, estado)`, `tarea(requiere_secretaria, estado_presencia)`.
- `notificacion(usuario_id, leida, creada_en desc)`.
- `auditoria(entidad, entidad_id)`, `auditoria(fecha desc)`.

---

## 5. Reglas de negocio

Cada regla tiene código. El código debe referenciarlo en comentarios y en los nombres de las pruebas (`RN-03 semaforo amarillo`).

### Metas y avance
- **RN-01** El avance del indicador de una meta es `valor_ejecutado_acum / valor_meta`, expresado en porcentaje y **topado en 100** para todo cálculo agregado. La ficha muestra el valor real cuando lo supera ("100 % — ejecutado 397 de 300").
- **RN-02** El avance planeado a una fecha es la suma de `valor_programado` de los meses cuyo último día es ≤ la fecha, dividida por `valor_meta`, topado en 100.
- **RN-03** Semáforo de meta: `CUMPLIDA` ⇒ verde. Si no: `brecha = avance_indicador − avance_planeado`. Verde si brecha ≥ 0; amarillo si `−umbral_amarillo ≤ brecha < 0`; rojo si brecha < −umbral_amarillo o si `hoy > fecha_corte` y avance < 100. `umbral_amarillo` es parámetro (15).
- **RN-04** El avance operativo es `tareas FINALIZADAS / tareas no CANCELADAS`. Sin tareas ⇒ se muestra "sin tareas", no 0 %. Nunca sustituye al avance del indicador.
- **RN-05** Una meta pasa a `CUMPLIDA` automáticamente cuando `valor_ejecutado_acum ≥ valor_meta` (o `porcentaje_binario = 100` en unidades binarias). Vuelve a `ABIERTA` si una corrección baja el acumulado por debajo de la meta.
- **RN-06** Al pasar la `fecha_corte` sin cumplir, la meta pasa a `CERRADA_SIN_CUMPLIR` en el proceso nocturno. Solo `ADMINISTRADOR` puede reabrirla (`REABRIR_META` en auditoría con motivo).
- **RN-07** Una meta sin responsable está en `PENDIENTE_COMPLETAR`: visible para el líder de área y el Despacho, no admite reportes ni tareas, no cuenta en promedios de avance pero sí en el conteo "pendientes de completar".
- **RN-08** Para unidades binarias (Documento, Porcentaje con `valor_meta = 1`) el reporte mensual registra `porcentaje_binario` 0..100. Un valor entre 1 y 99 exige observación.
- **RN-09** El avance global (Secretaría, área, componente) es el **promedio simple** del avance del indicador (topado) de las metas en estado `ABIERTA`, `CUMPLIDA` o `CERRADA_SIN_CUMPLIR`. El avance planeado global es el promedio simple de los avances planeados de las mismas metas.
- **RN-10** El semáforo agregado (área, componente, global) aplica RN-03 sobre los promedios.

### Reporte mensual
- **RN-11** Solo existe un reporte por meta y mes. Registrar el mismo mes dos veces es una corrección, no un reporte nuevo.
- **RN-12** Solo el responsable de la meta (y el `LIDER_AREA` de su área, y `ADMINISTRADOR`) puede crear reportes. El mes de reporte debe ser ≤ mes actual y ≥ mes de `fecha_inicio`.
- **RN-13** La corrección de cualquier mes por `LIDER_AREA` o `ADMINISTRADOR` exige `motivo` y genera auditoría `CORREGIR_REPORTE` con valores antes y después. El `LIDER_COMPONENTE` solo corrige el mes en curso de sus metas, también con motivo.
- **RN-14** Si `costo_ejecutado_acum > presupuesto_programado`, el reporte exige observación y la meta se marca "gasto sobre presupuesto".
- **RN-15** Alerta de gasto sobre avance: si `(costo_acum / presupuesto) − avance_indicador > umbral_gasto_sobre_avance` (parámetro, 20 puntos) se genera notificación `GASTO_SOBRE_AVANCE` a líder de área y Despacho. Metas sin presupuesto no evalúan esta regla.
- **RN-16** Del día 1 al día `dia_recordatorio_2` (4) de cada mes el sistema recuerda al responsable las metas `ABIERTA` sin reporte del mes anterior; desde el día `dia_alerta_lider` (6) avisa también al líder de área y la meta aparece en "sin reporte" del tablero.
- **RN-17** Metas `CUMPLIDA` y `CERRADA_SIN_CUMPLIR` no exigen reporte mensual, pero admiten reportes de costo si el responsable lo necesita (con observación).

### Programación
- **RN-18** Al crear o importar una meta se genera la programación uniforme (6.2). Cambiar `fecha_inicio` o `fecha_corte` regenera la programación **solo si** `distribucion_uniforme = true`.
- **RN-19** La programación editada manualmente debe sumar exactamente `valor_meta`; el formulario muestra la diferencia y no guarda hasta que sea 0. Para unidades binarias la programación es 100 % en el mes de `fecha_corte` (o el que elija el responsable).

### Tareas
- **RN-20** Toda tarea pertenece a una meta en estado `ABIERTA` o `CUMPLIDA`. `fecha_fin ≥ fecha_inicio`. Si tiene `hora_inicio`, `fecha_inicio = fecha_fin` (una tarea con hora es de un solo día) y `hora_fin > hora_inicio`.
- **RN-21** Estados automáticos (proceso nocturno 00:05 y al consultar): `PROGRAMADA` si `hoy < fecha_inicio`; `EN_CURSO` si `fecha_inicio ≤ hoy ≤ fecha_fin`; `VENCIDA` si `hoy > fecha_fin` y no está `FINALIZADA` ni `CANCELADA`.
- **RN-22** Finalizar una tarea exige al menos un soporte y una observación de cierre. Finalizar es inmediato (no hay aprobación previa).
- **RN-23** `LIDER_AREA`, `LIDER_COMPONENTE` (su alcance) y `ADMINISTRADOR` pueden reabrir una tarea finalizada dentro de `dias_reapertura_tarea` (5) días con motivo. La tarea vuelve al estado que le corresponda por fechas y el responsable es notificado. Los soportes no se borran.
- **RN-24** Cancelar una tarea exige motivo; una tarea cancelada no cuenta en el avance operativo.
- **RN-25** Reasignar una tarea o una meta conserva el historial; se registra en auditoría y se notifica al nuevo responsable.
- **RN-26** No se puede desactivar un usuario con metas `ABIERTA`/`PENDIENTE_COMPLETAR` ni tareas no finalizadas a cargo; el sistema lista lo que hay que reasignar.

### Agenda y presencia de la Secretaria
- **RN-27** Al guardar una tarea con hora, el sistema busca cruces: otras tareas con hora del mismo responsable en la misma fecha con `hora_inicio < hora_fin' AND hora_fin > hora_inicio'`; y si `requiere_secretaria`, tareas con `requiere_secretaria = true` y `estado_presencia = CONFIRMADA` en esa franja. Muestra los cruces y exige confirmación explícita ("Guardar de todas formas"). **Nunca bloquea.**
- **RN-28** Una tarea con `requiere_secretaria = true` nace con `estado_presencia = PENDIENTE` y notifica al Despacho. `SECRETARIA` o `ASISTENTE_DESPACHO` la confirman o declinan (declinar exige motivo). Si se cambia fecha u hora después de confirmada, vuelve a `PENDIENTE`.
- **RN-29** Al confirmar una presencia que se cruza con otra confirmada, se notifica `CRUCE_AGENDA_DESPACHO` al Despacho; no se bloquea.
- **RN-30** El calendario colorea por estado: PROGRAMADA gris, EN_CURSO azul, VENCIDA rojo, FINALIZADA verde, CANCELADA tachada; las de presencia de la Secretaria llevan marca distintiva y borde ámbar si `PENDIENTE`.

### Observaciones del Despacho
- **RN-31** Solo `SECRETARIA` crea observaciones. Se notifica al responsable y al líder de área. La meta o tarea muestra "observación pendiente" hasta que el responsable la marque atendida con respuesta; entonces se notifica a la Secretaria.

### Notificaciones y correo
- **RN-32** Toda notificación se crea en la aplicación. El correo se envía solo si `correo_activo = true` (parámetro global, por defecto `false`), el tipo tiene `envia_correo = true` y el usuario tiene `recibe_correo = true` (esta última preferencia no aplica a tipos con `es_alerta = true`).
- **RN-33** El envío de correo es asíncrono y no bloquea la operación que lo originó. Un fallo de correo se registra en `notificacion.correo_error` y no se reintenta más de 3 veces.

### Auditoría y seguridad
- **RN-34** Se audita: creación, edición y eliminación de metas, reportes, tareas, usuarios, áreas, componentes, parámetros; correcciones; reaperturas; confirmaciones de presencia; importaciones; backups; borrado de datos de prueba; inicios de sesión.
- **RN-35** Las acciones ejecutadas por `ASISTENTE_DESPACHO` quedan a su nombre, nunca a nombre de la Secretaria.

---

## 6. Especificación de cálculos

Implementar en `apps/api/src/comun/calculos/` como funciones puras con pruebas unitarias.

### 6.1 Acumulados
```
valorEjecutadoAcum(meta, hastaAnioMes) = Σ reporte.valor_ejecutado  donde (anio,mes) ≤ hastaAnioMes
costoEjecutadoAcum(meta, hastaAnioMes)  = Σ reporte.costo_ejecutado  donde (anio,mes) ≤ hastaAnioMes
```
Para unidades binarias, `valorEjecutadoAcum = max(porcentaje_binario) / 100 * valor_meta`.

### 6.2 Programación uniforme
```
meses = lista de (anio, mes) desde mes(fecha_inicio) hasta mes(fecha_corte), inclusive
n = |meses|
cuota = redondear(valor_meta / n, 2)
valor_programado[mes_i] = cuota para i < n-1
valor_programado[mes_{n-1}] = valor_meta − cuota*(n−1)   // absorbe el redondeo
valor_programado[otros meses de 2026] = 0
```
Excepción: si `fecha_inicio` es anterior a 2026-01-01, se usa enero de 2026 como primer mes.

### 6.3 Avance planeado a una fecha
```
avancePlaneado(meta, fecha) = min(100, 100 * Σ valor_programado[m] / valor_meta) para m con ultimoDia(m) ≤ fecha
```
Si `fecha < ultimoDia(mes(fecha_inicio))` ⇒ 0.

### 6.4 Avance del indicador
```
avanceIndicador(meta) = min(100, 100 * valorEjecutadoAcum(meta, mesActual) / valor_meta)
avanceIndicadorReal(meta) = 100 * valorEjecutadoAcum / valor_meta   // sin tope, solo para la ficha
```

### 6.5 Semáforo (RN-03)
```
semaforo(meta):
  si estado = CUMPLIDA → VERDE
  si hoy > fecha_corte y avance < 100 → ROJO
  brecha = avanceIndicador − avancePlaneado(hoy)
  si brecha ≥ 0 → VERDE
  si brecha ≥ −umbral_amarillo → AMARILLO
  si no → ROJO
```

### 6.6 Curva de avance (tablero)
Para cada mes m de enero a diciembre 2026, sobre el conjunto de metas filtrado:
```
planeado[m]  = promedio( avancePlaneado(meta, ultimoDia(m)) )
ejecutado[m] = promedio( min(100, 100 * valorEjecutadoAcum(meta, m) / valor_meta) )   solo si m ≤ mes actual
```
Se traza planeado hasta diciembre y ejecutado hasta el mes actual, con línea vertical en la fecha de corte.

### 6.7 Agregados por área y componente
Promedio simple (RN-09) sobre metas `ABIERTA, CUMPLIDA, CERRADA_SIN_CUMPLIR` del alcance. Además: total de metas, cumplidas, por semáforo, sin reporte del mes, pendientes de completar, presupuesto programado, costo ejecutado acumulado, avance operativo agregado = `Σ tareas finalizadas / Σ tareas no canceladas`.

### 6.8 Ejecución presupuestal
```
ejecucionPresupuestal = 100 * Σ costoEjecutadoAcum / Σ presupuesto_programado   (solo metas con presupuesto)
```

### 6.9 Fecha y hora
Zona horaria fija `America/Bogota` en servidor y cliente. "Hoy" se calcula en esa zona. Todas las fechas de negocio son `date`; los instantes de auditoría, `timestamptz`.

---

## 7. Casos de uso

Formato: actor, precondiciones, flujo principal, flujos alternos, poscondiciones, reglas aplicables.

### CU-01 Iniciar sesión
- **Actor**: cualquier usuario activo.
- **Flujo**: ingresa correo y clave → el sistema valida (bcrypt) → emite JWT de acceso (8 h) y de refresco (7 días, cookie httpOnly) → registra `LOGIN` → redirige al tablero de su alcance.
- **Alternos**: clave incorrecta ⇒ mensaje genérico, `LOGIN_FALLIDO`; 5 fallos en 15 min ⇒ bloqueo de 15 min. Usuario inactivo ⇒ "Cuenta inactiva, contacte al administrador". "Olvidé mi clave" ⇒ correo con enlace de 1 h (este correo se envía aunque `correo_activo = false`, porque es operativo; si no hay SMTP configurado, el administrador restablece la clave manualmente).

### CU-02 Importar metas desde Excel
- **Actor**: ADMINISTRADOR. **Precondición**: áreas y usuarios cargados.
- **Flujo**: sube `.xlsx` → el sistema lee la hoja `PLAN` → valida fila por fila (sección 9) → muestra vista previa con conteo de correctas, con advertencia y con error, y el detalle por fila → el administrador confirma → se crean o actualizan metas (por `codigo`), su programación y el reporte histórico → se muestra el informe final descargable en Excel → auditoría `IMPORTAR`.
- **Alternos**: hoja `PLAN` no existe ⇒ error sin procesar. Columnas obligatorias faltantes ⇒ error indicando cuáles. Filas con error no se cargan; el resto sí.
- **Poscondición**: metas visibles en el tablero con estado `ABIERTA` o `PENDIENTE_COMPLETAR`; metas cuyo acumulado ≥ meta quedan `CUMPLIDA`.

### CU-03 Asignar responsable de meta
- **Actor**: LIDER_AREA de esa área, ADMINISTRADOR.
- **Flujo**: abre la meta → elige usuario del área (o componente) → guarda → la meta pasa de `PENDIENTE_COMPLETAR` a `ABIERTA` si ya tenía el resto de datos → notificación `META_ASIGNADA` → auditoría.
- **Alternos**: usuario inactivo no aparece. Reasignación: se conserva el anterior en auditoría.

### CU-04 Editar programación mensual
- **Actor**: responsable de la meta, LIDER_AREA, ADMINISTRADOR.
- **Flujo**: abre "Programación" en la ficha → ve 12 meses con valor programado y ejecutado → edita valores → el formulario muestra suma y diferencia con `valor_meta` → guarda cuando diferencia = 0 → `distribucion_uniforme = false` → recalcula semáforo.
- **Alternos**: "Restablecer distribución uniforme" regenera y vuelve a `true`.

### CU-05 Registrar reporte mensual
- **Actor**: responsable de la meta, LIDER_AREA.
- **Precondición**: meta `ABIERTA`; mes ≤ mes actual; sin reporte previo en ese mes (si lo hay, es CU-06).
- **Flujo**: desde "Mis metas → pendientes de reporte" o desde la ficha, elige el mes → ingresa valor ejecutado del mes, costo ejecutado del mes, observación, soportes opcionales → el sistema muestra en vivo el nuevo acumulado, avance y semáforo → guarda → recalcula → si acumulado ≥ meta ⇒ `CUMPLIDA` y notificación `META_CUMPLIDA` → si RN-14/RN-15 aplican, exige observación y notifica.
- **Alternos**: unidad binaria ⇒ campo `porcentaje_binario` en vez de valor; 1..99 exige observación. Valor negativo ⇒ rechazado. Mes futuro ⇒ rechazado.

### CU-06 Corregir un reporte
- **Actor**: LIDER_AREA (cualquier mes), LIDER_COMPONENTE (mes en curso de sus metas), ADMINISTRADOR.
- **Flujo**: abre el reporte → edita valores → escribe motivo (obligatorio) → guarda → `origen = CORRECCION` → auditoría `CORREGIR_REPORTE` con antes/después/motivo → recalcula estado de la meta (RN-05 en ambas direcciones) → notifica `REPORTE_CORREGIDO` al responsable.

### CU-07 Crear tarea
- **Actor**: LIDER_AREA, LIDER_COMPONENTE, FUNCIONARIO (propia), ASISTENTE_DESPACHO (solo con presencia de la Secretaria).
- **Flujo**: desde la meta o desde el calendario → título, responsable (dentro del alcance), fechas, opcional: hora, lugar, categoría, fase, recursos, "requiere presencia de la Secretaria" → si hay hora, el sistema evalúa cruces (RN-27) y los muestra → guarda (o "guardar de todas formas") → estado por fechas (RN-21) → notificación `TAREA_ASIGNADA` → si requiere Secretaria, `SOLICITUD_PRESENCIA` al Despacho.
- **Alternos**: meta no `ABIERTA`/`CUMPLIDA` ⇒ no permite. Responsable fuera del alcance ⇒ no aparece en la lista.

### CU-08 Finalizar tarea
- **Actor**: responsable de la tarea.
- **Flujo**: abre la tarea → adjunta uno o más soportes → escribe observación de cierre → "Finalizar" → estado `FINALIZADA`, `finalizada_en` → recalcula avance operativo → notificación `TAREA_FINALIZADA` al líder.
- **Alternos**: sin soporte ⇒ el botón está deshabilitado y el mensaje indica por qué. Archivo no permitido o > tamaño ⇒ rechazado con mensaje.

### CU-09 Reabrir tarea
- **Actor**: LIDER_AREA, LIDER_COMPONENTE, ADMINISTRADOR. **Precondición**: `FINALIZADA` hace ≤ `dias_reapertura_tarea`.
- **Flujo**: "Reabrir" → motivo → la tarea vuelve al estado por fechas → notificación `TAREA_REABIERTA` → auditoría.

### CU-10 Confirmar o declinar presencia de la Secretaria
- **Actor**: SECRETARIA, ASISTENTE_DESPACHO.
- **Flujo**: desde "Esperan confirmación" o desde la tarea → Confirmar ⇒ `CONFIRMADA`; si se cruza con otra confirmada, notificación `CRUCE_AGENDA_DESPACHO` → Declinar ⇒ motivo obligatorio, `DECLINADA` → notificación `PRESENCIA_RESPONDIDA` al organizador → auditoría a nombre de quien actuó (RN-35).

### CU-11 Registrar observación del Despacho
- **Actor**: SECRETARIA.
- **Flujo**: desde la ficha de meta o tarea → texto → guarda → notificación `OBSERVACION_DESPACHO` a responsable y líder → aparece en tablero "observaciones pendientes".
- **Atender** (responsable): respuesta → `atendida = true` → notificación `OBSERVACION_ATENDIDA` a la Secretaria.

### CU-12 Consultar tablero
- **Actor**: todos según alcance.
- **Flujo**: carga el tablero con el alcance del rol → aplica filtros (área, componente, responsable, fuente, población, unidad, estado, semáforo) → todos los bloques responden al filtro → clic en cualquier cifra abre la lista que la compone → clic en la lista abre la ficha.
- **Modo presentación**: oculta navegación, agranda tipografía, se sale con Esc.

### CU-13 Exportar
- **PDF del tablero**: con filtros aplicados, encabezado institucional, fecha y hora de datos. Generado en servidor con Puppeteer a partir de una ruta `/imprimir/tablero?...` del frontend.
- **Excel de metas**: columnas del sistema (código, descripción, unidad, valor meta, área, componente, responsable, fechas, presupuesto, ejecutado acumulado, costo acumulado, avance indicador, avance planeado, semáforo, estado, tareas totales, tareas finalizadas, último mes reportado). Respeta el alcance y los filtros.

### CU-14 Gestionar estructura y usuarios
- **Actor**: ADMINISTRADOR.
- Áreas y componentes: crear, editar, activar/desactivar, asignar líder. Usuarios: crear (clave inicial generada y mostrada una vez), editar, activar/desactivar (RN-26), restablecer clave. Importación de usuarios desde Excel (hoja `Usuarios`: nombre, correo, rol, área, componente).

### CU-15 Administrar parámetros y correo
- **Actor**: ADMINISTRADOR.
- Edita parámetros (10.1) con validación de tipo. Interruptor `correo_activo`; si está activo, tabla de tipos de notificación con casilla `envia_correo` y botón "Enviar correo de prueba". Todo cambio queda en auditoría `CAMBIO_PARAMETRO`.

### CU-16 Borrar datos de prueba
- **Actor**: ADMINISTRADOR. **Ubicación**: Parámetros → Herramientas.
- **Flujo**: el sistema muestra cuántos registros tienen `es_dato_prueba = true` por tabla (metas, reportes, tareas, soportes, usuarios, notificaciones) → el administrador escribe la palabra `BORRAR` y su clave actual → confirmación final → se ejecuta en transacción: elimina en orden soportes (archivos y filas), notificaciones, observaciones, tarea_recurso, tareas, reportes, programación, metas, usuarios marcados (si no son el usuario actual) → auditoría `BORRAR_DATOS_PRUEBA` con conteos → resumen en pantalla.
- **Controles**: solo si el parámetro `entorno` ≠ `PRODUCCION` o si se marca explícitamente "Entiendo que este es el entorno de producción"; se genera un backup automático antes de borrar (CU-17); las filas de auditoría nunca se borran; los registros reales (`es_dato_prueba = false`) nunca se tocan.
- Marcado de datos de prueba: todo registro creado mientras el parámetro `modo_datos_prueba = true` se marca automáticamente; además, el formulario de importación tiene la casilla "Cargar como datos de prueba".

### CU-17 Copia de seguridad y restauración
- **Actor**: ADMINISTRADOR. **Ubicación**: Parámetros → Herramientas.
- **Backup**: "Generar copia" ⇒ el servidor ejecuta `pg_dump -Fc` de la base y comprime la carpeta de soportes en un `.zip` con nombre `metrica_backup_AAAAMMDD_HHMM.zip` que contiene `base.dump`, `soportes/` y `manifiesto.json` (versión de la aplicación, fecha, conteos por tabla). Se guarda en `RUTA_BACKUPS` y se ofrece para descarga. Auditoría `BACKUP`. Se listan las copias existentes con tamaño y fecha; se pueden descargar o eliminar (con confirmación).
- **Restaurar**: solo mediante el script `scripts/restaurar.ps1 <archivo.zip>` ejecutado en el servidor (no desde la interfaz, por seguridad). El script detiene el servicio, restaura con `pg_restore --clean`, repone la carpeta de soportes y reinicia el servicio.
- **Backup automático**: tarea programada diaria 02:00 (sección 11.5) que genera la misma copia y conserva las últimas `dias_retencion_backup` (14).

---

## 8. Notificaciones

### 8.1 Catálogo de tipos (semilla de `tipo_notificacion`)

| Código | es_alerta | Cuándo | Destinatarios |
|---|---|---|---|
| `REPORTE_PENDIENTE` | no | Días 1 y `dia_recordatorio_2` (4) 07:00, metas ABIERTA sin reporte del mes anterior | Responsable |
| `REPORTE_VENCIDO` | sí | Día `dia_alerta_lider` (6) 07:00 y cada lunes mientras falte | Responsable, líder de área |
| `META_EN_ROJO` | sí | Al recalcular y cambiar a rojo | Responsable, líder de área |
| `META_CUMPLIDA` | no | Al cumplir | Responsable, líder de área, Despacho |
| `META_ASIGNADA` | no | Al asignar o reasignar responsable | Nuevo responsable |
| `REPORTE_CORREGIDO` | no | Al corregir | Responsable |
| `GASTO_SOBRE_AVANCE` | sí | RN-15 | Líder de área, Despacho |
| `GASTO_SOBRE_PRESUPUESTO` | sí | RN-14 | Líder de área, Despacho |
| `TAREA_ASIGNADA` | no | Crear o reasignar | Responsable |
| `TAREA_POR_VENCER` | no | Diario 07:00, `fecha_fin − hoy = dias_aviso_tarea` (3) | Responsable |
| `TAREA_VENCIDA` | sí | Proceso nocturno | Responsable, líder de componente (o de área) |
| `TAREA_FINALIZADA` | no | Al finalizar | Líder de componente (o de área) |
| `TAREA_REABIERTA` | no | Al reabrir | Responsable |
| `SOLICITUD_PRESENCIA` | sí | Crear/modificar tarea con presencia de la Secretaria | Secretaria, asistente |
| `PRESENCIA_RESPONDIDA` | no | Confirmar o declinar | Creador de la tarea |
| `CRUCE_AGENDA_DESPACHO` | sí | RN-29 | Secretaria, asistente |
| `OBSERVACION_DESPACHO` | sí | RN-31 | Responsable, líder de área |
| `OBSERVACION_ATENDIDA` | no | Al atender | Secretaria |
| `RESUMEN_SEMANAL` | no | Lunes `hora_resumen_semanal` (07:00) | Secretaria y asistente (global); líderes (su alcance) |

Todos nacen con `envia_correo = false`.

### 8.2 Contenido del resumen semanal
Avance del plan y variación frente a la semana anterior; metas que cambiaron de semáforo; metas sin reporte; tareas vencidas por responsable; agenda de la Secretaria de la semana (solo para el Despacho). Se guarda como una notificación con el resumen en HTML simple.

### 8.3 Interfaz
Campana en la barra superior con contador de no leídas; panel con lista, filtro por tipo, "marcar todas como leídas"; cada notificación abre su `enlace`. Página "Notificaciones" completa con paginación.

### 8.4 Correo (cuando está activo)
Plantilla única: encabezado institucional, título, mensaje, botón "Abrir en MÉTRICA" (URL pública + `enlace`), pie con "Este correo se envía porque el administrador activó las notificaciones por correo. Puede desactivarlas en su perfil". Remitente: parámetro `correo_remitente`. Cola en memoria con reintento (RN-33).

---

## 9. Importador de metas (Excel)

### 9.1 Entrada
Archivo `.xlsx`, hoja `PLAN`, primera fila encabezados. Columnas esperadas (nombres exactos, tolerando espacios y mayúsculas):

| Columna | Obligatoria | Destino | Validación / transformación |
|---|---|---|---|
| `ID` | sí | `meta.codigo` | entero > 0; se guarda como texto; clave de actualización |
| `ACTIVIDAD` | sí | `meta.descripcion` | texto no vacío; se recortan espacios y saltos de línea dobles |
| `META` | sí | `meta.valor_meta` | numérico > 0 |
| `UNIDAD` | sí | `meta.unidad_id` | debe existir en `unidad_medida` (ignorando tildes/mayúsculas); si no, error |
| `F_INICIO` | sí | `meta.fecha_inicio` | fecha; si < 2026-01-01 se usa 2026-01-01 con advertencia |
| `F_FIN` | sí | `meta.fecha_fin_oficial` | fecha ≥ F_INICIO |
| `COD_FUENTE_RECURSOS` | no | `fuente_recurso.codigo` | crea la fuente si no existe (usando `DESC_FUENTE_RECURSOS` como nombre) |
| `DESC_FUENTE_RECURSOS` | no | | |
| `PRESUPUESTO` | no | `meta.presupuesto_programado` | numérico ≥ 0; vacío ⇒ null con advertencia "sin presupuesto" |
| `20. Población sujeto` | no | `meta.poblacion_sujeto_id` | normalizar: recortar, colapsar espacios y saltos, capitalizar primera letra, eliminar punto/; final; buscar sin distinguir mayúsculas; crear si no existe |
| `AREA` | sí | `meta.area_id` | buscar por nombre normalizado (sin tildes, mayúsculas); si no existe ⇒ error |
| `COMPONENTE` | no | `meta.componente_id` | buscar dentro del área; si no existe ⇒ crear inactivo-sin-líder con advertencia; vacío en área con componentes ⇒ advertencia "sin componente" |
| `RESPONSABLE` | no | `meta.responsable_id` | correo o nombre exacto de usuario activo; vacío o no encontrado ⇒ `PENDIENTE_COMPLETAR` con advertencia |
| `VINCULACION` | no | ignorada | |
| `META 2026` | no | | si difiere de `META` ⇒ advertencia; se usa `META` |
| `EJEC ENE-JUN` | sí | reporte histórico | numérico ≥ 0; si > 0 crea `reporte_mensual(2026, 6, valor_ejecutado = EJEC ENE-JUN, origen = CARGA_INICIAL, observacion = "Carga inicial desde Excel: acumulado enero–junio")`; para unidades binarias ⇒ `porcentaje_binario = min(100, 100 * EJEC / META)` |
| `% CUMP ACUM` | no | no se carga | se recalcula; si |recalculado − Excel| > 1 punto ⇒ advertencia "revisar cumplimiento" |
| `PENDIENTE` | no | no se carga | |

### 9.2 Reglas de proceso
- Transacción por fila: una fila con error no afecta a las demás.
- Existe `meta.codigo` ⇒ actualizar datos básicos; no se tocan reportes ni tareas ya registrados, salvo el reporte histórico de junio si aún tiene `origen = CARGA_INICIAL` y el valor cambió.
- Tras cargar: generar programación uniforme (RN-18) para metas nuevas; evaluar RN-05 (cumplida); registrar `observaciones_importacion` con las advertencias de la fila.
- Casilla "Cargar como datos de prueba" ⇒ `es_dato_prueba = true` en todo lo creado.
- Informe descargable: hoja `Resumen` (conteos) y hoja `Detalle` (fila, código, estado, mensajes).

### 9.3 Plantilla de historia mensual (opcional)
Hoja `HISTORIA`: `ID, AÑO, MES, VALOR_EJECUTADO, COSTO_EJECUTADO, OBSERVACION`. Al importarla: reemplaza el reporte histórico de junio por las filas entregadas para esa meta (si hay filas de la meta); crea o actualiza reportes con `origen = CARGA_INICIAL`. Meses > mes actual ⇒ error.

### 9.4 Depuración esperada del archivo actual (para el informe al cliente)
276 filas; RESPONSABLE vacío en todas; COMPONENTE vacío en 87; PRESUPUESTO vacío en 74; 27 filas con cumplimiento ≥ 100 % (algunas hasta 800 %, cargar como cumplidas, revisar); población con variantes de escritura del mismo valor; 233 filas con F_FIN 2027-03-31 (se conserva como oficial; fecha de corte = 30/11/2026).

---

## 10. Parámetros, semillas y datos de prueba

### 10.1 Parámetros (`parametro`)
| Clave | Tipo | Valor inicial | Descripción |
|---|---|---|---|
| `nombre_sistema` | texto | MÉTRICA | |
| `entidad` | texto | Gobernación del Magdalena – Secretaría de Salud | |
| `vigencia` | numero | 2026 | |
| `fecha_corte_global` | fecha | 2026-11-30 | RN-03/RN-06; al cambiarla se recalcula la programación de metas con `distribucion_uniforme = true` |
| `fecha_cierre_vigencia` | fecha | 2026-12-31 | informativa |
| `umbral_amarillo` | numero | 15 | puntos |
| `umbral_gasto_sobre_avance` | numero | 20 | puntos |
| `dias_reapertura_tarea` | numero | 5 | |
| `dia_recordatorio_2` | numero | 4 | |
| `dia_alerta_lider` | numero | 6 | |
| `dias_aviso_tarea` | numero | 3 | |
| `hora_resumen_semanal` | texto | 07:00 | |
| `tamano_max_soporte_mb` | numero | 20 | |
| `extensiones_soporte` | json | ["pdf","jpg","jpeg","png","xlsx","xls","docx","doc"] | |
| `correo_activo` | booleano | false | interruptor general |
| `correo_remitente` | texto | metrica@magdalena.gov.co | |
| `correo_dominio_permitido` | texto | magdalena.gov.co | vacío = cualquiera |
| `url_publica` | texto | https://metrica.magdalena.gov.co | para enlaces en correos |
| `entorno` | texto | PRUEBAS | PRUEBAS / PRODUCCION |
| `modo_datos_prueba` | booleano | false | marca lo que se cree |
| `dias_retencion_backup` | numero | 14 | |
| `sesion_horas` | numero | 8 | |

La configuración SMTP (host, puerto, usuario, clave, TLS) va en variables de entorno, no en la tabla, para no exponer la clave en la interfaz.

### 10.2 Semillas obligatorias (`prisma/seed.ts`)
Catálogos de la sección 4.2; tipos de notificación de 8.1; parámetros de 10.1; las 6 áreas; los componentes del Excel; un usuario `ADMINISTRADOR` inicial con clave definida por variable de entorno `ADMIN_CLAVE_INICIAL` que debe cambiarse en el primer acceso.

### 10.3 Datos de prueba (`prisma/seed-prueba.ts`, todo con `es_dato_prueba = true`)
Usuarios: una Secretaria, un asistente, un líder por área, líderes de 4 componentes (PAI, ETV, Salud Ambiental, Salud Mental), 6 funcionarios. Metas: las del Excel cargadas con la casilla de prueba, o si no está disponible, 24 metas representativas (4 por área) con reportes de enero a agosto variados para producir verdes, amarillos y rojos. Tareas: 40 tareas entre el 1 y el 30 de septiembre, 8 con hora y recursos, 4 con presencia de la Secretaria (2 pendientes, 1 confirmada, 1 declinada), 2 cruces de horario, 6 finalizadas con soporte de ejemplo (`datos/soporte_ejemplo.pdf`), 5 vencidas. Observaciones: 2 pendientes. Notificaciones generadas por los procesos.

---

## 11. Arquitectura y stack

### 11.1 Resumen
| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS 3, React Router 6, TanStack Query 5, Recharts, react-hook-form + zod, date-fns (locale `es`), lucide-react |
| Backend | Node.js 20 LTS, NestJS 10, TypeScript, Prisma 5, class-validator, Passport JWT, @nestjs/schedule, Nodemailer, ExcelJS, Puppeteer, bcrypt, helmet, multer |
| Base de datos | PostgreSQL 16 (instalador de EnterpriseDB para Windows), esquema `metrica` |
| Servidor | Windows Server 2019 Standard, 64 GB RAM, Xeon E-2236 (ver imagen anexa: `ns563156`, WORKGROUP, sin dominio Active Directory) |
| Proxy y estáticos | IIS 10 con URL Rewrite + Application Request Routing (ARR) sirviendo `apps/web/dist` y reenviando `/api/*` a `http://localhost:3000` |
| Servicio | API como servicio de Windows mediante **NSSM** (o `node-windows`); reinicio automático |
| Archivos | `D:\metrica\soportes`, `D:\metrica\backups` (rutas por variable de entorno) |
| HTTPS | Certificado institucional en IIS; si no existe, certificado autofirmado para el piloto con instrucción de reemplazo |

Se descarta Docker porque Windows Server 2019 no ejecuta contenedores Linux sin Hyper-V/WSL adicional; la instalación nativa es más simple de operar para el equipo TIC.

### 11.2 Backend — módulos NestJS
```
apps/api/src/
  main.ts                      // helmet, CORS (solo url_publica), prefijo /api, validación global
  app.module.ts
  comun/                       // guards (JwtGuard, RolesGuard, AlcanceGuard), decoradores, filtros, calculos/, fecha.ts
  prisma/                      // PrismaService
  autenticacion/               // login, refresco, recuperación
  usuarios/  areas/  componentes/  catalogos/
  metas/                       // CRUD, programación, ficha, agregados
  reportes/                    // reporte mensual, correcciones
  tareas/                     // CRUD, finalizar, reabrir, cruces, presencia
  soportes/                    // subida, descarga con control de alcance
  observaciones/
  tablero/                     // consultas agregadas (6.6–6.8), listas accionables
  notificaciones/              // creación, cola de correo, resumen semanal
  programados/                 // cron: estados nocturnos, recordatorios, backup
  importacion/                 // Excel de metas e historia
  exportacion/                 // Excel, PDF (Puppeteer)
  auditoria/
  parametros/                  // parámetros, tipos de notificación, herramientas (borrar prueba, backup)
```

### 11.3 Frontend — estructura
```
apps/web/src/
  main.tsx  App.tsx  rutas.tsx
  api/                 // cliente axios + hooks TanStack por módulo
  componentes/         // ui base (Boton, Tarjeta, Chip, Semaforo, Anillo, Tabla, Cajón, Modal, Toast), graficas/
  paginas/
    Acceso/  Tablero/  Metas/ (Lista, Ficha, Programacion, Reporte)  Tareas/ (Lista, Calendario, Ficha)
    Agenda/  Notificaciones/  Administracion/ (Estructura, Usuarios, Catalogos, Parametros, Herramientas, Importar, Auditoria)
    Imprimir/Tablero    // ruta sin navegación para el PDF
  estado/              // sesión, filtros globales del tablero
  utilidades/          // fechas (America/Bogota), formato de moneda COP, semáforo
```

### 11.4 API REST (prefijo `/api`, JSON, JWT Bearer)

| Método y ruta | Descripción |
|---|---|
| `POST /auth/ingresar` · `POST /auth/refrescar` · `POST /auth/salir` · `POST /auth/recuperar` · `POST /auth/restablecer` | Autenticación |
| `GET /yo` · `PATCH /yo` (recibe_correo, clave) | Perfil |
| `GET/POST/PATCH /areas` · `GET/POST/PATCH /componentes` | Estructura |
| `GET/POST/PATCH /usuarios` · `POST /usuarios/{id}/restablecer-clave` · `POST /usuarios/importar` | Usuarios |
| `GET /catalogos/{tipo}` · `POST/PATCH /catalogos/{tipo}` | unidades, poblaciones, fuentes, recursos, categorias |
| `GET /metas` (filtros: area, componente, responsable, estado, semaforo, fuente, poblacion, unidad, texto, sinReporte, paginación) | Lista con campos calculados |
| `GET /metas/{id}` | Ficha completa: meta, programación, reportes, tareas, observaciones, historial |
| `POST /metas` · `PATCH /metas/{id}` · `PATCH /metas/{id}/responsable` · `POST /metas/{id}/reabrir` | |
| `GET/PUT /metas/{id}/programacion` · `POST /metas/{id}/programacion/uniforme` | |
| `GET /metas/{id}/reportes` · `POST /metas/{id}/reportes` · `PATCH /reportes/{id}` (corrección con motivo) | |
| `GET /mis-metas/pendientes-reporte` | Para el responsable |
| `GET /tareas` (filtros: meta, responsable, area, componente, estado, desde, hasta, requiereSecretaria) · `POST /tareas` · `PATCH /tareas/{id}` · `POST /tareas/{id}/finalizar` · `POST /tareas/{id}/reabrir` · `POST /tareas/{id}/cancelar` | |
| `POST /tareas/verificar-cruces` (fecha, horaInicio, horaFin, responsableId, requiereSecretaria, excluirId) | Devuelve cruces sin guardar |
| `POST /tareas/{id}/presencia` (accion: CONFIRMAR/DECLINAR, motivo) | |
| `GET /agenda/despacho?desde&hasta` · `GET /agenda/equipo?area&componente&desde&hasta` · `GET /agenda/recursos-semana?desde` | |
| `POST /soportes` (multipart: tareaId o reporteId, archivos[]) · `GET /soportes/{id}/descargar` · `DELETE /soportes/{id}` (solo antes de finalizar) | |
| `POST /observaciones` · `POST /observaciones/{id}/atender` | |
| `GET /tablero/resumen` · `GET /tablero/curva` · `GET /tablero/por-area` · `GET /tablero/por-componente` · `GET /tablero/distribucion` · `GET /tablero/listas/{tipo}` (rojo, sinReporte, observaciones, tareasVencidas, tareasPorVencer, gastoSobreAvance) — todos aceptan los mismos filtros de `/metas` | |
| `GET /exportar/metas.xlsx` · `GET /exportar/tablero.pdf` | |
| `GET /notificaciones` · `PATCH /notificaciones/{id}/leer` · `POST /notificaciones/leer-todas` · `GET /notificaciones/no-leidas/conteo` | |
| `GET/PATCH /parametros` · `GET/PATCH /parametros/tipos-notificacion` · `POST /parametros/correo-prueba` | |
| `POST /importacion/metas/previsualizar` · `POST /importacion/metas/confirmar` · `POST /importacion/historia` · `GET /importacion/{id}/informe.xlsx` | |
| `GET /herramientas/datos-prueba/conteo` · `POST /herramientas/datos-prueba/borrar` (confirmacion: "BORRAR", clave) · `GET /herramientas/backups` · `POST /herramientas/backups` · `GET /herramientas/backups/{nombre}/descargar` · `DELETE /herramientas/backups/{nombre}` | |
| `GET /auditoria` (filtros: entidad, entidadId, usuario, accion, desde, hasta) | |

Convenciones: errores en formato `{ codigo, mensaje, detalles? }` con HTTP 400/401/403/404/409/422; paginación `?pagina=1&tamano=50` con respuesta `{ datos, total, pagina, tamano }`; fechas ISO `AAAA-MM-DD`, instantes ISO 8601 con zona.

### 11.5 Procesos programados (`programados/`)
| Cron (America/Bogota) | Proceso |
|---|---|
| `5 0 * * *` | Actualizar estados de tareas (RN-21), cerrar metas vencidas (RN-06), recalcular vista de avance, `TAREA_VENCIDA` |
| `0 7 * * *` | `TAREA_POR_VENCER`; días 1 y `dia_recordatorio_2`: `REPORTE_PENDIENTE`; día `dia_alerta_lider` y lunes: `REPORTE_VENCIDO` |
| `0 7 * * 1` | `RESUMEN_SEMANAL` (respeta `hora_resumen_semanal`) |
| `0 2 * * *` | Backup automático y limpieza por retención |
| cada 1 min | Cola de correo (si `correo_activo`) |

### 11.6 Seguridad
- Claves con bcrypt (12). JWT firmado con `JWT_SECRETO` (≥ 32 bytes aleatorios), acceso 8 h, refresco 7 días en cookie `httpOnly; Secure; SameSite=Strict`.
- Bloqueo tras 5 intentos fallidos en 15 minutos. Cambio de clave obligatorio en el primer acceso.
- Autorización en backend por rol y alcance en cada endpoint; los soportes se descargan por endpoint autenticado, nunca por URL directa de IIS.
- Validación de entrada con class-validator/zod; Prisma parametriza todas las consultas.
- helmet, CORS restringido a `url_publica`, límite de tamaño de cuerpo 25 MB, rate limit 100 req/min por IP en `/auth/*`.
- Soportes: validación de extensión y tipo MIME real (magic bytes), nombre almacenado aleatorio, fuera de la raíz web.
- Auditoría de solo inserción (RN-34). Variables de entorno en `.env` del servidor con permisos solo para la cuenta del servicio.
- Copias de seguridad diarias; la carpeta de backups fuera de la raíz web y con permisos restringidos.

### 11.7 Despliegue en Windows Server 2019 (`docs/DESPLIEGUE.md` ampliará esto)
1. Instalar Node.js 20 LTS, PostgreSQL 16 (crear base `metrica`, usuario `metrica_app` con permisos sobre el esquema y sin `UPDATE/DELETE` en `auditoria`), Git, NSSM.
2. Clonar el repositorio en `D:\metrica\app`. Crear `D:\metrica\soportes` y `D:\metrica\backups`.
3. `apps/api`: `.env` (DATABASE_URL, JWT_SECRETO, RUTA_SOPORTES, RUTA_BACKUPS, SMTP_*, ADMIN_CLAVE_INICIAL, PG_DUMP_PATH), `npm ci`, `npx prisma migrate deploy`, `npx prisma db seed`, `npm run build`.
4. Registrar el servicio: `nssm install MetricaApi "C:\Program Files\nodejs\node.exe" "D:\metrica\app\apps\api\dist\main.js"`, directorio de trabajo `apps/api`, inicio automático, reinicio en fallo.
5. `apps/web`: `npm ci`, `npm run build`; publicar `dist` como sitio IIS en `D:\metrica\web`, con `web.config` que reescribe rutas SPA a `index.html` y reenvía `/api/*` a `http://localhost:3000/api/*` (ARR). Instalar URL Rewrite y ARR si faltan.
6. Enlazar HTTPS (443) con el certificado disponible; redirigir 80 → 443.
7. Verificar: `https://<servidor>/api/salud` responde `{ ok: true, version }`; ingresar como administrador; cambiar clave; cargar áreas, usuarios y el Excel de metas.
8. Scripts en `scripts/`: `instalar.ps1` (pasos 3–5 automatizados), `actualizar.ps1` (git pull, build, migrate, reinicio del servicio), `restaurar.ps1`.

---

## 12. Repositorio

```
metrica/
  README.md                 // cómo correr en desarrollo en 5 minutos
  package.json              // workspaces: apps/*
  apps/api/                 // NestJS + Prisma (prisma/schema.prisma, migrations/, seed.ts, seed-prueba.ts)
  apps/web/                 // React + Vite
  datos/
    Metas_Plan_Salud.xlsx   // carga inicial real (hoja PLAN)
    plantilla_usuarios.xlsx // generada por el equipo
    plantilla_historia.xlsx // hoja HISTORIA (9.3)
    soporte_ejemplo.pdf
  docs/
    REQUERIMIENTOS_METRICA.md   // este documento
    DESPLIEGUE.md
    DECISIONES.md               // bitácora de decisiones del agente
  scripts/                  // instalar.ps1, actualizar.ps1, restaurar.ps1, backup.ps1
```

Desarrollo local: PostgreSQL 16 local o en contenedor (en el equipo del desarrollador sí puede usarse Docker), `npm run dev` levanta API (3000) y web (5173) con proxy. Convenciones: commits en español, ramas `main` y `desarrollo`, ESLint + Prettier en pre-commit.

---

## 13. Plan de construcción (7 días)

Cada día termina con la aplicación arrancando y lo construido demostrable. El orden prioriza el flujo de valor: cargar metas reales → reportar → ver el tablero.

| Día | Backend | Frontend | Resultado demostrable |
|---|---|---|---|
| 1 | Esquema Prisma completo, migración, semillas, autenticación, usuarios, áreas, componentes, catálogos, parámetros, auditoría base | Diseño base (tokens, layout, navegación, sesión), acceso, administración de estructura y usuarios | Ingreso con roles, estructura cargada |
| 2 | Metas (CRUD, programación uniforme, cálculos 6.1–6.5 con pruebas), importador de metas con previsualización e informe | Lista y ficha de metas, importación | Las 276 metas del Excel cargadas y visibles con semáforo |
| 3 | Reportes mensuales, correcciones, RN-11 a RN-17, notificaciones en app, cron de recordatorios | Mis metas, formulario de reporte, programación, campana de notificaciones | Un responsable reporta y el semáforo cambia |
| 4 | Tareas, soportes, finalizar/reabrir, cruces, presencia de la Secretaria, cron de estados | Tareas, calendario, ficha de tarea, agenda del Despacho, consolidado de recursos | Ciclo completo de una tarea y confirmación de agenda |
| 5 | Tablero (6.6–6.8, listas accionables), observaciones, exportación Excel y PDF | Tablero con navegación descendente, filtros, modo presentación, observaciones | Tablero con datos reales |
| 6 | Correo parametrizable, herramientas (borrar prueba, backup), resumen semanal, auditoría consultable, pruebas E2E de 3 flujos | Parámetros, tipos de notificación, herramientas, auditoría, ajustes de usabilidad | Sistema completo en entorno de pruebas del servidor |
| 7 | Despliegue en el servidor (11.7), scripts, backup automático | Pulido visual, revisión responsive, textos | Demostración al Despacho con el plan real |

En paralelo (cliente): asignar responsables, completar componentes, revisar las 27 metas ≥ 100 %, entregar plantilla de usuarios.

---

## 14. Requisitos no funcionales

### 14.1 Diseño e interfaz
- Paleta: azul marino `#0B2A5B`, azul `#1E5FD9`, azul claro `#5B8DEF`, hielo `#E8F0FB`, blanco; semáforo verde `#2BB673`, ámbar `#F5A623`, rojo `#E5484D`. Tipografía del sistema (Segoe UI / Inter). El prototipo HTML entregado con la propuesta es la referencia visual: barra lateral azul marino, tarjetas blancas, tablero con indicadores de cabecera, curva de avance, barras por área y listas accionables.
- Interfaz completamente en español, sin anglicismos en textos de usuario. Los mensajes de error dicen qué pasó y qué hacer.
- Responsive: usable en pantalla de 1366 px y en móvil (≥ 360 px) para reportar y cerrar tareas. El tablero en móvil apila los bloques.
- Accesibilidad: contraste AA, foco visible, navegación por teclado en formularios y modales, etiquetas en campos, textos alternativos en iconos.
- El semáforo nunca se comunica solo por color: siempre acompaña texto o icono.
- Moneda en pesos colombianos con separador de miles (`$ 4.344.000.000`); porcentajes con un decimal solo cuando aporta.

### 14.2 Rendimiento
- Tablero global (276 metas, ~3.000 reportes, ~2.000 tareas): ≤ 2 s en primera carga, ≤ 1 s al cambiar filtros (agregados calculados en SQL, no en el cliente; índices de 4.3; vista `vw_meta_avance`).
- Listas paginadas de 50; búsqueda con retardo de 300 ms.
- Subida de soportes hasta 20 MB con barra de progreso.
- Exportación PDF ≤ 10 s.
- Capacidad: 60 usuarios concurrentes sin degradación (el servidor sobra: 64 GB RAM, 6 núcleos).

### 14.3 Disponibilidad y operación
- Servicio con reinicio automático; endpoint `/api/salud`.
- Backup diario 02:00 con retención de 14 días; restauración probada antes de la entrega.
- Registro de aplicación con rotación diaria (`D:\metrica\logs`), nivel `info` en producción, sin datos personales en los registros.
- Actualización con `scripts/actualizar.ps1` en menos de 5 minutos de indisponibilidad.

### 14.4 Seguridad (resumen de 11.6)
Autenticación JWT con refresco, bloqueo por intentos, autorización por rol y alcance en servidor, validación de entrada, soportes fuera de la raíz web, auditoría inmutable, HTTPS, secretos en variables de entorno, cumplimiento de la Ley 1581 de 2012 (datos personales): solo se almacenan nombre, correo institucional y cargo; no se registran datos sensibles de la población.

### 14.5 Mantenibilidad
- TypeScript estricto en ambos lados; ESLint y Prettier; nombres en español.
- Pruebas unitarias sobre `calculos/` (cobertura ≥ 90 %), pruebas de integración de los endpoints de reportes, tareas e importación, y E2E (Playwright) de: reportar y cumplir una meta; crear, cruzar y confirmar una tarea con presencia; importar el Excel.
- Documentación: README, DESPLIEGUE.md, DECISIONES.md, y OpenAPI generado por NestJS en `/api/docs` (solo en entorno PRUEBAS).

### 14.6 Compatibilidad
Navegadores: Chrome, Edge y Firefox de los últimos 2 años; Safari iOS 16+. Sin dependencias de plugins.

---

## 15. Criterios de decisión por defecto (para ambigüedades)

1. Ante la duda entre bloquear y advertir, **advertir y registrar**. Solo bloquean las reglas que dicen explícitamente "no permite" o "exige".
2. Ante la duda sobre quién puede ver algo, aplicar el alcance más restrictivo de la matriz 3.2.
3. Toda acción que cambie datos de negocio deja auditoría.
4. Toda fecha se interpreta en `America/Bogota`.
5. Nunca borrar físicamente reportes, tareas finalizadas ni soportes, salvo en CU-16 sobre datos de prueba.
6. Un cálculo se implementa una sola vez (backend) y se expone a la interfaz; el frontend no recalcula avances.
7. Los textos de interfaz se escriben para un funcionario público no técnico: verbos claros, sin jerga.
8. Si una funcionalidad no cabe en el día planeado, se recorta a lo mínimo que mantenga el flujo de valor y se anota en `DECISIONES.md`.

---

## 16. Historias de usuario con criterios de aceptación

Formato Dado / Cuando / Entonces. Cada historia referencia sus reglas.

### Tablero y consulta
**HU-01** Como Secretaria, quiero ver el avance global del plan frente a lo planeado, para saber si el plan va a llegar a la fecha de corte. (RN-09, RN-10, 6.6)
- Dado que existen metas abiertas con reportes, cuando abro el tablero, entonces veo el avance global, el planeado a hoy, el semáforo y la curva mensual de ambos.
- Dado que aplico el filtro "Salud Pública", cuando se recarga, entonces todos los bloques muestran solo esa área y su desglose por componente.
- Dado que hago clic en "Metas en rojo: 12", entonces se abre la lista de esas 12 metas ordenadas por brecha.

**HU-02** Como líder de área, quiero ver mi área y cada componente con su semáforo y sus metas sin reporte, para saber a quién pedir cuentas. (RN-16)
- Dado que es día 7 y un componente no reportó agosto, cuando abro el tablero, entonces ese componente aparece con contador "sin reporte" y la lista muestra al responsable y los días de atraso.

**HU-03** Como Secretaria, quiero un modo presentación, para proyectar el tablero en el comité.
- Dado que activo el modo, entonces desaparece la navegación, crecen las cifras y Esc lo cierra.

**HU-04** Como Secretaria, quiero exportar el tablero a PDF y las metas a Excel, para llevarlos a reuniones y a la supervisión. (CU-13)
- Dado que tengo filtros aplicados, cuando exporto, entonces el archivo respeta los filtros e indica fecha y hora de datos.

### Metas y reporte mensual
**HU-05** Como administrador, quiero importar el Excel de metas tal como está, para arrancar con el plan real sin digitar. (CU-02, sección 9)
- Dado el archivo `Metas_Plan_Salud.xlsx`, cuando lo previsualizo, entonces veo 276 filas clasificadas y las advertencias por fila (sin responsable, sin componente, sin presupuesto, cumplimiento a revisar).
- Cuando confirmo, entonces se crean 276 metas, cada una con su programación uniforme y su reporte de junio, y las de acumulado ≥ meta quedan CUMPLIDA.
- Dado que vuelvo a importar el mismo archivo con un presupuesto corregido, entonces la meta se actualiza y no se duplica.

**HU-06** Como líder de área, quiero asignar el responsable de cada meta de mi área, para que pueda reportar. (RN-07, CU-03)
- Dado una meta PENDIENTE_COMPLETAR, cuando asigno responsable, entonces pasa a ABIERTA y el responsable recibe la notificación.

**HU-07** Como responsable, quiero ver mis metas pendientes de reporte del mes anterior, para no olvidar ninguna. (RN-16)
- Dado que es 3 de octubre y tengo 5 metas sin reporte de septiembre, entonces "Mis metas" las lista primero con la marca "pendiente de reporte".

**HU-08** Como responsable, quiero registrar el valor y el costo ejecutados del mes, para que el avance se actualice sin cálculos manuales. (RN-01, RN-05, RN-11, RN-14)
- Dado meta 397 con acumulado 225, cuando reporto septiembre = 60, entonces el acumulado es 285, el avance 71,8 % y el semáforo se recalcula al instante.
- Dado que el nuevo acumulado alcanza 397, entonces la meta pasa a CUMPLIDA y se notifica al Despacho.
- Dado que el costo acumulado supera el presupuesto, entonces el formulario exige observación y el tablero marca "gasto sobre presupuesto".
- Dado que intento reportar octubre en septiembre, entonces el sistema lo rechaza.

**HU-09** Como responsable de una meta tipo Documento, quiero reportar un porcentaje intermedio con justificación, para reflejar avances parciales. (RN-08)
- Dado unidad Documento, cuando reporto 60 % sin observación, entonces el sistema pide la observación; con observación, el avance del indicador es 60 %.

**HU-10** Como líder de área, quiero corregir un reporte de cualquier mes con justificación, para arreglar errores sin perder trazabilidad. (RN-13)
- Dado un reporte de junio, cuando lo corrijo con motivo, entonces se guarda, la auditoría registra antes y después y el responsable es notificado.
- Cuando intento guardar sin motivo, entonces no se permite.

**HU-11** Como responsable, quiero ajustar la programación mensual de una meta que no es lineal, para que el semáforo sea justo. (RN-18, RN-19)
- Dado una meta anual con una jornada en octubre, cuando pongo 100 % en octubre y 0 en los demás, entonces guarda; si la suma no coincide con la meta, muestra la diferencia y no guarda.

### Tareas y calendario
**HU-12** Como líder de componente, quiero crear tareas para mi equipo bajo una meta, con fechas y opcionalmente hora, lugar y recursos, para organizar el trabajo. (RN-20, CU-07)
- Dado que elijo un responsable de mi componente, cuando guardo, entonces la tarea aparece en su calendario como Programada o En curso según la fecha y recibe notificación.
- Dado que la fecha de fin es anterior a la de inicio, entonces no se permite.

**HU-13** Como funcionario, quiero finalizar mis tareas adjuntando el soporte, para dejar evidencia. (RN-22)
- Dado una tarea En curso sin soporte, entonces "Finalizar" está deshabilitado con el texto "Adjunte al menos un soporte".
- Dado que adjunto un PDF y escribo la observación, cuando finalizo, entonces queda Finalizada, verde en el calendario y el avance operativo de la meta sube.

**HU-14** Como líder, quiero reabrir una tarea finalizada dentro de cinco días con comentario, para exigir un mejor soporte sin frenar al equipo. (RN-23)
- Dado una tarea finalizada hace 2 días, cuando la reabro con motivo, entonces vuelve a En curso/Vencida, conserva los soportes y notifica al responsable. A los 6 días, la opción no aparece.

**HU-15** Como funcionario, quiero que las tareas vencidas se marquen solas, para no depender de que alguien las revise. (RN-21)
- Dado una tarea con fin ayer y no finalizada, cuando corre el proceso nocturno, entonces pasa a Vencida y me llega la notificación.

**HU-16** Como líder, quiero ver el calendario de mi equipo coloreado por estado, para saber qué está haciendo cada uno. (RN-30)
- Dado la vista semanal, cuando filtro por un funcionario, entonces veo solo sus tareas con los colores de estado y puedo abrir cada una.

### Agenda del Despacho
**HU-17** Como funcionario, quiero que el sistema me avise si mi tarea con hora se cruza con otra, sin impedirme guardarla. (RN-27)
- Dado que ya tengo una tarea 10:00–12:00 el miércoles, cuando creo otra 11:00–13:00, entonces veo el cruce y el botón dice "Guardar de todas formas".

**HU-18** Como Secretaria o asistente, quiero confirmar o declinar las tareas que requieren mi presencia, para controlar la agenda. (RN-28, RN-29, RN-35)
- Dado una solicitud pendiente, cuando confirmo, entonces queda Confirmada y el organizador es notificado; si se cruza con otra confirmada, recibo la alerta de cruce.
- Cuando declino sin motivo, entonces no se permite; con motivo, el organizador lo recibe.
- Dado que actúa el asistente, entonces la auditoría muestra su nombre.

**HU-19** Como asistente, quiero ver el consolidado de recursos de la semana, para coordinar logística.
- Dado la semana actual, entonces veo cada recurso con la cantidad de tareas que lo requieren y puedo abrir la lista.

### Observaciones y notificaciones
**HU-20** Como Secretaria, quiero dejar una observación sobre una meta o tarea y saber cuándo fue atendida. (RN-31)
- Cuando escribo la observación, entonces el responsable y el líder la reciben y el tablero la muestra como pendiente; cuando el responsable responde, recibo la notificación y deja de estar pendiente.

**HU-21** Como usuario, quiero recibir todas las notificaciones dentro de la aplicación y, solo si el administrador lo activa, por correo. (RN-32, RN-33)
- Dado `correo_activo = false`, cuando ocurre cualquier evento, entonces la notificación aparece en la campana y no se envía correo.
- Dado `correo_activo = true` y `TAREA_VENCIDA.envia_correo = true`, entonces ese tipo llega también por correo y los demás no.
- Dado que desactivo "recibir correo" en mi perfil, entonces dejo de recibir los tipos que no son alerta.

### Administración
**HU-22** Como administrador, quiero activar el correo y elegir qué tipos lo envían, con un correo de prueba. (CU-15)
**HU-23** Como administrador, quiero borrar los datos de prueba con doble confirmación y backup previo, para dejar el sistema limpio antes de producción. (CU-16)
- Cuando entro a Herramientas, entonces veo el conteo por tabla; cuando escribo `BORRAR`, mi clave y confirmo, entonces se genera un backup, se eliminan solo los registros marcados y veo el resumen; la auditoría conserva el registro.
- Dado que hay datos reales, entonces no se tocan.
**HU-24** Como administrador, quiero generar y descargar una copia de seguridad completa, para migrar de pruebas a producción. (CU-17)
- Cuando genero la copia, entonces obtengo un `.zip` con la base, los soportes y el manifiesto, y aparece en la lista con fecha y tamaño.
**HU-25** Como administrador, quiero consultar la auditoría por entidad, usuario y fecha, para responder a la supervisión.
**HU-26** Como administrador, quiero que un usuario con metas o tareas a cargo no pueda desactivarse hasta reasignarlas. (RN-26)

---

## 17. Decisiones tomadas y pendientes

### Tomadas (no reabrir sin acuerdo con INGNOVATICS)
Nombre MÉTRICA; modelo Meta → Tarea sin nivel intermedio; doble avance (indicador y operativo); promedio simple; reporte mensual por el responsable de la meta; componente como subárea con líder propio; corrección de cualquier mes por el líder de área con auditoría; tarea y evento unificados; correo desactivado por defecto y parametrizable por tipo; fecha de corte 30/11/2026; stack de la sección 11; despliegue nativo en Windows Server 2019; código en español.

### Pendientes del cliente (no bloquean el desarrollo)
1. Listado de usuarios con correo y rol (plantilla de usuarios).
2. Responsable de cada una de las 276 metas.
3. Componente de las 87 metas de Salud Pública sin componente.
4. Revisión de las 27 metas con cumplimiento ≥ 100 %.
5. Certificado HTTPS y nombre público del servidor (`url_publica`).
6. Datos SMTP institucionales (solo si en algún momento se activa el correo).

---

*Fin del documento.*
