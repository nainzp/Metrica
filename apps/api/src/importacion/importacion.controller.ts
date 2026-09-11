import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ImportacionService } from './importacion.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { RolesGuard } from '../comun/guards/roles.guard';
import { Roles } from '../comun/decoradores/roles.decorador';
import { RolUsuario } from '@prisma/client';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('importacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportacionController {
  constructor(private importacionService: ImportacionService) {}

  @Post('metas/previsualizar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('archivo'))
  async previsualizar(@UploadedFile() archivo: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('Debe adjuntar un archivo Excel (.xlsx).');
    }
    return this.importacionService.previsualizarExcel(archivo.buffer);
  }

  @Post('metas/confirmar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('archivo'))
  async confirmar(
    @UploadedFile() archivo: Express.Multer.File,
    @Query('esDatoPrueba') esDatoPrueba?: string,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    if (!archivo) {
      throw new BadRequestException('Debe adjuntar un archivo Excel (.xlsx).');
    }
    return this.importacionService.confirmarImportacion(
      archivo.buffer,
      esDatoPrueba === 'true',
      usuario?.id,
    );
  }

  @Post('cargar-archivo-local')
  @Roles(RolUsuario.ADMINISTRADOR)
  async cargarArchivoLocal(
    @Query('esDatoPrueba') esDatoPrueba?: string,
    @UsuarioActual() usuario?: UsuarioAutenticado,
  ) {
    return this.importacionService.cargarArchivoLocal(
      esDatoPrueba === 'true',
      usuario?.id,
    );
  }

  @Get(':id/informe.xlsx')
  async descargarInforme(@Param('id') id: string, @Res() res: Response) {
    const buffer = this.importacionService.obtenerInformeDescarga(id);
    if (!buffer) {
      throw new BadRequestException('El informe solicitado no existe o ha expirado.');
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=informe_importacion_${id}.xlsx`);
    res.send(buffer);
  }
}
