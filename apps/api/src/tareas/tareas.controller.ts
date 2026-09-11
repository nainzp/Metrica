import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TareasService } from './tareas.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import {
  CrearTareaDto,
  ActualizarTareaDto,
  FinalizarTareaDto,
  ReabrirTareaDto,
  CancelarTareaDto,
  PresenciaTareaDto,
  VerificarCrucesDto,
} from './dto/tareas.dto';
import { EstadoTarea, EstadoPresencia } from '@prisma/client';

@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private tareasService: TareasService) {}

  @Get()
  async listar(
    @Query('metaId') metaId: string,
    @Query('responsableId') responsableId: string,
    @Query('areaId') areaId: string,
    @Query('componenteId') componenteId: string,
    @Query('estado') estado: EstadoTarea,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('requiereSecretaria') requiereSecretaria: string,
    @Query('estadoPresencia') estadoPresencia: EstadoPresencia,
    @Query('busqueda') busqueda: string,
    @Query('pagina') pagina: number,
    @Query('tamano') tamano: number,
  ) {
    return this.tareasService.listar({
      metaId,
      responsableId,
      areaId,
      componenteId,
      estado,
      desde,
      hasta,
      requiereSecretaria: requiereSecretaria !== undefined ? requiereSecretaria === 'true' : undefined,
      estadoPresencia,
      busqueda,
      pagina,
      tamano,
    });
  }

  @Post('verificar-cruces')
  async verificarCruces(@Body() dto: VerificarCrucesDto) {
    return this.tareasService.verificarCruces(dto);
  }

  @Get('categorias')
  async obtenerCategorias() {
    return this.tareasService.obtenerCategorias();
  }

  @Get('recursos')
  async obtenerRecursos() {
    return this.tareasService.obtenerRecursos();
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.tareasService.obtenerPorId(id);
  }

  @Post()
  async crear(
    @Body() dto: CrearTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.crear(dto, usuario);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.actualizar(id, dto, usuario);
  }

  @Post(':id/finalizar')
  async finalizar(
    @Param('id') id: string,
    @Body() dto: FinalizarTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.finalizar(id, dto, usuario);
  }

  @Post(':id/reabrir')
  async reabrir(
    @Param('id') id: string,
    @Body() dto: ReabrirTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.reabrir(id, dto, usuario);
  }

  @Post(':id/cancelar')
  async cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.cancelar(id, dto, usuario);
  }

  @Post(':id/presencia')
  async gestionarPresencia(
    @Param('id') id: string,
    @Body() dto: PresenciaTareaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.tareasService.gestionarPresencia(id, dto, usuario);
  }
}
