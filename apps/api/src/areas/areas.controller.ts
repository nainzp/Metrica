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
import { AreasService } from './areas.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AreasController {
  constructor(private areasService: AreasService) {}

  @Get()
  async listar(@Query('todas') todas?: string) {
    return this.areasService.listar(todas !== 'true');
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.areasService.obtenerPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  async crear(
    @Body() body: { codigo: string; nombre: string; liderId?: string },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.areasService.crear(body, usuario.id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizar(
    @Param('id') id: string,
    @Body() body: { nombre?: string; liderId?: string | null; activo?: boolean },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.areasService.actualizar(id, body, usuario.id);
  }

  @Get(':id/miembros')
  async obtenerMiembros(@Param('id') id: string) {
    return this.areasService.obtenerMiembros(id);
  }
}
