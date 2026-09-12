import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportacionService } from './exportacion.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('exportacion')
@UseGuards(JwtAuthGuard)
export class ExportacionController {
  constructor(private exportacionService: ExportacionService) {}

  @Get('metas/excel')
  async exportarMetasExcel(
    @Query('areaId') areaId: string,
    @Query('componenteId') componenteId: string,
    @Query('mes') mes: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res() res: Response,
  ) {
    return this.exportacionService.exportarMetasExcel(
      {
        areaId: areaId || undefined,
        componenteId: componenteId || undefined,
        mes: mes ? Number(mes) : undefined,
      },
      usuario,
      res,
    );
  }
}
