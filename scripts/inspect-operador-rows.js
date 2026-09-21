const ExcelJS = require('exceljs');

async function inspectRows() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsOp = wb.getWorksheet('Operador');
  console.log('Columns header row 3:');
  const headers = {};
  wsOp.getRow(3).eachCell({ includeEmpty: true }, (c, col) => {
    headers[col] = c.value;
  });
  console.log('Key headers:');
  for (let i = 1; i <= wsOp.columnCount; i++) {
    if (headers[i] && typeof headers[i] === 'string' && isNaN(headers[i])) {
      console.log(`Col ${i}: ${headers[i]}`);
    }
  }

  console.log('\nInspecting non-standard IDs:');
  wsOp.eachRow((row, r) => {
    if (r > 3) {
      const consec = row.getCell(1).value;
      const id = String(row.getCell(2).value).trim();
      const act = row.getCell(3).value;
      const oblig = row.getCell(4).value;
      const sop = row.getCell(5).value;
      const estado = row.getCell(129).value;
      const resumen = row.getCell(130).value;
      const den = row.getCell(131).value;
      const num = row.getCell(132).value;
      const cump = row.getCell(133).value;
      const est136 = row.getCell(136).value;

      if (['null', '108-110', '123-124', 'undefined'].includes(id) || !id || isNaN(id)) {
        console.log(`Row ${r} -> Consec: ${consec}, ID: "${id}", Actividad: "${String(act).substring(0,60)}", Estado: ${estado}, Cumplimiento: ${JSON.stringify(cump)}, Estado136: ${est136}`);
      }
    }
  });

  console.log('\nChecking duplicate IDs in Operador:');
  const idCounts = {};
  wsOp.eachRow((row, r) => {
    if (r > 3) {
      const id = String(row.getCell(2).value).trim();
      if (id && id !== 'null') {
        idCounts[id] = (idCounts[id] || 0) + 1;
      }
    }
  });
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      console.log(`Meta ID ${id} has ${count} activities in Operador sheet.`);
    }
  }
}

inspectRows().catch(console.error);
