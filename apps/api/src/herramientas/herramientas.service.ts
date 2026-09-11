import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { PurgarDatosPruebaDto } from './dto/herramientas.dto';
import { Cron } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
const JSZip = require('jszip');

@Injectable()
export class HerramientasService {
  private readonly logger = new Logger(HerramientasService.name);
  private readonly rutaBackups: string;
  private readonly rutaSoportes: string;

  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {
    this.rutaBackups = path.resolve(process.env.RUTA_BACKUPS || './datos/backups');
    this.rutaSoportes = path.resolve(process.env.RUTA_SOPORTES || './datos/soportes');

    if (!fs.existsSync(this.rutaBackups)) {
      fs.mkdirSync(this.rutaBackups, { recursive: true });
    }
    if (!fs.existsSync(this.rutaSoportes)) {
      fs.mkdirSync(this.rutaSoportes, { recursive: true });
    }
  }

  /**
   * Conteo de registros marcados como datos de prueba (CU-16)
   */
  async obtenerConteoDatosPrueba() {
    const [metas, reportes, tareas, usuarios] = await Promise.all([
      this.prisma.meta.count({ where: { esDatoPrueba: true } }),
      this.prisma.reporteMensual.count({ where: { esDatoPrueba: true } }),
      this.prisma.tarea.count({ where: { esDatoPrueba: true } }),
      this.prisma.usuario.count({ where: { esDatoPrueba: true } }),
    ]);

    // Conteo de soportes vinculados a tareas o reportes de prueba
    const soportes = await this.prisma.soporte.count({
      where: {
        OR: [
          { tarea: { esDatoPrueba: true } },
          { reporte: { esDatoPrueba: true } },
        ],
      },
    });

    const total = metas + reportes + tareas + usuarios + soportes;

    return {
      metas,
      reportes,
      tareas,
      usuarios,
      soportes,
      total,
    };
  }

