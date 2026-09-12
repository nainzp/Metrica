import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TableroService } from './tablero.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import { FiltrosTableroDto } from './dto/tablero.dto';

@Controller('tablero')
@UseGuards(JwtAuthGuard)
export class TableroController {
  constructor(private tableroService: TableroService) {}

  @Get('resumen')
  async obtenerResumen(
    @Query() filtros: FiltrosTableroDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tableroService.obtenerResumenEjecutivo(filtros, usuario);
  }

  @Get('curva')
  async obtenerCurva(
    @Query() filtros: FiltrosTableroDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tableroService.obtenerCurvaAvance(filtros, usuario);
  }

  @Get('desglose-areas')
  async obtenerDesgloseAreas(
    @Query() filtros: FiltrosTableroDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tableroService.obtenerDesgloseAreas(filtros, usuario);
  }

  @Get('alertas-criticas')
  async obtenerAlertasCriticas(
    @Query() filtros: FiltrosTableroDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tableroService.obtenerAlertasCriticas(filtros, usuario);
  }
}
