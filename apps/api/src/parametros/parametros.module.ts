import { Module } from '@nestjs/common';
import { ParametrosService } from './parametros.service';
import { ParametrosController } from './parametros.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ParametrosController],
  providers: [ParametrosService, PrismaService],
  exports: [ParametrosService],
})
export class ParametrosModule {}
