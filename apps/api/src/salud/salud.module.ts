import { Module } from '@nestjs/common';
import { SaludController } from './salud.controller';
import { SaludService } from './salud.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SaludController],
  providers: [SaludService, PrismaService],
  exports: [SaludService],
})
export class SaludModule {}
