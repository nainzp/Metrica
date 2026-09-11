import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AutenticacionService } from './autenticacion.service';
import { IngresarDto } from './dto/ingresar.dto';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('auth')
export class AutenticacionController {
  constructor(private autenticacionService: AutenticacionService) {}

  @Post('ingresar')
  @HttpCode(HttpStatus.OK)
  async ingresar(
    @Body() dto: IngresarDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const resultado = await this.autenticacionService.ingresar(dto.correo, dto.clave, ip);

    // Guardar refresh token en cookie httpOnly (segura)
    res.cookie('tokenRefresco', resultado.tokenRefresco, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    return {
      tokenAcceso: resultado.tokenAcceso,
      usuario: resultado.usuario,
    };
  }

  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  async refrescar(@Req() req: Request) {
    const tokenRefresco = req.cookies?.tokenRefresco || req.body?.tokenRefresco;
    return this.autenticacionService.refrescarToken(tokenRefresco);
  }

  @Post('salir')
  @HttpCode(HttpStatus.OK)
  async salir(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('tokenRefresco');
    return { ok: true, mensaje: 'Sesión cerrada correctamente.' };
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  async solicitarRecuperacion(@Body('correo') correo: string) {
    return this.autenticacionService.solicitarRecuperacion(correo);
  }

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  async restablecer(
    @Body('token') token: string,
    @Body('claveNueva') claveNueva: string,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.autenticacionService.restablecerClave(token, claveNueva, ip);
  }
}

@Controller('yo')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private autenticacionService: AutenticacionService) {}

  @Get()
  async obtenerMiPerfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.autenticacionService.obtenerPerfil(usuario.id);
  }

  @Patch()
  async actualizarMiPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() body: { recibeCorreo?: boolean; claveActual?: string; claveNueva?: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.autenticacionService.actualizarPerfil(usuario.id, body, ip);
  }
}
