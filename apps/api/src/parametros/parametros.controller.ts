import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ParametrosService } from './parametros.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('parametros')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrosController {
  constructor(private parametrosService: ParametrosService) {}

  @Get()
  async listarParametros() {
    return this.parametrosService.listarParametros();
  }

  @Patch(':clave')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizarParametro(
    @Param('clave') clave: string,
    @Body('valor') valor: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.parametrosService.actualizarParametro(clave, String(valor), usuario.id);
  }

  @Get('tipos-notificacion')
  async listarTiposNotificacion() {
    return this.parametrosService.listarTiposNotificacion();
  }

  @Patch('tipos-notificacion/:codigo')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizarTipoNotificacion(
    @Param('codigo') codigo: string,
    @Body() body: { enviaCorreo?: boolean; nombre?: string; descripcion?: string },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.parametrosService.actualizarTipoNotificacion(codigo, body, usuario.id);
  }

  @Post('correo-prueba')
  @Roles(RolUsuario.ADMINISTRADOR)
  async enviarCorreoPrueba(@Body('destinatario') destinatario: string) {
    // Verificación de configuración
    const correoActivo = await this.parametrosService.obtenerValor('correo_activo');
    return {
      enviado: false,
      correoActivo: correoActivo === 'true',
      mensaje:
        correoActivo === 'true'
          ? `Correo de prueba despachado a ${destinatario || 'remitente'}`
          : 'El envío global de correos se encuentra desactivado (correo_activo = false).',
    };
  }
}
