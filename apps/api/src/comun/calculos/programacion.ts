export interface ProgramacionMensual {
  anio: number;
  mes: number;
  valorProgramado: number;
}

/**
 * 6.2 y RN-18 / RN-19: Genera la programación mensual de 12 meses para la vigencia 2026.
 * Reparte valor_meta uniformemente entre mes(fecha_inicio) y mes(fecha_corte),
 * absorbiendo el residuo de redondeo en el último mes.
 * Para unidades binarias, asigna el 100% de valor_meta en el mes de fecha_corte.
 */
export function generarProgramacionUniforme(
  valorMeta: number,
  fechaInicio: Date | string,
  fechaCorte: Date | string,
  vigencia = 2026,
  esBinaria = false,
): ProgramacionMensual[] {
  const programacion: ProgramacionMensual[] = [];
  for (let m = 1; m <= 12; m++) {
    programacion.push({ anio: vigencia, mes: m, valorProgramado: 0 });
  }

  if (valorMeta <= 0) {
    return programacion;
  }

  const dInicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const dCorte = typeof fechaCorte === 'string' ? new Date(fechaCorte) : fechaCorte;

  const anioInicio = dInicio.getUTCFullYear();
  const mesInicioRaw = dInicio.getUTCMonth() + 1; // 1..12

  const anioCorte = dCorte.getUTCFullYear();
  const mesCorteRaw = dCorte.getUTCMonth() + 1; // 1..12

  // Ajustar rango al año de vigencia
  let mesIni = 1;
  if (anioInicio === vigencia) {
    mesIni = Math.max(1, Math.min(12, mesInicioRaw));
  } else if (anioInicio > vigencia) {
    // Fuera de la vigencia
    return programacion;
  }

  let mesFin = 12;
  if (anioCorte === vigencia) {
    mesFin = Math.max(mesIni, Math.min(12, mesCorteRaw));
  } else if (anioCorte < vigencia) {
    return programacion;
  }

  if (esBinaria) {
    // RN-19: para unidades binarias la programación es 100 % en el mes de fecha_corte
    const idx = mesFin - 1;
    programacion[idx].valorProgramado = Math.round(valorMeta * 100) / 100;
    return programacion;
  }

  const nMeses = mesFin - mesIni + 1;
  if (nMeses <= 0) return programacion;

  const cuota = Math.round((valorMeta / nMeses) * 100) / 100;
  let sumaAcumulada = 0;

  for (let i = 0; i < nMeses - 1; i++) {
    const mesIndex = mesIni - 1 + i;
    programacion[mesIndex].valorProgramado = cuota;
    sumaAcumulada += cuota;
  }

  // El último mes del rango absorbe el redondeo
  const ultimoIndex = mesFin - 1;
  const ultimaCuota = Math.round((valorMeta - sumaAcumulada) * 100) / 100;
  programacion[ultimoIndex].valorProgramado = ultimaCuota;

  return programacion;
}
