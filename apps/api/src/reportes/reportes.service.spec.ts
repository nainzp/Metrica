import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { RolUsuario, EstadoMeta } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ReportesService (Reglas de Negocio de Reportes Mensuales)', () => {
  let service: ReportesService;
  let prisma: any;
  let auditoria: any;
  let notificaciones: any;

  const mockAdmin = {
    id: 'admin-id',
    correo: 'admin@magdalena.gov.co',
    nombre: 'Administrador',
    rol: RolUsuario.ADMINISTRADOR,
    areaId: 'area-sp-id',
  };

  const mockFuncionario = {
    id: 'func-id',
    correo: 'funcionario@magdalena.gov.co',
    nombre: 'Funcionario SP',
    rol: RolUsuario.FUNCIONARIO,
    areaId: 'area-sp-id',
  };

  beforeEach(async () => {
    prisma = {
      meta: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      reporteMensual: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    auditoria = {
      registrar: jest.fn().mockResolvedValue({ id: 1 }),
    };

    notificaciones = {
      crear: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditoriaService, useValue: auditoria },
        { provide: NotificacionesService, useValue: notificaciones },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  describe('RN-11 y RN-12: Validaciones de Registro de Reporte', () => {
    it('debe rechazar si el usuario no tiene permisos sobre la meta', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({
        id: 'meta-1',
        areaId: 'otra-area',
        responsableId: 'otro-usuario',
        unidad: { esBinaria: false },
        reportes: [],
      });

      await expect(
        service.crearReporte('meta-1', { anio: 2026, mes: 1, valorEjecutado: 10 }, mockFuncionario),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar meses futuros', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({
        id: 'meta-1',
        areaId: 'area-sp-id',
        responsableId: mockFuncionario.id,
        fechaInicio: new Date('2026-01-01'),
        unidad: { esBinaria: false },
        reportes: [],
      });

      await expect(
        service.crearReporte('meta-1', { anio: 2026, mes: 12, valorEjecutado: 10 }, mockFuncionario),
      ).rejects.toThrow(BadRequestException);
    });

    it('RN-11: debe rechazar si ya existe reporte para ese mes (exige corrección)', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({
        id: 'meta-1',
        areaId: 'area-sp-id',
        responsableId: mockFuncionario.id,
        fechaInicio: new Date('2026-01-01'),
        unidad: { esBinaria: false },
        reportes: [{ anio: 2026, mes: 3, valorEjecutado: 5 }],
      });

      await expect(
        service.crearReporte('meta-1', { anio: 2026, mes: 3, valorEjecutado: 10 }, mockFuncionario),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RN-08: Unidades Binarias (Documento / Porcentaje)', () => {
    it('debe exigir observación obligatoria si el porcentaje binario está entre 1 y 99', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({
        id: 'meta-binaria',
        areaId: 'area-sp-id',
        responsableId: mockFuncionario.id,
        fechaInicio: new Date('2026-01-01'),
        valorMeta: 1,
        estado: EstadoMeta.ABIERTA,
        unidad: { esBinaria: true, nombre: 'Documento' },
        reportes: [],
      });

      await expect(
        service.crearReporte(
          'meta-binaria',
          { anio: 2026, mes: 2, porcentajeBinario: 50, observacion: '' },
          mockFuncionario,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RN-05: Cumplimiento Automático y Transición de Estados', () => {
    it('debe marcar la meta como CUMPLIDA cuando el valor acumulado alcanza o supera la meta', async () => {
      prisma.meta.findUnique.mockResolvedValueOnce({
        id: 'meta-cumplir',
        codigo: '301',
        descripcion: 'Meta para cumplir',
        areaId: 'area-sp-id',
        responsableId: mockFuncionario.id,
        fechaInicio: new Date('2026-01-01'),
        valorMeta: 100,
        estado: EstadoMeta.ABIERTA,
        unidad: { esBinaria: false },
        area: { codigo: 'SP', nombre: 'Salud Pública' },
        reportes: [{ anio: 2026, mes: 1, valorEjecutado: 60, costoEjecutado: 1000 }],
      });

      const nuevoReporte = {
        id: 'rep-nuevo-id',
        metaId: 'meta-cumplir',
        anio: 2026,
        mes: 2,
        valorEjecutado: 40,
        costoEjecutado: 1000,
      };
      prisma.reporteMensual.create.mockResolvedValueOnce(nuevoReporte);

      await service.crearReporte(
        'meta-cumplir',
        { anio: 2026, mes: 2, valorEjecutado: 40, costoEjecutado: 1000 },
        mockFuncionario,
      );

      // Debe actualizar el estado a CUMPLIDA
      expect(prisma.meta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meta-cumplir' },
          data: { estado: EstadoMeta.CUMPLIDA },
        }),
      );
      // Debe haber registrado auditoría
      expect(auditoria.registrar).toHaveBeenCalled();
      // Debe haber notificado META_CUMPLIDA
      expect(notificaciones.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoCodigo: 'META_CUMPLIDA',
        }),
      );
    });
  });

  describe('CU-06 y RN-13: Corrección de Reportes con Auditoría', () => {
    it('debe rechazar corrección si no se especifica motivo', async () => {
      await expect(
        service.corregirReporte('rep-1', { motivo: 'no' }, mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe corregir el reporte, registrar auditoría CORREGIR_REPORTE y recalcular estado', async () => {
      const reporteExistente = {
        id: 'rep-1',
        metaId: 'meta-1',
        anio: 2026,
        mes: 1,
        valorEjecutado: 100,
        costoEjecutado: 5000,
        meta: {
          id: 'meta-1',
          codigo: '101',
          valorMeta: 100,
          areaId: 'area-sp-id',
          responsableId: mockFuncionario.id,
          estado: EstadoMeta.CUMPLIDA,
          unidad: { esBinaria: false },
          reportes: [
            { id: 'rep-1', anio: 2026, mes: 1, valorEjecutado: 100, costoEjecutado: 5000 },
          ],
        },
      };
      prisma.reporteMensual.findUnique.mockResolvedValueOnce(reporteExistente);
      prisma.reporteMensual.update.mockResolvedValueOnce({
        ...reporteExistente,
        valorEjecutado: 40,
      });

      await service.corregirReporte(
        'rep-1',
        { valorEjecutado: 40, motivo: 'Error tipográfico en acta de liquidación' },
        mockAdmin,
      );

      // Al bajar el valor a 40 (menor a meta 100), debe transicionar de vuelta a ABIERTA (RN-05)
      expect(prisma.meta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meta-1' },
          data: { estado: EstadoMeta.ABIERTA },
        }),
      );

      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CORREGIR_REPORTE',
          motivo: 'Error tipográfico en acta de liquidación',
        }),
      );

      expect(notificaciones.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoCodigo: 'REPORTE_CORREGIDO',
          usuarioId: mockFuncionario.id,
        }),
      );
    });
  });
});
