import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { RolUsuario, EstadoTarea } from '@prisma/client';

const EXTENSIONES_PERMITIDAS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'xlsx',
  'xls',
  'docx',
  'doc',
];

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB (RN-22)

@Injectable()
export class SoportesService {
  private readonly logger = new Logger(SoportesService.name);
  private readonly carpetaSoportes: string;

  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {
    if (process.env.RUTA_SOPORTES) {
      this.carpetaSoportes = path.resolve(process.env.RUTA_SOPORTES);
    } else {
      this.carpetaSoportes = path.resolve(process.cwd(), 'datos', 'soportes');
    }

    if (!fs.existsSync(this.carpetaSoportes)) {
      try {
        fs.mkdirSync(this.carpetaSoportes, { recursive: true });
        this.logger.log('Carpeta de soportes lista en: ' + this.carpetaSoportes);
      } catch (err) {
        this.logger.error('No se pudo crear la carpeta de soportes', err);
      }
    }
  }

  async subirArchivos(
    archivos: Express.Multer.File[],
    data: { tareaId?: string; reporteId?: string },
    usuario: UsuarioAutenticado,
  ) {
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException('Debe adjuntar al menos un archivo de soporte.');
    }

    if (!data.tareaId && !data.reporteId) {
      throw new BadRequestException('El soporte debe vincularse a una tarea o a un reporte mensual.');
    }

    if (data.tareaId && data.reporteId) {
      throw new BadRequestException('El soporte no puede vincularse simultáneamente a tarea y reporte.');
    }

    if (data.tareaId) {
      const tarea = await this.prisma.tarea.findUnique({
        where: { id: data.tareaId },
      });
      if (!tarea) {
        throw new NotFoundException('La tarea especificada no existe.');
      }
      if (tarea.estado === EstadoTarea.CANCELADA) {
        throw new BadRequestException('No se pueden adjuntar soportes a una tarea cancelada.');
      }
    }

    if (data.reporteId) {
      const reporte = await this.prisma.reporteMensual.findUnique({
        where: { id: data.reporteId },
      });
      if (!reporte) {
        throw new NotFoundException('El reporte mensual especificado no existe.');
      }
    }

    const soportesCreados = [];

    for (const archivo of archivos) {
      const ext = path.extname(archivo.originalname).toLowerCase().replace('.', '');
      if (!EXTENSIONES_PERMITIDAS.includes(ext)) {
        throw new BadRequestException(
          'Extensión .' + ext + ' no permitida. Formatos válidos: ' + EXTENSIONES_PERMITIDAS.join(', '),
        );
      }

      if (archivo.size > TAMANO_MAXIMO_BYTES) {
        throw new BadRequestException(
          'El archivo ' + archivo.originalname + ' supera el límite máximo permitido de 20 MB.',
        );
      }

      const nombreAlmacenado = randomUUID() + '.' + ext;
      const rutaRelativa = nombreAlmacenado;
      const rutaAbsoluta = path.join(this.carpetaSoportes, nombreAlmacenado);

      await fs.promises.writeFile(rutaAbsoluta, archivo.buffer);

      const nuevoSoporte = await this.prisma.soporte.create({
        data: {
          tareaId: data.tareaId || null,
          reporteId: data.reporteId || null,
          nombreOriginal: archivo.originalname,
          nombreAlmacenado,
          ruta: rutaRelativa,
          tipoMime: archivo.mimetype || 'application/octet-stream',
          tamanoBytes: BigInt(archivo.size),
          subidoPor: usuario.id,
        },
      });

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'CREAR',
        entidad: 'soporte',
        entidadId: nuevoSoporte.id,
        datosDespues: {
          id: nuevoSoporte.id,
          nombreOriginal: nuevoSoporte.nombreOriginal,
          tareaId: nuevoSoporte.tareaId,
          reporteId: nuevoSoporte.reporteId,
          tamanoBytes: Number(nuevoSoporte.tamanoBytes),
        },
      });

      soportesCreados.push({
        ...nuevoSoporte,
        tamanoBytes: Number(nuevoSoporte.tamanoBytes),
      });
    }

    return soportesCreados;
  }

  async obtenerParaDescarga(id: string) {
    const soporte = await this.prisma.soporte.findUnique({
      where: { id },
    });

    if (!soporte) {
      throw new NotFoundException('Soporte no encontrado.');
    }

    const rutaAbsoluta = path.join(this.carpetaSoportes, soporte.nombreAlmacenado);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new NotFoundException('El archivo físico no se encuentra en el servidor.');
    }

    return {
      rutaAbsoluta,
      nombreOriginal: soporte.nombreOriginal,
      tipoMime: soporte.tipoMime,
    };
  }

  async listarPorTarea(tareaId: string) {
    const lista = await this.prisma.soporte.findMany({
      where: { tareaId },
      orderBy: { subidoEn: 'desc' },
    });

    return lista.map((s) => ({
      ...s,
      tamanoBytes: Number(s.tamanoBytes),
    }));
  }

  async listarPorReporte(reporteId: string) {
    const lista = await this.prisma.soporte.findMany({
      where: { reporteId },
      orderBy: { subidoEn: 'desc' },
    });

    return lista.map((s) => ({
      ...s,
      tamanoBytes: Number(s.tamanoBytes),
    }));
  }

  async eliminar(id: string, usuario: UsuarioAutenticado) {
    const soporte = await this.prisma.soporte.findUnique({
      where: { id },
      include: {
        tarea: true,
      },
    });

    if (!soporte) {
      throw new NotFoundException('Soporte no encontrado.');
    }

    if (
      soporte.tarea &&
      soporte.tarea.estado === EstadoTarea.FINALIZADA &&
      usuario.rol !== RolUsuario.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'No se pueden eliminar soportes de una tarea finalizada.',
      );
    }

    const rutaAbsoluta = path.join(this.carpetaSoportes, soporte.nombreAlmacenado);
    if (fs.existsSync(rutaAbsoluta)) {
      try {
        await fs.promises.unlink(rutaAbsoluta);
      } catch (err) {
        this.logger.warn('No se pudo eliminar el archivo físico: ' + rutaAbsoluta, err);
      }
    }

    await this.prisma.soporte.delete({
      where: { id },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ELIMINAR',
      entidad: 'soporte',
      entidadId: id,
      datosAntes: {
        id: soporte.id,
        nombreOriginal: soporte.nombreOriginal,
        tareaId: soporte.tareaId,
        reporteId: soporte.reporteId,
      },
    });

    return { ok: true, mensaje: 'Soporte eliminado correctamente.' };
  }
}
