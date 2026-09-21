import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario, EstadoMeta } from '@prisma/client';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import {
  calcularValorEjecutadoAcum,
  calcularCostoEjecutadoAcum,
  generarProgramacionUniforme,
  calcularAvancePlaneado,
  calcularAvanceIndicador,
  calcularAvanceIndicadorReal,
  calcularAvanceOperativo,
  calcularSemaforoMeta,
  tieneGastoSobrePresupuesto,
  tieneGastoSobreAvance,
} from '../comun/calculos';
import { obtenerHoyBogota, parsearFechaUtc } from '../comun/fecha';

@Injectable()
export class MetasService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  /**
   * Enriquece una entidad Meta con todos los campos calculados normativos (sección 4.2 y 6)
   */
  enriquecerMeta(meta: any, hoy = obtenerHoyBogota(), umbralAmarillo = 15, trimestre?: number) {
    const valorMeta = Number(meta.valorMeta) || 0;
    const esBinaria = Boolean(meta.unidad?.esBinaria);

    // Formatear reportes para cálculo
    const reportesItem = (meta.reportes || []).map((r: any) => ({
      anio: r.anio,
      mes: r.mes,
      valorEjecutado: Number(r.valorEjecutado) || 0,
      costoEjecutado: Number(r.costoEjecutado) || 0,
      porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
    }));

    const anioActual = hoy.getUTCFullYear();
    const mesActual = hoy.getUTCMonth() + 1;

    const valorEjecutadoAcum = calcularValorEjecutadoAcum(
      reportesItem,
      anioActual,
      mesActual,
      esBinaria,
      valorMeta,
    );

    const costoEjecutadoAcum = calcularCostoEjecutadoAcum(
      reportesItem,
      anioActual,
      mesActual,
    );

    const avanceIndicador = calcularAvanceIndicador(valorEjecutadoAcum, valorMeta);
    const avanceIndicadorReal = calcularAvanceIndicadorReal(valorEjecutadoAcum, valorMeta);

    const programacionesItem = (meta.programaciones || []).map((p: any) => ({
      anio: p.anio,
      mes: p.mes,
      valorProgramado: Number(p.valorProgramado) || 0,
    }));

    const avancePlaneado = calcularAvancePlaneado(
      programacionesItem,
      valorMeta,
      hoy,
      meta.fechaInicio,
    );

    const evaluacionSemaforo = calcularSemaforoMeta(
      meta.estado,
      avanceIndicador,
      avancePlaneado,
      meta.fechaCorte,
      hoy,
      umbralAmarillo,
    );

    // Tareas
    const totalTareas = meta.tareas?.length || 0;
    const tareasFinalizadas =
      meta.tareas?.filter((t: any) => t.estado === 'FINALIZADA').length || 0;
    const tareasCanceladas =
      meta.tareas?.filter((t: any) => t.estado === 'CANCELADA').length || 0;
    const avanceOperativo = calcularAvanceOperativo(
      totalTareas,
      tareasFinalizadas,
      tareasCanceladas,
    );

    // Último mes reportado (hasta la fecha de referencia)
    let ultimoMesReportado: { anio: number; mes: number } | null = null;
    if (meta.reportes && meta.reportes.length > 0) {
      const reportesHastaFecha = meta.reportes.filter(
        (r: any) => r.anio < anioActual || (r.anio === anioActual && r.mes <= mesActual),
      );
      if (reportesHastaFecha.length > 0) {
        const ordenados = [...reportesHastaFecha].sort((a, b) =>
          a.anio !== b.anio ? b.anio - a.anio : b.mes - a.mes,
        );
        ultimoMesReportado = { anio: ordenados[0].anio, mes: ordenados[0].mes };
      }
    }

    // Observaciones pendientes
    const tieneObservacionPendiente =
      meta.observaciones?.some((o: any) => !o.atendida) || false;

    // Alertas financieras
    const presupuesto = meta.presupuestoProgramado != null ? Number(meta.presupuestoProgramado) : null;
    const sobrePresupuesto = tieneGastoSobrePresupuesto(presupuesto, costoEjecutadoAcum);
    const sobreAvance = tieneGastoSobreAvance(presupuesto, costoEjecutadoAcum, avanceIndicador);

    // Cálculo específico de Trimestre (si se solicita)
    let datosTrimestre: any = null;
    let programadoTrimestre = 0;
    let ejecutadoTrimestre = 0;
    let costoEjecutadoTrimestre = 0;
    let cumplimientoTrimestre = 0;
    let tieneReporteTrimestre = false;

    if (trimestre && trimestre >= 1 && trimestre <= 4) {
      const mesesTrim = [(trimestre - 1) * 3 + 1, (trimestre - 1) * 3 + 2, (trimestre - 1) * 3 + 3];
      const progsTrim = (meta.programaciones || []).filter(
        (p: any) => p.anio === 2026 && mesesTrim.includes(p.mes),
      );
      const repsTrim = (meta.reportes || []).filter(
        (r: any) => r.anio === 2026 && mesesTrim.includes(r.mes),
      );

      programadoTrimestre = progsTrim.reduce(
        (acc: number, p: any) => acc + (Number(p.valorProgramado) || 0),
        0,
      );
      ejecutadoTrimestre = repsTrim.reduce(
        (acc: number, r: any) => acc + (Number(r.valorEjecutado) || 0),
        0,
      );
      costoEjecutadoTrimestre = repsTrim.reduce(
        (acc: number, r: any) => acc + (Number(r.costoEjecutado) || 0),
        0,
      );

      if (esBinaria) {
        const pctBin = repsTrim
          .filter((r: any) => r.porcentajeBinario != null)
          .map((r: any) => Number(r.porcentajeBinario));
        if (pctBin.length > 0) {
          ejecutadoTrimestre = Math.max(...pctBin);
        }
      }

      if (programadoTrimestre > 0) {
        cumplimientoTrimestre = Math.min(
          100,
          Math.round((ejecutadoTrimestre / programadoTrimestre) * 1000) / 10,
        );
      } else if (ejecutadoTrimestre > 0) {
        cumplimientoTrimestre = 100;
      }

      tieneReporteTrimestre =
        repsTrim.length > 0 &&
        (ejecutadoTrimestre > 0 ||
          costoEjecutadoTrimestre > 0 ||
          repsTrim.some((r: any) => r.porcentajeBinario != null));

      datosTrimestre = {
        trimestre,
        meses: mesesTrim,
        programadoTrimestre: Math.round(programadoTrimestre * 100) / 100,
        ejecutadoTrimestre: Math.round(ejecutadoTrimestre * 100) / 100,
        costoEjecutadoTrimestre,
        cumplimientoTrimestre,
        tieneReporteTrimestre,
      };
    }

    // Resumen Operador (Contrato de Gestión)
    const tieneOperador = Boolean(meta.tieneOperador);
    const actividadesOp = meta.actividadesOperador || [];
    const totalActividadesOp = actividadesOp.length;
    const actividadesEjecutadasOp = actividadesOp.filter((a: any) => a.estado === 'EJECUTADA').length;
    const actividadesEnEjecucionOp = actividadesOp.filter((a: any) => a.estado === 'EN_EJECUCION').length;
    const actividadesPendientesOp = actividadesOp.filter((a: any) => a.estado === 'PENDIENTE').length;
    const actividadesADemandaOp = actividadesOp.filter((a: any) => a.estado === 'A_DEMANDA').length;
    const porcentajeOperador = totalActividadesOp > 0
      ? Math.round(
          (actividadesOp.reduce((sum: number, a: any) => sum + (Number(a.porcentajeCumplimiento) || 0), 0) /
            totalActividadesOp) *
            10,
        ) / 10
      : null;

    const resumenOperador = tieneOperador
      ? {
          tieneOperador: true,
          totalActividades: totalActividadesOp,
          ejecutadas: actividadesEjecutadasOp,
          enEjecucion: actividadesEnEjecucionOp,
          pendientes: actividadesPendientesOp,
          aDemanda: actividadesADemandaOp,
          porcentajeCumplimiento: porcentajeOperador,
          estadoPrincipal:
            actividadesEjecutadasOp === totalActividadesOp && totalActividadesOp > 0
              ? 'EJECUTADA'
              : actividadesEnEjecucionOp > 0
                ? 'EN_EJECUCION'
                : actividadesADemandaOp > 0 && actividadesEjecutadasOp === 0 && actividadesPendientesOp === 0
                  ? 'A_DEMANDA'
                  : 'PENDIENTE',
        }
      : null;

    return {
      ...meta,
      tieneOperador,
      resumenOperador,
      valorMeta,
      presupuestoProgramado: presupuesto,
      valorEjecutadoAcum,
      costoEjecutadoAcum,
      avanceIndicador,
      avanceIndicadorReal,
      avancePlaneado,
      avanceOperativo,
      semaforo: evaluacionSemaforo.color,
      brecha: evaluacionSemaforo.brecha,
      totalTareas,
      tareasFinalizadas,
      ultimoMesReportado,
      tieneObservacionPendiente,
      sobrePresupuesto,
      sobreAvance,
      datosTrimestre,
      programadoTrimestre,
      ejecutadoTrimestre,
      costoEjecutadoTrimestre,
      cumplimientoTrimestre,
      tieneReporteTrimestre,
    };
  }

  /**
   * Listado de metas con filtros, paginación y campos calculados
   */
  async listar(
    filtros: {
      areaId?: string;
      componenteId?: string;
      responsableId?: string;
      estado?: EstadoMeta;
      semaforo?: string;
      fuenteId?: string;
      poblacionId?: string;
      unidadId?: string;
      busqueda?: string;
      sinReporte?: boolean;
      pagina?: number;
      tamano?: number;
      mes?: number;
      trimestre?: number;
      ejecutor?: string;
    },
    usuario: UsuarioAutenticado,
  ) {
    const pagina = Number(filtros.pagina) || 1;
    const tamano = Number(filtros.tamano) || 50;
    const skip = (pagina - 1) * tamano;

    const where: any = {};

    // Aplicar alcance según rol
    if (usuario.rol === RolUsuario.LIDER_AREA) {
      where.areaId = usuario.areaId;
    } else if (usuario.rol === RolUsuario.LIDER_COMPONENTE) {
      where.areaId = usuario.areaId;
      if (usuario.componenteId) where.componenteId = usuario.componenteId;
    }

    if (filtros.areaId) where.areaId = filtros.areaId;
    if (filtros.componenteId) where.componenteId = filtros.componenteId;
    if (filtros.responsableId) where.responsableId = filtros.responsableId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.fuenteId) where.fuenteRecursoId = filtros.fuenteId;
    if (filtros.poblacionId) where.poblacionSujetoId = filtros.poblacionId;
    if (filtros.unidadId) where.unidadId = filtros.unidadId;

    if (filtros.ejecutor === 'OPERADOR') {
      where.tieneOperador = true;
    } else if (filtros.ejecutor === 'SECRETARIA') {
      where.tieneOperador = false;
    }

    if (filtros.busqueda) {
      where.OR = [
        { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const [total, metasDb] = await Promise.all([
      this.prisma.meta.count({ where }),
      this.prisma.meta.findMany({
        where,
        include: {
          area: { select: { id: true, codigo: true, nombre: true } },
          componente: { select: { id: true, codigo: true, nombre: true } },
          responsable: { select: { id: true, nombre: true, correo: true, cargo: true } },
          unidad: true,
          fuenteRecurso: true,
          poblacionSujeto: true,
          programaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
          reportes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
          tareas: { select: { id: true, estado: true } },
          observaciones: { select: { id: true, atendida: true } },
          actividadesOperador: true,
        },
        orderBy: [{ area: { nombre: 'asc' } }, { codigo: 'asc' }],
        skip,
        take: tamano,
      }),
    ]);

    const trim =
      filtros.trimestre && Number(filtros.trimestre) >= 1 && Number(filtros.trimestre) <= 4
        ? Number(filtros.trimestre)
        : null;
    const mesEfectivo = trim
      ? trim * 3
      : filtros.mes && Number(filtros.mes) >= 1 && Number(filtros.mes) <= 12
        ? Number(filtros.mes)
        : null;

    const hoy = mesEfectivo
      ? new Date(Date.UTC(2026, mesEfectivo, 0, 23, 59, 59, 999))
      : obtenerHoyBogota();
    let metasEnriquecidas = metasDb.map((m) =>
      this.enriquecerMeta(m, hoy, 15, trim || undefined),
    );

    if (filtros.semaforo) {
      metasEnriquecidas = metasEnriquecidas.filter(
        (m) => m.semaforo === filtros.semaforo?.toUpperCase(),
      );
    }

    if (filtros.sinReporte) {
      const mesActual = hoy.getUTCMonth() + 1;
      const anioActual = hoy.getUTCFullYear();
      metasEnriquecidas = metasEnriquecidas.filter(
        (m) =>
          m.estado === 'ABIERTA' &&
          !m.reportes?.some((r: any) => r.anio === anioActual && r.mes === mesActual),
      );
    }

    const tieneDatosTrimestre = trim
      ? metasEnriquecidas.some((m) => m.tieneReporteTrimestre)
      : true;

    return {
      datos: metasEnriquecidas,
      total,
      pagina,
      tamano,
      trimestreSeleccionado: trim,
      tieneDatosTrimestre,
      mensajeTrimestre:
        trim && !tieneDatosTrimestre
          ? `Sin reportes: No se registran avances o reportes periódicos para el Trimestre ${trim}.`
          : null,
    };
  }

  /**
   * Obtiene la ficha técnica completa de una meta (CU-12 / CU-04 / CU-05)
   */
  async obtenerPorId(id: string, usuario?: UsuarioAutenticado) {
    const meta = await this.prisma.meta.findUnique({
      where: { id },
      include: {
        area: true,
        componente: true,
        responsable: true,
        unidad: true,
        fuenteRecurso: true,
        poblacionSujeto: true,
        programaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
        reportes: {
          include: {
            usuario: { select: { id: true, nombre: true, correo: true } },
            soportes: true,
          },
          orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        },
        tareas: {
          include: {
            responsable: { select: { id: true, nombre: true } },
            categoria: true,
            recursos: { include: { recurso: true } },
            soportes: true,
          },
          orderBy: { fechaInicio: 'desc' },
        },
        observaciones: {
          include: {
            autor: { select: { id: true, nombre: true, rol: true } },
          },
          orderBy: { creadoEn: 'desc' },
        },
        actividadesOperador: {
          orderBy: { consecutivo: 'asc' },
        },
      },
    });

    if (!meta) throw new NotFoundException('Meta no encontrada');

    return this.enriquecerMeta(meta);
  }

  /**
   * Obtiene la lista de actividades del operador asignadas a una meta
   */
  async obtenerActividadesOperador(metaId: string) {
    return this.prisma.actividadOperador.findMany({
      where: { metaId },
      orderBy: { consecutivo: 'asc' },
    });
  }

  /**
   * CU-03: Asignar o reasignar responsable de meta
   */
  async asignarResponsable(metaId: string, nuevoResponsableId: string, usuario: UsuarioAutenticado) {
    const meta = await this.prisma.meta.findUnique({
      where: { id: metaId },
      include: { responsable: true },
    });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    // Validar permisos: LIDER_AREA de su área o ADMINISTRADOR
    if (usuario.rol === RolUsuario.LIDER_AREA && meta.areaId !== usuario.areaId) {
      throw new ForbiddenException('Solo puede asignar metas pertenecientes a su área.');
    }

    const nuevoResp = await this.prisma.usuario.findUnique({
      where: { id: nuevoResponsableId },
    });
    if (!nuevoResp || !nuevoResp.activo) {
      throw new BadRequestException('El responsable seleccionado no existe o está inactivo.');
    }

    // Actualizar estado si estaba en PENDIENTE_COMPLETAR
    let nuevoEstado = meta.estado;
    if (meta.estado === EstadoMeta.PENDIENTE_COMPLETAR) {
      nuevoEstado = EstadoMeta.ABIERTA;
    }

    const actualizada = await this.prisma.meta.update({
      where: { id: metaId },
      data: {
        responsableId: nuevoResponsableId,
        estado: nuevoEstado,
      },
      include: { responsable: true },
    });

    // Auditoría
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'meta',
      entidadId: metaId,
      motivo: `Asignación de responsable: ${nuevoResp.nombre}`,
      datosAntes: { responsableId: meta.responsableId, responsable: meta.responsable?.nombre, estado: meta.estado },
      datosDespues: { responsableId: nuevoResponsableId, responsable: nuevoResp.nombre, estado: nuevoEstado },
    });

    // Notificación META_ASIGNADA
    await this.prisma.notificacion.create({
      data: {
        usuarioId: nuevoResponsableId,
        tipoCodigo: 'META_ASIGNADA',
        titulo: 'Nueva meta asignada',
        mensaje: `Se le ha asignado como responsable de la meta ${actualizada.codigo}: ${actualizada.descripcion.slice(0, 100)}...`,
        enlace: `/metas/${metaId}`,
      },
    });

    return actualizada;
  }

  /**
   * CU-04 y RN-19: Actualizar programación mensual de una meta
   */
  async actualizarProgramacion(
    metaId: string,
    programacion: { anio: number; mes: number; valorProgramado: number }[],
    usuario: UsuarioAutenticado,
  ) {
    const meta = await this.prisma.meta.findUnique({
      where: { id: metaId },
      include: { programaciones: true },
    });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    // RN-19: La suma debe ser exactamente igual a valor_meta
    const valorMeta = Number(meta.valorMeta);
    const suma = programacion.reduce((acc, p) => acc + (Number(p.valorProgramado) || 0), 0);
    const sumaRedondeada = Math.round(suma * 100) / 100;

    if (Math.abs(sumaRedondeada - valorMeta) > 0.01) {
      throw new BadRequestException({
        codigo: 'PROGRAMACION_NO_CUADRA',
        mensaje: `La suma de la programación mensual (${sumaRedondeada}) debe ser exactamente igual al valor meta (${valorMeta}). Diferencia: ${Math.round((valorMeta - sumaRedondeada) * 100) / 100}`,
      });
    }

    // Transacción para guardar las 12 filas y setear distribucionUniforme = false
    await this.prisma.$transaction(async (tx) => {
      for (const p of programacion) {
        await tx.programacionMeta.upsert({
          where: {
            metaId_anio_mes: {
              metaId,
              anio: p.anio,
              mes: p.mes,
            },
          },
          update: { valorProgramado: p.valorProgramado },
          create: {
            metaId,
            anio: p.anio,
            mes: p.mes,
            valorProgramado: p.valorProgramado,
          },
        });
      }

      await tx.meta.update({
        where: { id: metaId },
        data: { distribucionUniforme: false },
      });
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'programacion_meta',
      entidadId: metaId,
      motivo: 'Modificación manual de programación mensual',
    });

    return this.obtenerPorId(metaId);
  }

  /**
   * Restablece la distribución uniforme de una meta (RN-18)
   */
  async restablecerProgramacionUniforme(metaId: string, usuario: UsuarioAutenticado) {
    const meta = await this.prisma.meta.findUnique({
      where: { id: metaId },
      include: { unidad: true },
    });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    const nuevaProg = generarProgramacionUniforme(
      Number(meta.valorMeta),
      meta.fechaInicio,
      meta.fechaCorte,
      2026,
      meta.unidad.esBinaria,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const p of nuevaProg) {
        await tx.programacionMeta.upsert({
          where: {
            metaId_anio_mes: {
              metaId,
              anio: p.anio,
              mes: p.mes,
            },
          },
          update: { valorProgramado: p.valorProgramado },
          create: {
            metaId,
            anio: p.anio,
            mes: p.mes,
            valorProgramado: p.valorProgramado,
          },
        });
      }

      await tx.meta.update({
        where: { id: metaId },
        data: { distribucionUniforme: true },
      });
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'programacion_meta',
      entidadId: metaId,
      motivo: 'Restablecimiento de programación uniforme',
    });

    return this.obtenerPorId(metaId);
  }

  /**
   * RN-06: Reabrir meta cerrada o cumplida (solo ADMINISTRADOR con motivo)
   */
  async reabrirMeta(metaId: string, motivo: string, usuario: UsuarioAutenticado) {
    if (!motivo || motivo.trim().length < 5) {
      throw new BadRequestException('El motivo de reapertura es obligatorio (mínimo 5 caracteres).');
    }

    const meta = await this.prisma.meta.findUnique({ where: { id: metaId } });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    const actualizada = await this.prisma.meta.update({
      where: { id: metaId },
      data: { estado: EstadoMeta.ABIERTA },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'REABRIR_META',
      entidad: 'meta',
      entidadId: metaId,
      motivo,
      datosAntes: { estado: meta.estado },
      datosDespues: { estado: EstadoMeta.ABIERTA },
    });

    return actualizada;
  }

  /**
   * Creación manual de una meta (ADMINISTRADOR o LIDER_AREA en su área)
   */
  async crear(
    dto: {
      codigo: string;
      descripcion: string;
      areaId: string;
      componenteId?: string;
      unidadId: string;
      valorMeta: number;
      fechaInicio?: string;
      fechaFinOficial?: string;
      fechaCorte?: string;
      responsableId?: string;
      fuenteRecursoId?: string;
      presupuestoProgramado?: number;
      poblacionSujetoId?: string;
    },
    usuario: UsuarioAutenticado,
  ) {
    if (usuario.rol === RolUsuario.LIDER_AREA && usuario.areaId !== dto.areaId) {
      throw new ForbiddenException('Solo puede crear metas para su propia área.');
    }

    const existe = await this.prisma.meta.findUnique({ where: { codigo: dto.codigo } });
    if (existe) {
      throw new BadRequestException(`Ya existe una meta con el código ${dto.codigo}`);
    }

    const unidad = await this.prisma.unidadMedida.findUnique({ where: { id: dto.unidadId } });
    if (!unidad) throw new NotFoundException('Unidad de medida no válida');

    const fechaInicio = dto.fechaInicio ? parsearFechaUtc(dto.fechaInicio) : parsearFechaUtc('2026-01-01');
    const fechaFinOficial = dto.fechaFinOficial ? parsearFechaUtc(dto.fechaFinOficial) : parsearFechaUtc('2026-12-31');
    const fechaCorte = dto.fechaCorte ? parsearFechaUtc(dto.fechaCorte) : parsearFechaUtc('2026-11-30');

    const estado = dto.responsableId ? EstadoMeta.ABIERTA : EstadoMeta.PENDIENTE_COMPLETAR;

    const nuevaMeta = await this.prisma.$transaction(async (tx) => {
      const meta = await tx.meta.create({
        data: {
          codigo: dto.codigo,
          descripcion: dto.descripcion,
          areaId: dto.areaId,
          componenteId: dto.componenteId || null,
          unidadId: dto.unidadId,
          valorMeta: dto.valorMeta,
          fechaInicio,
          fechaFinOficial,
          fechaCorte,
          responsableId: dto.responsableId || null,
          fuenteRecursoId: dto.fuenteRecursoId || null,
          presupuestoProgramado: dto.presupuestoProgramado ?? null,
          poblacionSujetoId: dto.poblacionSujetoId || null,
          estado,
          distribucionUniforme: true,
        },
      });

      const prog = generarProgramacionUniforme(
        Number(dto.valorMeta),
        fechaInicio,
        fechaCorte,
        2026,
        unidad.esBinaria,
      );

      for (const p of prog) {
        await tx.programacionMeta.create({
          data: {
            metaId: meta.id,
            anio: p.anio,
            mes: p.mes,
            valorProgramado: p.valorProgramado,
          },
        });
      }

      return meta;
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CREAR',
      entidad: 'meta',
      entidadId: nuevaMeta.id,
      datosDespues: nuevaMeta,
    });

    return this.obtenerPorId(nuevaMeta.id);
  }

  /**
   * Actualización de datos básicos de la meta (ADMINISTRADOR o LIDER_AREA en su área)
   */
  async actualizar(
    id: string,
    dto: {
      descripcion?: string;
      componenteId?: string | null;
      unidadId?: string;
      valorMeta?: number;
      fechaInicio?: string;
      fechaFinOficial?: string;
      fechaCorte?: string;
      fuenteRecursoId?: string | null;
      presupuestoProgramado?: number | null;
      poblacionSujetoId?: string | null;
    },
    usuario: UsuarioAutenticado,
  ) {
    const meta = await this.prisma.meta.findUnique({
      where: { id },
      include: { unidad: true },
    });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    if (usuario.rol === RolUsuario.LIDER_AREA && usuario.areaId !== meta.areaId) {
      throw new ForbiddenException('Solo puede actualizar metas de su propia área.');
    }

    const dataToUpdate: any = {};
    if (dto.descripcion !== undefined) dataToUpdate.descripcion = dto.descripcion;
    if (dto.componenteId !== undefined) dataToUpdate.componenteId = dto.componenteId;
    if (dto.unidadId !== undefined) dataToUpdate.unidadId = dto.unidadId;
    if (dto.valorMeta !== undefined) dataToUpdate.valorMeta = dto.valorMeta;
    if (dto.fechaInicio !== undefined) dataToUpdate.fechaInicio = parsearFechaUtc(dto.fechaInicio);
    if (dto.fechaFinOficial !== undefined) dataToUpdate.fechaFinOficial = parsearFechaUtc(dto.fechaFinOficial);
    if (dto.fechaCorte !== undefined) dataToUpdate.fechaCorte = parsearFechaUtc(dto.fechaCorte);
    if (dto.fuenteRecursoId !== undefined) dataToUpdate.fuenteRecursoId = dto.fuenteRecursoId;
    if (dto.presupuestoProgramado !== undefined) dataToUpdate.presupuestoProgramado = dto.presupuestoProgramado;
    if (dto.poblacionSujetoId !== undefined) dataToUpdate.poblacionSujetoId = dto.poblacionSujetoId;

    const actualizada = await this.prisma.meta.update({
      where: { id },
      data: dataToUpdate,
    });

    if (
      meta.distribucionUniforme &&
      (dto.valorMeta !== undefined || dto.fechaInicio !== undefined || dto.fechaCorte !== undefined)
    ) {
      const valorMetaFinal = dto.valorMeta !== undefined ? dto.valorMeta : Number(meta.valorMeta);
      const fInicioFinal = dataToUpdate.fechaInicio || meta.fechaInicio;
      const fCorteFinal = dataToUpdate.fechaCorte || meta.fechaCorte;
      const esBinaria = dto.unidadId
        ? (await this.prisma.unidadMedida.findUnique({ where: { id: dto.unidadId } }))?.esBinaria ?? meta.unidad.esBinaria
        : meta.unidad.esBinaria;

      const nuevaProg = generarProgramacionUniforme(
        valorMetaFinal,
        fInicioFinal,
        fCorteFinal,
        2026,
        esBinaria,
      );

      for (const p of nuevaProg) {
        await this.prisma.programacionMeta.upsert({
          where: {
            metaId_anio_mes: {
              metaId: id,
              anio: p.anio,
              mes: p.mes,
            },
          },
          update: { valorProgramado: p.valorProgramado },
          create: {
            metaId: id,
            anio: p.anio,
            mes: p.mes,
            valorProgramado: p.valorProgramado,
          },
        });
      }
    }

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'meta',
      entidadId: id,
      datosAntes: meta,
      datosDespues: actualizada,
    });

    return this.obtenerPorId(id);
  }

  /**
   * Cierre de meta sin cumplir (ADMINISTRADOR o LIDER_AREA con motivo)
   */
  async cerrar(id: string, motivo: string, usuario: UsuarioAutenticado) {
    if (!motivo || motivo.trim().length < 5) {
      throw new BadRequestException('El motivo de cierre es obligatorio (mínimo 5 caracteres).');
    }
    const meta = await this.prisma.meta.findUnique({ where: { id } });
    if (!meta) throw new NotFoundException('Meta no encontrada');

    if (usuario.rol === RolUsuario.LIDER_AREA && usuario.areaId !== meta.areaId) {
      throw new ForbiddenException('Solo puede cerrar metas de su propia área.');
    }

    const actualizada = await this.prisma.meta.update({
      where: { id },
      data: { estado: EstadoMeta.CERRADA_SIN_CUMPLIR },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'meta',
      entidadId: id,
      motivo,
      datosAntes: { estado: meta.estado },
      datosDespues: { estado: EstadoMeta.CERRADA_SIN_CUMPLIR },
    });

    return actualizada;
  }

  /**
   * RN-16 y HU-07: Metas del usuario actual pendientes de reporte
   */
  async obtenerMisMetasPendientesReporte(usuario: UsuarioAutenticado) {
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const mesAnterior = mesActual > 1 ? mesActual - 1 : 12;
    const anioReporte = mesActual > 1 ? hoy.getUTCFullYear() : hoy.getUTCFullYear() - 1;

    const metas = await this.prisma.meta.findMany({
      where: {
        responsableId: usuario.id,
        estado: EstadoMeta.ABIERTA,
      },
      include: {
        area: true,
        componente: true,
        unidad: true,
        reportes: { where: { anio: anioReporte, mes: mesAnterior } },
      },
    });

    // Filtrar aquellas que NO tienen reporte del mes anterior
    return metas
      .filter((m) => m.reportes.length === 0)
      .map((m) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        area: m.area.nombre,
        componente: m.componente?.nombre,
        unidad: m.unidad.nombre,
        valorMeta: Number(m.valorMeta),
        mesPendiente: mesAnterior,
        anioPendiente: anioReporte,
      }));
  }
}
