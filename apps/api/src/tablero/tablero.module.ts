import { Module } from '@nestjs/common';
import { TableroService } from './tablero.service';
import { TableroController } from './tablero.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MetasModule } from '../metas/metas.module';

@Module({
  imports: [MetasModule],
  providers: [TableroService, PrismaService],
  controllers: [TableroController],
  exports: [TableroService],
})
export class TableroModule {}
