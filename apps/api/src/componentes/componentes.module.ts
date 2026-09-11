import { Module } from '@nestjs/common';
import { ComponentesService } from './componentes.service';
import { ComponentesController } from './componentes.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ComponentesController],
  providers: [ComponentesService, PrismaService],
  exports: [ComponentesService],
})
export class ComponentesModule {}
