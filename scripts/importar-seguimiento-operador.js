/**
 * Script de importación para el Seguimiento al Contrato de Gestión (Operador 2026)
 * Archivo fuente: docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx
 * Hoja: Operador
 */

const path = require('path');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ARCHIVO_EXCEL = path.resolve(__dirname, '../docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

function extraerValor(cell) {
  if (!cell) return null;
  let val = cell.value;
  if (val && typeof val === 'object') {
    if (val.result !== undefined) val = val.result;
    else if (val.richText) val = val.richText.map(t => t.text).join('');
    else if (val.text !== undefined) val = val.text;
  }
  return val;
}

function normalizarEstado(estadoCol129, obsCol136) {
  const e129 = String(estadoCol129 || '').trim().toLowerCase();
  const o136 = String(obsCol136 || '').trim().toUpperCase();

  if (e129 === 'ejecutada' || o136.includes('ACTIVIDAD EJECUTADA') || o136.includes('TALLER REALIZADO') || o136.includes('TALLERES REALIZADOS') || o136.includes('TALLERES EJECUTADOS')) {
    return 'EJECUTADA';
  }
  if (e129 === 'en ejecución' || e129 === 'en ejecucion' || o136.includes('EN EJECUCION') || o136.includes('PRIMERA Y SEGUNDA MESAS')) {
    return 'EN_EJECUCION';
  }
  if (e129 === 'a demanda' || o136.includes('SUJETO AL') || o136.includes('SUJETO A')) {
    return 'A_DEMANDA';
  }
  return 'PENDIENTE';
}

async function importarSeguimientoOperador() {
  console.log('Iniciando importación del seguimiento a metas del Operador...');
  console.log('Archivo:', ARCHIVO_EXCEL);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ARCHIVO_EXCEL);

  const wsOp = wb.getWorksheet('Operador');
  if (!wsOp) {
    throw new Error('No se encontró la hoja "Operador" en el archivo Excel.');
  }

  // Traer todas las metas de la BD
  const metas = await prisma.meta.findMany({
    select: { id: true, codigo: true, descripcion: true }
  });
  const metasPorCodigo = new Map(metas.map(m => [String(m.codigo).trim(), m]));

  // Identificar columnas del cronograma (Columnas 6 a 127)
  const r1 = wsOp.getRow(1);
  const r3 = wsOp.getRow(3);
  const cronoCols = [];
  for (let col = 6; col <= 127; col++) {
    const mesVal = r1.getCell(col).value;
    const diaVal = r3.getCell(col).value;
    let fechaStr = null;
    if (mesVal instanceof Date) {
      const anio = mesVal.getFullYear();
      const mes = String(mesVal.getMonth() + 1).padStart(2, '0');
      const dia = String(diaVal || 1).padStart(2, '0');
      fechaStr = `${anio}-${mes}-${dia}`;
    }
    cronoCols.push({ col, fechaStr });
  }

  const actividadesParaInsertar = [];
  const metasConOperador = new Set();

  wsOp.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return; // Encabezados

    const consec = extraerValor(row.getCell(1));
    if (!consec || typeof consec !== 'number') return;

    let rawId = extraerValor(row.getCell(2));
    const rawActividad = extraerValor(row.getCell(3));
    const rawObligacion = extraerValor(row.getCell(4));
    const rawSoportes = extraerValor(row.getCell(5));
    const rawEstado129 = extraerValor(row.getCell(129));
    const rawCompromiso = extraerValor(row.getCell(130));
    const rawDen = extraerValor(row.getCell(131));
    const rawNum = extraerValor(row.getCell(132));
    let rawCump = extraerValor(row.getCell(133));
    const rawObs = extraerValor(row.getCell(136));

    // Casos especiales de mapeo de IDs
    let codigosAsociados = [];
    const idStr = String(rawId || '').trim();

    if (idStr === '108-110') {
      codigosAsociados = ['108', '110'];
    } else if (idStr === '123-124') {
      codigosAsociados = ['123', '124'];
    } else if (!idStr || idStr === 'null' || idStr === 'undefined') {
      // Fila 40 / Consecutivo 38 -> Meta 76 (Epicollect / arbovirosis)
      if (consec === 38) {
        codigosAsociados = ['76'];
      }
    } else {
      codigosAsociados = [idStr];
    }

    // Cronograma diario de la fila
    const marcasCronograma = [];
    cronoCols.forEach(({ col, fechaStr }) => {
      const val = extraerValor(row.getCell(col));
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        marcasCronograma.push({ fecha: fechaStr, valor: String(val).trim() });
      }
    });

    const estadoNorm = normalizarEstado(rawEstado129, rawObs);
    const denNum = rawDen != null && !isNaN(rawDen) ? Number(rawDen) : null;
    const numNum = rawNum != null && !isNaN(rawNum) ? Number(rawNum) : null;
    let cumpNum = null;

    if (rawCump != null && !isNaN(rawCump)) {
      cumpNum = Math.min(100, Math.max(0, Number(rawCump) * 100));
    } else if (estadoNorm === 'EJECUTADA') {
      cumpNum = 100;
    } else if (denNum && numNum != null) {
      cumpNum = Math.min(100, Math.max(0, (numNum / denNum) * 100));
    } else {
      cumpNum = 0;
    }

    codigosAsociados.forEach(codigo => {
      const meta = metasPorCodigo.get(codigo);
      if (!meta) {
        console.warn(`[WARN] No se encontró meta en BD para el código: ${codigo} (Consecutivo ${consec})`);
        return;
      }

      metasConOperador.add(meta.id);

      actividadesParaInsertar.push({
        consecutivo: consec,
        metaId: meta.id,
        actividad: String(rawActividad || '').trim(),
        obligacion: rawObligacion ? String(rawObligacion).trim() : null,
        soportesVerificacion: rawSoportes ? String(rawSoportes).trim() : null,
        resumenCompromiso: rawCompromiso ? String(rawCompromiso).trim() : null,
        denominador: denNum,
        numerador: numNum,
        porcentajeCumplimiento: Math.round(cumpNum * 10) / 10,
        estado: estadoNorm,
        observaciones: rawObs ? String(rawObs).trim() : null,
        cronograma: marcasCronograma.length > 0 ? marcasCronograma : null,
      });
    });
  });

  console.log(`Actividades procesadas a insertar: ${actividadesParaInsertar.length}`);
  console.log(`Metas únicas vinculadas al Operador: ${metasConOperador.size}`);

  // Limpiar actividades anteriores si las hubiera
  await prisma.actividadOperador.deleteMany({});
  await prisma.meta.updateMany({
    data: { tieneOperador: false },
  });

  // Insertar actividades
  for (const act of actividadesParaInsertar) {
    await prisma.actividadOperador.create({
      data: {
        consecutivo: act.consecutivo,
        metaId: act.metaId,
        actividad: act.actividad,
        obligacion: act.obligacion,
        soportesVerificacion: act.soportesVerificacion,
        resumenCompromiso: act.resumenCompromiso,
        denominador: act.denominador,
        numerador: act.numerador,
        porcentajeCumplimiento: act.porcentajeCumplimiento,
        estado: act.estado,
        observaciones: act.observaciones,
        cronograma: act.cronograma,
      },
    });
  }

  // Actualizar tieneOperador = true en las metas correspondientes
  const metaIdsArray = Array.from(metasConOperador);
  await prisma.meta.updateMany({
    where: { id: { in: metaIdsArray } },
    data: { tieneOperador: true },
  });

  console.log('✓ Importación exitosa.');
  console.log(`- ${actividadesParaInsertar.length} registros creados en ActividadOperador.`);
  console.log(`- ${metaIdsArray.length} metas marcadas con tieneOperador = true.`);

  // Resumen estadístico
  const statsEstado = await prisma.actividadOperador.groupBy({
    by: ['estado'],
    _count: true,
  });
  console.log('Distribución de actividades por estado:', statsEstado);

  await prisma.$disconnect();
}

importarSeguimientoOperador().catch(err => {
  console.error('Error importando seguimiento operador:', err);
  prisma.$disconnect();
  process.exit(1);
});
