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
import { ComponentesService } from './componentes.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('componentes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComponentesController {
  constructor(private componentesService: ComponentesService) {}

  @Get()
  async listar(@Query('areaId') areaId?: string, @Query('todos') todos?: string) {
    return this.componentesService.listar(areaId, todos !== 'true');
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.componentesService.obtenerPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  async crear(
    @Body() body: { areaId: string; codigo: string; nombre: string; liderId?: string },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.componentesService.crear(body, usuario.id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizar(
    @Param('id') id: string,
    @Body() body: { nombre?: string; liderId?: string | null; activo?: boolean },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.componentesService.actualizar(id, body, usuario.id);
  }
}
