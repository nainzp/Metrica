const ExcelJS = require('exceljs');

async function inspect() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  for (const ws of wb.worksheets) {
    console.log(`\n================ SHEET: ${ws.name} (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ================`);
    for (let r = 1; r <= Math.min(8, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 35) {
          let val = cell.value;
          if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(t => t.text).join('');
          values.push(`[C${colNumber}]: ${String(val).substring(0, 35)}`);
        }
      });
      console.log(`Row ${r}: ${values.join(' | ')}`);
    }
  }
}

inspect().catch(console.error);
