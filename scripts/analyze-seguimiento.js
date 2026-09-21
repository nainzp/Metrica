const ExcelJS = require('exceljs');

async function analyze() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  for (const ws of wb.worksheets) {
    console.log(`\n=============================================================`);
    console.log(`SHEET: ${ws.name} | RowCount: ${ws.rowCount} | ColCount: ${ws.columnCount}`);
    console.log(`=============================================================`);

    // Let's print the first 5 rows with non-empty cells
    for (let r = 1; r <= 10; r++) {
      const row = ws.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        let val = cell.value;
        if (val && typeof val === 'object' && val.result !== undefined) val = val.result;
        if (val && typeof val === 'object' && val.richText) val = val.richText.map(t => t.text).join('');
        if (val instanceof Date) val = val.toISOString().split('T')[0];
        cells.push(`C${colNumber}: "${String(val).trim()}"`);
      });
      if (cells.length > 0) {
        console.log(`Row ${r} (${cells.length} cells): ${cells.slice(0, 15).join(' | ')}${cells.length > 15 ? ' ... +' + (cells.length - 15) + ' more' : ''}`);
      }
    }
  }
}

analyze().catch(console.error);
