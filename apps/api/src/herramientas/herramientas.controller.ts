import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { HerramientasService } from './herramientas.service';
import { PurgarDatosPruebaDto } from './dto/herramientas.dto';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { RolUsuario } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('herramientas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class HerramientasController {
  constructor(private readonly herramientasService: HerramientasService) {}

  @Get('datos-prueba/conteo')
  async obtenerConteo() {
    return this.herramientasService.obtenerConteoDatosPrueba();
  }

  @Post('datos-prueba/inyectar')
  async inyectarDemostracion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.herramientasService.inyectarDatosDemostracion(usuario);
  }

  @Post('datos-prueba/borrar')
  async purgar(
    @Body() dto: PurgarDatosPruebaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.herramientasService.purgarDatosPrueba(dto, usuario);
  }

  @Post('backups/generar')
  async generarBackup(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.herramientasService.generarBackup('MANUAL_ADMINISTRADOR', usuario.nombre);
  }

  @Get('backups')
  async listarBackups() {
    return this.herramientasService.listarBackups();
  }

  @Get('backups/:nombre/descargar')
  async descargarBackup(
    @Param('nombre') nombre: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ruta = this.herramientasService.obtenerRutaBackup(nombre);
    const stream = fs.createReadStream(ruta);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombre)}"`,
    });

    return new StreamableFile(stream);
  }

  @Delete('backups/:nombre')
  async eliminarBackup(@Param('nombre') nombre: string) {
    return this.herramientasService.eliminarBackup(nombre);
  }
}
