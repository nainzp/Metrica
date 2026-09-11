import { Module } from '@nestjs/common';
import { SoportesService } from './soportes.service';
import { SoportesController } from './soportes.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  controllers: [SoportesController],
  providers: [SoportesService, PrismaService],
  exports: [SoportesService],
})
export class SoportesModule {}
