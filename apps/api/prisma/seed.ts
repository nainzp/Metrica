import { PrismaClient, RolUsuario, TipoParametro } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando siembra de datos normativos para MÉTRICA...');

  // 1. Catálogo: Unidad de Medida
  const unidades = [
    { codigo: 'NUMERO', nombre: 'Número', esBinaria: false },
    { codigo: 'PORCENTAJE', nombre: 'Porcentaje', esBinaria: false },
    { codigo: 'DOCUMENTO', nombre: 'Documento', esBinaria: true },
    { codigo: 'DIAS', nombre: 'Días', esBinaria: false },
  ];

  for (const u of unidades) {
    await prisma.unidadMedida.upsert({
      where: { codigo: u.codigo },
      update: { nombre: u.nombre, esBinaria: u.esBinaria },
      create: u,
    });
  }
  console.log('✔ Unidades de medida sembradas.');

  // 2. Catálogo: Fuente de Recurso
  const fuentes = [
    { codigo: '1.2.4.2.02', nombre: 'SGP-SALUD-SALUD PUBLICA' },
    { codigo: '1.2.4.2.01', nombre: 'SGP-SALUD-REGIMEN SUBSIDIADO' },
    { codigo: 'RP', nombre: 'RECURSOS PROPIOS' },
  ];

  for (const f of fuentes) {
    await prisma.fuenteRecurso.upsert({
      where: { codigo: f.codigo },
      update: { nombre: f.nombre },
      create: f,
    });
  }
  console.log('✔ Fuentes de recurso sembradas.');

  // 3. Catálogo: Recurso
  const recursos = [
    'Sala de juntas',
    'Auditorio',
    'Vehículo',
    'Refrigerios',
    'Equipo audiovisual',
    'Papelería',
    'Transporte fluvial',
  ];

  for (const r of recursos) {
    await prisma.recurso.upsert({
      where: { nombre: r },
      update: {},
      create: { nombre: r },
    });
  }
  console.log('✔ Recursos logísticos sembrados.');

  // 4. Catálogo: Categoría de Tarea
  const categorias = [
    'Reunión',
    'Jornada',
    'Capacitación',
    'Visita',
    'Documento',
    'Gestión',
    'Otro',
  ];

  for (const c of categorias) {
    await prisma.categoriaTarea.upsert({
      where: { nombre: c },
      update: {},
      create: { nombre: c },
    });
  }
  console.log('✔ Categorías de tarea sembradas.');

  // 5. Áreas Normativas
  const areas = [
    { codigo: 'SP', nombre: 'Salud Pública' },
    { codigo: 'PLA', nombre: 'Planeación' },
    { codigo: 'PRE', nombre: 'Prestación de Servicios' },
    { codigo: 'ASE', nombre: 'Aseguramiento' },
    { codigo: 'EMD', nombre: 'Emergencias y Desastres' },
    { codigo: 'DES', nombre: 'Despacho' },
  ];

  const areaMap = new Map<string, string>();

  for (const a of areas) {
    const area = await prisma.area.upsert({
      where: { codigo: a.codigo },
      update: { nombre: a.nombre },
      create: a,
    });
    areaMap.set(a.codigo, area.id);
  }
  console.log('✔ 6 Áreas normativas sembradas.');

  // 6. Componentes de Salud Pública
  const componentesSP = [
    'Salud Ambiental',
    'Laboratorio',
    'PAI',
    'ETV',
    'Salud Mental',
    'Nutrición',
    'EDA-IRA',
    'Vigilancia',
    'Zoonosis',
    'SSR',
    'ECNT',
    'TB-Lepra',
    'Lepra',
    'SAC',
    'SOGC',
    'DNT',
    'PIC',
    'Medicamentos',
    'Registros',
    'Jurídica',
    'General',
  ];

  const spAreaId = areaMap.get('SP')!;

  for (const comp of componentesSP) {
    // Código simple normalizado
    const cod = comp
      .toUpperCase()
      .replace(/[\s-]/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    await prisma.componente.upsert({
      where: {
        areaId_codigo: {
          areaId: spAreaId,
          codigo: cod,
        },
      },
      update: { nombre: comp },
      create: {
        areaId: spAreaId,
        codigo: cod,
        nombre: comp,
      },
    });
  }
  console.log('✔ Componentes de Salud Pública sembrados.');

  // 7. Parámetros del Sistema (Sección 10.1)
  const parametros = [
    { clave: 'nombre_sistema', valor: 'MÉTRICA', tipo: TipoParametro.texto, descripcion: 'Nombre institucional del sistema' },
    { clave: 'entidad', valor: 'Gobernación del Magdalena – Secretaría de Salud', tipo: TipoParametro.texto, descripcion: 'Entidad territorial' },
    { clave: 'vigencia', valor: '2026', tipo: TipoParametro.numero, descripcion: 'Año de la vigencia' },
    { clave: 'fecha_corte_global', valor: '2026-11-30', tipo: TipoParametro.fecha, descripcion: 'Fecha de corte global de seguimiento' },
    { clave: 'fecha_cierre_vigencia', valor: '2026-12-31', tipo: TipoParametro.fecha, descripcion: 'Cierre fiscal de la vigencia' },
    { clave: 'umbral_amarillo', valor: '15', tipo: TipoParametro.numero, descripcion: 'Umbral en puntos porcentuales para semáforo amarillo' },
    { clave: 'umbral_gasto_sobre_avance', valor: '20', tipo: TipoParametro.numero, descripcion: 'Umbral en puntos para alerta de gasto sobre avance' },
    { clave: 'dias_reapertura_tarea', valor: '5', tipo: TipoParametro.numero, descripcion: 'Días máximos permitidos para reabrir una tarea finalizada' },
    { clave: 'dia_recordatorio_2', valor: '4', tipo: TipoParametro.numero, descripcion: 'Segundo día del mes para recordatorio de reporte' },
    { clave: 'dia_alerta_lider', valor: '6', tipo: TipoParametro.numero, descripcion: 'Día del mes para alertar al líder por reporte vencido' },
    { clave: 'dias_aviso_tarea', valor: '3', tipo: TipoParametro.numero, descripcion: 'Días previos para notificar tarea próxima a vencer' },
    { clave: 'hora_resumen_semanal', valor: '07:00', tipo: TipoParametro.texto, descripcion: 'Hora del lunes para envío del resumen semanal' },
    { clave: 'tamano_max_soporte_mb', valor: '20', tipo: TipoParametro.numero, descripcion: 'Tamaño máximo de archivo soporte en megabytes' },
    { clave: 'extensiones_soporte', valor: '["pdf","jpg","jpeg","png","xlsx","xls","docx","doc"]', tipo: TipoParametro.json, descripcion: 'Extensiones de archivo permitidas para soportes' },
    { clave: 'correo_activo', valor: 'false', tipo: TipoParametro.booleano, descripcion: 'Interruptor global para habilitar el envío de correos SMTP' },
    { clave: 'correo_remitente', valor: 'metrica@magdalena.gov.co', tipo: TipoParametro.texto, descripcion: 'Dirección remitente institucional' },
    { clave: 'correo_dominio_permitido', valor: 'magdalena.gov.co', tipo: TipoParametro.texto, descripcion: 'Dominio institucional de correo electrónico' },
    { clave: 'url_publica', valor: 'http://localhost:5173', tipo: TipoParametro.texto, descripcion: 'URL pública de la aplicación para enlaces en correos' },
    { clave: 'entorno', valor: 'PRUEBAS', tipo: TipoParametro.texto, descripcion: 'Entorno de ejecución (PRUEBAS / PRODUCCION)' },
    { clave: 'modo_datos_prueba', valor: 'false', tipo: TipoParametro.booleano, descripcion: 'Si está activo, marca los nuevos registros como datos de prueba' },
    { clave: 'dias_retencion_backup', valor: '14', tipo: TipoParametro.numero, descripcion: 'Días de retención para copias de seguridad automáticas' },
    { clave: 'sesion_horas', valor: '8', tipo: TipoParametro.numero, descripcion: 'Duración en horas de la sesión JWT' },
  ];

  for (const p of parametros) {
    await prisma.parametro.upsert({
      where: { clave: p.clave },
      update: { valor: p.valor, tipo: p.tipo, descripcion: p.descripcion },
      create: p,
    });
  }
  console.log('✔ Parámetros del sistema sembrados.');

  // 8. Catálogo de Tipos de Notificación (Sección 8.1)
  const tiposNotificacion = [
    { codigo: 'REPORTE_PENDIENTE', nombre: 'Reporte mensual pendiente', descripcion: 'Recordatorio mensual de reporte sin diligenciar', esAlerta: false, enviaCorreo: false },
    { codigo: 'REPORTE_VENCIDO', nombre: 'Reporte mensual vencido', descripcion: 'Alerta por reporte del mes anterior no reportado a tiempo', esAlerta: true, enviaCorreo: false },
    { codigo: 'META_EN_ROJO', nombre: 'Meta en estado crítico (rojo)', descripcion: 'Alerta por meta que cae en semáforo rojo', esAlerta: true, enviaCorreo: false },
    { codigo: 'META_CUMPLIDA', nombre: 'Meta cumplida', descripcion: 'Notificación cuando una meta alcanza o supera el 100% de ejecución', esAlerta: false, enviaCorreo: false },
    { codigo: 'META_ASIGNADA', nombre: 'Meta asignada como responsable', descripcion: 'Aviso al responsable cuando se le asigna una meta', esAlerta: false, enviaCorreo: false },
    { codigo: 'REPORTE_CORREGIDO', nombre: 'Reporte mensual corregido', descripcion: 'Aviso al responsable cuando un reporte es corregido con motivo', esAlerta: false, enviaCorreo: false },
    { codigo: 'GASTO_SOBRE_AVANCE', nombre: 'Gasto sobre avance', descripcion: 'Alerta cuando la ejecución de costo excede en más de 20 puntos al avance del indicador', esAlerta: true, enviaCorreo: false },
    { codigo: 'GASTO_SOBRE_PRESUPUESTO', nombre: 'Gasto sobre presupuesto', descripcion: 'Alerta cuando el costo ejecutado supera el presupuesto programado de la meta', esAlerta: true, enviaCorreo: false },
    { codigo: 'TAREA_ASIGNADA', nombre: 'Tarea asignada', descripcion: 'Aviso al funcionario cuando se le asigna una tarea', esAlerta: false, enviaCorreo: false },
    { codigo: 'TAREA_POR_VENCER', nombre: 'Tarea próxima a vencer', descripcion: 'Recordatorio previo a la fecha de vencimiento de una tarea', esAlerta: false, enviaCorreo: false },
    { codigo: 'TAREA_VENCIDA', nombre: 'Tarea vencida', descripcion: 'Alerta cuando una tarea supera su fecha límite sin finalizar', esAlerta: true, enviaCorreo: false },
    { codigo: 'TAREA_FINALIZADA', nombre: 'Tarea finalizada', descripcion: 'Aviso al líder cuando una tarea es completada con soporte', esAlerta: false, enviaCorreo: false },
    { codigo: 'TAREA_REABIERTA', nombre: 'Tarea reabierta', descripcion: 'Aviso al funcionario cuando una tarea finalizada es reabierta', esAlerta: false, enviaCorreo: false },
    { codigo: 'SOLICITUD_PRESENCIA', nombre: 'Solicitud de presencia de la Secretaria', descripcion: 'Notificación al Despacho para confirmar o declinar presencia', esAlerta: true, enviaCorreo: false },
    { codigo: 'PRESENCIA_RESPONDIDA', nombre: 'Respuesta a presencia en evento', descripcion: 'Aviso al organizador cuando el Despacho responde la solicitud', esAlerta: false, enviaCorreo: false },
    { codigo: 'CRUCE_AGENDA_DESPACHO', nombre: 'Cruce de horario en agenda del Despacho', descripcion: 'Alerta por solapamiento de horario entre eventos confirmados', esAlerta: true, enviaCorreo: false },
    { codigo: 'OBSERVACION_DESPACHO', nombre: 'Observación del Despacho', descripcion: 'Instrucción u observación registrada directamente por la Secretaria', esAlerta: true, enviaCorreo: false },
    { codigo: 'OBSERVACION_ATENDIDA', nombre: 'Observación del Despacho atendida', descripcion: 'Respuesta brindada por el responsable a una observación', esAlerta: false, enviaCorreo: false },
    { codigo: 'RESUMEN_SEMANAL', nombre: 'Resumen semanal del plan', descripcion: 'Boletín de avance y pendientes consolidado cada lunes', esAlerta: false, enviaCorreo: false },
  ];

  for (const tn of tiposNotificacion) {
    await prisma.tipoNotificacion.upsert({
      where: { codigo: tn.codigo },
      update: { nombre: tn.nombre, descripcion: tn.descripcion, esAlerta: tn.esAlerta },
      create: tn,
    });
  }
  console.log('✔ Tipos de notificación sembrados.');

  // 9. Usuario ADMINISTRADOR Inicial
  const claveAdminPlano = process.env.ADMIN_CLAVE_INICIAL || 'Admin2026*!';
  const hashClave = await bcrypt.hash(claveAdminPlano, 12);
  const desAreaId = areaMap.get('DES')!;

  await prisma.usuario.upsert({
    where: { correo: 'admin@magdalena.gov.co' },
    update: {
      nombre: 'Administrador del Sistema',
      rol: RolUsuario.ADMINISTRADOR,
      areaId: desAreaId,
      activo: true,
    },
    create: {
      nombre: 'Administrador del Sistema',
      correo: 'admin@magdalena.gov.co',
      hashClave,
      rol: RolUsuario.ADMINISTRADOR,
      areaId: desAreaId,
      cargo: 'Soporte TIC',
      activo: true,
      recibeCorreo: true,
      esDatoPrueba: false,
    },
  });
  console.log('✔ Usuario inicial ADMINISTRADOR creado (admin@magdalena.gov.co).');

  console.log('Siembra normativa completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante la siembra de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
