import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RegistrarAuditoriaDto {
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  datosAntes?: any;
  datosDespues?: any;
  motivo?: string | null;
  ip?: string | null;
}

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  /**
   * RN-34: Registra una acción en la bitácora inmutable de auditoría
   */
  async registrar(dto: RegistrarAuditoriaDto) {
    return this.prisma.auditoria.create({
      data: {
        usuarioId: dto.usuarioId,
        accion: dto.accion,
        entidad: dto.entidad,
        entidadId: dto.entidadId,
        datosAntes: dto.datosAntes ? JSON.parse(JSON.stringify(dto.datosAntes)) : undefined,
        datosDespues: dto.datosDespues ? JSON.parse(JSON.stringify(dto.datosDespues)) : undefined,
        motivo: dto.motivo,
        ip: dto.ip,
      },
    });
  }

  /**
   * Consulta paginada con filtros para el administrador o roles con permiso
   */
  async listar(filtros: {
    entidad?: string;
    entidadId?: string;
    usuarioId?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    pagina?: number;
    tamano?: number;
  }) {
    const pagina = Number(filtros.pagina) || 1;
    const tamano = Number(filtros.tamano) || 50;
    const skip = (pagina - 1) * tamano;

    const where: any = {};

    if (filtros.entidad) where.entidad = filtros.entidad;
    if (filtros.entidadId) where.entidadId = filtros.entidadId;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.accion) where.accion = filtros.accion;

    if (filtros.desde || filtros.hasta) {
      where.fecha = {};
      if (filtros.desde) where.fecha.gte = new Date(filtros.desde);
      if (filtros.hasta) where.fecha.lte = new Date(filtros.hasta);
    }

    const [total, registros] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: tamano,
      }),
    ]);

    // Enriquecer con nombre de usuario si existe
    const usuarioIds = Array.from(new Set(registros.map((r) => r.usuarioId).filter(Boolean))) as string[];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, nombre: true, correo: true, rol: true },
    });
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    const datos = registros.map((r) => ({
      ...r,
      id: r.id.toString(), // Convertir BigInt a string para serialización JSON
      usuario: r.usuarioId ? usuarioMap.get(r.usuarioId) : null,
    }));

    return { datos, total, pagina, tamano };
  }
}
