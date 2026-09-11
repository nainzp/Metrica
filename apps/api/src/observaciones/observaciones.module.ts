import { Module } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { ObservacionesController } from './observaciones.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [AuditoriaModule, NotificacionesModule],
  providers: [ObservacionesService, PrismaService],
  controllers: [ObservacionesController],
  exports: [ObservacionesService],
})
export class ObservacionesModule {}
