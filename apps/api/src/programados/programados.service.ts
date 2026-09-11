import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadoMeta, RolUsuario, EstadoTarea } from '@prisma/client';
import { obtenerHoyBogota } from '../comun/fecha';
import { calcularValorEjecutadoAcum } from '../comun/calculos';

@Injectable()
export class ProgramadosService {
  private readonly logger = new Logger(ProgramadosService.name);

  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private auditoriaService: AuditoriaService,
  ) {}

  /**
   * RN-16: Recordatorio de reportes pendientes
   * Se ejecuta los días 1 y 4 de cada mes a las 07:00 AM (hora Colombia)
   */
  @Cron('0 7 1,4 * *', { timeZone: 'America/Bogota' })
  async ejecutarRecordatorioReportesPendientes() {
    this.logger.log('Iniciando cron: Recordatorio de reportes mensuales pendientes (RN-16)');
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const anioActual = hoy.getUTCFullYear();
    const mesAnterior = mesActual > 1 ? mesActual - 1 : 12;
    const anioReporte = mesActual > 1 ? anioActual : anioActual - 1;

    // Buscar metas abiertas con responsable asignado
    const metas = await this.prisma.meta.findMany({
      where: {
        estado: EstadoMeta.ABIERTA,
        responsableId: { not: null },
      },
      include: {
        reportes: { where: { anio: anioReporte, mes: mesAnterior } },
      },
    });

    let notificacionesCreadas = 0;
    for (const meta of metas) {
      const mesInicio = meta.fechaInicio.getUTCMonth() + 1;
      // Solo exigir si la meta ya había iniciado en el mes anterior
      if (mesAnterior >= mesInicio && meta.reportes.length === 0 && meta.responsableId) {
        await this.notificacionesService.crear({
          usuarioId: meta.responsableId,
          tipoCodigo: 'REPORTE_PENDIENTE',
          titulo: `Reporte pendiente de la Meta #${meta.codigo}`,
          mensaje: `Recuerde que está pendiente el reporte del mes ${mesAnterior}/${anioReporte} para la meta "${meta.descripcion}".`,
          enlace: `/metas/${meta.id}`,
        });
        notificacionesCreadas++;
      }
    }

    this.logger.log(`Cron finalizado: ${notificacionesCreadas} recordatorios enviados.`);
  }

  /**
   * RN-16: Alertas de reportes vencidos al líder de área
   * Se ejecuta el día 6 de cada mes y todos los lunes a las 07:00 AM (hora Colombia)
   */
  @Cron('0 7 6 * *', { timeZone: 'America/Bogota' })
  @Cron('0 7 * * 1', { timeZone: 'America/Bogota' })
  async ejecutarAlertaReportesVencidos() {
    this.logger.log('Iniciando cron: Alerta de reportes vencidos a líderes de área (RN-16)');
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const anioActual = hoy.getUTCFullYear();
    const mesAnterior = mesActual > 1 ? mesActual - 1 : 12;
    const anioReporte = mesActual > 1 ? anioActual : anioActual - 1;

    const metas = await this.prisma.meta.findMany({
      where: {
        estado: EstadoMeta.ABIERTA,
        responsableId: { not: null },
      },
      include: {
        area: true,
        reportes: { where: { anio: anioReporte, mes: mesAnterior } },
      },
    });

    let alertasEnviadas = 0;
    for (const meta of metas) {
      const mesInicio = meta.fechaInicio.getUTCMonth() + 1;
      if (mesAnterior >= mesInicio && meta.reportes.length === 0) {
        // Notificar al responsable
        if (meta.responsableId) {
          await this.notificacionesService.crear({
            usuarioId: meta.responsableId,
            tipoCodigo: 'REPORTE_VENCIDO',
            titulo: `¡Reporte vencido! Meta #${meta.codigo}`,
            mensaje: `El plazo ordinario para reportar el mes ${mesAnterior}/${anioReporte} de la meta "${meta.descripcion}" ha expirado.`,
            enlace: `/metas/${meta.id}`,
          });
          alertasEnviadas++;
        }

        // Notificar al líder de área
        if (meta.area?.liderId && meta.area.liderId !== meta.responsableId) {
          await this.notificacionesService.crear({
            usuarioId: meta.area.liderId,
            tipoCodigo: 'REPORTE_VENCIDO',
            titulo: `Reporte vencido en su área: Meta #${meta.codigo}`,
            mensaje: `La meta #${meta.codigo} del área ${meta.area.codigo} no ha registrado el reporte del mes ${mesAnterior}/${anioReporte}.`,
            enlace: `/metas/${meta.id}`,
          });
          alertasEnviadas++;
        }
      }
    }

    this.logger.log(`Cron finalizado: ${alertasEnviadas} alertas de vencimiento enviadas.`);
  }

  /**
   * RN-06: Proceso nocturno diario (00:05 AM)
   * Cierra automáticamente metas no cumplidas cuya fecha de corte ya pasó
   */
  @Cron('5 0 * * *', { timeZone: 'America/Bogota' })
  async ejecutarProcesoNocturnoCierreMetas() {
    this.logger.log('Iniciando cron: Proceso nocturno de cierre de metas vencidas (RN-06)');
    const hoy = obtenerHoyBogota();
    const hoyStr = hoy.toISOString().slice(0, 10);

    const metas = await this.prisma.meta.findMany({
      where: {
        estado: EstadoMeta.ABIERTA,
        fechaCorte: { lt: hoy },
      },
      include: {
        unidad: true,
        reportes: true,
      },
    });

    const anioActual = hoy.getUTCFullYear();
    const mesActual = hoy.getUTCMonth() + 1;
    let metasCerradas = 0;

    for (const meta of metas) {
      const valorMeta = Number(meta.valorMeta);
      const acum = calcularValorEjecutadoAcum(
        meta.reportes.map((r) => ({
          anio: r.anio,
          mes: r.mes,
          valorEjecutado: Number(r.valorEjecutado),
          costoEjecutado: Number(r.costoEjecutado),
          porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
        })),
        anioActual,
        mesActual,
        meta.unidad.esBinaria,
        valorMeta,
      );

      // Si la fecha de corte pasó y no alcanzó el 100%, pasa a CERRADA_SIN_CUMPLIR
      if (acum < valorMeta) {
        await this.prisma.meta.update({
          where: { id: meta.id },
          data: { estado: EstadoMeta.CERRADA_SIN_CUMPLIR },
        });

        await this.auditoriaService.registrar({
          accion: 'ACTUALIZAR',
          entidad: 'meta',
          entidadId: meta.id,
          motivo: `Cierre automático por fecha de corte expirada (${hoyStr}) sin alcanzar el 100% de cumplimiento (RN-06).`,
          datosAntes: { estado: EstadoMeta.ABIERTA },
          datosDespues: { estado: EstadoMeta.CERRADA_SIN_CUMPLIR },
        });

        metasCerradas++;
      }
    }

    this.logger.log(`Cron nocturno finalizado: ${metasCerradas} metas transicionaron a CERRADA_SIN_CUMPLIR.`);

    // RN-21: Transición automática de estados de tareas en proceso nocturno
    await this.ejecutarProcesoNocturnoTareas(hoy);
  }

  /**
   * RN-21: Proceso nocturno de actualización de estados de tareas
   */
  async ejecutarProcesoNocturnoTareas(hoy: Date) {
    this.logger.log('Iniciando proceso nocturno: Transición de estados de tareas (RN-21)');
    const hoyStr = hoy.toISOString().slice(0, 10);

    const tareasActivas = await this.prisma.tarea.findMany({
      where: {
        estado: { in: [EstadoTarea.PROGRAMADA, EstadoTarea.EN_CURSO] },
      },
      include: {
        meta: { select: { codigo: true } },
      },
    });

    let tareasVencidas = 0;
    let tareasIniciadas = 0;

    for (const t of tareasActivas) {
      const inicioStr = t.fechaInicio.toISOString().slice(0, 10);
      const finStr = t.fechaFin.toISOString().slice(0, 10);

      if (hoyStr > finStr && t.estado !== EstadoTarea.VENCIDA) {
        await this.prisma.tarea.update({
          where: { id: t.id },
          data: { estado: EstadoTarea.VENCIDA },
        });

        // Notificación TAREA_VENCIDA (alerta)
        await this.notificacionesService.crear({
          usuarioId: t.responsableId,
          tipoCodigo: 'TAREA_VENCIDA',
          titulo: `¡Tarea vencida! "${t.titulo}"`,
          mensaje: `La fecha límite (${finStr}) para la tarea "${t.titulo}" de la meta ${t.meta.codigo} ha expirado sin registrar soporte de finalización.`,
          enlace: `/metas/${t.metaId}?tab=tareas`,
        });

        tareasVencidas++;
      } else if (hoyStr >= inicioStr && hoyStr <= finStr && t.estado === EstadoTarea.PROGRAMADA) {
        await this.prisma.tarea.update({
          where: { id: t.id },
          data: { estado: EstadoTarea.EN_CURSO },
        });
        tareasIniciadas++;
      }
    }

    this.logger.log(`Tareas actualizadas: ${tareasVencidas} vencidas, ${tareasIniciadas} pasaron a EN_CURSO.`);
  }

  /**
   * Notificación diaria de tareas por vencer en 3 días (07:00 AM)
   */
  @Cron('0 7 * * *', { timeZone: 'America/Bogota' })
  async ejecutarAvisoTareasPorVencer() {
    this.logger.log('Iniciando cron: Aviso de tareas por vencer (3 días antes)');
    const hoy = obtenerHoyBogota();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + 3);
    const limiteStr = fechaLimite.toISOString().slice(0, 10);

    const tareasPorVencer = await this.prisma.tarea.findMany({
      where: {
        estado: { in: [EstadoTarea.PROGRAMADA, EstadoTarea.EN_CURSO] },
        fechaFin: {
          gte: new Date(`${limiteStr}T00:00:00.000Z`),
          lte: new Date(`${limiteStr}T23:59:59.999Z`),
        },
      },
      include: {
        meta: { select: { codigo: true } },
      },
    });

    for (const t of tareasPorVencer) {
      await this.notificacionesService.crear({
        usuarioId: t.responsableId,
        tipoCodigo: 'TAREA_POR_VENCER',
        titulo: `Tarea por vencer en 3 días: "${t.titulo}"`,
        mensaje: `La tarea "${t.titulo}" de la meta ${t.meta.codigo} tiene fecha límite el ${limiteStr}. Recuerde adjuntar evidencias antes de finalizar.`,
        enlace: `/metas/${t.metaId}?tab=tareas`,
      });
    }

    this.logger.log(`Avisos de vencimiento enviados: ${tareasPorVencer.length}`);
  }

  /**
   * Control automático de CONTRATISTAS (Punto 7):
   * 1. Notifica 7 días antes al líder del área informando el vencimiento próximo.
   * 2. Inactiva automáticamente a los contratistas cuya fecha de contrato haya expirado.
   */
  @Cron('0 6 * * *', { timeZone: 'America/Bogota' })
  async ejecutarControlContratistas() {
    this.logger.log('Iniciando cron: Control y verificación de contratos de contratistas');
    const hoy = obtenerHoyBogota();
    const hoyStr = hoy.toISOString().slice(0, 10);

    // 1. Alerta 7 días antes
    const enSieteDias = new Date(hoy);
    enSieteDias.setDate(enSieteDias.getDate() + 7);
    const avisoStr = enSieteDias.toISOString().slice(0, 10);

    const porVencer = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.CONTRATISTA,
        activo: true,
        fechaFinContrato: {
          gte: new Date(`${avisoStr}T00:00:00.000Z`),
          lte: new Date(`${avisoStr}T23:59:59.999Z`),
        },
      },
      include: { area: true },
    });

    for (const c of porVencer) {
      if (c.area?.liderId) {
        await this.notificacionesService.crear({
          usuarioId: c.area.liderId,
          tipoCodigo: 'REPORTE_PENDIENTE',
          titulo: `Aviso: Contrato de ${c.nombre} vence en 7 días`,
          mensaje: `El contrato del contratista ${c.nombre} (${c.cargo || 'Contratista'}) asignado a su área (${c.area.nombre}) finaliza el ${avisoStr}. Si no es renovado, el usuario será inactivado automáticamente.`,
          enlace: '/admin/usuarios',
        });
      }
    }

    // 2. Inactivación automática de contratos ya vencidos
    const vencidos = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.CONTRATISTA,
        activo: true,
        fechaFinContrato: {
          lt: new Date(`${hoyStr}T00:00:00.000Z`),
        },
      },
      include: { area: true },
    });

    for (const c of vencidos) {
      await this.prisma.usuario.update({
        where: { id: c.id },
        data: { activo: false },
      });

      if (c.area?.liderId) {
        await this.notificacionesService.crear({
          usuarioId: c.area.liderId,
          tipoCodigo: 'REPORTE_VENCIDO',
          titulo: `Contratista inactivado: ${c.nombre}`,
          mensaje: `El contrato del contratista ${c.nombre} finalizó el ${c.fechaFinContrato?.toISOString().slice(0, 10)}. El usuario ha sido inactivado automáticamente.`,
          enlace: '/admin/usuarios',
        });
      }

      await this.auditoriaService.registrar({
        accion: 'INACTIVAR',
        entidad: 'usuario',
        entidadId: c.id,
        motivo: 'Inactivación automática por vencimiento de contrato',
      });
    }

    this.logger.log(`Control contratistas: ${porVencer.length} avisos 7 días, ${vencidos.length} inactivados.`);
  }
}
