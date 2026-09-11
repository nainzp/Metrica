import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ParametrosService {
  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  async listarParametros() {
    return this.prisma.parametro.findMany({
      orderBy: { clave: 'asc' },
    });
  }

  async obtenerValor(clave: string): Promise<string> {
    const param = await this.prisma.parametro.findUnique({ where: { clave } });
    if (!param) throw new NotFoundException(`Parámetro ${clave} no encontrado.`);
    return param.valor;
  }

  async actualizarParametro(clave: string, valor: string, usuarioId?: string) {
    const anterior = await this.prisma.parametro.findUnique({ where: { clave } });
    if (!anterior) throw new NotFoundException(`Parámetro ${clave} no encontrado.`);
    if (!anterior.editable) throw new BadRequestException(`El parámetro ${clave} no es editable.`);

    // Validar tipo
    if (anterior.tipo === 'numero' && isNaN(Number(valor))) {
      throw new BadRequestException(`El valor del parámetro debe ser numérico.`);
    }
    if (anterior.tipo === 'booleano' && valor !== 'true' && valor !== 'false') {
      throw new BadRequestException(`El valor del parámetro debe ser 'true' o 'false'.`);
    }
    if (anterior.tipo === 'json') {
      try {
        JSON.parse(valor);
      } catch {
        throw new BadRequestException(`El valor del parámetro debe ser un JSON válido.`);
      }
    }

    const actualizado = await this.prisma.parametro.update({
      where: { clave },
      data: { valor },
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CAMBIO_PARAMETRO',
      entidad: 'parametro',
      motivo: `Cambio de parámetro ${clave}`,
      datosAntes: { clave, valor: anterior.valor },
      datosDespues: { clave, valor: actualizado.valor },
    });

    return actualizado;
  }

  async listarTiposNotificacion() {
    return this.prisma.tipoNotificacion.findMany({
      orderBy: { codigo: 'asc' },
    });
  }

  async actualizarTipoNotificacion(
    codigo: string,
    datos: { enviaCorreo?: boolean; nombre?: string; descripcion?: string },
    usuarioId?: string,
  ) {
    const anterior = await this.prisma.tipoNotificacion.findUnique({ where: { codigo } });
    if (!anterior) throw new NotFoundException('Tipo de notificación no encontrado');

    const actualizado = await this.prisma.tipoNotificacion.update({
      where: { codigo },
      data: datos,
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CAMBIO_PARAMETRO',
      entidad: 'tipo_notificacion',
      motivo: `Modificación en tipo de notificación ${codigo}`,
      datosAntes: anterior,
      datosDespues: actualizado,
    });

    return actualizado;
  }
}
