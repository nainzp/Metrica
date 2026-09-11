import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ReportesService, CrearReporteDto, CorregirReporteDto } from './reportes.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Post('metas/:id/reportes')
  async crearReporte(
    @Param('id') metaId: string,
    @Body() dto: CrearReporteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.reportesService.crearReporte(metaId, dto, usuario);
  }

  @Post('metas/:id/reportes/proyectar')
  async proyectarReporte(
    @Param('id') metaId: string,
    @Body() dto: CrearReporteDto,
  ) {
    return this.reportesService.proyectarReporte(metaId, dto);
  }

  @Patch('reportes/:id')
  async corregirReporte(
    @Param('id') id: string,
    @Body() dto: CorregirReporteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.reportesService.corregirReporte(id, dto, usuario);
  }

  @Get('metas/:id/reportes')
  async listarPorMeta(@Param('id') metaId: string) {
    return this.reportesService.listarPorMeta(metaId);
  }

  @Get('reportes/:id')
  async obtenerPorId(@Param('id') id: string) {
    return this.reportesService.obtenerPorId(id);
  }
}
