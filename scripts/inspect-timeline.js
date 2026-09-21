const ExcelJS = require('exceljs');

async function inspectTimeline() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsOp = wb.getWorksheet('Operador');
  const r1 = wsOp.getRow(1);
  const r2 = wsOp.getRow(2);
  const r3 = wsOp.getRow(3);

  // Group columns by row 1 values (which look like month headers or dates)
  const monthCols = [];
  for (let c = 6; c <= 127; c++) {
    const v1 = r1.getCell(c).value;
    const v2 = r2.getCell(c).value;
    const v3 = r3.getCell(c).value;
    monthCols.push({ col: c, m: v1 instanceof Date ? v1.toISOString().split('T')[0] : v1, dayLetter: v2, dayNum: v3 });
  }

  console.log('Timeline columns count:', monthCols.length);
  console.log('Sample start (col 6-15):', monthCols.slice(0, 10));
  console.log('Sample middle (col 40-50):', monthCols.slice(34, 44));
  console.log('Sample end (col 118-127):', monthCols.slice(-10));

  // Let's check how months are distributed:
  const uniqueMonths = [...new Set(monthCols.map(x => x.m))];
  console.log('Unique month markers in row 1:', uniqueMonths);
}

inspectTimeline().catch(console.error);
