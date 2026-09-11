import { ProgramacionMensual } from './programacion';
import { ReporteItem, calcularValorEjecutadoAcum } from './acumulados';
import { calcularAvancePlaneado, calcularAvanceIndicador } from './avances';
import { obtenerUltimoDiaMes } from '../fecha';

export interface MetaParaCurva {
  id: string;
  valorMeta: number;
  esBinaria?: boolean;
  fechaInicio: Date | string;
  fechaCorte: Date | string;
  programacion: ProgramacionMensual[];
  reportes: ReporteItem[];
}

export interface PuntoCurvaMes {
  mes: number;
  nombreMes: string;
  planeado: number;
  ejecutado: number | null;
}

const NOMBRES_MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/**
 * 6.6: Genera los 12 puntos mensuales de la curva acumulada (planeado vs ejecutado).
 * El avance planeado se proyecta de enero a diciembre.
 * El avance ejecutado solo se calcula hasta el mes actual de la vigencia.
 */
export function generarCurvaAvanceMensual(
  metas: MetaParaCurva[],
  anioVigencia = 2026,
  mesActual = 12,
): PuntoCurvaMes[] {
  const puntos: PuntoCurvaMes[] = [];

  for (let m = 1; m <= 12; m++) {
    const ultimoDiaM = obtenerUltimoDiaMes(anioVigencia, m);

    // Promedio de avance planeado a ese mes
    let sumaPlaneado = 0;
    let sumaEjecutado = 0;
    let nMetas = 0;

    for (const meta of metas) {
      if (meta.valorMeta <= 0) continue;
      nMetas++;

      const avPl = calcularAvancePlaneado(
        meta.programacion,
        meta.valorMeta,
        ultimoDiaM,
        meta.fechaInicio,
      );
      sumaPlaneado += avPl;

      if (m <= mesActual) {
        const valAcum = calcularValorEjecutadoAcum(
          meta.reportes,
          anioVigencia,
          m,
          meta.esBinaria,
          meta.valorMeta,
        );
        const avEj = calcularAvanceIndicador(valAcum, meta.valorMeta);
        sumaEjecutado += avEj;
      }
    }

    const promPlaneado = nMetas > 0 ? Math.round((sumaPlaneado / nMetas) * 10) / 10 : 0;
    const promEjecutado =
      m <= mesActual && nMetas > 0
        ? Math.round((sumaEjecutado / nMetas) * 10) / 10
        : null;

    puntos.push({
      mes: m,
      nombreMes: NOMBRES_MESES[m - 1],
      planeado: promPlaneado,
      ejecutado: promEjecutado,
    });
  }

  return puntos;
}
