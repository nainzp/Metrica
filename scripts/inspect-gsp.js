const ExcelJS = require('exceljs');

async function inspectGSP() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsGsp = wb.getWorksheet('GSP');
  console.log('--- GSP HEADERS (Row 2) ---');
  for (let c = 1; c <= 24; c++) {
    console.log(`Col ${c}: ${wsGsp.getRow(2).getCell(c).value}`);
  }

  console.log('\n--- GSP SAMPLE DATA (Rows 3 to 10) ---');
  for (let r = 3; r <= 10; r++) {
    const row = wsGsp.getRow(r);
    const rowData = {};
    for (let c = 1; c <= 15; c++) {
      let val = row.getCell(c).value;
      if (val) rowData[`C${c}`] = String(val).substring(0, 30);
    }
    console.log(`Row ${r}:`, JSON.stringify(rowData));
  }
}

inspectGSP().catch(console.error);
