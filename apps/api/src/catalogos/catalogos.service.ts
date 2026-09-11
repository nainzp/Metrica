import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private prisma: PrismaService) {}

  async obtenerCatalogo(tipo: string, soloActivos = true) {
    const where = soloActivos ? { activo: true } : undefined;

    switch (tipo) {
      case 'unidades':
      case 'unidades-medida':
        return this.prisma.unidadMedida.findMany({ where, orderBy: { nombre: 'asc' } });
      case 'poblacion':
      case 'poblaciones':
        return this.prisma.poblacionSujeto.findMany({ where, orderBy: { nombre: 'asc' } });
      case 'fuente':
      case 'fuentes':
        return this.prisma.fuenteRecurso.findMany({ where, orderBy: { codigo: 'asc' } });
      case 'recurso':
      case 'recursos':
      case 'recursos-logisticos':
        return this.prisma.recurso.findMany({ where, orderBy: { nombre: 'asc' } });
      case 'categoria':
      case 'categorias':
      case 'categorias-tarea':
        return this.prisma.categoriaTarea.findMany({ where, orderBy: { nombre: 'asc' } });
      default:
        throw new BadRequestException(`Tipo de catálogo '${tipo}' no reconocido.`);
    }
  }

  async crearElemento(tipo: string, datos: any) {
    switch (tipo) {
      case 'unidades':
      case 'unidades-medida':
        return this.prisma.unidadMedida.create({
          data: {
            codigo: datos.codigo?.toUpperCase().trim() || 'UNI_' + Date.now(),
            nombre: datos.nombre.trim(),
            esBinaria: Boolean(datos.esBinaria),
            activo: datos.activo !== undefined ? Boolean(datos.activo) : true,
          },
        });
      case 'poblacion':
      case 'poblaciones':
        return this.prisma.poblacionSujeto.create({
          data: {
            nombre: datos.nombre.trim(),
            activo: datos.activo !== undefined ? Boolean(datos.activo) : true,
          },
        });
      case 'fuente':
      case 'fuentes':
        return this.prisma.fuenteRecurso.create({
          data: {
            codigo: datos.codigo?.trim() || 'F_' + Date.now(),
            nombre: datos.nombre.trim(),
            activo: datos.activo !== undefined ? Boolean(datos.activo) : true,
          },
        });
      case 'recurso':
      case 'recursos':
      case 'recursos-logisticos':
        return this.prisma.recurso.create({
          data: {
            nombre: datos.nombre.trim(),
            activo: datos.activo !== undefined ? Boolean(datos.activo) : true,
          },
        });
      case 'categoria':
      case 'categorias':
      case 'categorias-tarea':
        return this.prisma.categoriaTarea.create({
          data: {
            nombre: datos.nombre.trim(),
            activo: datos.activo !== undefined ? Boolean(datos.activo) : true,
          },
        });
      default:
        throw new BadRequestException(`Tipo de catálogo '${tipo}' no soportado para creación.`);
    }
  }

  async actualizarElemento(tipo: string, id: string, datos: any) {
    const dataToUpdate: any = {};
    if (datos.nombre !== undefined) dataToUpdate.nombre = datos.nombre.trim();
    if (datos.codigo !== undefined) dataToUpdate.codigo = datos.codigo.trim();
    if (datos.esBinaria !== undefined) dataToUpdate.esBinaria = Boolean(datos.esBinaria);
    if (datos.activo !== undefined) dataToUpdate.activo = Boolean(datos.activo);

    switch (tipo) {
      case 'unidades':
      case 'unidades-medida':
        return this.prisma.unidadMedida.update({ where: { id }, data: dataToUpdate });
      case 'poblacion':
      case 'poblaciones':
        return this.prisma.poblacionSujeto.update({ where: { id }, data: dataToUpdate });
      case 'fuente':
      case 'fuentes':
        return this.prisma.fuenteRecurso.update({ where: { id }, data: dataToUpdate });
      case 'recurso':
      case 'recursos':
      case 'recursos-logisticos':
        return this.prisma.recurso.update({ where: { id }, data: dataToUpdate });
      case 'categoria':
      case 'categorias':
      case 'categorias-tarea':
        return this.prisma.categoriaTarea.update({ where: { id }, data: dataToUpdate });
      default:
        throw new BadRequestException(`Tipo de catálogo '${tipo}' no soportado.`);
    }
  }
}
