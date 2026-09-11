import { Test, TestingModule } from '@nestjs/testing';
import { TableroService } from './tablero.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetasService } from '../metas/metas.service';
import { RolUsuario } from '@prisma/client';

describe('TableroService (CU-11, RN-09, RN-10)', () => {
  let service: TableroService;
  let prismaMock: any;
  let metasServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      tarea: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 't-1',
            titulo: 'Vacunación Ciénaga',
            meta: { codigo: '101', descripcion: 'Meta 101' },
            responsable: { nombre: 'Dr. Carlos' },
            fechaFin: new Date('2026-05-10'),
          },
        ]),
      },
      area: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'area-1',
            codigo: 'SP',
            nombre: 'Salud Pública',
            componentes: [{ id: 'comp-1', codigo: 'EPI', nombre: 'Epidemiología' }],
          },
        ]),
      },
      meta: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    metasServiceMock = {
      listar: jest.fn().mockResolvedValue({
        datos: [
          {
            id: 'meta-1',
            codigo: '101',
            estado: 'ABIERTA',
            avanceIndicador: 80,
            avancePlaneado: 60,
            semaforo: 'VERDE',
            presupuestoProgramado: 1000000,
            costoEjecutadoAcum: 500000,
            areaId: 'area-1',
            componenteId: 'comp-1',
            tareas: [],
          },
          {
            id: 'meta-2',
            codigo: '102',
            estado: 'ABIERTA',
            avanceIndicador: 40,
            avancePlaneado: 70,
            semaforo: 'ROJO',
            presupuestoProgramado: 2000000,
            costoEjecutadoAcum: 1200000,
            areaId: 'area-1',
            componenteId: 'comp-1',
            tareas: [],
          },
        ],
        total: 2,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TableroService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MetasService, useValue: metasServiceMock },
      ],
    }).compile();

    service = module.get<TableroService>(TableroService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerResumenEjecutivo', () => {
    it('debe calcular el promedio simple de avance físico global conforme a RN-09 y RN-10', async () => {
      const usuarioMock: any = { id: 'u1', rol: RolUsuario.SECRETARIA };
      const resumen = await service.obtenerResumenEjecutivo({}, usuarioMock);

      // (80 + 40) / 2 = 60
      expect(resumen.avanceGlobalFisico).toBe(60);
      // (60 + 70) / 2 = 65
      expect(resumen.avanceGlobalPlaneado).toBe(65);
      // Brecha: 60 - 65 = -5
      expect(resumen.brecha).toBe(-5);
      // Brecha -5 dentro de umbral 15 pts -> AMARILLO
      expect(resumen.semaforoGlobal).toBe('AMARILLO');

      expect(resumen.distribucionSemaforos.verde).toBe(1);
      expect(resumen.distribucionSemaforos.rojo).toBe(1);

      // Presupuesto total: 3.000.000, costo: 1.700.000 -> 56.7%
      expect(resumen.financiero.totalPresupuesto).toBe(3000000);
      expect(resumen.financiero.totalCostoEjecutado).toBe(1700000);
      expect(resumen.financiero.porcentajeEjecucion).toBe(56.7);
    });
  });

  describe('obtenerAlertasCriticas', () => {
    it('debe filtrar metas rojas y tareas vencidas', async () => {
      const usuarioMock: any = { id: 'u1', rol: RolUsuario.SECRETARIA };
      const alertas = await service.obtenerAlertasCriticas({}, usuarioMock);

      expect(alertas.metasRojas.length).toBe(1);
      expect(alertas.metasRojas[0].codigo).toBe('102');
      expect(alertas.tareasVencidas.length).toBe(1);
      expect(alertas.tareasVencidas[0].titulo).toBe('Vacunación Ciénaga');
    });
  });
});
