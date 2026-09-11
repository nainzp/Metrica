export type ColorSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface EvaluacionSemaforo {
  color: ColorSemaforo;
  brecha: number;
}

/**
 * 6.5 y RN-03: Determina el color del semáforo de una meta.
 * - CUMPLIDA => VERDE
 * - hoy > fecha_corte y avance < 100 => ROJO
 * - brecha = avanceIndicador - avancePlaneado
 *   - brecha >= 0 => VERDE
 *   - brecha >= -umbralAmarillo => AMARILLO
 *   - si no => ROJO
 */
export function calcularSemaforoMeta(
  estado: string,
  avanceIndicador: number,
  avancePlaneado: number,
  fechaCorte: Date | string,
  hoy: Date | string,
  umbralAmarillo = 15,
): EvaluacionSemaforo {
  if (estado === 'CUMPLIDA') {
    return { color: 'VERDE', brecha: Math.round((avanceIndicador - avancePlaneado) * 10) / 10 };
  }

  const dCorte = typeof fechaCorte === 'string' ? new Date(fechaCorte) : fechaCorte;
  const dHoy = typeof hoy === 'string' ? new Date(hoy) : hoy;

  // Comparación por fechas (ignorando horas)
  const corteStr = dCorte.toISOString().slice(0, 10);
  const hoyStr = dHoy.toISOString().slice(0, 10);

  const brecha = Math.round((avanceIndicador - avancePlaneado) * 10) / 10;

  if (hoyStr > corteStr && avanceIndicador < 100) {
    return { color: 'ROJO', brecha };
  }

  if (brecha >= 0) {
    return { color: 'VERDE', brecha };
  }

  if (brecha >= -umbralAmarillo) {
    return { color: 'AMARILLO', brecha };
  }

  return { color: 'ROJO', brecha };
}

/**
 * RN-10: Semáforo agregado para áreas, componentes o total de la entidad.
 * Aplica la lógica RN-03 sobre los promedios ponderados simples.
 */
export function calcularSemaforoAgregado(
  promedioAvanceIndicador: number,
  promedioAvancePlaneado: number,
  umbralAmarillo = 15,
): ColorSemaforo {
  const brecha = promedioAvanceIndicador - promedioAvancePlaneado;
  if (brecha >= 0) return 'VERDE';
  if (brecha >= -umbralAmarillo) return 'AMARILLO';
  return 'ROJO';
}
