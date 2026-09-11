import { Module } from '@nestjs/common';
import { HerramientasService } from './herramientas.service';
import { HerramientasController } from './herramientas.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  providers: [HerramientasService, PrismaService],
  controllers: [HerramientasController],
  exports: [HerramientasService],
})
export class HerramientasModule {}
