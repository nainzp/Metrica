import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class AreasService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  async listar(soloActivas = true) {
    return this.prisma.area.findMany({
      where: soloActivas ? { activo: true } : undefined,
      include: {
        lider: {
          select: { id: true, nombre: true, correo: true, cargo: true },
        },
        componentes: {
          where: soloActivas ? { activo: true } : undefined,
          select: {
            id: true,
            codigo: true,
            nombre: true,
            activo: true,
            lider: {
              select: { id: true, nombre: true, correo: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: {
        lider: true,
        componentes: { include: { lider: true } },
      },
    });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  async crear(datos: { codigo: string; nombre: string; liderId?: string }, usuarioId?: string) {
    const existe = await this.prisma.area.findUnique({ where: { codigo: datos.codigo } });
    if (existe) throw new BadRequestException(`Ya existe un área con código ${datos.codigo}`);

    const nueva = await this.prisma.area.create({
      data: {
        codigo: datos.codigo.toUpperCase().trim(),
        nombre: datos.nombre.trim(),
        liderId: datos.liderId || null,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CREAR',
      entidad: 'area',
      entidadId: nueva.id,
      datosDespues: nueva,
    });

    return nueva;
  }

  async actualizar(
    id: string,
    datos: { nombre?: string; liderId?: string | null; activo?: boolean },
    usuarioId?: string,
  ) {
    const anterior = await this.obtenerPorId(id);

    const actualizada = await this.prisma.area.update({
      where: { id },
      data: datos,
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR',
      entidad: 'area',
      entidadId: id,
      datosAntes: anterior,
      datosDespues: actualizada,
    });

    return actualizada;
  }

  async obtenerMiembros(areaId: string) {
    return this.prisma.usuario.findMany({
      where: { areaId },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        cargo: true,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }
}
