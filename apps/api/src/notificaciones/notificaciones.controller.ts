import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get()
  async listar(
    @Query('soloNoLeidas') soloNoLeidas: string,
    @Query('pagina') pagina: number,
    @Query('tamano') tamano: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.notificacionesService.listar(usuario.id, {
      soloNoLeidas: soloNoLeidas === 'true',
      pagina,
      tamano,
    });
  }

  @Get('no-leidas/conteo')
  async contarNoLeidas(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.notificacionesService.contarNoLeidas(usuario.id);
  }

  @Patch(':id/leida')
  async marcarLeida(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.notificacionesService.marcarLeida(id, usuario.id);
  }

  @Patch('marcar-todas-leidas')
  async marcarTodasLeidas(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.notificacionesService.marcarTodasLeidas(usuario.id);
  }
}
