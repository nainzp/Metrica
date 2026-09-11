import { Test, TestingModule } from '@nestjs/testing';
import { HerramientasService } from './herramientas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('HerramientasService', () => {
  let service: HerramientasService;

  const mockPrismaService = {
    meta: { count: jest.fn().mockResolvedValue(2) },
    reporteMensual: { count: jest.fn().mockResolvedValue(1) },
    tarea: { count: jest.fn().mockResolvedValue(3) },
    usuario: {
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn(),
    },
    soporte: { count: jest.fn().mockResolvedValue(0) },
  };

  const mockAuditoriaService = {
    registrar: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HerramientasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<HerramientasService>(HerramientasService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('obtenerConteoDatosPrueba debe sumar los registros de prueba', async () => {
    const conteo = await service.obtenerConteoDatosPrueba();
    expect(conteo.metas).toBe(2);
    expect(conteo.reportes).toBe(1);
    expect(conteo.tareas).toBe(3);
    expect(conteo.total).toBe(7);
  });

  it('purgarDatosPrueba debe fallar si palabraConfirmacion no es BORRAR', async () => {
    await expect(
      service.purgarDatosPrueba(
        { palabraConfirmacion: 'borrar', contrasena: '123' },
        { id: 'usr-1', nombre: 'Admin', correo: 'admin@magdalena.gov.co', rol: 'ADMINISTRADOR' as any, areaId: 'area-1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
