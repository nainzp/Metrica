import { Module } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CatalogosController],
  providers: [CatalogosService, PrismaService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