  /**
   * Inyecta un lote controlado de datos de prueba para demostración/pruebas (seed de prueba)
   */
  async inyectarDatosDemostracion(usuario: UsuarioAutenticado) {
    // 1. Obtener primera unidad y área
    const unidad = await this.prisma.unidadMedida.findFirst();
    const area = await this.prisma.area.findFirst();
    if (!unidad || !area) {
      throw new BadRequestException('Se requiere al menos un área y una unidad en el sistema.');
    }

    const timestamp = Date.now();
    const codigoMetaPrueba = 'TEST-' + String(timestamp).slice(-4);

    // 2. Crear usuario de prueba
    const hashClave = await bcrypt.hash('DemoPrueba2026*!', 10);
    const usuarioPrueba = await this.prisma.usuario.create({
      data: {
        nombre: 'Usuario de Prueba ' + codigoMetaPrueba,
        correo: 'test.' + timestamp + '@magdalena.gov.co',
        hashClave,
        rol: 'FUNCIONARIO',
        areaId: area.id,
        cargo: 'Tester Automatizado',
        esDatoPrueba: true,
      },
    });

    // 3. Crear meta de prueba
    const metaPrueba = await this.prisma.meta.create({
      data: {
        codigo: codigoMetaPrueba,
        descripcion: 'Meta de Prueba Automatizada ' + codigoMetaPrueba,
        unidadId: unidad.id,
        valorMeta: 100,
        fechaInicio: new Date('2026-01-01'),
        fechaFinOficial: new Date('2026-12-31'),
        fechaCorte: new Date('2026-11-30'),
        areaId: area.id,
        responsableId: usuarioPrueba.id,
        estado: 'ABIERTA',
        esDatoPrueba: true,
      },
    });

    // 4. Crear tarea de prueba
    const tareaPrueba = await this.prisma.tarea.create({
      data: {
        metaId: metaPrueba.id,
        titulo: 'Tarea de Prueba ' + codigoMetaPrueba,
        responsableId: usuarioPrueba.id,
        fechaInicio: new Date('2026-06-01'),
        fechaFin: new Date('2026-06-01'),
        estado: 'PROGRAMADA',
        esDatoPrueba: true,
      },
    });

    // 5. Crear reporte de prueba
    const reportePrueba = await this.prisma.reporteMensual.create({
      data: {
        metaId: metaPrueba.id,
        anio: 2026,
        mes: 1,
        valorEjecutado: 10,
        costoEjecutado: 50000,
        reportadoPor: usuarioPrueba.id,
        esDatoPrueba: true,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'CREAR',
      entidad: 'herramientas',
      entidadId: metaPrueba.id,
      motivo: 'Inyección de datos de prueba para validación de CU-16',
    });

    return {
      mensaje: 'Datos de prueba inyectados exitosamente',
      meta: { id: metaPrueba.id, codigo: metaPrueba.codigo },
      tarea: { id: tareaPrueba.id, titulo: tareaPrueba.titulo },
      reporte: { id: reportePrueba.id },
      usuario: { id: usuarioPrueba.id, correo: usuarioPrueba.correo },
    };
  }

  /**
   * Generación integral de copia de seguridad completa (.zip con BD + soportes + manifiesto) (CU-17)
   */
  async generarBackup(motivo = 'MANUAL', usuarioNombre = 'Sistema') {
    this.logger.log('Generando copia de seguridad completa. Motivo: ' + motivo);

    const fechaStr = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = 'backup_metrica_' + fechaStr + '.zip';
    const rutaDestino = path.join(this.rutaBackups, nombreArchivo);

    const zip = new JSZip();

    // 1. Exportar datos estructurados de PostgreSQL
    const [
      areas,
      componentes,
      usuarios,
      unidades,
      fuentes,
      poblaciones,
      recursos,
      categorias,
      metas,
      programaciones,
      reportes,
      tareas,
      tareasRecursos,
      soportes,
      observaciones,
      notificaciones,
      parametros,
    ] = await Promise.all([
      this.prisma.area.findMany(),
      this.prisma.componente.findMany(),
      this.prisma.usuario.findMany(),
      this.prisma.unidadMedida.findMany(),
      this.prisma.fuenteRecurso.findMany(),
      this.prisma.poblacionSujeto.findMany(),
      this.prisma.recurso.findMany(),
      this.prisma.categoriaTarea.findMany(),
      this.prisma.meta.findMany(),
      this.prisma.programacionMeta.findMany(),
      this.prisma.reporteMensual.findMany(),
      this.prisma.tarea.findMany(),
      this.prisma.tareaRecurso.findMany(),
      this.prisma.soporte.findMany(),
      this.prisma.observacion.findMany(),
      this.prisma.notificacion.findMany(),
      this.prisma.parametro.findMany(),
    ]);

    const baseDatos = {
      esquema: 'metrica',
      version: '1.0.0',
      exportadoEn: new Date().toISOString(),
      tablas: {
        areas,
        componentes,
        usuarios,
        unidades,
        fuentes,
        poblaciones,
        recursos,
        categorias,
        metas,
        programaciones,
        reportes,
        tareas,
        tareasRecursos,
        soportes,
        observaciones,
        notificaciones,
        parametros,
      },
    };

    zip.file('base_datos.json', JSON.stringify(baseDatos, null, 2));

    // 2. Empaquetar archivos físicos de soporte
    const carpetaSoportesZip = zip.folder('soportes');
    let conteoArchivosSoporte = 0;

    if (fs.existsSync(this.rutaSoportes)) {
      const archivos = fs.readdirSync(this.rutaSoportes);
      for (const archivo of archivos) {
        const rutaCompleta = path.join(this.rutaSoportes, archivo);
        if (fs.statSync(rutaCompleta).isFile()) {
          const buffer = fs.readFileSync(rutaCompleta);
          carpetaSoportesZip?.file(archivo, buffer);
          conteoArchivosSoporte++;
        }
      }
    }

    // 3. Crear manifiesto oficial de integridad
    const manifiesto = {
      sistema: 'MÉTRICA — Monitoreo de Metas en Salud',
      entidad: 'Gobernación del Magdalena · Secretaría de Salud',
      version: '1.0.0',
      generadoEn: new Date().toISOString(),
      generadoPor: usuarioNombre,
      motivo,
      archivoZip: nombreArchivo,
      resumenRegistros: {
        areas: areas.length,
        componentes: componentes.length,
        usuarios: usuarios.length,
        metas: metas.length,
        reportes: reportes.length,
        tareas: tareas.length,
        soportesRegistrados: soportes.length,
        archivosFisicosEmpaquetados: conteoArchivosSoporte,
      },
    };

    zip.file('manifiesto.json', JSON.stringify(manifiesto, null, 2));

    // 4. Comprimir y escribir a disco
    const bufferZip = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    fs.writeFileSync(rutaDestino, bufferZip);
    const tamanoBytes = bufferZip.length;

    this.logger.log(
      `Copia de seguridad ${nombreArchivo} generada exitosamente (${tamanoBytes} bytes)`,
    );

    return {
      nombre: nombreArchivo,
      ruta: rutaDestino,
      tamanoBytes,
      creadoEn: new Date(),
      motivo,
    };
  }

  /**
   * Listar copias de seguridad disponibles
   */
  async listarBackups() {
    if (!fs.existsSync(this.rutaBackups)) return [];

    const archivos = fs.readdirSync(this.rutaBackups);
    const backups = [];

    for (const archivo of archivos) {
      if (archivo.endsWith('.zip')) {
        const rutaCompleta = path.join(this.rutaBackups, archivo);
        const stats = fs.statSync(rutaCompleta);
        backups.push({
          nombre: archivo,
          tamanoBytes: stats.size,
          creadoEn: stats.mtime,
        });
      }
    }

    return backups.sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  /**
   * Obtiene la ruta física segura de un backup para descarga
   */
  obtenerRutaBackup(nombre: string): string {
    const nombreLimpio = path.basename(nombre);
    const rutaCompleta = path.join(this.rutaBackups, nombreLimpio);

    if (!fs.existsSync(rutaCompleta)) {
      throw new NotFoundException('El archivo de copia de seguridad no existe.');
    }

    return rutaCompleta;
  }

  /**
   * Eliminar una copia de seguridad específica
   */
  async eliminarBackup(nombre: string) {
    const ruta = this.obtenerRutaBackup(nombre);
    fs.unlinkSync(ruta);
    return { mensaje: 'Copia de seguridad eliminada exitosamente' };
  }

  /**
   * Purga segura de datos de prueba con backup previo y doble confirmación (CU-16)
   */
  async purgarDatosPrueba(dto: PurgarDatosPruebaDto, usuario: UsuarioAutenticado) {
    // 1. Doble confirmación: Validar palabra "BORRAR"
    if (dto.palabraConfirmacion !== 'BORRAR') {
      throw new BadRequestException(
        'Debe escribir exactamente la palabra "BORRAR" en mayúsculas para confirmar la purga.',
      );
    }

    // 2. Doble confirmación: Validar contraseña del administrador actual
    const admin = await this.prisma.usuario.findUnique({
      where: { id: usuario.id },
    });
    if (!admin) {
      throw new UnauthorizedException('Usuario administrador no encontrado.');
    }

    const passwordValido = await bcrypt.compare(dto.contrasena, admin.hashClave);
    if (!passwordValido) {
      throw new UnauthorizedException('Contraseña de administrador incorrecta.');
    }

    // 3. Respaldo obligatorio previo a cualquier eliminación
    const backupPrevio = await this.generarBackup('PREVIO_A_PURGA_DATOS_PRUEBA', admin.nombre);

    // 4. Identificar archivos físicos de soportes a eliminar
    const soportesPrueba = await this.prisma.soporte.findMany({
      where: {
        OR: [
          { tarea: { esDatoPrueba: true } },
          { reporte: { esDatoPrueba: true } },
        ],
      },
    });

    // 5. Borrado atómico de entidades de prueba en base de datos
    const [tareasBorradas, reportesBorrados, metasBorradas, usuariosBorados] =
      await this.prisma.$transaction([
        this.prisma.tarea.deleteMany({ where: { esDatoPrueba: true } }),
        this.prisma.reporteMensual.deleteMany({ where: { esDatoPrueba: true } }),
        this.prisma.meta.deleteMany({ where: { esDatoPrueba: true } }),
        this.prisma.usuario.deleteMany({
          where: {
            esDatoPrueba: true,
            id: { not: usuario.id }, // Protección absoluta: nunca borrar al usuario actual
          },
        }),
      ]);

    // 6. Eliminar archivos físicos de disco de los soportes borrados
    let archivosFisicosEliminados = 0;
    for (const soporte of soportesPrueba) {
      if (soporte.ruta && fs.existsSync(soporte.ruta)) {
        try {
          fs.unlinkSync(soporte.ruta);
          archivosFisicosEliminados++;
        } catch (err) {
          this.logger.warn(`No se pudo eliminar archivo físico: ${soporte.ruta}`);
        }
      }
    }

    // 7. Auditoría permanente (la auditoría se conserva intacta)
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ELIMINAR',
      entidad: 'herramientas_purga',
      entidadId: admin.id,
      motivo: 'Purga de datos de prueba (CU-16)',
      datosDespues: {
        backupPrevio: backupPrevio.nombre,
        metasBorradas: metasBorradas.count,
        reportesBorrados: reportesBorrados.count,
        tareasBorradas: tareasBorradas.count,
        usuariosBorados: usuariosBorados.count,
        soportesBorrados: soportesPrueba.length,
        archivosFisicosEliminados,
      },
    });

    return {
      mensaje: 'Purga de datos de prueba completada con éxito.',
      backupPrevio: backupPrevio.nombre,
      resumen: {
        metas: metasBorradas.count,
        reportes: reportesBorrados.count,
        tareas: tareasBorradas.count,
        usuarios: usuariosBorados.count,
        soportes: soportesPrueba.length,
        archivosFisicos: archivosFisicosEliminados,
      },
    };
  }

  /**
   * Tarea programada diaria a las 02:00 AM para backup automático y retención de 30 días
   */
  @Cron('0 2 * * *')
  async ejecutarBackupDiarioAutomatico() {
    this.logger.log('Iniciando backup automático diario programado (02:00 AM)...');
    try {
      await this.generarBackup('PROGRAMADO_DIARIO_02AM', 'Cron Automático');

      // Limpieza de backups mayores a 30 días
      const hace30Dias = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (fs.existsSync(this.rutaBackups)) {
        const archivos = fs.readdirSync(this.rutaBackups);
        for (const archivo of archivos) {
          if (archivo.endsWith('.zip')) {
            const ruta = path.join(this.rutaBackups, archivo);
            const stats = fs.statSync(ruta);
            if (stats.mtimeMs < hace30Dias) {
              fs.unlinkSync(ruta);
              this.logger.log(`Backup antiguo eliminado por política de retención: ${archivo}`);
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Error al ejecutar backup automático diario:', err);
    }
  }
}
