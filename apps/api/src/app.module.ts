import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AreasModule } from './areas/areas.module';
import { ComponentesModule } from './componentes/componentes.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ParametrosModule } from './parametros/parametros.module';
import { MetasModule } from './metas/metas.module';
import { ImportacionModule } from './importacion/importacion.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ReportesModule } from './reportes/reportes.module';
import { ProgramadosModule } from './programados/programados.module';
import { SoportesModule } from './soportes/soportes.module';
import { TareasModule } from './tareas/tareas.module';
import { TableroModule } from './tablero/tablero.module';
import { ObservacionesModule } from './observaciones/observaciones.module';
import { ExportacionModule } from './exportacion/exportacion.module';
import { HerramientasModule } from './herramientas/herramientas.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuditoriaModule,
    AutenticacionModule,
    UsuariosModule,
    AreasModule,
    ComponentesModule,
    CatalogosModule,
    ParametrosModule,
    MetasModule,
    ImportacionModule,
    NotificacionesModule,
    ReportesModule,
    ProgramadosModule,
    SoportesModule,
    TareasModule,
    TableroModule,
    ObservacionesModule,
    ExportacionModule,
    HerramientasModule,
    SaludModule,
  ],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
