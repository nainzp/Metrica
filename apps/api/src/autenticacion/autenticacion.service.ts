import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface IntentoFallido {
  conteo: number;
  bloqueadoHasta?: number;
  primerIntento: number;
}

@Injectable()
export class AutenticacionService {
  private intentosFallidos = new Map<string, IntentoFallido>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditoriaService: AuditoriaService,
  ) {}

  /**
   * CU-01: Iniciar sesión con validación de credenciales, bloqueo por intentos y auditoría
   */
  async ingresar(correo: string, clave: string, ip?: string) {
    const correoNorm = correo.trim().toLowerCase();
    const ahora = Date.now();

    // 1. Verificar bloqueo por intentos fallidos (5 fallos en 15 min => bloqueo 15 min)
    const registroIntentos = this.intentosFallidos.get(correoNorm);
    if (registroIntentos?.bloqueadoHasta && registroIntentos.bloqueadoHasta > ahora) {
      const minutosRestantes = Math.ceil((registroIntentos.bloqueadoHasta - ahora) / 60000);
      throw new ForbiddenException({
        codigo: 'CUENTA_BLOQUEADA_TEMPORAL',
        mensaje: `Demasiados intentos fallidos. Intente de nuevo en ${minutosRestantes} minutos.`,
      });
    }

    // 2. Buscar usuario
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: correoNorm },
      include: { area: true, componente: true },
    });

    if (!usuario) {
      this.registrarFallo(correoNorm);
      await this.auditoriaService.registrar({
        accion: 'LOGIN_FALLIDO',
        entidad: 'usuario',
        motivo: `Correo no registrado: ${correoNorm}`,
        ip,
      });
      throw new UnauthorizedException({
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Correo o contraseña incorrectos.',
      });
    }

    if (!usuario.activo) {
      throw new UnauthorizedException({
        codigo: 'CUENTA_INACTIVA',
        mensaje: 'Cuenta inactiva, contacte al administrador.',
      });
    }

    // 3. Validar contraseña
    const claveValida = await bcrypt.compare(clave, usuario.hashClave);
    if (!claveValida) {
      this.registrarFallo(correoNorm);
      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'LOGIN_FALLIDO',
        entidad: 'usuario',
        entidadId: usuario.id,
        motivo: 'Contraseña incorrecta',
        ip,
      });
      throw new UnauthorizedException({
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Correo o contraseña incorrectos.',
      });
    }

    // 4. Éxito: limpiar intentos fallidos
    this.intentosFallidos.delete(correoNorm);

    // 5. Actualizar último acceso
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    // 6. Generar Tokens
    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      areaId: usuario.areaId,
      componenteId: usuario.componenteId,
    };

    const tokenAcceso = this.jwtService.sign(payload, { expiresIn: '8h' });
    const tokenRefresco = this.jwtService.sign(payload, { expiresIn: '7d' });

    // 7. Auditoría
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'usuario',
      entidadId: usuario.id,
      ip,
    });

    return {
      tokenAcceso,
      tokenRefresco,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        areaId: usuario.areaId,
        componenteId: usuario.componenteId,
        areaNombre: usuario.area?.nombre,
        areaCodigo: usuario.area?.codigo,
        componenteNombre: usuario.componente?.nombre,
        componenteCodigo: usuario.componente?.codigo,
        cargo: usuario.cargo,
        recibeCorreo: usuario.recibeCorreo,
      },
    };
  }

  private registrarFallo(correo: string) {
    const ahora = Date.now();
    const registro = this.intentosFallidos.get(correo);

    if (!registro || ahora - registro.primerIntento > 15 * 60 * 1000) {
      this.intentosFallidos.set(correo, {
        conteo: 1,
        primerIntento: ahora,
      });
    } else {
      registro.conteo += 1;
      if (registro.conteo >= 5) {
        registro.bloqueadoHasta = ahora + 15 * 60 * 1000; // Bloqueo 15 minutos
      }
    }
  }

  /**
   * Refresca el token de acceso
   */
  async refrescarToken(tokenRefresco: string) {
    try {
      const payload = this.jwtService.verify(tokenRefresco);
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!usuario || !usuario.activo) {
        throw new UnauthorizedException({
          codigo: 'CUENTA_INACTIVA',
          mensaje: 'Usuario inválido o inactivo.',
        });
      }

      const nuevoPayload = {
        sub: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        areaId: usuario.areaId,
        componenteId: usuario.componenteId,
      };

      const nuevoTokenAcceso = this.jwtService.sign(nuevoPayload, { expiresIn: '8h' });
      return { tokenAcceso: nuevoTokenAcceso };
    } catch {
      throw new UnauthorizedException({
        codigo: 'TOKEN_REFRESCO_INVALIDO',
        mensaje: 'El token de refresco no es válido o ha expirado.',
      });
    }
  }

  /**
   * Obtiene la información del perfil del usuario actual (/yo)
   */
  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { area: true, componente: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      areaId: usuario.areaId,
      componenteId: usuario.componenteId,
      areaNombre: usuario.area?.nombre,
      areaCodigo: usuario.area?.codigo,
      componenteNombre: usuario.componente?.nombre,
      componenteCodigo: usuario.componente?.codigo,
      cargo: usuario.cargo,
      recibeCorreo: usuario.recibeCorreo,
      ultimoAcceso: usuario.ultimoAcceso,
    };
  }

  /**
   * Actualiza preferencias o clave del perfil propio (PATCH /yo)
   */
  async actualizarPerfil(
    usuarioId: string,
    datos: { recibeCorreo?: boolean; claveActual?: string; claveNueva?: string },
    ip?: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado.');

    const actualizacion: any = {};

    if (datos.recibeCorreo !== undefined) {
      actualizacion.recibeCorreo = datos.recibeCorreo;
    }

    if (datos.claveNueva) {
      if (!datos.claveActual) {
        throw new BadRequestException({
          codigo: 'CLAVE_ACTUAL_REQUERIDA',
          mensaje: 'Debe ingresar la contraseña actual para cambiarla.',
        });
      }
      const esCorrecta = await bcrypt.compare(datos.claveActual, usuario.hashClave);
      if (!esCorrecta) {
        throw new BadRequestException({
          codigo: 'CLAVE_ACTUAL_ERRONEA',
          mensaje: 'La contraseña actual ingresada es incorrecta.',
        });
      }
      if (datos.claveNueva.length < 6) {
        throw new BadRequestException({
          codigo: 'CLAVE_CORTA',
          mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.',
        });
      }
      actualizacion.hashClave = await bcrypt.hash(datos.claveNueva, 12);
    }

    const usuarioActualizado = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: actualizacion,
      include: { area: true, componente: true },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR',
      entidad: 'usuario',
      entidadId: usuarioId,
      motivo: 'Actualización de perfil/clave propia',
      ip,
    });

    return {
      id: usuarioActualizado.id,
      nombre: usuarioActualizado.nombre,
      correo: usuarioActualizado.correo,
      rol: usuarioActualizado.rol,
      cargo: usuarioActualizado.cargo,
      recibeCorreo: usuarioActualizado.recibeCorreo,
    };
  }

  /**
   * Solicitar recuperación de contraseña (envío de enlace o token de 1h)
   */
  async solicitarRecuperacion(correo: string) {
    const correoNorm = correo.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { correo: correoNorm } });

    if (!usuario || !usuario.activo) {
      // Retornar mensaje genérico para prevenir enumeración de correos
      return { mensaje: 'Si el correo existe en el sistema, se ha generado el proceso de recuperación.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tokenRecuperacion: token, tokenExpira: expira },
    });

    // En caso de que haya SMTP activo o correo operativo, se enviaría aquí.
    return {
      mensaje: 'Si el correo existe en el sistema, se ha generado el proceso de recuperación.',
      // En modo PRUEBAS devolvemos el token para facilitar verificación si SMTP no está configurado
      tokenPruebas: process.env.ENTORNO === 'PRUEBAS' ? token : undefined,
    };
  }

  /**
   * Restablecer contraseña con token de recuperación
   */
  async restablecerClave(token: string, claveNueva: string, ip?: string) {
    if (!token || !claveNueva || claveNueva.length < 6) {
      throw new BadRequestException('Token inválido o contraseña demasiado corta.');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        tokenRecuperacion: token,
        tokenExpira: { gt: new Date() },
      },
    });

    if (!usuario) {
      throw new BadRequestException({
        codigo: 'TOKEN_INVALIDO_O_EXPIRADO',
        mensaje: 'El enlace de recuperación es inválido o ha expirado.',
      });
    }

    const hashClave = await bcrypt.hash(claveNueva, 12);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        hashClave,
        tokenRecuperacion: null,
        tokenExpira: null,
      },
    });

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'ACTUALIZAR',
      entidad: 'usuario',
      entidadId: usuario.id,
      motivo: 'Restablecimiento de contraseña mediante token',
      ip,
    });

    return { mensaje: 'Contraseña actualizada con éxito. Puede iniciar sesión.' };
  }
}
