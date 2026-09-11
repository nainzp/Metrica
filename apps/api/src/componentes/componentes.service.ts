import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ComponentesService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  async listar(areaId?: string, soloActivos = true) {
    const where: any = {};
    if (areaId) where.areaId = areaId;
    if (soloActivos) where.activo = true;

    return this.prisma.componente.findMany({
      where,
      include: {
        area: { select: { id: true, codigo: true, nombre: true } },
        lider: { select: { id: true, nombre: true, correo: true, cargo: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const comp = await this.prisma.componente.findUnique({
      where: { id },
      include: {
        area: true,
        lider: true,
      },
    });
    if (!comp) throw new NotFoundException('Componente no encontrado');
    return comp;
  }

  async crear(
    datos: { areaId: string; codigo: string; nombre: string; liderId?: string },
    usuarioId?: string,
  ) {
    const codNorm = datos.codigo.toUpperCase().trim();
    const existe = await this.prisma.componente.findUnique({
      where: {
        areaId_codigo: {
          areaId: datos.areaId,
          codigo: codNorm,
        },
      },
    });
    if (existe) throw new BadRequestException(`Ya existe un componente con código ${codNorm} en esta área.`);

    const nuevo = await this.prisma.componente.create({
      data: {
        areaId: datos.areaId,
        codigo: codNorm,
        nombre: datos.nombre.trim(),
        liderId: datos.liderId || null,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CREAR',
      entidad: 'componente',
      entidadId: nuevo.id,
      datosDespues: nuevo,
    });

    return nuevo;
  }

  async actualizar(
    id: string,
    datos: { nombre?: string; liderId?: string | null; activo?: boolean },
    usuarioId?: string,
  ) {
    const anterior = await this.obtenerPorId(id);

    const actualizado = await this.prisma.componente.update({
      where: { id },
      data: datos,
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR',
      entidad: 'componente',
      entidadId: id,
      datosAntes: anterior,
      datosDespues: actualizado,
    });

    return actualizado;
  }
}
