import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { CrearObservacionDto, AtenderObservacionDto } from './dto/observaciones.dto';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class ObservacionesService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * CU-04: Emite una observación formal desde el Despacho sobre una meta o tarea
   */
  async crear(dto: CrearObservacionDto, usuario: UsuarioAutenticado) {
    if (
      usuario.rol !== RolUsuario.SECRETARIA &&
      usuario.rol !== RolUsuario.ASISTENTE_DESPACHO &&
      usuario.rol !== RolUsuario.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'Solo la Secretaria de Salud o Asistente de Despacho pueden emitir observaciones formales (CU-04).',
      );
    }

    if (!dto.metaId && !dto.tareaId) {
      throw new BadRequestException('Debe asociar la observación a una meta o a una tarea.');
    }

    let meta: any = null;
    let tarea: any = null;
    let destinatarioId: string | null = null;

    if (dto.metaId) {
      meta = await this.prisma.meta.findUnique({
        where: { id: dto.metaId },
        include: { responsable: true },
      });
      if (!meta) throw new NotFoundException('Meta no encontrada.');
      destinatarioId = meta.responsableId;
    }

    if (dto.tareaId) {
      tarea = await this.prisma.tarea.findUnique({
        where: { id: dto.tareaId },
        include: { responsable: true, meta: true },
      });
      if (!tarea) throw new NotFoundException('Tarea no encontrada.');
      destinatarioId = tarea.responsableId;
    }

    const nuevaObs = await this.prisma.observacion.create({
      data: {
        metaId: dto.metaId || null,
        tareaId: dto.tareaId || null,
        texto: dto.texto.trim(),
        autorId: usuario.id,
      },
      include: {
        autor: { select: { id: true, nombre: true, cargo: true, rol: true } },
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CREAR',
      entidad: 'observacion',
      entidadId: nuevaObs.id,
      datosDespues: nuevaObs,
    });

    if (destinatarioId) {
      const contexto = meta ? 'la meta #' + meta.codigo : 'la tarea "' + tarea.titulo + '"';
      await this.notificacionesService.crear({
        usuarioId: destinatarioId,
        tipoCodigo: 'OBSERVACION_DESPACHO',
        titulo: 'Nueva Observación del Despacho',
        mensaje: 'La Secretaria de Salud ha emitido una observación sobre ' + contexto + ': "' + dto.texto.substring(0, 80) + '..."',
        enlace: meta ? '/metas/' + meta.id + '?tab=observaciones' : '/tareas?tareaId=' + tarea.id,
      });
    }

    return nuevaObs;
  }

  async listarPorMeta(metaId: string) {
    return this.prisma.observacion.findMany({
      where: { metaId },
      include: {
        autor: { select: { id: true, nombre: true, cargo: true, rol: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async listarPorTarea(tareaId: string) {
    return this.prisma.observacion.findMany({
      where: { tareaId },
      include: {
        autor: { select: { id: true, nombre: true, cargo: true, rol: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Responde formalmente a una observación del Despacho (cierre y trazabilidad)
   */
  async atender(id: string, dto: AtenderObservacionDto, usuario: UsuarioAutenticado) {
    const obs = await this.prisma.observacion.findUnique({
      where: { id },
      include: { meta: true, tarea: true },
    });

    if (!obs) throw new NotFoundException('Observación no encontrada.');
    if (obs.atendida) {
      throw new BadRequestException('Esta observación ya fue atendida previamente.');
    }

    const actualizada = await this.prisma.observacion.update({
      where: { id },
      data: {
        atendida: true,
        respuesta: dto.respuesta.trim(),
        atendidaPor: usuario.id,
        atendidaEn: new Date(),
      },
      include: {
        autor: { select: { id: true, nombre: true } },
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'observacion',
      entidadId: id,
      datosAntes: obs,
      datosDespues: actualizada,
    });

    // Notificar al autor de la observación (Secretaria)
    await this.notificacionesService.crear({
      usuarioId: obs.autorId,
      tipoCodigo: 'OBSERVACION_ATENDIDA',
      titulo: 'Observación del Despacho Atendida',
      mensaje: usuario.nombre + ' ha respondido a la observación formulada.',
      enlace: obs.metaId ? '/metas/' + obs.metaId + '?tab=observaciones' : '/tareas',
    });

    return actualizada;
  }
}
