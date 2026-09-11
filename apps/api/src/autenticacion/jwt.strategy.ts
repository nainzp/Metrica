import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRETO || 'metrica_jwt_secret_magdalena_salud_2026_super_seguro_min_32_bytes',
    });
  }

  async validate(payload: any) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { area: true, componente: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException({
        codigo: 'CUENTA_INACTIVA',
        mensaje: 'La cuenta de usuario no existe o se encuentra inactiva.',
      });
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
    };
  }
}
