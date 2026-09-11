import {
  calcularValorEjecutadoAcum,
  calcularCostoEjecutadoAcum,
} from './acumulados';
import { generarProgramacionUniforme } from './programacion';
import {
  calcularAvancePlaneado,
  calcularAvanceIndicador,
  calcularAvanceIndicadorReal,
  calcularAvanceOperativo,
} from './avances';
import { calcularSemaforoMeta, calcularSemaforoAgregado } from './semaforo';
import {
  calcularEjecucionPresupuestal,
  tieneGastoSobrePresupuesto,
  tieneGastoSobreAvance,
} from './presupuesto';
import { calcularResumenAgregado } from './agregados';

describe('Motor de Cálculos Puros — MÉTRICA (Reglas de Negocio)', () => {
  describe('RN-01: Avance del indicador (topado en 100 y real para ficha)', () => {
    it('debe topar el avance en 100 cuando el acumulado supera la meta', () => {
      const valorMeta = 300;
      const valorEjecutadoAcum = 397;
      const avanceTopado = calcularAvanceIndicador(valorEjecutadoAcum, valorMeta);
      const avanceReal = calcularAvanceIndicadorReal(valorEjecutadoAcum, valorMeta);

      expect(avanceTopado).toBe(100);
      expect(avanceReal).toBe(132.3);
    });

    it('debe calcular el avance proporcional exacto cuando es menor a la meta', () => {
      const valorMeta = 200;
      const valorEjecutadoAcum = 50;
      expect(calcularAvanceIndicador(valorEjecutadoAcum, valorMeta)).toBe(25);
      expect(calcularAvanceIndicadorReal(valorEjecutadoAcum, valorMeta)).toBe(25);
    });

    it('debe retornar 0 si la meta es 0 o negativa', () => {
      expect(calcularAvanceIndicador(10, 0)).toBe(0);
      expect(calcularAvanceIndicadorReal(10, -5)).toBe(0);
    });
  });

  describe('RN-02 y 6.3: Avance planeado acumulado a una fecha', () => {
    it('debe sumar los meses cuyo último día sea menor o igual a la fecha de evaluación', () => {
      const prog = [
        { anio: 2026, mes: 1, valorProgramado: 10 },
        { anio: 2026, mes: 2, valorProgramado: 10 },
        { anio: 2026, mes: 3, valorProgramado: 10 },
        { anio: 2026, mes: 4, valorProgramado: 10 },
        { anio: 2026, mes: 5, valorProgramado: 10 },
        { anio: 2026, mes: 6, valorProgramado: 10 },
        { anio: 2026, mes: 7, valorProgramado: 10 },
        { anio: 2026, mes: 8, valorProgramado: 10 },
        { anio: 2026, mes: 9, valorProgramado: 10 },
        { anio: 2026, mes: 10, valorProgramado: 10 },
        { anio: 2026, mes: 11, valorProgramado: 10 },
        { anio: 2026, mes: 12, valorProgramado: 10 },
      ];
      const valorMeta = 120;
      // Evaluado a 30 de junio de 2026 (meses 1 a 6 = 60 programado)
      const fecha = new Date('2026-06-30T23:59:59Z');
      const avance = calcularAvancePlaneado(prog, valorMeta, fecha);
      expect(avance).toBe(50);
    });

    it('debe retornar 0 si la fecha de evaluación es previa al inicio de la meta', () => {
      const prog = [{ anio: 2026, mes: 3, valorProgramado: 50 }];
      const fecha = new Date('2026-01-15T00:00:00Z');
      const fechaInicio = new Date('2026-03-01T00:00:00Z');
      const avance = calcularAvancePlaneado(prog, 50, fecha, fechaInicio);
      expect(avance).toBe(0);
    });
  });

  describe('RN-03 y 6.5: Semáforo de meta (Verde, Amarillo, Rojo)', () => {
    const fechaCorte = '2026-11-30';
    const hoy = '2026-08-15';

    it('debe ser VERDE si el estado es CUMPLIDA independientemente de las fechas', () => {
      const res = calcularSemaforoMeta('CUMPLIDA', 100, 80, fechaCorte, hoy);
      expect(res.color).toBe('VERDE');
    });

    it('debe ser VERDE si la brecha es >= 0 (avance indicador >= planeado)', () => {
      // Indicador 60%, Planeado 50% => brecha +10%
      const res = calcularSemaforoMeta('ABIERTA', 60, 50, fechaCorte, hoy);
      expect(res.color).toBe('VERDE');
      expect(res.brecha).toBe(10);
    });

    it('debe ser AMARILLO si -umbral_amarillo (15) <= brecha < 0', () => {
      // Indicador 40%, Planeado 50% => brecha -10% (dentro de [-15, 0))
      const res = calcularSemaforoMeta('ABIERTA', 40, 50, fechaCorte, hoy, 15);
      expect(res.color).toBe('AMARILLO');
      expect(res.brecha).toBe(-10);
    });

    it('debe ser ROJO si la brecha es < -umbral_amarillo', () => {
      // Indicador 20%, Planeado 50% => brecha -30%
      const res = calcularSemaforoMeta('ABIERTA', 20, 50, fechaCorte, hoy, 15);
      expect(res.color).toBe('ROJO');
      expect(res.brecha).toBe(-30);
    });

    it('debe ser ROJO si hoy > fecha_corte y el avance es < 100%', () => {
      const hoyVencido = '2026-12-01';
      // Aunque la brecha matemática fuera favorable contra planeado, ya pasó la fecha de corte
      const res = calcularSemaforoMeta('ABIERTA', 95, 90, fechaCorte, hoyVencido);
      expect(res.color).toBe('ROJO');
    });
  });

  describe('RN-04: Avance operativo de tareas', () => {
    it('debe calcular tareas finalizadas entre tareas no canceladas', () => {
      const total = 10;
      const finalizadas = 4;
      const canceladas = 2; // Validas = 8
      const avance = calcularAvanceOperativo(total, finalizadas, canceladas);
      expect(avance).toBe(50); // 4 / 8 = 50%
    });

    it('debe retornar null ("sin tareas") si no hay tareas válidas', () => {
      expect(calcularAvanceOperativo(0, 0, 0)).toBeNull();
      expect(calcularAvanceOperativo(2, 0, 2)).toBeNull();
    });
  });

  describe('RN-08 y 6.1: Acumulados y Unidades Binarias (Documento)', () => {
    it('debe calcular acumulado tradicional para metas numéricas', () => {
      const reportes = [
        { anio: 2026, mes: 1, valorEjecutado: 10, costoEjecutado: 1000 },
        { anio: 2026, mes: 2, valorEjecutado: 25, costoEjecutado: 2500 },
        { anio: 2026, mes: 3, valorEjecutado: 15, costoEjecutado: 1500 },
      ];
      expect(calcularValorEjecutadoAcum(reportes, 2026, 2)).toBe(35);
      expect(calcularCostoEjecutadoAcum(reportes, 2026, 2)).toBe(3500);
    });

    it('debe usar max(porcentaje_binario) para unidades binarias', () => {
      const reportes = [
        { anio: 2026, mes: 1, valorEjecutado: 0, costoEjecutado: 0, porcentajeBinario: 30 },
        { anio: 2026, mes: 2, valorEjecutado: 0, costoEjecutado: 0, porcentajeBinario: 70 },
        { anio: 2026, mes: 3, valorEjecutado: 0, costoEjecutado: 0, porcentajeBinario: 60 },
      ];
      const valMeta = 1; // 1 Documento
      const acumulado = calcularValorEjecutadoAcum(reportes, 2026, 2, true, valMeta);
      expect(acumulado).toBe(0.7); // 70% de 1
    });
  });

  describe('RN-18 y RN-19: Programación uniforme', () => {
    it('debe distribuir equitativamente el valor y absorber el residuo en el último mes', () => {
      const valorMeta = 100;
      // 3 meses: enero a marzo
      const prog = generarProgramacionUniforme(valorMeta, '2026-01-01', '2026-03-31', 2026, false);
      expect(prog).toHaveLength(12);
      expect(prog[0].valorProgramado).toBe(33.33);
      expect(prog[1].valorProgramado).toBe(33.33);
      expect(prog[2].valorProgramado).toBe(33.34); // absorbe el centavo de residuo
      expect(prog[3].valorProgramado).toBe(0);
      const suma = prog.reduce((acc, p) => acc + p.valorProgramado, 0);
      expect(Math.round(suma * 100) / 100).toBe(100);
    });

    it('debe asignar 100% en el mes de fecha_corte para unidades binarias (RN-19)', () => {
      const valorMeta = 1;
      const prog = generarProgramacionUniforme(valorMeta, '2026-01-01', '2026-11-30', 2026, true);
      expect(prog[0].valorProgramado).toBe(0);
      expect(prog[9].valorProgramado).toBe(0);
      expect(prog[10].valorProgramado).toBe(1); // Mes 11 (Noviembre)
      expect(prog[11].valorProgramado).toBe(0);
    });
  });

  describe('RN-09 y RN-10: Promedios agregados y exclusión de PENDIENTE_COMPLETAR', () => {
    it('debe excluir metas PENDIENTE_COMPLETAR del promedio de avance (RN-07)', () => {
      const metas = [
        {
          id: '1',
          estado: 'ABIERTA',
          avanceIndicador: 50,
          avancePlaneado: 40,
          semaforo: 'VERDE' as const,
          tieneReporteMesActual: true,
          presupuestoProgramado: 1000,
          costoEjecutadoAcum: 400,
          totalTareas: 2,
          tareasFinalizadas: 1,
          tareasCanceladas: 0,
        },
        {
          id: '2',
          estado: 'CUMPLIDA',
          avanceIndicador: 100,
          avancePlaneado: 100,
          semaforo: 'VERDE' as const,
          tieneReporteMesActual: true,
          presupuestoProgramado: 2000,
          costoEjecutadoAcum: 1800,
          totalTareas: 1,
          tareasFinalizadas: 1,
          tareasCanceladas: 0,
        },
        {
          id: '3',
          estado: 'PENDIENTE_COMPLETAR', // NO debe entrar en el promedio de avance
          avanceIndicador: 0,
          avancePlaneado: 0,
          semaforo: 'ROJO' as const,
          tieneReporteMesActual: false,
          presupuestoProgramado: null,
          costoEjecutadoAcum: 0,
          totalTareas: 0,
          tareasFinalizadas: 0,
          tareasCanceladas: 0,
        },
      ];

      const resumen = calcularResumenAgregado(metas, 15);
      expect(resumen.totalMetas).toBe(3);
      expect(resumen.metasPendientesCompletar).toBe(1);
      // Promedio sobre las 2 metas válidas: (50 + 100) / 2 = 75%
      expect(resumen.promedioAvanceIndicador).toBe(75);
      // Planeado: (40 + 100) / 2 = 70%
      expect(resumen.promedioAvancePlaneado).toBe(70);
      expect(resumen.semaforoGlobal).toBe('VERDE');
      // Tareas: 2 finalizadas de 3 totales = 66.7%
      expect(resumen.avanceOperativo).toBe(66.7);
    });
  });

  describe('RN-14 y RN-15: Alertas presupuestales', () => {
    it('RN-14: debe detectar gasto sobre presupuesto programado', () => {
      expect(tieneGastoSobrePresupuesto(1000, 1200)).toBe(true);
      expect(tieneGastoSobrePresupuesto(1000, 900)).toBe(false);
      expect(tieneGastoSobrePresupuesto(null, 500)).toBe(false);
    });

    it('RN-15: debe alertar cuando el porcentaje de costo excede al avance del indicador en más de 20 puntos', () => {
      // Presupuesto 1000, Costo 600 (60% gastado). Avance indicador: 30%
      // 60% - 30% = 30 puntos de diferencia (> 20 umbral) => ALERTA
      expect(tieneGastoSobreAvance(1000, 600, 30, 20)).toBe(true);

      // Si el avance es 45%: 60% - 45% = 15 puntos (<= 20) => NO ALERTA
      expect(tieneGastoSobreAvance(1000, 600, 45, 20)).toBe(false);
    });

    it('6.8: debe calcular la ejecución presupuestal agregada', () => {
      const metas = [
        { presupuestoProgramado: 1000, costoEjecutadoAcum: 500, avanceIndicador: 50 },
        { presupuestoProgramado: 3000, costoEjecutadoAcum: 1500, avanceIndicador: 50 },
        { presupuestoProgramado: null, costoEjecutadoAcum: 200, avanceIndicador: 80 },
      ];
      const ejec = calcularEjecucionPresupuestal(metas);
      expect(ejec.totalPresupuesto).toBe(4000);
      expect(ejec.totalCostoEjecutado).toBe(2000);
      expect(ejec.porcentajeEjecucion).toBe(50);
    });
  });
});
