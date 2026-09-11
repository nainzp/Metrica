import { Module } from '@nestjs/common';
import { ProgramadosService } from './programados.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [NotificacionesModule, AuditoriaModule],
  providers: [ProgramadosService, PrismaService],
  exports: [ProgramadosService],
})
export class ProgramadosModule {}
