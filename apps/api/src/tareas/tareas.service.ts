import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import {
  RolUsuario,
  EstadoMeta,
  EstadoTarea,
  EstadoPresencia,
} from '@prisma/client';
import {
  obtenerHoyBogota,
  obtenerHoyBogotaString,
  formatearFechaBogota,
} from '../comun/fecha';
import {
  CrearTareaDto,
  ActualizarTareaDto,
  FinalizarTareaDto,
  ReabrirTareaDto,
  CancelarTareaDto,
  PresenciaTareaDto,
  VerificarCrucesDto,
} from './dto/tareas.dto';

@Injectable()
export class TareasService {
  private readonly logger = new Logger(TareasService.name);

  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
    private notificacionesService: NotificacionesService,
  ) {}

  determinarEstadoTemporal(
    estadoActual: EstadoTarea,
    fechaInicio: Date | string,
    fechaFin: Date | string,
    hoy: Date,
  ): EstadoTarea {
    if (
      estadoActual === EstadoTarea.FINALIZADA ||
      estadoActual === EstadoTarea.CANCELADA
    ) {
      return estadoActual;
    }

    const dInicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
    const dFin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;

    const inicioStr = formatearFechaBogota(dInicio);
    const finStr = formatearFechaBogota(dFin);
    const hoyStr = formatearFechaBogota(hoy);

    if (hoyStr < inicioStr) {
      return EstadoTarea.PROGRAMADA;
    } else if (hoyStr <= finStr) {
      return EstadoTarea.EN_CURSO;
    } else {
      return EstadoTarea.VENCIDA;
    }
  }

  validarFechasYHoras(
    fechaInicioStr: string,
    fechaFinStr: string,
    horaInicio?: string,
    horaFin?: string,
  ) {
    if (fechaFinStr < fechaInicioStr) {
      throw new BadRequestException(
        'La fecha de finalización debe ser mayor o igual a la fecha de inicio (RN-20).',
      );
    }

    if (horaInicio || horaFin) {
      if (!horaInicio || !horaFin) {
        throw new BadRequestException(
          'Si la tarea tiene horario específico, debe indicar tanto hora de inicio como hora de fin (RN-20).',
        );
      }
      if (fechaInicioStr !== fechaFinStr) {
        throw new BadRequestException(
          'Una tarea con horario específico debe realizarse en un solo día (fecha inicio igual a fecha fin) (RN-20).',
        );
      }
      if (horaFin <= horaInicio) {
        throw new BadRequestException(
          'La hora de finalización debe ser posterior a la hora de inicio (RN-20).',
        );
      }
    }
  }

  async verificarCruces(dto: VerificarCrucesDto) {
    const { fecha, horaInicio, horaFin, responsableId, requiereSecretaria, excluirId } = dto;
    const fechaFiltro = new Date(fecha);

    const tareasResponsable = await this.prisma.tarea.findMany({
      where: {
        id: excluirId ? { not: excluirId } : undefined,
        responsableId,
        fechaInicio: { lte: fechaFiltro },
        fechaFin: { gte: fechaFiltro },
        horaInicio: { not: null },
        horaFin: { not: null },
        estado: { notIn: [EstadoTarea.FINALIZADA, EstadoTarea.CANCELADA] },
      },
      include: {
        meta: { select: { codigo: true } },
      },
    });

    const crucesResponsable = tareasResponsable
      .filter((t) => {
        if (!t.horaInicio || !t.horaFin) return false;
        return horaInicio < t.horaFin && horaFin > t.horaInicio;
      })
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        metaCodigo: t.meta.codigo,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        lugar: t.lugar,
      }));

    let crucesSecretaria: any[] = [];
    if (requiereSecretaria) {
      const tareasSecretaria = await this.prisma.tarea.findMany({
        where: {
          id: excluirId ? { not: excluirId } : undefined,
          requiereSecretaria: true,
          estadoPresencia: { in: [EstadoPresencia.CONFIRMADA, EstadoPresencia.PENDIENTE] },
          fechaInicio: { lte: fechaFiltro },
          fechaFin: { gte: fechaFiltro },
          horaInicio: { not: null },
          horaFin: { not: null },
          estado: { notIn: [EstadoTarea.FINALIZADA, EstadoTarea.CANCELADA] },
        },
        include: {
          meta: { select: { codigo: true } },
          responsable: { select: { nombre: true } },
        },
      });

      crucesSecretaria = tareasSecretaria
        .filter((t) => {
          if (!t.horaInicio || !t.horaFin) return false;
          return horaInicio < t.horaFin && horaFin > t.horaInicio;
        })
        .map((t) => ({
          id: t.id,
          titulo: t.titulo,
          metaCodigo: t.meta.codigo,
          responsable: t.responsable.nombre,
          horaInicio: t.horaInicio,
          horaFin: t.horaFin,
          estadoPresencia: t.estadoPresencia,
          lugar: t.lugar,
        }));
    }

    const hayCruces = crucesResponsable.length > 0 || crucesSecretaria.length > 0;

    return {
      hayCruces,
      crucesResponsable,
      crucesSecretaria,
      mensaje: hayCruces
        ? 'Se detectaron cruces de agenda en el horario seleccionado (RN-27). Puede confirmar y guardar de todas formas.'
        : 'Horario disponible sin cruces de agenda.',
    };
  }

  async crear(dto: CrearTareaDto, usuario: UsuarioAutenticado) {
    const meta = await this.prisma.meta.findUnique({
      where: { id: dto.metaId },
      include: {
        area: true,
        componente: true,
        responsable: true,
      },
    });

    if (!meta) {
      throw new NotFoundException('La meta seleccionada no existe.');
    }

    if (
      meta.estado !== EstadoMeta.ABIERTA &&
      meta.estado !== EstadoMeta.CUMPLIDA
    ) {
      throw new BadRequestException(
        'Solo se pueden vincular tareas a metas en estado ABIERTA o CUMPLIDA (RN-20).',
      );
    }

    this.validarFechasYHoras(
      dto.fechaInicio,
      dto.fechaFin,
      dto.horaInicio,
      dto.horaFin,
    );

    const hoy = obtenerHoyBogota();
    const estadoInicial = this.determinarEstadoTemporal(
      EstadoTarea.PROGRAMADA,
      dto.fechaInicio,
      dto.fechaFin,
      hoy,
    );

    const requiereSec = Boolean(dto.requiereSecretaria);
    const estadoPresencia = requiereSec ? EstadoPresencia.PENDIENTE : null;

    const tarea = await this.prisma.$transaction(async (tx) => {
      const nueva = await tx.tarea.create({
        data: {
          metaId: dto.metaId,
          titulo: dto.titulo.trim(),
          descripcion: dto.descripcion?.trim() || null,
          fase: dto.fase?.trim() || null,
          categoriaId: dto.categoriaId || null,
          responsableId: dto.responsableId,
          fechaInicio: new Date(dto.fechaInicio),
          fechaFin: new Date(dto.fechaFin),
          horaInicio: dto.horaInicio || null,
          horaFin: dto.horaFin || null,
          lugar: dto.lugar?.trim() || null,
          requiereSecretaria: requiereSec,
          estadoPresencia,
          estado: estadoInicial,
          creadoPor: usuario.id,
        },
      });

      if (dto.recursos && dto.recursos.length > 0) {
        await tx.tareaRecurso.createMany({
          data: dto.recursos.map((r) => ({
            tareaId: nueva.id,
            recursoId: r.recursoId,
            cantidad: r.cantidad || 1,
            nota: r.nota?.trim() || null,
          })),
        });
      }

      return nueva;
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CREAR',
      entidad: 'tarea',
      entidadId: tarea.id,
      datosDespues: tarea,
    });

    if (dto.responsableId !== usuario.id) {
      await this.notificacionesService.crear({
        usuarioId: dto.responsableId,
        tipoCodigo: 'TAREA_ASIGNADA',
        titulo: 'Nueva tarea asignada',
        mensaje: `Se le ha asignado la tarea "${tarea.titulo}" en la meta ${meta.codigo}.`,
        enlace: `/metas/${meta.id}?tab=tareas`,
      });
    }

    if (requiereSec) {
      const usuariosDespacho = await this.prisma.usuario.findMany({
        where: {
          rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] },
          activo: true,
        },
      });

      for (const u of usuariosDespacho) {
        await this.notificacionesService.crear({
          usuarioId: u.id,
          tipoCodigo: 'SOLICITUD_PRESENCIA',
          titulo: 'Solicitud de presencia de la Secretaria',
          mensaje: `${usuario.nombre} solicita la presencia de la Secretaria para: "${tarea.titulo}" el ${dto.fechaInicio}${tarea.horaInicio ? ' a las ' + tarea.horaInicio : ''}.`,
          enlace: '/agenda',
        });
      }
    }

    return this.obtenerPorId(tarea.id);
  }

  async listar(filtros: {
    metaId?: string;
    responsableId?: string;
    areaId?: string;
    componenteId?: string;
    estado?: EstadoTarea;
    desde?: string;
    hasta?: string;
    requiereSecretaria?: boolean;
    estadoPresencia?: EstadoPresencia;
    busqueda?: string;
    pagina?: number;
    tamano?: number;
  }) {
    const pagina = Number(filtros.pagina) || 1;
    const tamano = Number(filtros.tamano) || 50;
    const skip = (pagina - 1) * tamano;

    const where: any = {};

    if (filtros.metaId) where.metaId = filtros.metaId;
    if (filtros.responsableId) where.responsableId = filtros.responsableId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.requiereSecretaria !== undefined) where.requiereSecretaria = filtros.requiereSecretaria;
    if (filtros.estadoPresencia) where.estadoPresencia = filtros.estadoPresencia;

    if (filtros.areaId) {
      where.meta = { ...where.meta, areaId: filtros.areaId };
    }
    if (filtros.componenteId) {
      where.meta = { ...where.meta, componenteId: filtros.componenteId };
    }

    if (filtros.desde) {
      where.fechaFin = { gte: new Date(filtros.desde) };
    }
    if (filtros.hasta) {
      where.fechaInicio = { lte: new Date(filtros.hasta) };
    }

    if (filtros.busqueda) {
      where.OR = [
        { titulo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
        { lugar: { contains: filtros.busqueda, mode: 'insensitive' } },
        { meta: { codigo: { contains: filtros.busqueda, mode: 'insensitive' } } },
      ];
    }

    const hoy = obtenerHoyBogota();

    const [total, tareasDb] = await Promise.all([
      this.prisma.tarea.count({ where }),
      this.prisma.tarea.findMany({
        where,
        include: {
          meta: {
            select: {
              id: true,
              codigo: true,
              descripcion: true,
              estado: true,
              area: { select: { id: true, codigo: true, nombre: true } },
              componente: { select: { id: true, codigo: true, nombre: true } },
            },
          },
          responsable: {
            select: { id: true, nombre: true, correo: true, cargo: true },
          },
          categoria: true,
          recursos: {
            include: { recurso: true },
          },
          soportes: {
            select: { id: true, nombreOriginal: true, tipoMime: true, tamanoBytes: true, subidoEn: true },
          },
          _count: {
            select: { soportes: true, observaciones: true },
          },
        },
        orderBy: [{ fechaInicio: 'asc' }, { horaInicio: 'asc' }],
        skip,
        take: tamano,
      }),
    ]);

    const datos = tareasDb.map((t) => {
      const estadoCalculado = this.determinarEstadoTemporal(
        t.estado,
        t.fechaInicio,
        t.fechaFin,
        hoy,
      );

      return {
        ...t,
        estado: estadoCalculado,
        soportes: t.soportes.map((s) => ({
          ...s,
          tamanoBytes: Number(s.tamanoBytes),
        })),
      };
    });

    return {
      datos,
      total,
      pagina,
      tamano,
    };
  }

  async obtenerPorId(id: string) {
    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: {
        meta: {
          include: {
            area: true,
            componente: true,
            responsable: true,
          },
        },
        responsable: {
          select: { id: true, nombre: true, correo: true, cargo: true },
        },
        categoria: true,
        recursos: {
          include: { recurso: true },
        },
        soportes: {
          orderBy: { subidoEn: 'desc' },
        },
        observaciones: {
          include: {
            autor: { select: { id: true, nombre: true, cargo: true } },
          },
          orderBy: { creadoEn: 'desc' },
        },
      },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    const hoy = obtenerHoyBogota();
    const estadoCalculado = this.determinarEstadoTemporal(
      tarea.estado,
      tarea.fechaInicio,
      tarea.fechaFin,
      hoy,
    );

    return {
      ...tarea,
      estado: estadoCalculado,
      soportes: tarea.soportes.map((s) => ({
        ...s,
        tamanoBytes: Number(s.tamanoBytes),
      })),
    };
  }

  async actualizar(id: string, dto: ActualizarTareaDto, usuario: UsuarioAutenticado) {
    const tareaActual = await this.prisma.tarea.findUnique({
      where: { id },
      include: { meta: true, recursos: true },
    });

    if (!tareaActual) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    if (
      tareaActual.estado === EstadoTarea.FINALIZADA ||
      tareaActual.estado === EstadoTarea.CANCELADA
    ) {
      throw new BadRequestException('No se puede editar una tarea finalizada o cancelada.');
    }

    const nuevaFechaInicio = dto.fechaInicio || formatearFechaBogota(tareaActual.fechaInicio);
    const nuevaFechaFin = dto.fechaFin || formatearFechaBogota(tareaActual.fechaFin);
    const nuevaHoraInicio = dto.horaInicio !== undefined ? dto.horaInicio : tareaActual.horaInicio;
    const nuevaHoraFin = dto.horaFin !== undefined ? dto.horaFin : tareaActual.horaFin;

    this.validarFechasYHoras(
      nuevaFechaInicio,
      nuevaFechaFin,
      nuevaHoraInicio || undefined,
      nuevaHoraFin || undefined,
    );

    let nuevoEstadoPresencia = tareaActual.estadoPresencia;
    const cambioHorario =
      nuevaFechaInicio !== formatearFechaBogota(tareaActual.fechaInicio) ||
      nuevaHoraInicio !== tareaActual.horaInicio ||
      nuevaHoraFin !== tareaActual.horaFin;

    if (tareaActual.requiereSecretaria && cambioHorario && tareaActual.estadoPresencia === EstadoPresencia.CONFIRMADA) {
      nuevoEstadoPresencia = EstadoPresencia.PENDIENTE;
      this.logger.warn(`Tarea ${tareaActual.id} cambió de horario tras confirmación; vuelve a PENDIENTE (RN-28).`);
    }

    const tareaActualizada = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tarea.update({
        where: { id },
        data: {
          titulo: dto.titulo?.trim(),
          descripcion: dto.descripcion !== undefined ? dto.descripcion?.trim() || null : undefined,
          fase: dto.fase !== undefined ? dto.fase?.trim() || null : undefined,
          categoriaId: dto.categoriaId !== undefined ? dto.categoriaId || null : undefined,
          responsableId: dto.responsableId,
          fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
          horaInicio: dto.horaInicio !== undefined ? dto.horaInicio || null : undefined,
          horaFin: dto.horaFin !== undefined ? dto.horaFin || null : undefined,
          lugar: dto.lugar !== undefined ? dto.lugar?.trim() || null : undefined,
          requiereSecretaria: dto.requiereSecretaria,
          estadoPresencia: nuevoEstadoPresencia,
        },
      });

      if (dto.recursos !== undefined) {
        await tx.tareaRecurso.deleteMany({ where: { tareaId: id } });
        if (dto.recursos.length > 0) {
          await tx.tareaRecurso.createMany({
            data: dto.recursos.map((r) => ({
              tareaId: id,
              recursoId: r.recursoId,
              cantidad: r.cantidad || 1,
              nota: r.nota?.trim() || null,
            })),
          });
        }
      }

      return t;
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'tarea',
      entidadId: id,
      datosAntes: tareaActual,
      datosDespues: tareaActualizada,
    });

    if (nuevoEstadoPresencia === EstadoPresencia.PENDIENTE && tareaActual.estadoPresencia === EstadoPresencia.CONFIRMADA) {
      const usuariosDespacho = await this.prisma.usuario.findMany({
        where: { rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] }, activo: true },
      });
      for (const u of usuariosDespacho) {
        await this.notificacionesService.crear({
          usuarioId: u.id,
          tipoCodigo: 'SOLICITUD_PRESENCIA',
          titulo: 'Horario modificado - Requiere reconfirmación',
          mensaje: `La tarea "${tareaActualizada.titulo}" cambió su horario y requiere nueva confirmación de presencia.`,
          enlace: '/agenda',
        });
      }
    }

    return this.obtenerPorId(id);
  }

  async finalizar(id: string, dto: FinalizarTareaDto, usuario: UsuarioAutenticado) {
    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: {
        meta: true,
        soportes: true,
      },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    if (tarea.estado === EstadoTarea.FINALIZADA) {
      throw new BadRequestException('La tarea ya se encuentra finalizada.');
    }

    if (tarea.estado === EstadoTarea.CANCELADA) {
      throw new BadRequestException('No se puede finalizar una tarea cancelada.');
    }

    if (tarea.soportes.length === 0 && (!dto.soportesIds || dto.soportesIds.length === 0)) {
      throw new BadRequestException(
        'Para finalizar la tarea es obligatorio adjuntar al menos un archivo de soporte (RN-22).',
      );
    }

    if (!dto.observacionCierre || dto.observacionCierre.trim().length < 5) {
      throw new BadRequestException(
        'La observación de cierre es obligatoria (mínimo 5 caracteres) (RN-22).',
      );
    }

    const tareaFinalizada = await this.prisma.tarea.update({
      where: { id },
      data: {
        estado: EstadoTarea.FINALIZADA,
        finalizadaEn: new Date(),
        finalizadaPor: usuario.id,
        observacionCierre: dto.observacionCierre.trim(),
      },
      include: {
        meta: {
          include: { area: true, componente: true },
        },
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'tarea',
      entidadId: id,
      datosAntes: tarea,
      datosDespues: tareaFinalizada,
    });

    const liderId = tareaFinalizada.meta.componente?.liderId || tareaFinalizada.meta.area.liderId;
    if (liderId && liderId !== usuario.id) {
      await this.notificacionesService.crear({
        usuarioId: liderId,
        tipoCodigo: 'TAREA_FINALIZADA',
        titulo: 'Tarea finalizada',
        mensaje: `${usuario.nombre} ha finalizado la tarea "${tarea.titulo}" con evidencias.`,
        enlace: `/metas/${tarea.metaId}?tab=tareas`,
      });
    }

    return this.obtenerPorId(id);
  }

  async reabrir(id: string, dto: ReabrirTareaDto, usuario: UsuarioAutenticado) {
    if (
      usuario.rol !== RolUsuario.ADMINISTRADOR &&
      usuario.rol !== RolUsuario.LIDER_AREA &&
      usuario.rol !== RolUsuario.LIDER_COMPONENTE
    ) {
      throw new ForbiddenException(
        'Solo los líderes de área/componente y administradores pueden reabrir tareas (RN-23).',
      );
    }

    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: { meta: true },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    if (tarea.estado !== EstadoTarea.FINALIZADA) {
      throw new BadRequestException('Solo se pueden reabrir tareas en estado FINALIZADA.');
    }

    if (!tarea.finalizadaEn) {
      throw new BadRequestException('No hay registro de fecha de finalización.');
    }

    const hoy = obtenerHoyBogota();
    const diferenciaMs = hoy.getTime() - tarea.finalizadaEn.getTime();
    const diasTranscurridos = diferenciaMs / (1000 * 60 * 60 * 24);

    if (diasTranscurridos > 5 && usuario.rol !== RolUsuario.ADMINISTRADOR) {
      throw new BadRequestException(
        `La tarea fue finalizada hace más de 5 días (${Math.floor(diasTranscurridos)} días). Ya no es posible reabrirla (RN-23).`,
      );
    }

    const nuevoEstado = this.determinarEstadoTemporal(
      EstadoTarea.PROGRAMADA,
      tarea.fechaInicio,
      tarea.fechaFin,
      hoy,
    );

    const tareaReabierta = await this.prisma.tarea.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        reabiertaEn: new Date(),
        reabiertaPor: usuario.id,
        motivoReapertura: dto.motivo.trim(),
        finalizadaEn: null,
        finalizadaPor: null,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'REABRIR_TAREA',
      entidad: 'tarea',
      entidadId: id,
      motivo: dto.motivo.trim(),
      datosAntes: tarea,
      datosDespues: tareaReabierta,
    });

    await this.notificacionesService.crear({
      usuarioId: tarea.responsableId,
      tipoCodigo: 'TAREA_REABIERTA',
      titulo: 'Tarea reabierta',
      mensaje: `Su tarea "${tarea.titulo}" ha sido reabierta por ${usuario.nombre}. Motivo: ${dto.motivo}.`,
      enlace: `/metas/${tarea.metaId}?tab=tareas`,
    });

    return this.obtenerPorId(id);
  }

  async cancelar(id: string, dto: CancelarTareaDto, usuario: UsuarioAutenticado) {
    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    if (tarea.estado === EstadoTarea.FINALIZADA) {
      throw new BadRequestException('No se puede cancelar una tarea finalizada.');
    }

    const tareaCancelada = await this.prisma.tarea.update({
      where: { id },
      data: {
        estado: EstadoTarea.CANCELADA,
        motivoDeclinacion: dto.motivo.trim(),
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'tarea',
      entidadId: id,
      motivo: dto.motivo.trim(),
      datosAntes: tarea,
      datosDespues: tareaCancelada,
    });

    return this.obtenerPorId(id);
  }

  async gestionarPresencia(id: string, dto: PresenciaTareaDto, usuario: UsuarioAutenticado) {
    if (
      usuario.rol !== RolUsuario.SECRETARIA &&
      usuario.rol !== RolUsuario.ASISTENTE_DESPACHO &&
      usuario.rol !== RolUsuario.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'Solo la Secretaria o el Asistente de Despacho pueden responder a solicitudes de presencia (RN-28).',
      );
    }

    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: { meta: true, responsable: true },
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada.');
    }

    if (!tarea.requiereSecretaria) {
      throw new BadRequestException('Esta tarea no tiene solicitud de presencia de la Secretaria.');
    }

    if (dto.accion === 'DECLINAR') {
      if (!dto.motivo || dto.motivo.trim().length < 5) {
        throw new BadRequestException(
          'Para declinar la presencia debe incluir un motivo explicativo (mínimo 5 caracteres) (RN-28).',
        );
      }

      const actualizada = await this.prisma.tarea.update({
        where: { id },
        data: {
          estadoPresencia: EstadoPresencia.DECLINADA,
          motivoDeclinacion: dto.motivo.trim(),
        },
      });

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'DECLINAR_PRESENCIA',
        entidad: 'tarea',
        entidadId: id,
        motivo: dto.motivo.trim(),
        datosAntes: tarea,
        datosDespues: actualizada,
      });

      await this.notificacionesService.crear({
        usuarioId: tarea.creadoPor || tarea.responsableId,
        tipoCodigo: 'PRESENCIA_RESPONDIDA',
        titulo: 'Presencia del Despacho declinada',
        mensaje: `La Secretaria de Salud no podrá asistir a "${tarea.titulo}". Motivo: ${dto.motivo}.`,
        enlace: `/metas/${tarea.metaId}?tab=tareas`,
      });

      return this.obtenerPorId(id);
    }

    if (tarea.horaInicio && tarea.horaFin) {
      const cruces = await this.prisma.tarea.findMany({
        where: {
          id: { not: tarea.id },
          requiereSecretaria: true,
          estadoPresencia: EstadoPresencia.CONFIRMADA,
          fechaInicio: { lte: tarea.fechaFin },
          fechaFin: { gte: tarea.fechaInicio },
          horaInicio: { not: null },
          horaFin: { not: null },
          estado: { notIn: [EstadoTarea.FINALIZADA, EstadoTarea.CANCELADA] },
        },
      });

      const seCruza = cruces.some(
        (c) => c.horaInicio! < tarea.horaFin! && c.horaFin! > tarea.horaInicio!,
      );

      if (seCruza) {
        const usuariosDespacho = await this.prisma.usuario.findMany({
          where: { rol: { in: [RolUsuario.SECRETARIA, RolUsuario.ASISTENTE_DESPACHO] }, activo: true },
        });
        for (const u of usuariosDespacho) {
          await this.notificacionesService.crear({
            usuarioId: u.id,
            tipoCodigo: 'CRUCE_AGENDA_DESPACHO',
            titulo: 'Alerta de cruce en agenda del Despacho',
            mensaje: `Se ha confirmado "${tarea.titulo}" generando cruce horario con otro compromiso confirmado el ${formatearFechaBogota(tarea.fechaInicio)}.`,
            enlace: '/agenda',
          });
        }
      }
    }

    const confirmada = await this.prisma.tarea.update({
      where: { id },
      data: {
        estadoPresencia: EstadoPresencia.CONFIRMADA,
        motivoDeclinacion: null,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CONFIRMAR_PRESENCIA',
      entidad: 'tarea',
      entidadId: id,
      datosAntes: tarea,
      datosDespues: confirmada,
    });

    await this.notificacionesService.crear({
      usuarioId: tarea.creadoPor || tarea.responsableId,
      tipoCodigo: 'PRESENCIA_RESPONDIDA',
      titulo: 'Presencia del Despacho CONFIRMADA',
      mensaje: `La Secretaria de Salud ha confirmado su asistencia a: "${tarea.titulo}".`,
      enlace: `/metas/${tarea.metaId}?tab=tareas`,
    });

    return this.obtenerPorId(id);
  }

  async obtenerAgendaDespacho(desde?: string, hasta?: string) {
    const where: any = {
      requiereSecretaria: true,
      estado: { notIn: [EstadoTarea.CANCELADA] },
    };

    if (desde) where.fechaFin = { gte: new Date(desde) };
    if (hasta) where.fechaInicio = { lte: new Date(hasta) };

    const hoy = obtenerHoyBogota();

    const tareas = await this.prisma.tarea.findMany({
      where,
      include: {
        meta: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            area: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        responsable: {
          select: { id: true, nombre: true, correo: true, cargo: true },
        },
        recursos: {
          include: { recurso: true },
        },
      },
      orderBy: [{ fechaInicio: 'asc' }, { horaInicio: 'asc' }],
    });

    return tareas.map((t) => ({
      ...t,
      estado: this.determinarEstadoTemporal(t.estado, t.fechaInicio, t.fechaFin, hoy),
    }));
  }

  async obtenerRecursosSemana(fechaInicioSemana?: string) {
    const inicio = fechaInicioSemana ? new Date(fechaInicioSemana) : obtenerHoyBogota();
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);

    const tareas = await this.prisma.tarea.findMany({
      where: {
        fechaInicio: { lte: fin },
        fechaFin: { gte: inicio },
        estado: { notIn: [EstadoTarea.CANCELADA] },
        recursos: { some: {} },
      },
      include: {
        recursos: { include: { recurso: true } },
        responsable: { select: { nombre: true } },
      },
    });

    const mapaRecursos = new Map<string, { id: string; nombre: string; tareas: any[] }>();

    for (const t of tareas) {
      for (const r of t.recursos) {
        if (!mapaRecursos.has(r.recursoId)) {
          mapaRecursos.set(r.recursoId, {
            id: r.recurso.id,
            nombre: r.recurso.nombre,
            tareas: [],
          });
        }
        mapaRecursos.get(r.recursoId)!.tareas.push({
          tareaId: t.id,
          tareaTitulo: t.titulo,
          responsable: t.responsable.nombre,
          fecha: formatearFechaBogota(t.fechaInicio),
          horaInicio: t.horaInicio,
          horaFin: t.horaFin,
          cantidad: r.cantidad,
          nota: r.nota,
        });
      }
    }

    return Array.from(mapaRecursos.values());
  }

  async obtenerCategorias() {
    return this.prisma.categoriaTarea.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerRecursos() {
    return this.prisma.recurso.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
