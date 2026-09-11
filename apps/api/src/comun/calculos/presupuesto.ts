export interface MetaPresupuesto {
  presupuestoProgramado: number | null;
  costoEjecutadoAcum: number;
  avanceIndicador: number;
}

/**
 * 6.8: Porcentaje de ejecución presupuestal agregada.
 * 100 * Σ costoEjecutadoAcum / Σ presupuesto_programado (solo metas con presupuesto asignado > 0)
 */
export function calcularEjecucionPresupuestal(metas: MetaPresupuesto[]): {
  totalPresupuesto: number;
  totalCostoEjecutado: number;
  porcentajeEjecucion: number;
} {
  let totalPresupuesto = 0;
  let totalCostoEjecutado = 0;

  for (const m of metas) {
    if (m.presupuestoProgramado != null && Number(m.presupuestoProgramado) > 0) {
      totalPresupuesto += Number(m.presupuestoProgramado);
      totalCostoEjecutado += Number(m.costoEjecutadoAcum) || 0;
    }
  }

  const porcentaje =
    totalPresupuesto > 0 ? (totalCostoEjecutado / totalPresupuesto) * 100 : 0;

  return {
    totalPresupuesto: Math.round(totalPresupuesto * 100) / 100,
    totalCostoEjecutado: Math.round(totalCostoEjecutado * 100) / 100,
    porcentajeEjecucion: Math.round(porcentaje * 10) / 10,
  };
}

/**
 * RN-14: Verifica si la meta tiene sobrecosto frente a su presupuesto programado.
 */
export function tieneGastoSobrePresupuesto(
  presupuestoProgramado: number | null,
  costoEjecutadoAcum: number,
): boolean {
  if (presupuestoProgramado == null || Number(presupuestoProgramado) <= 0) return false;
  return Number(costoEjecutadoAcum) > Number(presupuestoProgramado);
}

/**
 * RN-15: Alerta de gasto sobre avance.
 * (costo_acum / presupuesto) * 100 - avance_indicador > umbral_gasto_sobre_avance
 */
export function tieneGastoSobreAvance(
  presupuestoProgramado: number | null,
  costoEjecutadoAcum: number,
  avanceIndicador: number,
  umbral = 20,
): boolean {
  if (presupuestoProgramado == null || Number(presupuestoProgramado) <= 0) return false;
  const pctGasto = (Number(costoEjecutadoAcum) / Number(presupuestoProgramado)) * 100;
  return pctGasto - avanceIndicador > umbral;
}
