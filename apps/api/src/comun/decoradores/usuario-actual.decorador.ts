import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  areaId: string;
  componenteId?: string | null;
  cargo?: string | null;
}

export const UsuarioActual = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
