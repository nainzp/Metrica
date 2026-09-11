import { ProgramacionMensual } from './programacion';

/**
 * 6.3 y RN-02: Avance planeado acumulado a una fecha determinada.
 * Suma los meses de programación cuyo último día es <= fecha, dividida por valor_meta, topado en 100.
 * Si fecha < último día del mes de inicio, retorna 0.
 */
export function calcularAvancePlaneado(
  programacion: ProgramacionMensual[],
  valorMeta: number,
  fecha: Date | string,
  fechaInicio?: Date | string,
): number {
  if (valorMeta <= 0) return 0;

  const dFecha = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const anioReferencia = dFecha.getUTCFullYear();
  const mesReferencia = dFecha.getUTCMonth() + 1;
  const diaReferencia = dFecha.getUTCDate();

  if (fechaInicio) {
    const dInicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
    const anioIni = dInicio.getUTCFullYear();
    const mesIni = dInicio.getUTCMonth() + 1;
    // Último día de mesIni
    const ultimoDiaIni = new Date(Date.UTC(anioIni, mesIni, 0)).getUTCDate();
    if (
      anioReferencia < anioIni ||
      (anioReferencia === anioIni && mesReferencia < mesIni) ||
      (anioReferencia === anioIni && mesReferencia === mesIni && diaReferencia < ultimoDiaIni)
    ) {
      return 0;
    }
  }

  // Suma de meses cuyo último día sea <= dFecha
  let sumaProgramada = 0;

  for (const item of programacion) {
    // Obtenemos el último día del mes item.anio - item.mes
    const ultimoDiaDelMes = new Date(Date.UTC(item.anio, item.mes, 0, 23, 59, 59));
    if (ultimoDiaDelMes.getTime() <= dFecha.getTime()) {
      sumaProgramada += Number(item.valorProgramado) || 0;
    }
  }

  const avance = (sumaProgramada / valorMeta) * 100;
  return Math.min(100, Math.max(0, Math.round(avance * 10) / 10));
}

/**
 * 6.4 y RN-01: Avance del indicador (topado a 100 para cálculos y agregados).
 */
export function calcularAvanceIndicador(
  valorEjecutadoAcum: number,
  valorMeta: number,
): number {
  if (valorMeta <= 0) return 0;
  const avance = (valorEjecutadoAcum / valorMeta) * 100;
  return Math.min(100, Math.max(0, Math.round(avance * 10) / 10));
}

/**
 * 6.4 y RN-01: Avance del indicador real (sin tope, para visualización en la ficha).
 */
export function calcularAvanceIndicadorReal(
  valorEjecutadoAcum: number,
  valorMeta: number,
): number {
  if (valorMeta <= 0) return 0;
  const avance = (valorEjecutadoAcum / valorMeta) * 100;
  return Math.max(0, Math.round(avance * 10) / 10);
}

/**
 * RN-04: Avance operativo de tareas.
 * tareas finalizadas / tareas no canceladas.
 * Retorna null si no hay tareas no canceladas (indica "sin tareas").
 */
export function calcularAvanceOperativo(
  totalTareas: number,
  tareasFinalizadas: number,
  tareasCanceladas = 0,
): number | null {
  const tareasValidas = totalTareas - tareasCanceladas;
  if (tareasValidas <= 0) return null;
  const pct = (tareasFinalizadas / tareasValidas) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}
