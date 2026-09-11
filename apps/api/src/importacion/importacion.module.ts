import { Module } from '@nestjs/common';
import { ImportacionService } from './importacion.service';
import { ImportacionController } from './importacion.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ImportacionController],
  providers: [ImportacionService, PrismaService],
  exports: [ImportacionService],
})
export class ImportacionModule {}
