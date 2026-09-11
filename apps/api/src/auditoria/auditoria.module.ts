import { Module, Global } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService, PrismaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
