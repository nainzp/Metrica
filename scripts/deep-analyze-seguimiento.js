const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAnalyze() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  // Inspect GSP Sheet
  const wsGSP = wb.getWorksheet('GSP');
  console.log(`\n=== GSP SHEET === Rows: ${wsGSP.rowCount}, Cols: ${wsGSP.columnCount}`);
  const gspHeader1 = wsGSP.getRow(1).values;
  const gspHeader2 = wsGSP.getRow(2).values;
  console.log('GSP Row 1 Headers:', gspHeader1.filter(Boolean).slice(0, 20));
  console.log('GSP Row 2 Headers:', gspHeader2.filter(Boolean).slice(0, 20));

  const gspRows = [];
  wsGSP.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      const c1 = row.getCell(1).value;
      const c2 = row.getCell(2).value;
      const c3 = row.getCell(3).value;
      const c10 = row.getCell(10).value;
      if (c1 || c2) {
        gspRows.push({ rowNumber, c1, c2, c3: String(c3).substring(0, 40), estadoGsp: c10 });
      }
    }
  });
  console.log(`GSP valid rows count: ${gspRows.length}`);
  console.log('Sample GSP rows:', gspRows.slice(0, 5));

  // Inspect Operador Sheet
  const wsOp = wb.getWorksheet('Operador');
  console.log(`\n=== OPERADOR SHEET === Rows: ${wsOp.rowCount}, Cols: ${wsOp.columnCount}`);
  const opHeader3 = [];
  wsOp.getRow(3).eachCell({ includeEmpty: false }, (cell, col) => {
    opHeader3.push({ col, val: cell.value });
  });
  console.log('Operador Row 3 non-empty headers (first 10 and last 15):', 
    opHeader3.slice(0, 6), 
    '...\nLast cols:', 
    opHeader3.filter(h => h.col > 120)
  );

  const opRows = [];
  wsOp.eachRow((row, rowNumber) => {
    if (rowNumber > 3) {
      const consec = row.getCell(1).value;
      const idMeta = row.getCell(2).value;
      const actividad = row.getCell(3).value;
      const obligacion = row.getCell(4).value;
      const soportes = row.getCell(5).value;
      const estado129 = row.getCell(129).value;
      const unidadMedida = row.getCell(130).value;
      const programado131 = row.getCell(131).value;
      const ejecutado132 = row.getCell(132).value;
      const porcentaje133 = row.getCell(133).value;
      const estado136 = row.getCell(136).value;

      if (consec || idMeta) {
        opRows.push({
          rowNumber,
          consec,
          idMeta,
          actividad: String(actividad).substring(0, 50),
          estado129,
          unidadMedida,
          programado: programado131,
          ejecutado: ejecutado132,
          porcentaje: porcentaje133,
          estado136
        });
      }
    }
  });
  console.log(`Operador valid rows count: ${opRows.length}`);
  console.log('Sample Operador rows:', opRows.slice(0, 5));

  // Check matching with DB Metas
  const metas = await prisma.meta.findMany({
    select: { id: true, codigo: true, descripcion: true, area: { select: { nombre: true } } }
  });
  console.log(`\nTotal Metas in DB: ${metas.length}`);

  // Check ID matching: are IDs in GSP and Operador matching meta.codigo?
  const opIds = opRows.map(r => String(r.idMeta).trim()).filter(Boolean);
  const uniqueOpIds = [...new Set(opIds)];
  console.log(`Unique Meta IDs in Operador sheet: ${uniqueOpIds.length}`);
  console.log('Operador IDs:', uniqueOpIds.sort((a,b) => Number(a) - Number(b)));

  const matched = metas.filter(m => uniqueOpIds.includes(String(m.codigo)));
  console.log(`Matched with DB metas by codigo: ${matched.length} of ${uniqueOpIds.length}`);

  const notMatched = uniqueOpIds.filter(id => !metas.some(m => String(m.codigo) === id));
  if (notMatched.length > 0) {
    console.log('Not matched IDs:', notMatched);
  }

  await prisma.$disconnect();
}

deepAnalyze().catch(console.error);
