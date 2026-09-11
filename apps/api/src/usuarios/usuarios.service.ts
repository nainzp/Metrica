import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  async listar(filtros: {
    areaId?: string;
    componenteId?: string;
    rol?: RolUsuario;
    soloActivos?: boolean;
    busqueda?: string;
  }) {
    const where: any = {};
    if (filtros.soloActivos !== false) where.activo = true;
    if (filtros.areaId) where.areaId = filtros.areaId;
    if (filtros.componenteId) where.componenteId = filtros.componenteId;
    if (filtros.rol) where.rol = filtros.rol;

    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { correo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { cargo: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    return this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        areaId: true,
        componenteId: true,
        cargo: true,
        fechaFinContrato: true,
        activo: true,
        recibeCorreo: true,
        ultimoAcceso: true,
        esDatoPrueba: true,
        creadoEn: true,
        area: { select: { id: true, codigo: true, nombre: true } },
        componente: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: [{ area: { nombre: 'asc' } }, { nombre: 'asc' }],
    });
  }

  async obtenerPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { area: true, componente: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const { hashClave, tokenRecuperacion, ...resto } = usuario;
    return resto;
  }

  async crear(
    datos: {
      nombre: string;
      correo: string;
      rol: RolUsuario;
      areaId: string;
      componenteId?: string | null;
      cargo?: string | null;
      claveInicial?: string;
      fechaFinContrato?: string | null;
    },
    usuarioId?: string,
  ) {
    const correoNorm = datos.correo.trim().toLowerCase();
    const existe = await this.prisma.usuario.findUnique({ where: { correo: correoNorm } });
    if (existe) throw new BadRequestException(`El correo ${correoNorm} ya se encuentra registrado.`);

    // Restricción: solo una SECRETARIA activa
    if (datos.rol === RolUsuario.SECRETARIA) {
      const secretariaExistente = await this.prisma.usuario.findFirst({
        where: { rol: RolUsuario.SECRETARIA, activo: true },
      });
      if (secretariaExistente) {
        throw new BadRequestException('Ya existe un usuario activo con el rol de SECRETARIA.');
      }
    }

    // Rol LIDER_COMPONENTE requiere componente_id
    if (datos.rol === RolUsuario.LIDER_COMPONENTE && !datos.componenteId) {
      throw new BadRequestException('El rol de LIDER_COMPONENTE exige especificar el componente.');
    }

    // Rol CONTRATISTA exige fecha de finalización de contrato
    if (datos.rol === RolUsuario.CONTRATISTA && !datos.fechaFinContrato) {
      throw new BadRequestException('El rol de CONTRATISTA exige obligatoriamente la fecha de finalización del contrato.');
    }

    const clavePlano = datos.claveInicial || `Metrica2026_${crypto.randomBytes(3).toString('hex')}*`;
    const hashClave = await bcrypt.hash(clavePlano, 12);

    const nuevo = await this.prisma.usuario.create({
      data: {
        nombre: datos.nombre.trim(),
        correo: correoNorm,
        hashClave,
        rol: datos.rol,
        areaId: datos.areaId,
        componenteId: datos.componenteId || null,
        cargo: datos.cargo?.trim() || null,
        fechaFinContrato: datos.fechaFinContrato ? new Date(datos.fechaFinContrato) : null,
        activo: true,
      },
      include: { area: true, componente: true },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CREAR',
      entidad: 'usuario',
      entidadId: nuevo.id,
      datosDespues: { id: nuevo.id, nombre: nuevo.nombre, correo: nuevo.correo, rol: nuevo.rol },
    });

    const { hashClave: _, tokenRecuperacion: __, ...resto } = nuevo;
    return {
      usuario: resto,
      claveGenerada: clavePlano, // Devuelta una única vez al crear
    };
  }

  async actualizar(
    id: string,
    datos: {
      nombre?: string;
      rol?: RolUsuario;
      areaId?: string;
      componenteId?: string | null;
      cargo?: string | null;
      activo?: boolean;
      recibeCorreo?: boolean;
      fechaFinContrato?: string | null;
    },
    usuarioId?: string,
  ) {
    const usuarioActual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuarioActual) throw new NotFoundException('Usuario no encontrado');

    // RN-26: Validación al desactivar usuario
    if (datos.activo === false && usuarioActual.activo === true) {
      await this.validarDesactivacion(id);
    }

    // Restricción única secretaria
    if (datos.rol === RolUsuario.SECRETARIA && usuarioActual.rol !== RolUsuario.SECRETARIA) {
      const sec = await this.prisma.usuario.findFirst({
        where: { rol: RolUsuario.SECRETARIA, activo: true, id: { not: id } },
      });
      if (sec) throw new BadRequestException('Ya existe un usuario con rol SECRETARIA activo.');
    }

    // Rol CONTRATISTA exige fecha de finalización
    const nuevoRol = datos.rol || usuarioActual.rol;
    if (nuevoRol === RolUsuario.CONTRATISTA) {
      const tieneFecha = datos.fechaFinContrato !== undefined ? datos.fechaFinContrato : usuarioActual.fechaFinContrato;
      if (!tieneFecha) {
        throw new BadRequestException('El rol de CONTRATISTA exige obligatoriamente la fecha de finalización del contrato.');
      }
    }

    const dataToUpdate: any = { ...datos };
    if (datos.fechaFinContrato !== undefined) {
      dataToUpdate.fechaFinContrato = datos.fechaFinContrato ? new Date(datos.fechaFinContrato) : null;
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      include: { area: true, componente: true },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR',
      entidad: 'usuario',
      entidadId: id,
      datosAntes: { activo: usuarioActual.activo, rol: usuarioActual.rol, nombre: usuarioActual.nombre },
      datosDespues: { activo: actualizado.activo, rol: actualizado.rol, nombre: actualizado.nombre },
    });

    const { hashClave, tokenRecuperacion, ...resto } = actualizado;
    return resto;
  }

  /**
   * RN-26: Comprueba el estado de asignaciones sin lanzar excepción para consultas previas
   */
  async comprobarDesactivacion(usuarioId: string) {
    const [metasPendientes, tareasPendientes] = await Promise.all([
      this.prisma.meta.findMany({
        where: {
          responsableId: usuarioId,
          estado: { in: ['ABIERTA', 'PENDIENTE_COMPLETAR'] },
        },
        select: { id: true, codigo: true, descripcion: true },
      }),
      this.prisma.tarea.findMany({
        where: {
          responsableId: usuarioId,
          estado: { in: ['PROGRAMADA', 'EN_CURSO', 'VENCIDA'] },
        },
        select: { id: true, titulo: true, estado: true },
      }),
    ]);

    return {
      puedeDesactivar: metasPendientes.length === 0 && tareasPendientes.length === 0,
      metasAbiertas: metasPendientes.length,
      tareasAbiertas: tareasPendientes.length,
      detalles: {
        metas: metasPendientes.map((m) => `${m.codigo} - ${m.descripcion.slice(0, 50)}...`),
        tareas: tareasPendientes.map((t) => `${t.titulo} (${t.estado})`),
      },
    };
  }

  /**
   * RN-26: Verifica si el usuario tiene metas o tareas pendientes antes de desactivarlo
   */
  private async validarDesactivacion(usuarioId: string) {
    const resultado = await this.comprobarDesactivacion(usuarioId);
    if (!resultado.puedeDesactivar) {
      throw new BadRequestException({
        codigo: 'USUARIO_CON_ASIGNACIONES_ACTIVAS',
        mensaje: 'No se puede desactivar el usuario porque tiene metas o tareas pendientes asignadas. Reasígnelas primero.',
        detalles: resultado.detalles,
      });
    }
  }

  /**
   * Restablece la contraseña de un usuario por el Administrador
   */
  async restablecerClave(id: string, usuarioId?: string, claveManual?: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const nuevaClave = claveManual && claveManual.length >= 6
      ? claveManual
      : `Metrica2026_${crypto.randomBytes(3).toString('hex')}*!`;
    const hashClave = await bcrypt.hash(nuevaClave, 12);

    await this.prisma.usuario.update({
      where: { id },
      data: { hashClave },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR',
      entidad: 'usuario',
      entidadId: id,
      motivo: 'Restablecimiento de contraseña administrativa',
    });

    return {
      mensaje: 'Contraseña restablecida con éxito.',
      claveTemporal: nuevaClave,
    };
  }
}
