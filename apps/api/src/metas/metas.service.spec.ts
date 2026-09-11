import { Test, TestingModule } from '@nestjs/testing';
import { MetasService } from './metas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario, EstadoMeta } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('MetasService', () => {
  let service: MetasService;
  let prisma: any;
  let auditoria: any;

  const mockAdminUser = {
    id: 'user-admin-uuid',
    correo: 'admin@magdalena.gov.co',
    nombre: 'Administrador',
    rol: RolUsuario.ADMINISTRADOR,
    areaId: 'area-sp-uuid',
  };

  const mockLiderAreaUser = {
    id: 'user-lider-sp',
    correo: 'lider.sp@magdalena.gov.co',
    nombre: 'Líder SP',
    rol: RolUsuario.LIDER_AREA,
    areaId: 'area-sp-uuid',
  };

  beforeEach(async () => {
    prisma = {
      meta: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      unidadMedida: {
        findUnique: jest.fn(),
      },
      programacionMeta: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditoria = {
      registrar: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetasService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    }).compile();

    service = module.get<MetasService>(MetasService);
  });

  describe('enriquecerMeta (Campos Calculados Normativos)', () => {
    it('debe calcular acumulados, avance indicador, avance planeado y semáforo', () => {
      const metaDb = {
        id: 'meta-1',
        codigo: '101',
        valorMeta: 100,
        fechaInicio: new Date('2026-01-01T00:00:00Z'),
        fechaFinOficial: new Date('2026-12-31T00:00:00Z'),
        fechaCorte: new Date('2026-11-30T00:00:00Z'),
        presupuestoProgramado: 10000000,
        estado: EstadoMeta.ABIERTA,
        unidad: { esBinaria: false, codigo: 'NUM' },
        programaciones: [
          { anio: 2026, mes: 1, valorProgramado: 10 },
          { anio: 2026, mes: 2, valorProgramado: 10 },
          { anio: 2026, mes: 3, valorProgramado: 10 },
          { anio: 2026, mes: 4, valorProgramado: 10 },
          { anio: 2026, mes: 5, valorProgramado: 10 },
          { anio: 2026, mes: 6, valorProgramado: 10 },
        ],
        reportes: [
          { anio: 2026, mes: 6, valorEjecutado: 60, costoEjecutado: 5000000 },
        ],
        tareas: [],
        observaciones: [],
      };

      const enriquecida = service.enriquecerMeta(metaDb, new Date('2026-07-01T00:00:00Z'));
      expect(enriquecida.valorEjecutadoAcum).toBe(60);
      expect(enriquecida.costoEjecutadoAcum).toBe(5000000);
      expect(enriquecida.avanceIndicador).toBe(60);
      expect(enriquecida.avancePlaneado).toBe(60);
      expect(enriquecida.semaforo).toBe('VERDE');
      expect(enriquecida.brecha).toBe(0);
      expect(enriquecida.sobrePresupuesto).toBe(false);
    });
  });

  describe('crear (CRUD con validaciones)', () => {
    it('debe rechazar código duplicado', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({ id: 'meta-existente' });

      await expect(
        service.crear(
          {
            codigo: 'DUPLICADO',
            descripcion: 'Meta duplicada',
            areaId: 'area-sp-uuid',
            unidadId: 'unidad-uuid',
            valorMeta: 10,
          },
          mockAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe impedir a un líder de área crear metas fuera de su área', async () => {
      await expect(
        service.crear(
          {
            codigo: 'NUEVA',
            descripcion: 'Meta ajena',
            areaId: 'area-otra-uuid',
            unidadId: 'unidad-uuid',
            valorMeta: 10,
          },
          mockLiderAreaUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe crear la meta, generar su programación uniforme y registrar auditoría', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce(null);
      prisma.unidadMedida.findUnique.mockResolvedValueOnce({ id: 'unidad-uuid', esBinaria: false });
      const nuevaMetaCreada = {
        id: 'nueva-meta-uuid',
        codigo: 'NUEVA-01',
        descripcion: 'Meta de prueba',
        areaId: 'area-sp-uuid',
        unidadId: 'unidad-uuid',
        valorMeta: 12,
        fechaInicio: new Date('2026-01-01T00:00:00Z'),
        fechaFinOficial: new Date('2026-12-31T00:00:00Z'),
        fechaCorte: new Date('2026-11-30T00:00:00Z'),
        estado: EstadoMeta.PENDIENTE_COMPLETAR,
        distribucionUniforme: true,
      };
      prisma.meta.create.mockResolvedValueOnce(nuevaMetaCreada);
      prisma.meta.findUnique.mockResolvedValueOnce({
        ...nuevaMetaCreada,
        area: {},
        componente: null,
        responsable: null,
        unidad: { esBinaria: false },
        fuenteRecurso: null,
        poblacionSujeto: null,
        programaciones: [],
        reportes: [],
        tareas: [],
        observaciones: [],
      });

      const resultado = await service.crear(
        {
          codigo: 'NUEVA-01',
          descripcion: 'Meta de prueba',
          areaId: 'area-sp-uuid',
          unidadId: 'unidad-uuid',
          valorMeta: 12,
        },
        mockAdminUser,
      );

      expect(prisma.meta.create).toHaveBeenCalled();
      expect(prisma.programacionMeta.create).toHaveBeenCalledTimes(12);
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CREAR',
          entidad: 'meta',
          entidadId: 'nueva-meta-uuid',
        }),
      );
      expect(resultado).toBeDefined();
    });
  });

  describe('reabrirMeta y cerrar (Reglas de Apertura/Cierre)', () => {
    it('debe rechazar reapertura sin motivo válido (mínimo 5 caracteres)', async () => {
      await expect(
        service.reabrirMeta('meta-uuid', 'abc', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar cierre sin motivo válido', async () => {
      await expect(
        service.cerrar('meta-uuid', 'no', mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir a un admin reabrir una meta y auditar el cambio', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({ id: 'meta-uuid', estado: EstadoMeta.CUMPLIDA });
      prisma.meta.update.mockResolvedValueOnce({ id: 'meta-uuid', estado: EstadoMeta.ABIERTA });

      const res = await service.reabrirMeta('meta-uuid', 'Ajuste solicitado por Despacho', mockAdminUser);
      expect(res.estado).toBe(EstadoMeta.ABIERTA);
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REABRIR_META',
          entidad: 'meta',
          motivo: 'Ajuste solicitado por Despacho',
        }),
      );
    });
  });
});
