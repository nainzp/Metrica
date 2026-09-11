import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { MetasService } from '../metas/metas.service';
import { TableroService } from '../tablero/tablero.service';
import { UsuarioAutenticado } from '../comun/decoradores/usuario-actual.decorador';

@Injectable()
export class ExportacionService {
  constructor(
    private metasService: MetasService,
    private tableroService: TableroService,
  ) {}

  /**
   * Genera el libro Excel institucional con formato oficial de la Gobernación del Magdalena (CU-12)
   */
  async exportarMetasExcel(
    filtros: { areaId?: string; componenteId?: string },
    usuario: UsuarioAutenticado,
    res: Response,
  ) {
    const [resumen, metasData] = await Promise.all([
      this.tableroService.obtenerResumenEjecutivo(filtros, usuario),
      this.metasService.listar({ ...filtros, tamano: 400 }, usuario),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MÉTRICA - Secretaría de Salud del Magdalena';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // HOJA 1: RESUMEN EJECUTIVO
    // -------------------------------------------------------------
    const hojaResumen = workbook.addWorksheet('Resumen Gerencial', {
      views: [{ showGridLines: true }],
    });

    // Encabezado institucional
    hojaResumen.mergeCells('A1:G1');
    hojaResumen.getCell('A1').value = 'GOBERNACIÓN DEL MAGDALENA · SECRETARÍA DE SALUD DEPARTAMENTAL';
    hojaResumen.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
    hojaResumen.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B2A5B' }, // Azul Marino Oficial
    };
    hojaResumen.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    hojaResumen.getRow(1).height = 35;

    hojaResumen.mergeCells('A2:G2');
    hojaResumen.getCell('A2').value = 'TABLERO DE CONTROL Y SEGUIMIENTO DEL PLAN DE ACCIÓN EN SALUD (PAS) 2026';
    hojaResumen.getCell('A2').font = { bold: true, color: { argb: 'FF0B2A5B' }, size: 11 };
    hojaResumen.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    hojaResumen.getRow(2).height = 25;

    // Métricas Clave
    const filasKPI = [
      ['Total Metas en Seguimiento', resumen.distribucionEstados.total, 'Metas Cumplidas (100%)', resumen.distribucionEstados.cumplidas],
      ['Avance Físico Global (Promedio Simple)', (resumen.avanceGlobalFisico / 100), 'Avance Planeado a la Fecha', (resumen.avanceGlobalPlaneado / 100)],
      ['Semáforo Departamental', resumen.semaforoGlobal, 'Brecha Porcentual', resumen.brecha + '%'],
      ['Metas en Semáforo Verde', resumen.distribucionSemaforos.verde, 'Metas en Semáforo Amarillo', resumen.distribucionSemaforos.amarillo],
      ['Metas en Semáforo Rojo', resumen.distribucionSemaforos.rojo, 'Metas sin Reporte Oportuno', resumen.distribucionEstados.sinReporteMesActual],
      ['Presupuesto Total Programado ($)', resumen.financiero.totalPresupuesto, 'Costo Total Ejecutado ($)', resumen.financiero.totalCostoEjecutado],
      ['Ejecución Financiera (%)', (resumen.financiero.porcentajeEjecucion / 100), 'Avance Operativo Tareas (%)', (resumen.operativo.avanceOperativo ? resumen.operativo.avanceOperativo / 100 : 'N/A')],
    ];

    hojaResumen.addRow([]);
    let filaIdx = 4;
    for (const [k1, v1, k2, v2] of filasKPI) {
      const row = hojaResumen.addRow([k1, v1, '', k2, v2]);
      row.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
      row.getCell(4).font = { bold: true, color: { argb: 'FF334155' } };

      if (String(k1).includes('(%)') || String(k1).includes('Promedio Simple')) {
        row.getCell(2).numFmt = '0.0%';
      } else if (String(k1).includes('($)')) {
        row.getCell(2).numFmt = '$#,##0';
      }

      if (String(k2).includes('(%)') || String(k2).includes('Planeado')) {
        if (typeof v2 === 'number') row.getCell(5).numFmt = '0.0%';
      } else if (String(k2).includes('($)')) {
        row.getCell(5).numFmt = '$#,##0';
      }
      filaIdx++;
    }

    hojaResumen.columns = [
      { width: 38 },
      { width: 18 },
      { width: 5 },
      { width: 35 },
      { width: 18 },
      { width: 5 },
      { width: 5 },
    ];

    // -------------------------------------------------------------
    // HOJA 2: MATRIZ DE 276 METAS
    // -------------------------------------------------------------
    const hojaMetas = workbook.addWorksheet('Matriz 276 Metas', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }],
    });

    const headers = [
      'CÓDIGO',
      'ÁREA',
      'COMPONENTE',
      'DESCRIPCIÓN DE LA META',
      'UNIDAD DE MEDIDA',
      'VALOR META',
      'EJECUTADO ACUM.',
      'AVANCE INDICADOR (%)',
      'AVANCE PLANEADO (%)',
      'SEMÁFORO',
      'ESTADO',
      'FECHA CORTE',
      'PRESUPUESTO PROGRAMADO ($)',
      'COSTO EJECUTADO ($)',
      '% EJEC. PRESUPUESTAL',
      'RESPONSABLE',
      'TOTAL TAREAS',
      'AVANCE OPERATIVO (%)',
    ];

    const cabeceraRow = hojaMetas.addRow(headers);
    cabeceraRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cabeceraRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B2A5B' },
    };
    cabeceraRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cabeceraRow.height = 28;

    for (const m of metasData.datos) {
      const fila = hojaMetas.addRow([
        m.codigo,
        m.area?.nombre || '',
        m.componente?.nombre || 'General / Sin Componente',
        m.descripcion,
        m.unidad?.nombre || '',
        Number(m.valorMeta),
        Number(m.valorEjecutadoAcum) || 0,
        (m.avanceIndicador != null ? m.avanceIndicador / 100 : 0),
        (m.avancePlaneado != null ? m.avancePlaneado / 100 : 0),
        m.semaforo || 'ROJO',
        m.estado,
        m.fechaCorte ? String(m.fechaCorte).slice(0, 10) : '2026-11-30',
        Number(m.presupuestoProgramado) || 0,
        Number(m.costoEjecutadoAcum) || 0,
        (m.porcentajePresupuesto != null ? m.porcentajePresupuesto / 100 : 0),
        m.responsable?.nombre || 'Pendiente Asignar',
        m.tareas?.length || 0,
        (m.avanceOperativo != null ? m.avanceOperativo / 100 : null),
      ]);

      // Formato numérico
      fila.getCell(8).numFmt = '0.0%';
      fila.getCell(9).numFmt = '0.0%';
      fila.getCell(13).numFmt = '$#,##0';
      fila.getCell(14).numFmt = '$#,##0';
      fila.getCell(15).numFmt = '0.0%';
      if (m.avanceOperativo != null) fila.getCell(18).numFmt = '0.0%';

      // Color de semáforo en celda
      const semCell = fila.getCell(10);
      semCell.alignment = { horizontal: 'center' };
      semCell.font = { bold: true };
      if (m.semaforo === 'VERDE') {
        semCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        semCell.font = { color: { argb: 'FF065F46' }, bold: true };
      } else if (m.semaforo === 'AMARILLO') {
        semCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        semCell.font = { color: { argb: 'FF92400E' }, bold: true };
      } else {
        semCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        semCell.font = { color: { argb: 'FF991B1B' }, bold: true };
      }
    }

    // Ajustar anchos
    hojaMetas.columns = [
      { width: 12 }, // Código
      { width: 22 }, // Área
      { width: 28 }, // Componente
      { width: 50 }, // Descripción
      { width: 16 }, // Unidad
      { width: 14 }, // Valor Meta
      { width: 15 }, // Ejecutado
      { width: 15 }, // Avance Ind
      { width: 15 }, // Avance Plan
      { width: 14 }, // Semáforo
      { width: 16 }, // Estado
      { width: 14 }, // Fecha Corte
      { width: 22 }, // Presupuesto
      { width: 20 }, // Costo
      { width: 16 }, // % Ejec. Presup
      { width: 25 }, // Responsable
      { width: 14 }, // Tareas
      { width: 18 }, // Avance Op
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Metas_PAS_2026_Magdalena.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
