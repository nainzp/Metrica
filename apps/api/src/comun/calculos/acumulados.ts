export interface ReporteItem {
  anio: number;
  mes: number;
  valorEjecutado: number;
  costoEjecutado: number;
  porcentajeBinario?: number | null;
}

/**
 * 6.1 Acumulado de valor ejecutado hasta un año y mes específico.
 * Para unidades binarias (Documento), se calcula como:
 * max(porcentaje_binario) / 100 * valor_meta
 */
export function calcularValorEjecutadoAcum(
  reportes: ReporteItem[],
  hastaAnio: number,
  hastaMes: number,
  esBinaria = false,
  valorMeta = 0,
): number {
  const reportesFiltrados = reportes.filter(
    (r) => r.anio < hastaAnio || (r.anio === hastaAnio && r.mes <= hastaMes),
  );

  if (esBinaria) {
    let maxPorcentaje = 0;
    for (const r of reportesFiltrados) {
      if (r.porcentajeBinario != null) {
        if (r.porcentajeBinario > maxPorcentaje) {
          maxPorcentaje = Number(r.porcentajeBinario);
        }
      } else if (r.valorEjecutado != null) {
        // En caso de que se haya reportado en valor_ejecutado
        const pct = valorMeta > 0 ? (Number(r.valorEjecutado) / valorMeta) * 100 : 0;
        if (pct > maxPorcentaje) maxPorcentaje = pct;
      }
    }
    const val = (Math.min(100, maxPorcentaje) / 100) * valorMeta;
    return Math.round(val * 100) / 100;
  }

  const suma = reportesFiltrados.reduce((acc, r) => acc + (Number(r.valorEjecutado) || 0), 0);
  return Math.round(suma * 100) / 100;
}

/**
 * 6.1 Acumulado de costo ejecutado hasta un año y mes específico.
 */
export function calcularCostoEjecutadoAcum(
  reportes: ReporteItem[],
  hastaAnio: number,
  hastaMes: number,
): number {
  const suma = reportes
    .filter((r) => r.anio < hastaAnio || (r.anio === hastaAnio && r.mes <= hastaMes))
    .reduce((acc, r) => acc + (Number(r.costoEjecutado) || 0), 0);
  return Math.round(suma * 100) / 100;
}
