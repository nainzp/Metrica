import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';

@Controller('agenda')
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private tareasService: TareasService) {}

  @Get('despacho')
  async obtenerAgendaDespacho(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.tareasService.obtenerAgendaDespacho(desde, hasta);
  }

  @Get('equipo')
  async obtenerAgendaEquipo(
    @Query('areaId') areaId: string,
    @Query('componenteId') componenteId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.tareasService.listar({
      areaId,
      componenteId,
      desde,
      hasta,
      tamano: 100,
    });
  }

  @Get('recursos-semana')
  async obtenerRecursosSemana(@Query('desde') desde: string) {
    return this.tareasService.obtenerRecursosSemana(desde);
  }
}
