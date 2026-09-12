import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MetasService } from './metas.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario, EstadoMeta } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetasController {
  constructor(private metasService: MetasService) {}

  @Get('metas')
  async listar(
    @Query('areaId') areaId?: string,
    @Query('componenteId') componenteId?: string,
    @Query('responsableId') responsableId?: string,
    @Query('estado') estado?: EstadoMeta,
    @Query('semaforo') semaforo?: string,
    @Query('fuenteId') fuenteId?: string,
    @Query('poblacionId') poblacionId?: string,
    @Query('unidadId') unidadId?: string,
    @Query('busqueda') busqueda?: string,
    @Query('sinReporte') sinReporte?: string,
    @Query('mes') mes?: string,
    @Query('pagina') pagina?: number,
    @Query('tamano') tamano?: number,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return this.metasService.listar(
      {
        areaId,
        componenteId,
        responsableId,
        estado,
        semaforo,
        fuenteId,
        poblacionId,
        unidadId,
        busqueda,
        sinReporte: sinReporte === 'true',
        mes: mes ? Number(mes) : undefined,
        pagina,
        tamano,
      },
      usuario!,
    );
  }

  @Get('mis-metas/pendientes-reporte')
  async misMetasPendientesReporte(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.metasService.obtenerMisMetasPendientesReporte(usuario);
  }

  @Get('metas/:id')
  async obtenerPorId(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.obtenerPorId(id, usuario);
  }

  @Patch('metas/:id/responsable')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA)
  async asignarResponsable(
    @Param('id') id: string,
    @Body('responsableId') responsableId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.asignarResponsable(id, responsableId, usuario);
  }

  @Put('metas/:id/programacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA, RolUsuario.LIDER_COMPONENTE, RolUsuario.FUNCIONARIO)
  async actualizarProgramacion(
    @Param('id') id: string,
    @Body('programacion') programacion: { anio: number; mes: number; valorProgramado: number }[],
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.actualizarProgramacion(id, programacion, usuario);
  }

  @Post('metas/:id/programacion/uniforme')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA, RolUsuario.LIDER_COMPONENTE, RolUsuario.FUNCIONARIO)
  async restablecerProgramacionUniforme(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.restablecerProgramacionUniforme(id, usuario);
  }

  @Post('metas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA)
  async crear(
    @Body()
    body: {
      codigo: string;
      descripcion: string;
      areaId: string;
      componenteId?: string;
      unidadId: string;
      valorMeta: number;
      fechaInicio?: string;
      fechaFinOficial?: string;
      fechaCorte?: string;
      responsableId?: string;
      fuenteRecursoId?: string;
      presupuestoProgramado?: number;
      poblacionSujetoId?: string;
    },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.crear(body, usuario);
  }

  @Patch('metas/:id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA)
  async actualizar(
    @Param('id') id: string,
    @Body()
    body: {
      descripcion?: string;
      componenteId?: string | null;
      unidadId?: string;
      valorMeta?: number;
      fechaInicio?: string;
      fechaFinOficial?: string;
      fechaCorte?: string;
      fuenteRecursoId?: string | null;
      presupuestoProgramado?: number | null;
      poblacionSujetoId?: string | null;
    },
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.actualizar(id, body, usuario);
  }

  @Post('metas/:id/cerrar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.LIDER_AREA)
  async cerrar(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.cerrar(id, motivo, usuario);
  }

  @Post('metas/:id/reabrir')
  @Roles(RolUsuario.ADMINISTRADOR)
  async reabrirMeta(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.metasService.reabrirMeta(id, motivo, usuario);
  }
}
