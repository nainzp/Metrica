import { Module } from '@nestjs/common';
import { ExportacionService } from './exportacion.service';
import { ExportacionController } from './exportacion.controller';
import { MetasModule } from '../metas/metas.module';
import { TableroModule } from '../tablero/tablero.module';

@Module({
  imports: [MetasModule, TableroModule],
  providers: [ExportacionService],
  controllers: [ExportacionController],
  exports: [ExportacionService],
})
export class ExportacionModule {}
