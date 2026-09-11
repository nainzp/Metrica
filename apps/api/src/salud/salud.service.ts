import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SaludService {
  constructor(private prisma: PrismaService) {}

  async verificarSalud() {
    const inicio = Date.now();
    let estadoBd = 'CONECTADO';
    let errorBd: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      estadoBd = 'DESCONECTADO';
      errorBd = err.message;
    }

    const latenciaBdMs = Date.now() - inicio;
    const memoria = process.memoryUsage();

    return {
      ok: estadoBd === 'CONECTADO',
      sistema: 'MÉTRICA',
      entidad: 'Gobernación del Magdalena - Secretaría de Salud',
      version: '1.0.0',
      vigencia: '2026',
      entorno: process.env.NODE_ENV || 'produccion',
      timestamp: new Date().toISOString(),
      tiempoActivoSegundos: Math.floor(process.uptime()),
      baseDatos: {
        estado: estadoBd,
        latenciaMs: latenciaBdMs,
        ...(errorBd ? { error: errorBd } : {}),
      },
      memoria: {
        rssMb: Math.round((memoria.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoria.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoria.heapUsed / 1024 / 1024) * 100) / 100,
      },
      servicios: {
        api: 'ACTIVO',
        cron: 'ACTIVO',
      },
    };
  }
}
