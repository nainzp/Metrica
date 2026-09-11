import { Test, TestingModule } from '@nestjs/testing';
import { TareasService } from './tareas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EstadoMeta, EstadoTarea, EstadoPresencia, RolUsuario } from '@prisma/client';

describe('TareasService (RN-20 a RN-29)', () => {
  let service: TareasService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      meta: {
        findUnique: jest.fn(),
      },
      tarea: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      tareaRecurso: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      usuario: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TareasService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditoriaService, useValue: { registrar: jest.fn() } },
        { provide: NotificacionesService, useValue: { crear: jest.fn() } },
      ],
    }).compile();

    service = module.get<TareasService>(TareasService);
  });

  describe('RN-20: Validación de fechas y horas', () => {
    it('debe rechazar si fechaFin < fechaInicio', () => {
      expect(() =>
        service.validarFechasYHoras('2026-05-10', '2026-05-09'),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar si tiene horario y fechaInicio !== fechaFin (un solo día)', () => {
      expect(() =>
        service.validarFechasYHoras('2026-05-10', '2026-05-11', '08:00', '10:00'),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar si horaFin <= horaInicio', () => {
      expect(() =>
        service.validarFechasYHoras('2026-05-10', '2026-05-10', '10:00', '09:00'),
      ).toThrow(BadRequestException);
    });

    it('debe aceptar horario válido en un mismo día', () => {
      expect(() =>
        service.validarFechasYHoras('2026-05-10', '2026-05-10', '08:00', '11:30'),
      ).not.toThrow();
    });
  });

  describe('RN-21: Determinación dinámica de estado temporal', () => {
    const hoy = new Date('2026-06-15T00:00:00.000Z');

    it('debe marcar PROGRAMADA si hoy < fechaInicio', () => {
      const estado = service.determinarEstadoTemporal(
        EstadoTarea.PROGRAMADA,
        new Date('2026-06-20T00:00:00.000Z'),
        new Date('2026-06-25T00:00:00.000Z'),
        hoy,
      );
      expect(estado).toBe(EstadoTarea.PROGRAMADA);
    });

    it('debe marcar EN_CURSO si fechaInicio <= hoy <= fechaFin', () => {
      const estado = service.determinarEstadoTemporal(
        EstadoTarea.PROGRAMADA,
        new Date('2026-06-10T00:00:00.000Z'),
        new Date('2026-06-20T00:00:00.000Z'),
        hoy,
      );
      expect(estado).toBe(EstadoTarea.EN_CURSO);
    });

    it('debe marcar VENCIDA si hoy > fechaFin y no está finalizada', () => {
      const estado = service.determinarEstadoTemporal(
        EstadoTarea.PROGRAMADA,
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-10T00:00:00.000Z'),
        hoy,
      );
      expect(estado).toBe(EstadoTarea.VENCIDA);
    });

    it('debe conservar FINALIZADA o CANCELADA sin alterar', () => {
      const estadoFin = service.determinarEstadoTemporal(
        EstadoTarea.FINALIZADA,
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-10T00:00:00.000Z'),
        hoy,
      );
      expect(estadoFin).toBe(EstadoTarea.FINALIZADA);
    });
  });

  describe('RN-20: Estado de Meta admisible para crear tarea', () => {
    it('debe rechazar vincular tarea a una meta en PENDIENTE_COMPLETAR', async () => {
      prisma.meta.findUnique.mockResolvedValue({
        id: 'meta-1',
        estado: EstadoMeta.PENDIENTE_COMPLETAR,
      });

      await expect(
        service.crear(
          {
            metaId: 'meta-1',
            titulo: 'Reunión de avance',
            responsableId: 'user-1',
            fechaInicio: '2026-05-10',
            fechaFin: '2026-05-10',
          },
          { id: 'user-1', rol: RolUsuario.FUNCIONARIO } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RN-22: Finalizar tarea', () => {
    it('debe rechazar finalizar si no tiene ningún soporte adjunto', async () => {
      prisma.tarea.findUnique.mockResolvedValue({
        id: 'tarea-1',
        estado: EstadoTarea.EN_CURSO,
        soportes: [],
      });

      await expect(
        service.finalizar(
          'tarea-1',
          { observacionCierre: 'Actividad ejecutada a satisfacción' },
          { id: 'user-1', rol: RolUsuario.FUNCIONARIO } as any,
        ),
      ).rejects.toThrow('al menos un archivo de soporte (RN-22)');
    });

    it('debe rechazar finalizar si la observación de cierre es menor a 5 caracteres', async () => {
      prisma.tarea.findUnique.mockResolvedValue({
        id: 'tarea-1',
        estado: EstadoTarea.EN_CURSO,
        soportes: [{ id: 'sop-1' }],
      });

      await expect(
        service.finalizar(
          'tarea-1',
          { observacionCierre: 'Ok' },
          { id: 'user-1', rol: RolUsuario.FUNCIONARIO } as any,
        ),
      ).rejects.toThrow('mínimo 5 caracteres');
    });
  });

  describe('RN-23: Reabrir tarea', () => {
    it('debe rechazar reapertura si el rol es FUNCIONARIO', async () => {
      await expect(
        service.reabrir(
          'tarea-1',
          { motivo: 'Falta acta' },
          { id: 'user-1', rol: RolUsuario.FUNCIONARIO } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar si han transcurrido más de 5 días de finalizada', async () => {
      const fechaVieja = new Date();
      fechaVieja.setDate(fechaVieja.getDate() - 7);

      prisma.tarea.findUnique.mockResolvedValue({
        id: 'tarea-1',
        estado: EstadoTarea.FINALIZADA,
        finalizadaEn: fechaVieja,
        fechaInicio: new Date('2026-05-01'),
        fechaFin: new Date('2026-05-05'),
      });

      await expect(
        service.reabrir(
          'tarea-1',
          { motivo: 'Se requiere adjuntar soporte complementario' },
          { id: 'lider-1', rol: RolUsuario.LIDER_AREA } as any,
        ),
      ).rejects.toThrow('hace más de 5 días');
    });
  });

  describe('RN-27: Detección de cruces de agenda', () => {
    it('debe detectar cruce cuando se superpone el horario del responsable', async () => {
      prisma.tarea.findMany.mockResolvedValue([
        {
          id: 'tarea-existente',
          titulo: 'Mesa de concertación',
          horaInicio: '09:00',
          horaFin: '11:00',
          meta: { codigo: '226' },
        },
      ]);

      const resultado = await service.verificarCruces({
        fecha: '2026-07-15',
        horaInicio: '10:00',
        horaFin: '12:00',
        responsableId: 'resp-1',
        requiereSecretaria: false,
      });

      expect(resultado.hayCruces).toBe(true);
      expect(resultado.crucesResponsable).toHaveLength(1);
    });

    it('no debe detectar cruce si los horarios no se solapan', async () => {
      prisma.tarea.findMany.mockResolvedValue([
        {
          id: 'tarea-existente',
          titulo: 'Mesa de concertación',
          horaInicio: '09:00',
          horaFin: '10:00',
          meta: { codigo: '226' },
        },
      ]);

      const resultado = await service.verificarCruces({
        fecha: '2026-07-15',
        horaInicio: '10:30',
        horaFin: '12:00',
        responsableId: 'resp-1',
        requiereSecretaria: false,
      });

      expect(resultado.hayCruces).toBe(false);
    });
  });

  describe('RN-28: Presencia de la Secretaria de Salud', () => {
    it('debe rechazar declinar presencia si no incluye motivo de mínimo 5 caracteres', async () => {
      prisma.tarea.findUnique.mockResolvedValue({
        id: 'tarea-1',
        requiereSecretaria: true,
      });

      await expect(
        service.gestionarPresencia(
          'tarea-1',
          { accion: 'DECLINAR', motivo: 'No' },
          { id: 'sec-1', rol: RolUsuario.SECRETARIA } as any,
        ),
      ).rejects.toThrow('mínimo 5 caracteres');
    });
  });
});
