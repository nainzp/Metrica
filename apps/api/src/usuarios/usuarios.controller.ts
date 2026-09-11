import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  async listar(
    @Query('areaId') areaId?: string,
    @Query('componenteId') componenteId?: string,
    @Query('rol') rol?: RolUsuario,
    @Query('todos') todos?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.usuariosService.listar({
      areaId,
      componenteId,
      rol,
      soloActivos: todos !== 'true',
      busqueda,
    });
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Get(':id/validar-desactivacion')
  @Roles(RolUsuario.ADMINISTRADOR)
  async validarDesactivacion(@Param('id') id: string) {
    return this.usuariosService.comprobarDesactivacion(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  async crear(
    @Body()
    body: {
      nombre: string;
      correo: string;
      rol: RolUsuario;
      areaId: string;
      componenteId?: string | null;
      cargo?: string | null;
      claveInicial?: string;
      fechaFinContrato?: string | null;
    },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.usuariosService.crear(body, usuario.id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizar(
    @Param('id') id: string,
    @Body()
    body: {
      nombre?: string;
      rol?: RolUsuario;
      areaId?: string;
      componenteId?: string | null;
      cargo?: string | null;
      activo?: boolean;
      recibeCorreo?: boolean;
      fechaFinContrato?: string | null;
    },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.usuariosService.actualizar(id, body, usuario.id);
  }

  @Post(':id/restablecer-clave')
  @Roles(RolUsuario.ADMINISTRADOR)
  async restablecerClave(
    @Param('id') id: string,
    @Body('claveNueva') claveNueva: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.usuariosService.restablecerClave(id, usuario.id, claveNueva);
  }
}
