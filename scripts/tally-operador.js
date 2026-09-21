const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullTally() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Desarrollos/Metrica/docs/SEGUIMIENTO CUMPLIMIENTO CONTRATO GESTION 2026.xlsx');

  const wsOp = wb.getWorksheet('Operador');
  const rows = [];

  wsOp.eachRow((row, r) => {
    if (r > 3) {
      const consec = row.getCell(1).value;
      const rawId = row.getCell(2).value;
      const actividad = row.getCell(3).value;
      const obligacion = row.getCell(4).value;
      const soporte = row.getCell(5).value;
      const estado = row.getCell(129).value;
      const compromiso = row.getCell(130).value;
      const denominador = row.getCell(131).value;
      const numerador = row.getCell(132).value;
      let cump = row.getCell(133).value;
      if (cump && typeof cump === 'object' && cump.result !== undefined) cump = cump.result;
      const obs = row.getCell(136).value;

      if (consec && typeof consec === 'number') {
        rows.push({
          row: r,
          consec,
          rawId: String(rawId || '').trim(),
          actividad: String(actividad || '').trim(),
          obligacion: String(obligacion || '').trim(),
          soporte: String(soporte || '').trim(),
          estado: String(estado || 'Sin Estado').trim(),
          compromiso: String(compromiso || '').trim(),
          denominador,
          numerador,
          cump,
          obs: String(obs || '').trim()
        });
      }
    }
  });

  console.log(`Total valid activities found in Operador: ${rows.length}`);

  // Count by estado
  const byEstado = {};
  rows.forEach(r => {
    byEstado[r.estado] = (byEstado[r.estado] || 0) + 1;
  });
  console.log('Distribution by Estado (Col 129):', byEstado);

  // Count by obs (Col 136)
  const byObs = {};
  rows.forEach(r => {
    byObs[r.obs] = (byObs[r.obs] || 0) + 1;
  });
  console.log('Distribution by Estado Detallado (Col 136):', byObs);

  // Match with metas
  const dbMetas = await prisma.meta.findMany({
    select: { id: true, codigo: true, descripcion: true, area: { select: { nombre: true } } }
  });
  const metaCodeMap = new Map(dbMetas.map(m => [String(m.codigo), m]));

  const mappedMetas = new Set();
  const unmappedActivities = [];

  rows.forEach(r => {
    let metaCodes = [];
    if (r.rawId === '108-110') metaCodes = ['108', '110'];
    else if (r.rawId === '123-124') metaCodes = ['123', '124'];
    else if (r.rawId === 'null' || !r.rawId) {
      if (r.consec === 38) metaCodes = ['76'];
    } else {
      metaCodes = [r.rawId];
    }

    let foundAny = false;
    metaCodes.forEach(code => {
      if (metaCodeMap.has(code)) {
        mappedMetas.add(code);
        foundAny = true;
      }
    });

    if (!foundAny) {
      unmappedActivities.push(r);
    }
  });

  console.log(`\nMetas in DB that have operator activities: ${mappedMetas.size} of 276 metas`);
  console.log(`Unmapped activities count: ${unmappedActivities.length}`);
  if (unmappedActivities.length > 0) {
    console.log('Unmapped:', unmappedActivities);
  }

  // Areas breakdown for operator metas
  const metasWithOp = dbMetas.filter(m => mappedMetas.has(String(m.codigo)));
  const areaCounts = {};
  metasWithOp.forEach(m => {
    const a = m.area?.nombre || 'Sin Área';
    areaCounts[a] = (areaCounts[a] || 0) + 1;
  });
  console.log('\nOperator Metas count by Area:', areaCounts);

  await prisma.$disconnect();
}

fullTally().catch(console.error);
