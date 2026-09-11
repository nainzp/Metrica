import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { CrearObservacionDto, AtenderObservacionDto } from './dto/observaciones.dto';

@Controller('observaciones')
@UseGuards(JwtAuthGuard)
export class ObservacionesController {
  constructor(private observacionesService: ObservacionesService) {}

  @Post()
  async crear(
    @Body() dto: CrearObservacionDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.observacionesService.crear(dto, usuario);
  }

  @Get('meta/:metaId')
  async listarPorMeta(@Param('metaId') metaId: string) {
    return this.observacionesService.listarPorMeta(metaId);
  }

  @Get('tarea/:tareaId')
  async listarPorTarea(@Param('tareaId') tareaId: string) {
    return this.observacionesService.listarPorTarea(tareaId);
  }

  @Post(':id/atender')
  async atender(
    @Param('id') id: string,
    @Body() dto: AtenderObservacionDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.observacionesService.atender(id, dto, usuario);
  }
}
