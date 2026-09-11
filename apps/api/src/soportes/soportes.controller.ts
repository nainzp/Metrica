import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SoportesService } from './soportes.service';
import { JwtAuthGuard } from '../comun/guards/jwt-auth.guard';
import { UsuarioActual, UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Controller('soportes')
@UseGuards(JwtAuthGuard)
export class SoportesController {
  constructor(private soportesService: SoportesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('archivos', 10))
  async subirMultiples(
    @UploadedFiles() archivos: Express.Multer.File[],
    @Body('tareaId') tareaId: string,
    @Body('reporteId') reporteId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.soportesService.subirArchivos(
      archivos,
      { tareaId: tareaId || undefined, reporteId: reporteId || undefined },
      usuario,
    );
  }

  @Post('archivo')
  @UseInterceptors(FileInterceptor('archivo'))
  async subirUno(
    @UploadedFile() archivo: Express.Multer.File,
    @Body('tareaId') tareaId: string,
    @Body('reporteId') reporteId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    if (!archivo) {
      throw new BadRequestException('No se ha recibido ningún archivo.');
    }
    const creados = await this.soportesService.subirArchivos(
      [archivo],
      { tareaId: tareaId || undefined, reporteId: reporteId || undefined },
      usuario,
    );
    return creados[0];
  }

  @Get('tarea/:tareaId')
  async listarPorTarea(@Param('tareaId') tareaId: string) {
    return this.soportesService.listarPorTarea(tareaId);
  }

  @Get('reporte/:reporteId')
  async listarPorReporte(@Param('reporteId') reporteId: string) {
    return this.soportesService.listarPorReporte(reporteId);
  }

  @Get(':id/descargar')
  async descargar(@Param('id') id: string, @Res() res: Response) {
    const info = await this.soportesService.obtenerParaDescarga(id);
    return res.download(info.rutaAbsoluta, info.nombreOriginal);
  }

  @Delete(':id')
  async eliminar(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.soportesService.eliminar(id, usuario);
  }
}
