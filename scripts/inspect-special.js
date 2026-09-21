const ExcelJS = require('exceljs');

async function inspectSpecial() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsOp = wb.getWorksheet('Operador');
  const wsGsp = wb.getWorksheet('GSP');

  console.log('Comparing Row 40, 48, 53 between Operador and GSP:');
  for (const r of [40, 48, 53]) {
    const rowOp = wsOp.getRow(r);
    const rowGsp = wsGsp.getRow(r - 1); // GSP has 2 header rows, Operador has 3 header rows!

    console.log(`\n--- ROW ${r} (Operador) vs ROW ${r-1} (GSP) ---`);
    console.log('Operador Consec:', rowOp.getCell(1).value, 'ID:', rowOp.getCell(2).value, 'Actividad:', rowOp.getCell(3).value);
    console.log('GSP Col 1:', rowGsp.getCell(1).value, 'Col 2:', rowGsp.getCell(2).value, 'Col 3:', rowGsp.getCell(3).value, 'Col 10:', rowGsp.getCell(10).value);
  }
}

inspectSpecial().catch(console.error);
