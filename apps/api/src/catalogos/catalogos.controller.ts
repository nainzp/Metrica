import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';

@Controller('catalogos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogosController {
  constructor(private catalogosService: CatalogosService) {}

  @Get(':tipo')
  async obtenerCatalogo(@Param('tipo') tipo: string, @Query('todos') todos?: string) {
    return this.catalogosService.obtenerCatalogo(tipo, todos !== 'true');
  }

  @Post(':tipo')
  @Roles(RolUsuario.ADMINISTRADOR)
  async crearElemento(@Param('tipo') tipo: string, @Body() body: any) {
    return this.catalogosService.crearElemento(tipo, body);
  }

  @Patch(':tipo/:id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizarElemento(
    @Param('tipo') tipo: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.catalogosService.actualizarElemento(tipo, id, body);
  }

  @Delete(':tipo/:id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async eliminarElemento(
    @Param('tipo') tipo: string,
    @Param('id') id: string,
  ) {
    return this.catalogosService.actualizarElemento(tipo, id, { activo: false });
  }
}
