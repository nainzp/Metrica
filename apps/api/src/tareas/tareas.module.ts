import { Module } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { TareasController } from './tareas.controller';
import { AgendaController } from './agenda.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [AuditoriaModule, NotificacionesModule],
  controllers: [TareasController, AgendaController],
  providers: [TareasService, PrismaService],
  exports: [TareasService],
})
export class TareasModule {}
