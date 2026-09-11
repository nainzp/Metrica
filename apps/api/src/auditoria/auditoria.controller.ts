import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(private auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SECRETARIA, RolUsuario.LIDER_AREA)
  async listar(
    @Query('entidad') entidad?: string,
    @Query('entidadId') entidadId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina?: number,
    @Query('tamano') tamano?: number,
  ) {
    return this.auditoriaService.listar({
      entidad,
      entidadId,
      usuarioId,
      accion,
      desde,
      hasta,
      pagina,
      tamano,
    });
  }
}
