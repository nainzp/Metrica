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
  async obtenerResumenEjecutivo(filtros: { areaId?: string; componenteId?: string }, usuario: UsuarioAutenticado) {
    const metasData = await this.metasService.listar(
      {
        areaId: filtros.areaId,
        componenteId: filtros.componenteId,
        tamano: 400,
      },
      usuario,
    );

    const metas = metasData.datos;
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;

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
        m.ultimoMesReportado && m.ultimoMesReportado.mes === mesActual,
      ),
      totalTareas: m.tareas?.length || 0,
      tareasFinalizadas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.FINALIZADA).length || 0,
      tareasCanceladas: m.tareas?.filter((t: any) => t.estado === EstadoTarea.CANCELADA).length || 0,
    }));

    const resumen = calcularResumenAgregado(metasParaAgregados);

    // Consulta consolidada de tareas para KPIs operativos
    const whereTareas: any = {
      meta: {
        estado: { in: [EstadoMeta.ABIERTA, EstadoMeta.CUMPLIDA] },
      },
    };
    if (filtros.areaId) whereTareas.meta.areaId = filtros.areaId;
    if (filtros.componenteId) whereTareas.meta.componenteId = filtros.componenteId;

    const [conteoProgramadas, conteoEnCurso, conteoVencidas, conteoFinalizadas, conteoDespacho] = await Promise.all([
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.PROGRAMADA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.EN_CURSO } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.VENCIDA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, estado: EstadoTarea.FINALIZADA } }),
      this.prisma.tarea.count({ where: { ...whereTareas, requiereSecretaria: true } }),
    ]);

    return {
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
  async obtenerCurvaAvance(filtros: { areaId?: string; componenteId?: string }, usuario: UsuarioAutenticado) {
    const where: any = {};
    if (usuario.rol === RolUsuario.LIDER_AREA) {
      where.areaId = usuario.areaId;
    } else if (usuario.rol === RolUsuario.LIDER_COMPONENTE) {
      where.areaId = usuario.areaId;
      if (usuario.componenteId) where.componenteId = usuario.componenteId;
    }
    if (filtros.areaId) where.areaId = filtros.areaId;
    if (filtros.componenteId) where.componenteId = filtros.componenteId;

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

    const puntos = generarCurvaAvanceMensual(metasParaCurva, 2026, mesActual);

    return puntos.map((p) => ({
      ...p,
      esMesActual: p.mes === mesActual,
      esFechaCorte: p.mes === 11, // 30 de noviembre de 2026
    }));
  }

  /**
   * Desglose del avance físico por área y componente para gráficos de barras y drill-down
   */
  async obtenerDesgloseAreas(usuario: UsuarioAutenticado) {
    const areas = await this.prisma.area.findMany({
      where: { activo: true },
      include: {
        componentes: { where: { activo: true }, orderBy: { codigo: 'asc' } },
      },
      orderBy: { nombre: 'asc' },
    });

    const metasData = await this.metasService.listar({ tamano: 400 }, usuario);
    const metasEnriquecidas = metasData.datos;
    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;

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
          m.ultimoMesReportado && m.ultimoMesReportado.mes === mesActual,
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
            m.ultimoMesReportado && m.ultimoMesReportado.mes === mesActual,
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
  async obtenerAlertasCriticas(filtros: { areaId?: string; componenteId?: string }, usuario: UsuarioAutenticado) {
    const metasData = await this.metasService.listar(
      {
        areaId: filtros.areaId,
        componenteId: filtros.componenteId,
        tamano: 400,
      },
      usuario,
    );

    const hoy = obtenerHoyBogota();
    const mesActual = hoy.getUTCMonth() + 1;
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
      .filter((m: any) => m.estado === 'ABIERTA' && (!m.ultimoMesReportado || m.ultimoMesReportado.mes < mesActual))
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
