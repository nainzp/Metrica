import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { RolUsuario, EstadoMeta, OrigenReporte } from '@prisma/client';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import {
  calcularValorEjecutadoAcum,
  calcularCostoEjecutadoAcum,
  calcularAvanceIndicador,
  calcularAvancePlaneado,
  calcularSemaforoMeta,
  tieneGastoSobrePresupuesto,
  tieneGastoSobreAvance,
} from '../comun/calculos';
import { obtenerHoyBogota } from '../comun/fecha';

export interface CrearReporteDto {
  anio: number;
  mes: number;
  valorEjecutado?: number;
  costoEjecutado?: number;
  porcentajeBinario?: number;
  observacion?: string;
}

export interface CorregirReporteDto {
  valorEjecutado?: number;
  costoEjecutado?: number;
  porcentajeBinario?: number;
  observacion?: string;
  motivo: string;
}

@Injectable()
export class ReportesService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * CU-05: Registrar reporte mensual (RN-08, RN-11, RN-12, RN-14, RN-15, RN-17, RN-05)
   */
  async crearReporte(metaId: string, dto: CrearReporteDto, usuario: UsuarioAutenticado) {
    const hoy = obtenerHoyBogota();
    const anioActual = hoy.getUTCFullYear();
    const mesActual = hoy.getUTCMonth() + 1;

    const meta = await this.prisma.meta.findUnique({
      where: { id: metaId },
      include: {
        unidad: true,
        area: true,
        responsable: true,
        reportes: true,
        programaciones: true,
      },
    });

    if (!meta) throw new NotFoundException('Meta no encontrada');

    // RN-12: Permiso de reporte
    const esAdmin = usuario.rol === RolUsuario.ADMINISTRADOR;
    const esLiderArea = usuario.rol === RolUsuario.LIDER_AREA && usuario.areaId === meta.areaId;
    const esResponsable = meta.responsableId === usuario.id;

    if (!esAdmin && !esLiderArea && !esResponsable) {
      throw new ForbiddenException('No tiene permisos para registrar reportes en esta meta.');
    }

    // RN-12: Validación de mes y año
    if (dto.anio !== 2026) {
      throw new BadRequestException('El año del reporte debe ser 2026.');
    }
    if (dto.mes < 1 || dto.mes > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12.');
    }
    if (dto.mes > mesActual) {
      throw new BadRequestException('No es posible registrar reportes para meses futuros.');
    }

    const mesInicioMeta = meta.fechaInicio.getUTCMonth() + 1;
    if (dto.mes < mesInicioMeta) {
      throw new BadRequestException(`El mes no puede ser anterior a la fecha de inicio de la meta (${mesInicioMeta}).`);
    }

    // RN-11: Reporte único por mes
    const reporteExistente = meta.reportes.find((r) => r.anio === dto.anio && r.mes === dto.mes);
    if (reporteExistente) {
      throw new BadRequestException(
        `Ya existe un reporte registrado para el mes ${dto.mes}/${dto.anio}. Debe realizar una corrección.`,
      );
    }

    // RN-17: Metas CUMPLIDA y CERRADA_SIN_CUMPLIR
    if (meta.estado === EstadoMeta.CERRADA_SIN_CUMPLIR) {
      throw new BadRequestException('No se pueden registrar reportes en una meta cerrada sin cumplir.');
    }
    if (meta.estado === EstadoMeta.CUMPLIDA && (dto.valorEjecutado || 0) > 0) {
      throw new BadRequestException(
        'La meta ya está cumplida. Solo admite reportes de costo con observación justificativa.',
      );
    }

    const esBinaria = meta.unidad.esBinaria;
    let valorEjecutadoFinal = Number(dto.valorEjecutado) || 0;
    let porcentajeBinarioFinal: number | null = null;

    if (valorEjecutadoFinal < 0) {
      throw new BadRequestException('El valor ejecutado no puede ser negativo.');
    }
    const costoEjecutadoFinal = Number(dto.costoEjecutado) || 0;
    if (costoEjecutadoFinal < 0) {
      throw new BadRequestException('El costo ejecutado no puede ser negativo.');
    }

    // RN-08: Manejo de unidades binarias
    if (esBinaria) {
      const pct = dto.porcentajeBinario != null ? Number(dto.porcentajeBinario) : (valorEjecutadoFinal >= Number(meta.valorMeta) ? 100 : 0);
      if (pct < 0 || pct > 100) {
        throw new BadRequestException('El porcentaje binario debe estar entre 0 y 100.');
      }
      porcentajeBinarioFinal = pct;
      valorEjecutadoFinal = Math.round(((pct / 100) * Number(meta.valorMeta)) * 100) / 100;

      if (pct > 0 && pct < 100 && (!dto.observacion || dto.observacion.trim().length < 5)) {
        throw new BadRequestException('Un avance binario intermedio (1% a 99%) exige una observación explicativa (mínimo 5 caracteres).');
      }
    }

    // Simular acumulación para validar RN-14 y RN-15
    const reportesSimulados = [
      ...meta.reportes.map((r) => ({
        anio: r.anio,
        mes: r.mes,
        valorEjecutado: Number(r.valorEjecutado),
        costoEjecutado: Number(r.costoEjecutado),
        porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
      })),
      {
        anio: dto.anio,
        mes: dto.mes,
        valorEjecutado: valorEjecutadoFinal,
        costoEjecutado: costoEjecutadoFinal,
        porcentajeBinario: porcentajeBinarioFinal,
      },
    ];

    const valorMetaNum = Number(meta.valorMeta);
    const presupuestoNum = meta.presupuestoProgramado ? Number(meta.presupuestoProgramado) : null;

    const nuevoValorEjecutadoAcum = calcularValorEjecutadoAcum(
      reportesSimulados,
      anioActual,
      mesActual,
      esBinaria,
      valorMetaNum,
    );

    const nuevoCostoEjecutadoAcum = calcularCostoEjecutadoAcum(
      reportesSimulados,
      anioActual,
      mesActual,
    );

    // RN-14: Validación gasto sobre presupuesto
    const gastoExcedePresupuesto = tieneGastoSobrePresupuesto(nuevoCostoEjecutadoAcum, presupuestoNum);
    if (gastoExcedePresupuesto && (!dto.observacion || dto.observacion.trim().length < 5)) {
      throw new BadRequestException(
        `El costo acumulado ($${nuevoCostoEjecutadoAcum.toLocaleString()}) excede el presupuesto programado ($${presupuestoNum?.toLocaleString()}). Debe incluir una observación justificativa.`,
      );
    }

    // RN-15: Alerta de gasto sobre avance
    const nuevoAvanceIndicador = calcularAvanceIndicador(nuevoValorEjecutadoAcum, valorMetaNum);
    const gastoExcedeAvance = tieneGastoSobreAvance(nuevoCostoEjecutadoAcum, presupuestoNum, nuevoAvanceIndicador, 20);

    // RN-05: Transición automática a CUMPLIDA
    const alcanzaCumplimiento = esBinaria ? porcentajeBinarioFinal === 100 : nuevoValorEjecutadoAcum >= valorMetaNum;
    const nuevoEstado = alcanzaCumplimiento ? EstadoMeta.CUMPLIDA : meta.estado === EstadoMeta.PENDIENTE_COMPLETAR ? EstadoMeta.ABIERTA : meta.estado;

    // Crear reporte en transacción
    const resultado = await this.prisma.$transaction(async (tx) => {
      const rep = await tx.reporteMensual.create({
        data: {
          metaId,
          anio: dto.anio,
          mes: dto.mes,
          valorEjecutado: valorEjecutadoFinal,
          costoEjecutado: costoEjecutadoFinal,
          porcentajeBinario: porcentajeBinarioFinal,
          observacion: dto.observacion?.trim() || null,
          origen: OrigenReporte.MANUAL,
          reportadoPor: usuario.id,
          reportadoEn: new Date(),
        },
      });

      if (nuevoEstado !== meta.estado) {
        await tx.meta.update({
          where: { id: metaId },
          data: { estado: nuevoEstado },
        });
      }

      return rep;
    });

    // Auditoría
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CREAR',
      entidad: 'reporte_mensual',
      entidadId: resultado.id,
      datosDespues: resultado,
    });

    // Notificaciones normativas automáticas
    // 1. Meta Cumplida
    if (nuevoEstado === EstadoMeta.CUMPLIDA && meta.estado !== EstadoMeta.CUMPLIDA) {
      await this.notificarMetaCumplida(meta);
    }

    // 2. Gasto sobre presupuesto (RN-14)
    if (gastoExcedePresupuesto) {
      await this.notificarAlertaPresupuesto(meta, nuevoCostoEjecutadoAcum, presupuestoNum!);
    }

    // 3. Gasto sobre avance (RN-15)
    if (gastoExcedeAvance) {
      await this.notificarGastoSobreAvance(meta, nuevoCostoEjecutadoAcum, presupuestoNum!, nuevoAvanceIndicador);
    }

    return resultado;
  }

  /**
   * CU-06: Corregir un reporte mensual existente (RN-05, RN-13)
   */
  async corregirReporte(id: string, dto: CorregirReporteDto, usuario: UsuarioAutenticado) {
    if (!dto.motivo || dto.motivo.trim().length < 5) {
      throw new BadRequestException('El motivo de la corrección es obligatorio (mínimo 5 caracteres).');
    }

    const reporte = await this.prisma.reporteMensual.findUnique({
      where: { id },
      include: {
        meta: {
          include: {
            unidad: true,
            area: true,
            responsable: true,
            reportes: true,
            programaciones: true,
          },
        },
      },
    });

    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    const { meta } = reporte;

    // RN-13: Permisos de corrección
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const esAdmin = usuario.rol === RolUsuario.ADMINISTRADOR;
    const esLiderArea = usuario.rol === RolUsuario.LIDER_AREA && usuario.areaId === meta.areaId;
    const esLiderComp =
      usuario.rol === RolUsuario.LIDER_COMPONENTE &&
      usuario.componenteId === meta.componenteId &&
      reporte.mes === mesActual;

    if (!esAdmin && !esLiderArea && !esLiderComp) {
      throw new ForbiddenException('No tiene permisos para corregir este reporte.');
    }

    const esBinaria = meta.unidad.esBinaria;
    let nuevoValorEjecutado = dto.valorEjecutado !== undefined ? Number(dto.valorEjecutado) : Number(reporte.valorEjecutado);
    let nuevoPorcentajeBinario = reporte.porcentajeBinario ? Number(reporte.porcentajeBinario) : null;

    if (esBinaria && dto.porcentajeBinario !== undefined) {
      nuevoPorcentajeBinario = Number(dto.porcentajeBinario);
      nuevoValorEjecutado = Math.round(((nuevoPorcentajeBinario / 100) * Number(meta.valorMeta)) * 100) / 100;
    }

    const nuevoCostoEjecutado = dto.costoEjecutado !== undefined ? Number(dto.costoEjecutado) : Number(reporte.costoEjecutado);

    // Simular acumulación para RN-05 en ambas direcciones
    const anioActual = hoy.getUTCFullYear();
    const reportesSimulados = meta.reportes.map((r) => {
      if (r.id === id) {
        return {
          anio: r.anio,
          mes: r.mes,
          valorEjecutado: nuevoValorEjecutado,
          costoEjecutado: nuevoCostoEjecutado,
          porcentajeBinario: nuevoPorcentajeBinario,
        };
      }
      return {
        anio: r.anio,
        mes: r.mes,
        valorEjecutado: Number(r.valorEjecutado),
        costoEjecutado: Number(r.costoEjecutado),
        porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
      };
    });

    const valorMetaNum = Number(meta.valorMeta);
    const nuevoValorEjecutadoAcum = calcularValorEjecutadoAcum(
      reportesSimulados,
      anioActual,
      mesActual,
      esBinaria,
      valorMetaNum,
    );

    // RN-05: Si baja por debajo de la meta, vuelve a ABIERTA; si alcanza, CUMPLIDA
    let nuevoEstadoMeta = meta.estado;
    if (esBinaria) {
      nuevoEstadoMeta = nuevoPorcentajeBinario === 100 ? EstadoMeta.CUMPLIDA : EstadoMeta.ABIERTA;
    } else {
      nuevoEstadoMeta = nuevoValorEjecutadoAcum >= valorMetaNum ? EstadoMeta.CUMPLIDA : EstadoMeta.ABIERTA;
    }

    const actualizado = await this.prisma.$transaction(async (tx) => {
      const repAct = await tx.reporteMensual.update({
        where: { id },
        data: {
          valorEjecutado: nuevoValorEjecutado,
          costoEjecutado: nuevoCostoEjecutado,
          porcentajeBinario: nuevoPorcentajeBinario,
          observacion: dto.observacion !== undefined ? dto.observacion : reporte.observacion,
          origen: OrigenReporte.CORRECCION,
        },
      });

      if (nuevoEstadoMeta !== meta.estado) {
        await tx.meta.update({
          where: { id: meta.id },
          data: { estado: nuevoEstadoMeta },
        });
      }

      return repAct;
    });

    // Registrar en auditoría CORREGIR_REPORTE
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CORREGIR_REPORTE',
      entidad: 'reporte_mensual',
      entidadId: id,
      motivo: dto.motivo.trim(),
      datosAntes: reporte,
      datosDespues: actualizado,
    });

    // Notificar al responsable REPORTE_CORREGIDO
    if (meta.responsableId) {
      await this.notificacionesService.crear({
        usuarioId: meta.responsableId,
        tipoCodigo: 'REPORTE_CORREGIDO',
        titulo: `Reporte de ${meta.codigo} corregido`,
        mensaje: `El reporte del mes ${reporte.mes}/${reporte.anio} para la meta ${meta.codigo} fue corregido por ${usuario.nombre}. Motivo: ${dto.motivo.trim()}`,
        enlace: `/metas/${meta.id}`,
      });
    }

    return actualizado;
  }

  /**
   * Cálculo y simulación de reporte en caliente antes de guardar (para el modal dinámico del frontend)
   */
  async proyectarReporte(metaId: string, dto: CrearReporteDto) {
    const meta = await this.prisma.meta.findUnique({
      where: { id: metaId },
      include: {
        unidad: true,
        reportes: true,
        programaciones: true,
      },
    });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    const hoy = obtenerHoyBogota();
    const anioActual = hoy.getUTCFullYear();
    const mesActual = hoy.getUTCMonth() + 1;
    const esBinaria = meta.unidad.esBinaria;
    const valorMeta = Number(meta.valorMeta);

    let valEjec = Number(dto.valorEjecutado) || 0;
    let pctBin = dto.porcentajeBinario != null ? Number(dto.porcentajeBinario) : null;
    if (esBinaria && pctBin != null) {
      valEjec = Math.round(((pctBin / 100) * valorMeta) * 100) / 100;
    }

    const costoEjec = Number(dto.costoEjecutado) || 0;

    // Reportes acumulados actuales vs proyectados
    const reportesActuales = meta.reportes.map((r) => ({
      anio: r.anio,
      mes: r.mes,
      valorEjecutado: Number(r.valorEjecutado),
      costoEjecutado: Number(r.costoEjecutado),
      porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
    }));

    const reportesProyectados = [
      ...reportesActuales.filter((r) => !(r.anio === dto.anio && r.mes === dto.mes)),
      {
        anio: dto.anio,
        mes: dto.mes,
        valorEjecutado: valEjec,
        costoEjecutado: costoEjec,
        porcentajeBinario: pctBin,
      },
    ];

    const actualAcum = calcularValorEjecutadoAcum(reportesActuales, anioActual, mesActual, esBinaria, valorMeta);
    const proyectadoAcum = calcularValorEjecutadoAcum(reportesProyectados, anioActual, mesActual, esBinaria, valorMeta);

    const actualAvance = calcularAvanceIndicador(actualAcum, valorMeta);
    const proyectadoAvance = calcularAvanceIndicador(proyectadoAcum, valorMeta);

    const progItems = meta.programaciones.map((p) => ({
      anio: p.anio,
      mes: p.mes,
      valorProgramado: Number(p.valorProgramado),
    }));
    const avancePlaneado = calcularAvancePlaneado(progItems, valorMeta, hoy, meta.fechaInicio);

    const semaforoActual = calcularSemaforoMeta(
      meta.estado,
      actualAvance,
      avancePlaneado,
      meta.fechaCorte,
      hoy,
    );
    const semaforoProyectado = calcularSemaforoMeta(
      proyectadoAcum >= valorMeta || pctBin === 100 ? EstadoMeta.CUMPLIDA : meta.estado,
      proyectadoAvance,
      avancePlaneado,
      meta.fechaCorte,
      hoy,
    );

    const presupuestoNum = meta.presupuestoProgramado ? Number(meta.presupuestoProgramado) : null;
    const proyectadoCostoAcum = calcularCostoEjecutadoAcum(reportesProyectados, anioActual, mesActual);
    const sobrePresupuesto = tieneGastoSobrePresupuesto(proyectadoCostoAcum, presupuestoNum);
    const sobreAvance = tieneGastoSobreAvance(proyectadoCostoAcum, presupuestoNum, proyectadoAvance, 20);

    return {
      valorMeta,
      actual: {
        acumulado: actualAcum,
        avance: actualAvance,
        semaforo: semaforoActual.color,
        brecha: semaforoActual.brecha,
      },
      proyectado: {
        acumulado: proyectadoAcum,
        avance: proyectadoAvance,
        avancePlaneado,
        semaforo: semaforoProyectado.color,
        brecha: semaforoProyectado.brecha,
        cumpleMeta: proyectadoAcum >= valorMeta || pctBin === 100,
        sobrePresupuesto,
        sobreAvance,
        costoAcumulado: proyectadoCostoAcum,
      },
    };
  }

  /**
   * Obtiene un reporte por su ID
   */
  async obtenerPorId(id: string) {
    const reporte = await this.prisma.reporteMensual.findUnique({
      where: { id },
      include: {
        meta: { include: { unidad: true, area: true, responsable: true } },
        usuario: { select: { id: true, nombre: true, correo: true, cargo: true } },
        soportes: true,
      },
    });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    return reporte;
  }

  /**
   * Lista reportes de una meta
   */
  async listarPorMeta(metaId: string) {
    return this.prisma.reporteMensual.findMany({
      where: { metaId },
      include: {
        usuario: { select: { id: true, nombre: true, correo: true, cargo: true } },
        soportes: true,
      },
      orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
    });
  }

  // --- Auxiliares de Notificaciones ---

  private async notificarMetaCumplida(meta: any) {
    const liderArea = meta.area.liderId
      ? await this.prisma.usuario.findUnique({ where: { id: meta.area.liderId } })
      : null;

    const destinatarios = new Set<string>();
    if (meta.responsableId) destinatarios.add(meta.responsableId);
    if (liderArea) destinatarios.add(liderArea.id);

    // Buscar usuarios del despacho
    const despachoUsers = await this.prisma.usuario.findMany({
      where: { rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] }, activo: true },
    });
    despachoUsers.forEach((u) => destinatarios.add(u.id));

    for (const usuarioId of destinatarios) {
      await this.notificacionesService.crear({
        usuarioId,
        tipoCodigo: 'META_CUMPLIDA',
        titulo: `¡Meta #${meta.codigo} Cumplida!`,
        mensaje: `La meta #${meta.codigo} (${meta.descripcion}) ha alcanzado el 100% de su valor programado.`,
        enlace: `/metas/${meta.id}`,
      });
    }
  }

  private async notificarAlertaPresupuesto(meta: any, costoAcum: number, presupuesto: number) {
    const destinatarios = new Set<string>();
    if (meta.area?.liderId) destinatarios.add(meta.area.liderId);

    const despachoUsers = await this.prisma.usuario.findMany({
      where: { rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] }, activo: true },
    });
    despachoUsers.forEach((u) => destinatarios.add(u.id));

    for (const usuarioId of destinatarios) {
      await this.notificacionesService.crear({
        usuarioId,
        tipoCodigo: 'GASTO_SOBRE_PRESUPUESTO',
        titulo: `Alerta: Sobrecosto en Meta #${meta.codigo}`,
        mensaje: `El costo ejecutado ($${costoAcum.toLocaleString()}) de la meta #${meta.codigo} ha superado el presupuesto programado ($${presupuesto.toLocaleString()}).`,
        enlace: `/metas/${meta.id}`,
      });
    }
  }

  private async notificarGastoSobreAvance(meta: any, costoAcum: number, presupuesto: number, avanceIndicador: number) {
    const pctGasto = Math.round((costoAcum / presupuesto) * 1000) / 10;
    const destinatarios = new Set<string>();
    if (meta.area?.liderId) destinatarios.add(meta.area.liderId);

    const despachoUsers = await this.prisma.usuario.findMany({
      where: { rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] }, activo: true },
    });
    despachoUsers.forEach((u) => destinatarios.add(u.id));

    for (const usuarioId of destinatarios) {
      await this.notificacionesService.crear({
        usuarioId,
        tipoCodigo: 'GASTO_SOBRE_AVANCE',
        titulo: `Alerta RN-15: Gasto sobre avance en Meta #${meta.codigo}`,
        mensaje: `En la meta #${meta.codigo}, el gasto financiero (${pctGasto}%) excede en más de 20 puntos al avance del indicador (${avanceIndicador}%).`,
        enlace: `/metas/${meta.id}`,
      });
    }
  }
}
