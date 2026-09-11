import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { ROLES_CLAVE } from '../decoradores/roles.decorador';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_CLAVE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException({
        codigo: 'ACCESO_DENEGADO',
        mensaje: 'No se encontró el usuario en la solicitud.',
      });
    }

    const tieneRol = rolesRequeridos.includes(user.rol);
    if (!tieneRol) {
      throw new ForbiddenException({
        codigo: 'ROL_INSUFICIENTE',
        mensaje: 'Su rol no tiene permisos para realizar esta acción.',
        detalles: { rolActual: user.rol, rolesPermitidos: rolesRequeridos },
      });
    }

    return true;
  }
}
