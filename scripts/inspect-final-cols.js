const ExcelJS = require('exceljs');

async function inspectFinalCols() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsOp = wb.getWorksheet('Operador');
  console.log('--- HEADERS (Row 3, cols 128 to 136) ---');
  for (let c = 128; c <= 136; c++) {
    console.log(`Col ${c}: ${wsOp.getRow(3).getCell(c).value}`);
  }

  console.log('\n--- SAMPLE DATA (Rows 4 to 20, cols 128 to 136) ---');
  for (let r = 4; r <= 20; r++) {
    const row = wsOp.getRow(r);
    const rowData = {};
    for (let c = 128; c <= 136; c++) {
      let val = row.getCell(c).value;
      if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
      if (val && typeof val === 'object' && val.richText) val = val.richText.map(t => t.text).join('');
      rowData[`C${c}`] = val;
    }
    const id = row.getCell(2).value;
    const consec = row.getCell(1).value;
    console.log(`Row ${r} (Consec ${consec}, ID ${id}):`, JSON.stringify(rowData));
  }
}

inspectFinalCols().catch(console.error);
