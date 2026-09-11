import { ColorSemaforo, calcularSemaforoAgregado } from './semaforo';
import { calcularEjecucionPresupuestal, MetaPresupuesto } from './presupuesto';

export interface MetaParaAgregados extends MetaPresupuesto {
  id: string;
  estado: string; // PENDIENTE_COMPLETAR, ABIERTA, CUMPLIDA, CERRADA_SIN_CUMPLIR
  avanceIndicador: number;
  avancePlaneado: number;
  semaforo: ColorSemaforo;
  tieneReporteMesActual: boolean;
  totalTareas: number;
  tareasFinalizadas: number;
  tareasCanceladas: number;
}

export interface ResumenAgregado {
  totalMetas: number;
  metasAbiertas: number;
  metasCumplidas: number;
  metasCerradasSinCumplir: number;
  metasPendientesCompletar: number;
  metasSinReporteMes: number;

  metasVerde: number;
  metasAmarillo: number;
  metasRojo: number;

  promedioAvanceIndicador: number;
  promedioAvancePlaneado: number;
  semaforoGlobal: ColorSemaforo;

  totalPresupuesto: number;
  totalCostoEjecutado: number;
  porcentajeEjecucionPresupuestal: number;

  totalTareas: number;
  tareasFinalizadas: number;
  tareasCanceladas: number;
  avanceOperativo: number | null;
}

/**
 * 6.7, RN-07, RN-09, RN-10: Consolida el resumen agregado para un conjunto de metas.
 * Promedio simple sobre metas ABIERTA, CUMPLIDA y CERRADA_SIN_CUMPLIR.
 */
export function calcularResumenAgregado(
  metas: MetaParaAgregados[],
  umbralAmarillo = 15,
): ResumenAgregado {
  let metasAbiertas = 0;
  let metasCumplidas = 0;
  let metasCerradasSinCumplir = 0;
  let metasPendientesCompletar = 0;
  let metasSinReporteMes = 0;

  let metasVerde = 0;
  let metasAmarillo = 0;
  let metasRojo = 0;

  let sumaAvanceIndicador = 0;
  let sumaAvancePlaneado = 0;
  let nMetasCalculo = 0;

  let totalTareas = 0;
  let tareasFinalizadas = 0;
  let tareasCanceladas = 0;

  for (const m of metas) {
    if (m.estado === 'PENDIENTE_COMPLETAR') {
      metasPendientesCompletar++;
      continue; // RN-07: no cuenta en promedios de avance
    }

    if (m.estado === 'ABIERTA') metasAbiertas++;
    else if (m.estado === 'CUMPLIDA') metasCumplidas++;
    else if (m.estado === 'CERRADA_SIN_CUMPLIR') metasCerradasSinCumplir++;

    if (!m.tieneReporteMesActual && m.estado === 'ABIERTA') {
      metasSinReporteMes++;
    }

    if (m.semaforo === 'VERDE') metasVerde++;
    else if (m.semaforo === 'AMARILLO') metasAmarillo++;
    else if (m.semaforo === 'ROJO') metasRojo++;

    sumaAvanceIndicador += Math.min(100, Math.max(0, m.avanceIndicador));
    sumaAvancePlaneado += Math.min(100, Math.max(0, m.avancePlaneado));
    nMetasCalculo++;

    totalTareas += m.totalTareas || 0;
    tareasFinalizadas += m.tareasFinalizadas || 0;
    tareasCanceladas += m.tareasCanceladas || 0;
  }

  const promedioAvanceIndicador =
    nMetasCalculo > 0 ? Math.round((sumaAvanceIndicador / nMetasCalculo) * 10) / 10 : 0;
  const promedioAvancePlaneado =
    nMetasCalculo > 0 ? Math.round((sumaAvancePlaneado / nMetasCalculo) * 10) / 10 : 0;

  const semaforoGlobal = calcularSemaforoAgregado(
    promedioAvanceIndicador,
    promedioAvancePlaneado,
    umbralAmarillo,
  );

  const ejecPres = calcularEjecucionPresupuestal(metas);

  const tareasValidas = totalTareas - tareasCanceladas;
  const avanceOperativo =
    tareasValidas > 0
      ? Math.round(((tareasFinalizadas / tareasValidas) * 100) * 10) / 10
      : null;

  return {
    totalMetas: metas.length,
    metasAbiertas,
    metasCumplidas,
    metasCerradasSinCumplir,
    metasPendientesCompletar,
    metasSinReporteMes,

    metasVerde,
    metasAmarillo,
    metasRojo,

    promedioAvanceIndicador,
    promedioAvancePlaneado,
    semaforoGlobal,

    totalPresupuesto: ejecPres.totalPresupuesto,
    totalCostoEjecutado: ejecPres.totalCostoEjecutado,
    porcentajeEjecucionPresupuestal: ejecPres.porcentajeEjecucion,

    totalTareas,
    tareasFinalizadas,
    tareasCanceladas,
    avanceOperativo,
  };
}
