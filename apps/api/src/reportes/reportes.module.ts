import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [AuditoriaModule, NotificacionesModule],
  controllers: [ReportesController],
  providers: [ReportesService, PrismaService],
  exports: [ReportesService],
})
export class ReportesModule {}
