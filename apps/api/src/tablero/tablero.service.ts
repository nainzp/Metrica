import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetasService } from '../metas/metas.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';
import {
  calcularResumenAgregado,
  generarCurvaAvanceMensual,
  MetaParaCurva,
  MetaParaAgregados,
} from '../comun/calculos';
import { obtenerHoyBogota } from '../comun/fecha';
import { RolUsuario, EstadoTarea, EstadoMeta } from '@prisma/client';

@Injectable()
export class TableroService {
  constructor(
    private prisma: PrismaService,
    private metasService: MetasService,
  ) {}

  /**
   * Obtiene el resumen ejecutivo de alto nivel para la Secretaria y Directivos (CU-11, RN-09, RN-10)
   */
  async obtenerResumenEjecutivo(
    filtros: { areaId?: string; componenteId?: string; mes?: number; trimestre?: number; ejecutor?: string },
    usuario: UsuarioAutenticado,
  ) {
    const trim =
      filtros.trimestre && Number(filtros.trimestre) >= 1 && Number(filtros.trimestre) <= 4
        ? Number(filtros.trimestre)
        : null;
    const mesesDelTrimestre = trim
      ? [(trim - 1) * 3 + 1, (trim - 1) * 3 + 2, (trim - 1) * 3 + 3]
      : null;
    const mesReferencia = trim
      ? trim * 3
      : filtros.mes && Number(filtros.mes) >= 1 && Number(filtros.mes) <= 12
        ? Number(filtros.mes)
        : null;

    const metasData = await this.metasService.listar(
      {
        areaId: filtros.areaId,
        componenteId: filtros.componenteId,
        mes: mesReferencia || undefined,
        trimestre: trim || undefined,
        ejecutor: filtros.ejecutor,
        tamano: 400,
      },
      usuario,
    );

    const metas = metasData.datos;
    const hoy = mesReferencia
      ? new Date(Date.UTC(2026, mesReferencia, 0, 23, 59, 59, 999))
      : obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const anioActual = hoy.getUTCFullYear();

    // Adaptar a MetaParaAgregados
    const metasParaAgregados: MetaParaAgregados[] = metas.map((m: any) => ({
      id: m.id,
      estado: m.estado,
      avanceIndicador: m.avanceIndicador ?? 0,
      avancePlaneado: m.avancePlaneado ?? 0,
      semaforo: m.semaforo || 'ROJO',
      presupuestoProgramado: Number(m.presupuestoProgramado) || 0,
      costoEjecutadoAcum: Number(m.costoEjecutadoAcum) || 0,
      tieneReporteMesActual: Boolean(
        m.reportes?.some((r: any) => r.anio === anioActual && r.mes === mesActual),
      ),
      totalTareas: m.tareas?.length || 0,
      tareasFinalizadas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.FINALIZADA).length || 0,
      tareasCanceladas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.CANCELADA).length || 0,
    }));

    const resumen = calcularResumenAgregado(metasParaAgregados);

    // Cálculos específicos de periodo para el Trimestre
    let totalProgramadoTrimestre = 0;
    let totalEjecutadoTrimestre = 0;
    let totalCostoEjecutadoTrimestre = 0;
    let metasProgramadasEnTrimestre = 0;
    let metasConReporteEnTrimestre = 0;
    let sumaCumplimientoPorcentual = 0;
    let tieneReportesEnTrimestre = false;

    if (trim && mesesDelTrimestre) {
      for (const m of metas) {
        if (m.estado === EstadoMeta.PENDIENTE_COMPLETAR) continue;

        const valorProg = Number(m.programadoTrimestre) || 0;
        const valorEjec = Number(m.ejecutadoTrimestre) || 0;
        const costoEjec = Number(m.costoEjecutadoTrimestre) || 0;

        if (m.tieneReporteTrimestre) {
          tieneReportesEnTrimestre = true;
          metasConReporteEnTrimestre++;
        }

        totalProgramadoTrimestre += valorProg;
        totalEjecutadoTrimestre += valorEjec;
        totalCostoEjecutadoTrimestre += costoEjec;

        if (valorProg > 0) {
          metasProgramadasEnTrimestre++;
          const cumplimiento = Math.min(100, Math.max(0, (valorEjec / valorProg) * 100));
          sumaCumplimientoPorcentual += cumplimiento;
        } else if (valorEjec > 0) {
          metasProgramadasEnTrimestre++;
          sumaCumplimientoPorcentual += 100;
        }
      }
    }

    const promedioCumplimientoTrimestre =
      metasProgramadasEnTrimestre > 0
        ? Math.round((sumaCumplimientoPorcentual / metasProgramadasEnTrimestre) * 10) / 10
        : 0;

    // Consulta consolidada de tareas para KPIs operativos
    const whereTareas: any = {
      meta: {
        estado: { in: [EstadoMeta.ABIERTA, EstadoMeta.CUMPLIDA] },
      },
    };
    if (filtros.areaId) whereTareas.meta.areaId = filtros.areaId;
    if (filtros.componenteId) whereTareas.meta.componenteId = filtros.componenteId;

    const [
      conteoProgramadas,
      conteoEnCurso,
      conteoVencidas,
      conteoFinalizadas,
      conteoDespacho,
      actividadesOpTotal,
      actividadesOpPorEstado,
      metasConOperadorTotal,
    ] = await Promise.all([
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.PROGRAMADA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.EN_CURSO } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.VENCIDA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.FINALIZADA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, requiereSecretaria: true } }),
      this.prisma.actividadOperador.count(),
      this.prisma.actividadOperador.groupBy({
        by: ['estado'],
        _count: true,
      }),
      this.prisma.meta.count({ where: { tieneOperador: true } }),
    ]);

    const conteoOp: Record<string, number> = {};
    actividadesOpPorEstado.forEach((g: any) => {
      conteoOp[g.estado] = g._count;
    });

    const resumenContratoOperador = {
      totalActividades: actividadesOpTotal,
      ejecutadas: conteoOp['EJECUTADA'] || 0,
      enEjecucion: conteoOp['EN_EJECUCION'] || 0,
      pendientes: conteoOp['PENDIENTE'] || 0,
      aDemanda: conteoOp['A_DEMANDA'] || 0,
      totalMetasAsociadas: metasConOperadorTotal,
      porcentajeAvanceContrato:
        actividadesOpTotal > 0
          ? Math.round((((conteoOp['EJECUTADA'] || 0) + (conteoOp['EN_EJECUCION'] || 0) * 0.5) / actividadesOpTotal) * 1000) / 10
          : 0,
    };

    const nombresTrimestres: Record<number, string> = {
      1: 'Trimestre 1 (Enero - Marzo)',
      2: 'Trimestre 2 (Abril - Junio)',
      3: 'Trimestre 3 (Julio - Septiembre)',
      4: 'Trimestre 4 (Octubre - Diciembre)',
    };

    return {
      ejecutorSeleccionado: filtros.ejecutor || 'TODOS',
      resumenContratoOperador,
      mesSeleccionado: filtros.mes ? Number(filtros.mes) : null,
      trimestreSeleccionado: trim,
      nombreTrimestre: trim ? nombresTrimestres[trim] : null,
      mesesTrimestre: mesesDelTrimestre,
      tieneDatosTrimestre: trim ? tieneReportesEnTrimestre : true,
      mensajeTrimestre:
        trim && !tieneReportesEnTrimestre
          ? `Sin reportes: No se registran avances o reportes periódicos para el ${nombresTrimestres[trim]}. Los indicadores trimestrales se presentan en 0% a la espera del cargue de información.`
          : null,
      resumenTrimestre: trim
        ? {
            programadoPeriodo: Math.round(totalProgramadoTrimestre * 100) / 100,
            ejecutadoPeriodo: Math.round(totalEjecutadoTrimestre * 100) / 100,
            costoEjecutadoPeriodo: totalCostoEjecutadoTrimestre,
            porcentajeCumplimiento: promedioCumplimientoTrimestre,
            metasProgramadas: metasProgramadasEnTrimestre,
            metasConReporte: metasConReporteEnTrimestre,
          }
        : null,
      mesReferencia: mesActual,
      avanceGlobalFisico: resumen.promedioAvanceIndicador,
      avanceGlobalPlaneado: resumen.promedioAvancePlaneado,
      semaforoGlobal: resumen.semaforoGlobal,
      brecha: Math.round((resumen.promedioAvanceIndicador - resumen.promedioAvancePlaneado) * 10) / 10,
      distribucionSemaforos: {
        verde: resumen.metasVerde,
        amarillo: resumen.metasAmarillo,
        rojo: resumen.metasRojo,
      },
      distribucionEstados: {
        total: resumen.totalMetas,
        abiertas: resumen.metasAbiertas,
        cumplidas: resumen.metasCumplidas,
        cerradasSinCumplir: resumen.metasCerradasSinCumplir,
        pendientesCompletar: resumen.metasPendientesCompletar,
        sinReporteMesActual: resumen.metasSinReporteMes,
      },
      financiero: {
        totalPresupuesto: resumen.totalPresupuesto,
        totalCostoEjecutado: resumen.totalCostoEjecutado,
        porcentajeEjecucion: resumen.porcentajeEjecucionPresupuestal,
        totalPresupuestoProgramado: resumen.totalPresupuesto,
        totalPresupuestoEjecutado: resumen.totalCostoEjecutado,
      },
      operativo: {
        totalTareas: conteoProgramadas + conteoEnCurso + conteoVencidas + conteoFinalizadas,
        programadas: conteoProgramadas,
        enCurso: conteoEnCurso,
        vencidas: conteoVencidas,
        finalizadas: conteoFinalizadas,
        compromisosDespacho: conteoDespacho,
        avanceOperativo: resumen.avanceOperativo,
      },
    };
  }

  /**
   * Genera los 12 puntos de la curva de avance mensual acumulado (CU-11, 6.6)
   */
  async obtenerCurvaAvance(
    filtros: { areaId?: string; componenteId?: string; mes?: number; trimestre?: number; ejecutor?: string },
    usuario: UsuarioAutenticado,
  ) {
    const where: any = {};
    if (usuario.rol === RolUsuario.LIDER_AREA) {
      where.areaId = usuario.areaId;
    } else if (usuario.rol === RolUsuario.LIDER_COMPONENTE) {
      where.areaId = usuario.areaId;
      if (usuario.componenteId) where.componenteId = usuario.componenteId;
    }
    if (filtros.areaId) where.areaId = filtros.areaId;
    if (filtros.componenteId) where.componenteId = filtros.componenteId;

    if (filtros.ejecutor === 'OPERADOR') {
      where.tieneOperador = true;
    } else if (filtros.ejecutor === 'SECRETARIA') {
      where.tieneOperador = false;
    }

    const metas = await this.prisma.meta.findMany({
      where,
      include: {
        unidad: true,
        programaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
        reportes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
      },
    });

    const metasParaCurva: MetaParaCurva[] = metas.map((m) => ({
      id: m.id,
      valorMeta: Number(m.valorMeta),
      esBinaria: Boolean(m.unidad?.esBinaria),
      fechaInicio: m.fechaInicio,
      fechaCorte: m.fechaCorte,
      programacion: m.programaciones.map((p) => ({
        anio: p.anio,
        mes: p.mes,
        valorProgramado: Number(p.valorProgramado),
      })),
      reportes: m.reportes.map((r) => ({
        anio: r.anio,
        mes: r.mes,
        valorEjecutado: Number(r.valorEjecutado),
        costoEjecutado: Number(r.costoEjecutado),
        porcentajeBinario: r.porcentajeBinario != null ? Number(r.porcentajeBinario) : null,
      })),
    }));

    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCFullYear() === 2026 ? hoy.getUTCMonth() + 1 : 12;
    const mesFiltro = filtros.mes && Number(filtros.mes) >= 1 && Number(filtros.mes) <= 12 ? Number(filtros.mes) : null;

    const trim =
      filtros.trimestre && Number(filtros.trimestre) >= 1 && Number(filtros.trimestre) <= 4
        ? Number(filtros.trimestre)
        : null;
    const mesesTrimestre = trim
      ? [(trim - 1) * 3 + 1, (trim - 1) * 3 + 2, (trim - 1) * 3 + 3]
      : null;

    const puntos = generarCurvaAvanceMensual(metasParaCurva, 2026, mesActual);

    return puntos.map((p) => ({
      ...p,
      esMesActual: p.mes === mesActual,
      esMesSeleccionado: p.mes === mesFiltro,
      esTrimestreSeleccionado: mesesTrimestre ? mesesTrimestre.includes(p.mes) : false,
      esFechaCorte: p.mes === 11, // 30 de noviembre de 2026
    }));
  }

  /**
   * Desglose del avance físico por área y componente para gráficos de barras y drill-down
   */
  async obtenerDesgloseAreas(
    filtros: { mes?: number; trimestre?: number; ejecutor?: string },
    usuario: UsuarioAutenticado,
  ) {
    const areas = await this.prisma.area.findMany({
      where: { activo: true },
      include: { componentes: { where: { activo: true } } },
      orderBy: { nombre: 'asc' },
    });

    const trim =
      filtros?.trimestre && Number(filtros.trimestre) >= 1 && Number(filtros.trimestre) <= 4
        ? Number(filtros.trimestre)
        : null;
    const mesReferenciaNum = trim
      ? trim * 3
      : filtros?.mes && Number(filtros.mes) >= 1 && Number(filtros.mes) <= 12
        ? Number(filtros.mes)
        : undefined;

    const metasData = await this.metasService.listar(
      { tamano: 400, mes: mesReferenciaNum, trimestre: trim || undefined, ejecutor: filtros.ejecutor },
      usuario,
    );
    const metasEnriquecidas = metasData.datos;
    const hoy = mesReferenciaNum
      ? new Date(Date.UTC(2026, mesReferenciaNum, 0, 23, 59, 59, 999))
      : obtenerHoyBogota();
    const mesReferencia = hoy.getUTCMonth() + 1;
    const anioReferencia = hoy.getUTCFullYear();

    const resultados = [];

    for (const area of areas) {
      const metasArea = metasEnriquecidas.filter((m: any) => m.areaId === area.id);

      const metasParaAgr: MetaParaAgregados[] = metasArea.map((m: any) => ({
        id: m.id,
        estado: m.estado,
        avanceIndicador: m.avanceIndicador ?? 0,
        avancePlaneado: m.avancePlaneado ?? 0,
        semaforo: m.semaforo || 'ROJO',
        presupuestoProgramado: Number(m.presupuestoProgramado) || 0,
        costoEjecutadoAcum: Number(m.costoEjecutadoAcum) || 0,
        tieneReporteMesActual: Boolean(
          m.reportes?.some((r: any) => r.anio === anioReferencia && r.mes === mesReferencia),
        ),
        totalTareas: m.tareas?.length || 0,
        tareasFinalizadas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.FINALIZADA).length || 0,
        tareasCanceladas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.CANCELADA).length || 0,
      }));

      const resumenArea = calcularResumenAgregado(metasParaAgr);

      // Desglose por componentes
      const componentesDetalle = [];
      for (const comp of area.componentes) {
        const metasComp = metasArea.filter((m: any) => m.componenteId === comp.id);
        const metasCompAgr: MetaParaAgregados[] = metasComp.map((m: any) => ({
          id: m.id,
          estado: m.estado,
          avanceIndicador: m.avanceIndicador ?? 0,
          avancePlaneado: m.avancePlaneado ?? 0,
          semaforo: m.semaforo || 'ROJO',
          presupuestoProgramado: Number(m.presupuestoProgramado) || 0,
          costoEjecutadoAcum: Number(m.costoEjecutadoAcum) || 0,
          tieneReporteMesActual: Boolean(
            m.reportes?.some((r: any) => r.anio === anioReferencia && r.mes === mesReferencia),
          ),
          totalTareas: m.tareas?.length || 0,
          tareasFinalizadas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.FINALIZADA).length || 0,
          tareasCanceladas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.CANCELADA).length || 0,
        }));
        const resumenComp = calcularResumenAgregado(metasCompAgr);
        componentesDetalle.push({
          id: comp.id,
          codigo: comp.codigo,
          nombre: comp.nombre,
          totalMetas: metasComp.length,
          avanceFisico: resumenComp.promedioAvanceIndicador,
          avancePlaneado: resumenComp.promedioAvancePlaneado,
          semaforo: resumenComp.semaforoGlobal,
          presupuestoProgramado: resumenComp.totalPresupuesto,
          costoEjecutado: resumenComp.totalCostoEjecutado,
          porcentajePresupuesto: resumenComp.porcentajeEjecucionPresupuestal,
        });
      }

      resultados.push({
        id: area.id,
        codigo: area.codigo,
        nombre: area.nombre,
        totalMetas: metasArea.length,
        avanceFisico: resumenArea.promedioAvanceIndicador,
        avancePlaneado: resumenArea.promedioAvancePlaneado,
        semaforo: resumenArea.semaforoGlobal,
        presupuestoProgramado: resumenArea.totalPresupuesto,
        costoEjecutado: resumenArea.totalCostoEjecutado,
        porcentajePresupuesto: resumenArea.porcentajeEjecucionPresupuestal,
        distribucionSemaforos: {
          verde: resumenArea.metasVerde,
          amarillo: resumenArea.metasAmarillo,
          rojo: resumenArea.metasRojo,
        },
        componentes: componentesDetalle,
      });
    }

    return resultados;
  }

  /**
   * Obtiene las alertas operativas y gerenciales críticas (metas rojas, sin reporte, tareas vencidas, sobrecosto)
   */
  async obtenerAlertasCriticas(
    filtros: { areaId?: string; componenteId?: string; mes?: number; trimestre?: number; ejecutor?: string },
    usuario: UsuarioAutenticado,
  ) {
    const trim =
      filtros?.trimestre && Number(filtros.trimestre) >= 1 && Number(filtros.trimestre) <= 4
        ? Number(filtros.trimestre)
        : null;
    const mesReferenciaNum = trim
      ? trim * 3
      : filtros?.mes && Number(filtros.mes) >= 1 && Number(filtros.mes) <= 12
        ? Number(filtros.mes)
        : undefined;

    const metasData = await this.metasService.listar(
      {
        areaId: filtros.areaId,
        componenteId: filtros.componenteId,
        mes: mesReferenciaNum,
        trimestre: trim || undefined,
        ejecutor: filtros.ejecutor,
        tamano: 400,
      },
      usuario,
    );

    const hoy = mesReferenciaNum
      ? new Date(Date.UTC(2026, mesReferenciaNum, 0, 23, 59, 59, 999))
      : obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
    const anioActual = hoy.getUTCFullYear();
    const metas = metasData.datos;

    const metasRojas = metas
      .filter((m: any) => m.semaforo === 'ROJO' && m.estado === 'ABIERTA')
      .map((m: any) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        area: m.area?.nombre,
        componente: m.componente?.nombre,
        responsable: m.responsable?.nombre,
        avanceIndicador: m.avanceIndicador,
        avancePlaneado: m.avancePlaneado,
        brecha: Math.round((m.avanceIndicador - m.avancePlaneado) * 10) / 10,
        fechaCorte: m.fechaCorte ? String(m.fechaCorte).slice(0, 10) : '2026-11-30',
      }));

    const metasSinReporte = metas
      .filter((m: any) => m.estado === 'ABIERTA' && !m.reportes?.some((r: any) => r.anio === anioActual && r.mes === mesActual))
      .map((m: any) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        area: m.area?.nombre,
        responsable: m.responsable?.nombre,
        ultimoMesReportado: m.ultimoMesReportado?.mes || null,
      }));

    const metasSobrecosto = metas
      .filter((m: any) => {
        const pres = Number(m.presupuestoProgramado) || 0;
        const costo = Number(m.costoEjecutadoAcum) || 0;
        return pres > 0 && costo > pres;
      })
      .map((m: any) => ({
        id: m.id,
        codigo: m.codigo,
        descripcion: m.descripcion,
        presupuestoProgramado: Number(m.presupuestoProgramado),
        costoEjecutadoAcum: Number(m.costoEjecutadoAcum),
        exceso: Number(m.costoEjecutadoAcum) - Number(m.presupuestoProgramado),
      }));

    // Tareas vencidas
    const tareasVencidas = await this.prisma.tarea.findMany({
      where: {
        estado: EstadoTarea.VENCIDA,
        meta: {
          areaId: filtros.areaId || undefined,
          componenteId: filtros.componenteId || undefined,
        },
      },
      include: {
        meta: { select: { codigo: true, descripcion: true } },
        responsable: { select: { nombre: true } },
      },
      orderBy: { fechaFin: 'asc' },
      take: 20,
    });

    return {
      metasRojas,
      metasSinReporte,
      metasSobrecosto,
      tareasVencidas: tareasVencidas.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        metaCodigo: t.meta.codigo,
        responsable: t.responsable.nombre,
        fechaFin: t.fechaFin.toISOString().slice(0, 10),
      })),
    };
  }
}
