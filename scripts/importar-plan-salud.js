/**
 * ==============================================================================
 * MÉTRICA — Script de Ingestión y Estructuración de Metas_Plan_Salud.xlsx
 * ==============================================================================
 * Carga completa y estructuración de:
 * 1. Áreas y Componentes del Plan
 * 2. Catálogos: Unidades de Medida, Fuentes de Financiación, Poblaciones Sujeto
 * 3. Talento Humano (Hojas Personas y TH): creación de usuarios, roles, cargos,
 *    asignación a áreas/componentes y designación de líderes.
 *    -> Secretaria de Salud: Magda Karina Alarcón Gómez (DESPACHO).
 * 4. 276 Metas Oficiales (Hoja Plan): asignación de responsables, presupuesto,
 *    fechas y estados.
 * 5. Programación Mensual de 12 Meses (ProgramacionMeta).
 * 6. Reportes Mensuales de Avance Físico y Costo Ejecutado (ReporteMensual)
 *    para actualizar Tablero de Control y Curva de Avance.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');

const rutaBase = 'c:/Desarrollos/Metrica';
const envPath = path.resolve(rutaBase, 'apps/api/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

const {
  PrismaClient,
  RolUsuario,
  EstadoMeta,
  OrigenReporte,
} = require(path.resolve(rutaBase, 'node_modules/@prisma/client'));

const prisma = new PrismaClient();

// Funciones auxiliares de normalización
function normalizarTexto(val) {
  if (val == null) return '';
  return String(val)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizarSlugEmail(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.|\.$/g, '');
}

function obtenerValorCelda(cell) {
  if (!cell) return null;
  let val = cell.value;
  if (val == null) return null;
  if (typeof val === 'object') {
    if (val.result !== undefined) return val.result;
    if (val.text !== undefined) return val.text;
    if (val.richText !== undefined) return val.richText.map((t) => t.text).join('');
  }
  return val;
}

function aNumero(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'object' && val.result !== undefined) val = val.result;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function generarCodigoCorto(nombre) {
  return normalizarTexto(nombre)
    .replace(/[\s-]/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 20);
}

// Búsqueda inteligente de candidatos para responsables
function encontrarMejorCoincidencia(nombreBuscado, candidatos) {
  if (!nombreBuscado) return null;
  const norm = normalizarTexto(nombreBuscado);
  if (!norm) return null;

  // Manejo especial: Si es Diana Celedón o contiene secretaria -> Magda Karina Alarcón Gómez
  if (norm.includes('DIANA CELEDON') || norm.includes('CELEDON') || norm.includes('SECRETARIA')) {
    const sec = candidatos.find((c) => c.nombreNorm.includes('MAGDA KARINA'));
    if (sec) return sec;
  }

  // 1. Coincidencia exacta
  let directo = candidatos.find((c) => c.nombreNorm === norm);
  if (directo) return directo;

  // 2. Subcadena completa
  directo = candidatos.find((c) => c.nombreNorm.includes(norm) || norm.includes(c.nombreNorm));
  if (directo) return directo;

  // 3. Coincidencia por tokens (nombre y apellido)
  const tokens = norm.split(' ').filter((t) => t.length > 2);
  let mejorPuntaje = 0;
  let mejorCandidato = null;

  for (const cand of candidatos) {
    const candTokens = cand.nombreNorm.split(' ').filter((t) => t.length > 2);
    let coincidencias = 0;
    for (const t of tokens) {
      if (candTokens.includes(t)) {
        coincidencias += 1.0;
      } else if (candTokens.some((ct) => ct.startsWith(t) || t.startsWith(ct))) {
        coincidencias += 0.8;
      }
    }
    if (coincidencias > mejorPuntaje && coincidencias >= 1.5) {
      mejorPuntaje = coincidencias;
      mejorCandidato = cand;
    }
  }

  return mejorCandidato;
}

async function main() {
  console.log('================================================================');
  console.log('  MÉTRICA — INICIO DE CARGA OFICIAL: Metas_Plan_Salud.xlsx');
  console.log('================================================================');

  const archivoExcel = path.resolve(rutaBase, 'docs/Metas_Plan_Salud.xlsx');
  if (!fs.existsSync(archivoExcel)) {
    throw new Error(`No se encontró el archivo: ${archivoExcel}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivoExcel);

  const planSheet = wb.getWorksheet('Plan');
  const personasSheet = wb.getWorksheet('Personas');
  const thSheet = wb.getWorksheet('TH');

  if (!planSheet) throw new Error("Falta la hoja 'Plan' en el libro Excel.");

  const claveInicialPlana = 'Metrica2026*!';
  const hashClaveGeneral = await bcrypt.hash(claveInicialPlana, 10);

  // ----------------------------------------------------------------------------
  // 1. CONFIGURACIÓN DE ÁREAS
  // ----------------------------------------------------------------------------
  console.log('\n[1/7] Configurando y asegurando las 10 Áreas funcionales...');
  const definicionesAreas = [
    { codigo: 'SP', nombre: 'Salud Pública' },
    { codigo: 'PRE', nombre: 'Prestación de Servicios' },
    { codigo: 'ASE', nombre: 'Aseguramiento' },
    { codigo: 'EMD', nombre: 'Emergencias y Desastres' },
    { codigo: 'PLA', nombre: 'Planeación' },
    { codigo: 'DES', nombre: 'Despacho' },
    { codigo: 'RL', nombre: 'Riesgos Laborales' },
    { codigo: 'PS', nombre: 'Promoción Social' },
    { codigo: 'FIN', nombre: 'Financiera' },
    { codigo: 'JUR', nombre: 'Jurídica' },
  ];

  const mapaAreasPorCodigo = new Map();
  const mapaAreasPorNorm = new Map();

  for (const a of definicionesAreas) {
    const areaBd = await prisma.area.upsert({
      where: { codigo: a.codigo },
      update: { nombre: a.nombre, activo: true },
      create: { codigo: a.codigo, nombre: a.nombre, activo: true },
    });
    mapaAreasPorCodigo.set(a.codigo, areaBd);
    mapaAreasPorNorm.set(normalizarTexto(a.nombre), areaBd);
    mapaAreasPorNorm.set(normalizarTexto(a.codigo), areaBd);
  }

  // Alias frecuentes en el Excel para mapear áreas sin error
  mapaAreasPorNorm.set('SALUD PUBLICA', mapaAreasPorCodigo.get('SP'));
  mapaAreasPorNorm.set('PRESTACION DE SERVICIOS', mapaAreasPorCodigo.get('PRE'));
  mapaAreasPorNorm.set('ASEGURAMIENTO', mapaAreasPorCodigo.get('ASE'));
  mapaAreasPorNorm.set('EMERGENCIAS Y DESASTRES', mapaAreasPorCodigo.get('EMD'));
  mapaAreasPorNorm.set('PLANEACION', mapaAreasPorCodigo.get('PLA'));
  mapaAreasPorNorm.set('DESPACHO', mapaAreasPorCodigo.get('DES'));
  mapaAreasPorNorm.set('RIESGOS LABORALES', mapaAreasPorCodigo.get('RL'));
  mapaAreasPorNorm.set('PROMOCION SOCIAL', mapaAreasPorCodigo.get('PS'));
  mapaAreasPorNorm.set('FINANCIERA', mapaAreasPorCodigo.get('FIN'));
  mapaAreasPorNorm.set('JURIDICA', mapaAreasPorCodigo.get('JUR'));

  console.log(`✔ ${definicionesAreas.length} Áreas sincronizadas.`);

  // ----------------------------------------------------------------------------
  // 2. CONFIGURACIÓN DE CATÁLOGOS BASE
  // ----------------------------------------------------------------------------
  console.log('\n[2/7] Sincronizando catálogos base (Unidades, Fuentes)...');

  // 2.1 Unidades de Medida
  const unidadesBase = [
    { codigo: 'NUMERO', nombre: 'Número', esBinaria: false },
    { codigo: 'PORCENTAJE', nombre: 'Porcentaje', esBinaria: false },
    { codigo: 'DOCUMENTO', nombre: 'Documento', esBinaria: true },
    { codigo: 'DIAS', nombre: 'Días', esBinaria: false },
  ];

  const mapaUnidadesPorCodigo = new Map();
  const mapaUnidadesPorNorm = new Map();

  for (const u of unidadesBase) {
    const uBd = await prisma.unidadMedida.upsert({
      where: { codigo: u.codigo },
      update: { nombre: u.nombre, esBinaria: u.esBinaria, activo: true },
      create: u,
    });
    mapaUnidadesPorCodigo.set(u.codigo, uBd);
    mapaUnidadesPorNorm.set(normalizarTexto(u.nombre), uBd);
    mapaUnidadesPorNorm.set(normalizarTexto(u.codigo), uBd);
  }

  // Alias para unidades
  mapaUnidadesPorNorm.set('MUNICIPIOS', mapaUnidadesPorCodigo.get('NUMERO'));
  mapaUnidadesPorNorm.set('PORCENTAAJE DE GESTION', mapaUnidadesPorCodigo.get('PORCENTAJE'));
  mapaUnidadesPorNorm.set('DOCUMENTO PLAN', mapaUnidadesPorCodigo.get('DOCUMENTO'));
  mapaUnidadesPorNorm.set('ESTRATEGIA', mapaUnidadesPorCodigo.get('DOCUMENTO'));
  mapaUnidadesPorNorm.set('NUMEO', mapaUnidadesPorCodigo.get('NUMERO'));

  // 2.2 Fuentes de Recursos
  const fuentesBase = [
    { codigo: '1.2.4.2.02', nombre: 'SGP-SALUD-SALUD PUBLICA' },
    { codigo: '1.2.4.2.01', nombre: 'SGP-SALUD-REGIMEN SUBSIDIADO' },
    { codigo: 'RP', nombre: 'RECURSOS PROPIOS' },
    { codigo: '1.2.5.1.00', nombre: 'RECURSOS PROPIOS DE ESTABLECIMIENTOS PUBLICOS O UNIDADES ADMINISTRATIVAS ESPECIALES' },
    { codigo: '1.3.3.7.01', nombre: 'SGP - OTROS' },
  ];

  const mapaFuentesPorCodigo = new Map();
  for (const f of fuentesBase) {
    const fBd = await prisma.fuenteRecurso.upsert({
      where: { codigo: f.codigo },
      update: { nombre: f.nombre, activo: true },
      create: f,
    });
    mapaFuentesPorCodigo.set(f.codigo, fBd);
  }

  // 2.3 Poblaciones Sujeto (extraer del Plan)
  console.log('  -> Extrayendo poblaciones sujeto únicas desde Plan...');
  const mapaPoblacionesPorNorm = new Map();
  for (let r = 5; r <= planSheet.rowCount; r++) {
    const rawPob = obtenerValorCelda(planSheet.getRow(r).getCell(29));
    if (rawPob && String(rawPob).trim().length > 0) {
      const pobTexto = String(rawPob).trim();
      const normPob = normalizarTexto(pobTexto);
      if (!mapaPoblacionesPorNorm.has(normPob)) {
        let pBd = await prisma.poblacionSujeto.findFirst({
          where: { nombre: { equals: pobTexto, mode: 'insensitive' } },
        });
        if (!pBd) {
          pBd = await prisma.poblacionSujeto.create({
            data: { nombre: pobTexto, activo: true },
          });
        }
        mapaPoblacionesPorNorm.set(normPob, pBd);
      }
    }
  }
  console.log(`✔ Catálogos sincronizados (${mapaPoblacionesPorNorm.size} poblaciones registradas).`);

  // ----------------------------------------------------------------------------
  // 3. COMPONENTES (DESDE TH Y PLAN)
  // ----------------------------------------------------------------------------
  console.log('\n[3/7] Mapeando y creando Componentes por Área...');
  const mapaComponentes = new Map(); // clave: `areaId_normComp`

  async function asegurarComponente(areaId, compNombre) {
    if (!compNombre || !areaId) return null;
    const norm = normalizarTexto(compNombre);
    const clave = `${areaId}_${norm}`;
    if (mapaComponentes.has(clave)) return mapaComponentes.get(clave);

    const cod = compNombre.toUpperCase().replace(/[\s-]/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20) || 'COMP';
    let compBd = await prisma.componente.findFirst({
      where: {
        areaId,
        nombre: { equals: compNombre, mode: 'insensitive' },
      },
    });

    if (!compBd) {
      // Intentar encontrar si hay colisión de código en la misma área
      let codUnico = cod;
      let existeCod = await prisma.componente.findUnique({
        where: { areaId_codigo: { areaId, codigo: codUnico } },
      });
      let contador = 2;
      while (existeCod) {
        codUnico = `${cod.slice(0, 17)}_${contador}`;
        existeCod = await prisma.componente.findUnique({
          where: { areaId_codigo: { areaId, codigo: codUnico } },
        });
        contador++;
      }

      compBd = await prisma.componente.create({
        data: {
          areaId,
          codigo: codUnico,
          nombre: compNombre.trim(),
          activo: true,
        },
      });
    }

    mapaComponentes.set(clave, compBd);
    return compBd;
  }

  // Pre-cargar componentes existentes
  const compExistentes = await prisma.componente.findMany();
  for (const c of compExistentes) {
    mapaComponentes.set(`${c.areaId}_${normalizarTexto(c.nombre)}`, c);
  }

  // ----------------------------------------------------------------------------
  // 4. CARGA DEL TALENTO HUMANO (USUARIOS)
  // ----------------------------------------------------------------------------
  console.log('\n[4/7] Procesando Talento Humano y estructurando Usuarios...');

  // 4.1 Crear / Actualizar a la Secretaria de Salud: Dra. Magda Karina Alarcón Gómez
  const areaDespacho = mapaAreasPorCodigo.get('DES');
  const usuarioSecretaria = await prisma.usuario.upsert({
    where: { correo: 'magda.alarcon@magdalena.gov.co' },
    update: {
      nombre: 'Magda Karina Alarcón Gómez',
      rol: RolUsuario.SECRETARIA,
      cargo: 'Secretaria de Salud Departamental',
      areaId: areaDespacho.id,
      activo: true,
    },
    create: {
      nombre: 'Magda Karina Alarcón Gómez',
      correo: 'magda.alarcon@magdalena.gov.co',
      hashClave: hashClaveGeneral,
      rol: RolUsuario.SECRETARIA,
      cargo: 'Secretaria de Salud Departamental',
      areaId: areaDespacho.id,
      activo: true,
      recibeCorreo: true,
    },
  });
  console.log('✔ Secretaria de Salud registrada: Dra. Magda Karina Alarcón Gómez (magda.alarcon@magdalena.gov.co)');

  // 4.2 Leer datos de TH y Personas
  // Construir mapa de TH para enriquecer con Vinculación, Líder (SI/NO), etc.
  const infoThPorNombre = new Map();
  if (thSheet) {
    for (let r = 2; r <= thSheet.rowCount; r++) {
      const row = thSheet.getRow(r);
      const nom = obtenerValorCelda(row.getCell(4));
      if (!nom) continue;
      const normNom = normalizarTexto(nom);
      infoThPorNombre.set(normNom, {
        perfil: obtenerValorCelda(row.getCell(5)),
        vinculacion: String(obtenerValorCelda(row.getCell(6)) || '').trim().toUpperCase(),
        cargo: obtenerValorCelda(row.getCell(8)),
        fechaFinal: obtenerValorCelda(row.getCell(10)),
        esLider: String(obtenerValorCelda(row.getCell(13)) || '').trim().toUpperCase() === 'SI',
      });
    }
  }

  const correosUsados = new Set();
  correosUsados.add('admin@magdalena.gov.co');
  correosUsados.add('magda.alarcon@magdalena.gov.co');

  const listaCandidatosResponsables = [
    {
      id: usuarioSecretaria.id,
      nombre: usuarioSecretaria.nombre,
      nombreNorm: normalizarTexto(usuarioSecretaria.nombre),
      usuario: usuarioSecretaria,
    },
  ];

  let totalUsuariosCreados = 0;

  if (personasSheet) {
    for (let r = 2; r <= personasSheet.rowCount; r++) {
      const row = personasSheet.getRow(r);
      const nomRaw = obtenerValorCelda(row.getCell(1));
      if (!nomRaw) continue;
      const nombreCompleto = String(nomRaw).trim();
      const normNom = normalizarTexto(nombreCompleto);

      // Si es Magda Karina o Diana Celedón, ya está manejada en el Despacho
      if (normNom.includes('MAGDA KARINA') || normNom.includes('DIANA CELEDON')) {
        continue;
      }

      const rolRaw = String(obtenerValorCelda(row.getCell(3)) || '').trim();
      let cargoRaw = obtenerValorCelda(row.getCell(4));
      const areaRaw = String(obtenerValorCelda(row.getCell(5)) || '').trim();
      const compRaw = String(obtenerValorCelda(row.getCell(6)) || '').trim();
      let finContratoRaw = obtenerValorCelda(row.getCell(7));

      // Consultar info complementaria de TH
      const infoTh = infoThPorNombre.get(normNom);
      const esLiderTh = infoTh ? infoTh.esLider : false;
      const vincTh = infoTh ? infoTh.vinculacion : '';

      // Determinar Área
      let areaTarget = mapaAreasPorNorm.get(normalizarTexto(areaRaw));
      if (!areaTarget) {
        areaTarget = mapaAreasPorCodigo.get('SP'); // Por defecto Salud Pública
      }

      // Asegurar Componente
      let compTarget = null;
      if (compRaw && compRaw !== 'SALUD PUBLICA') {
        compTarget = await asegurarComponente(areaTarget.id, compRaw);
      }

      // Determinar Rol
      let rolFinal = RolUsuario.CONTRATISTA;
      if (rolRaw === 'LIDER_AREA') {
        rolFinal = RolUsuario.LIDER_AREA;
      } else if (esLiderTh) {
        rolFinal = RolUsuario.LIDER_COMPONENTE;
      } else if (rolRaw === 'PLANTA' || vincTh === 'PLANTA') {
        rolFinal = RolUsuario.FUNCIONARIO;
      } else {
        rolFinal = RolUsuario.CONTRATISTA;
      }

      // Cargo
      const cargoFinal = cargoRaw ? String(cargoRaw).trim() : (infoTh?.cargo || (rolFinal === RolUsuario.FUNCIONARIO ? 'Funcionario' : 'Contratista'));

      // Fecha fin contrato
      let fechaFinContrato = null;
      if (finContratoRaw instanceof Date && !isNaN(finContratoRaw.getTime())) {
        fechaFinContrato = finContratoRaw;
      } else if (infoTh?.fechaFinal instanceof Date && !isNaN(infoTh.fechaFinal.getTime())) {
        fechaFinContrato = infoTh.fechaFinal;
      }

      // Generar Correo único
      const baseSlug = normalizarSlugEmail(nombreCompleto);
      let correoGenerado = `${baseSlug}@magdalena.gov.co`;
      let sufijo = 2;
      while (correosUsados.has(correoGenerado)) {
        correoGenerado = `${baseSlug}${sufijo}@magdalena.gov.co`;
        sufijo++;
      }
      correosUsados.add(correoGenerado);

      // Crear o actualizar en Base de Datos
      const usuarioBd = await prisma.usuario.upsert({
        where: { correo: correoGenerado },
        update: {
          nombre: nombreCompleto,
          rol: rolFinal,
          cargo: cargoFinal.slice(0, 120),
          areaId: areaTarget.id,
          componenteId: compTarget ? compTarget.id : null,
          fechaFinContrato,
          activo: true,
        },
        create: {
          nombre: nombreCompleto,
          correo: correoGenerado,
          hashClave: hashClaveGeneral,
          rol: rolFinal,
          cargo: cargoFinal.slice(0, 120),
          areaId: areaTarget.id,
          componenteId: compTarget ? compTarget.id : null,
          fechaFinContrato,
          activo: true,
          recibeCorreo: true,
        },
      });

      listaCandidatosResponsables.push({
        id: usuarioBd.id,
        nombre: usuarioBd.nombre,
        nombreNorm: normNom,
        usuario: usuarioBd,
      });

      // Si es líder de área, actualizar Area.liderId
      if (rolFinal === RolUsuario.LIDER_AREA) {
        await prisma.area.update({
          where: { id: areaTarget.id },
          data: { liderId: usuarioBd.id },
        });
      }

      // Si es líder de componente, actualizar Componente.liderId
      if (rolFinal === RolUsuario.LIDER_COMPONENTE && compTarget) {
        await prisma.componente.update({
          where: { id: compTarget.id },
          data: { liderId: usuarioBd.id },
        });
      }

      totalUsuariosCreados++;
    }
  }
  console.log(`✔ ${totalUsuariosCreados} Usuarios de talento humano sincronizados exitosamente.`);

  // Asignar los 10 líderes oficiales de área
  const lideresOficialesArea = [
    { areaCod: 'SP', nombre: 'RUBY PONCE' },
    { areaCod: 'PRE', nombre: 'RICARDO RUIZ' },
    { areaCod: 'ASE', nombre: 'MARIA JOSEFA' },
    { areaCod: 'EMD', nombre: 'JESUS REBOLLEDO' },
    { areaCod: 'RL', nombre: 'ANDRES JIEMENEZ' },
    { areaCod: 'PS', nombre: 'BERENA MEZA' },
    { areaCod: 'PLA', nombre: 'KAREN RAMIREZ' },
    { areaCod: 'FIN', nombre: 'ARMANDO SALAS' },
    { areaCod: 'JUR', nombre: 'RENNY' },
    { areaCod: 'DES', nombre: 'MAGDA KARINA' },
  ];

  for (const lo of lideresOficialesArea) {
    const userLid = await prisma.usuario.findFirst({
      where: { nombre: { contains: lo.nombre, mode: 'insensitive' } },
    });
    if (userLid) {
      if (userLid.rol !== RolUsuario.SECRETARIA) {
        await prisma.usuario.update({
          where: { id: userLid.id },
          data: { rol: RolUsuario.LIDER_AREA },
        });
      }
      await prisma.area.update({
        where: { codigo: lo.areaCod },
        data: { liderId: userLid.id },
      });
    }
  }
  console.log('✔ Líderes oficiales asignados a las 10 Áreas.');

  // ----------------------------------------------------------------------------
  // 5. CARGA DE LAS 276 METAS DEL PLAN
  // ----------------------------------------------------------------------------
  console.log('\n[5/7] Ingestando y estructurando las 276 Metas del Plan...');

  // Mapeo mes -> columnas en Excel (PROG, EJEC)
  const mesesColumnas = [
    { mes: 1, colProg: 37, colEjec: 38 },
    { mes: 2, colProg: 40, colEjec: 41 },
    { mes: 3, colProg: 43, colEjec: 44 },
    { mes: 4, colProg: 49, colEjec: 50 },
    { mes: 5, colProg: 52, colEjec: 53 },
    { mes: 6, colProg: 55, colEjec: 56 },
    { mes: 7, colProg: 65, colEjec: 66 },
    { mes: 8, colProg: 68, colEjec: 69 },
    { mes: 9, colProg: 71, colEjec: 72 },
  ];

  let metasCreadas = 0;
  let totalProgramacionesCreadas = 0;
  let totalReportesCreados = 0;
  let sumaPresupuestoGlobal = 0;
  let sumaObligacionesGlobal = 0;

  for (let r = 5; r <= planSheet.rowCount; r++) {
    const row = planSheet.getRow(r);
    const idActividad = obtenerValorCelda(row.getCell(1));
    const descripcionRaw = obtenerValorCelda(row.getCell(2));
    if (!idActividad || !descripcionRaw) continue;

    const codigoMeta = String(idActividad).trim();
    const descripcion = String(descripcionRaw).trim();
    const metaValor = aNumero(obtenerValorCelda(row.getCell(3)));
    const unidadTexto = String(obtenerValorCelda(row.getCell(4)) || '').trim();

    // Unidad de medida normalizada
    let unidadBd = mapaUnidadesPorNorm.get(normalizarTexto(unidadTexto));
    if (!unidadBd) unidadBd = mapaUnidadesPorCodigo.get('NUMERO');

    // Fechas
    let fInicioRaw = obtenerValorCelda(row.getCell(20));
    let fFinRaw = obtenerValorCelda(row.getCell(21));
    let fechaInicio = fInicioRaw instanceof Date ? fInicioRaw : new Date(String(fInicioRaw || '2026-01-01'));
    let fechaFinOficial = fFinRaw instanceof Date ? fFinRaw : new Date(String(fFinRaw || '2026-12-31'));
    if (isNaN(fechaInicio.getTime())) fechaInicio = new Date('2026-01-01');
    if (isNaN(fechaFinOficial.getTime())) fechaFinOficial = new Date('2026-12-31');

    // Fecha de corte global de seguimiento
    const fechaCorte = new Date('2026-11-30');

    // Área
    const areaTexto = String(obtenerValorCelda(row.getCell(32)) || '').trim();
    let areaBd = mapaAreasPorNorm.get(normalizarTexto(areaTexto));
    if (!areaBd) areaBd = mapaAreasPorCodigo.get('SP');

    // Componente
    const compTexto = String(obtenerValorCelda(row.getCell(33)) || '').trim();
    let compBd = null;
    if (compTexto) {
      compBd = await asegurarComponente(areaBd.id, compTexto);
    }

    // Responsable (Col 31 y Col 34)
    const respCol31 = obtenerValorCelda(row.getCell(31));
    const respCol34 = obtenerValorCelda(row.getCell(34));
    let responsableMatch = encontrarMejorCoincidencia(respCol31, listaCandidatosResponsables) ||
      encontrarMejorCoincidencia(respCol34, listaCandidatosResponsables);

    const responsableId = responsableMatch ? responsableMatch.id : null;

    // Presupuesto (Col 25 Apropiación, Col 27 Obligaciones, Col 28 Pagado)
    const apropiacion = aNumero(obtenerValorCelda(row.getCell(25)));
    const obligaciones = aNumero(obtenerValorCelda(row.getCell(27)));
    const pagado = aNumero(obtenerValorCelda(row.getCell(28)));
    sumaPresupuestoGlobal += apropiacion;
    sumaObligacionesGlobal += pagado;

    // Población Sujeto
    const pobTexto = String(obtenerValorCelda(row.getCell(29)) || '').trim();
    const pobBd = mapaPoblacionesPorNorm.get(normalizarTexto(pobTexto));

    // Fuente de Recursos (Col 23 y 24)
    const codFuente = String(obtenerValorCelda(row.getCell(24)) || '').trim();
    let fuenteBd = mapaFuentesPorCodigo.get(codFuente);
    if (!fuenteBd && codFuente) {
      const descFuente = String(obtenerValorCelda(row.getCell(23)) || codFuente).trim();
      fuenteBd = await prisma.fuenteRecurso.upsert({
        where: { codigo: codFuente.slice(0, 50) },
        update: { nombre: descFuente },
        create: { codigo: codFuente.slice(0, 50), nombre: descFuente },
      });
      mapaFuentesPorCodigo.set(codFuente, fuenteBd);
    }

    // Determinar avance ejecutado total para estado inicial
    const t1_e = aNumero(obtenerValorCelda(row.getCell(6)));
    const t2_e = aNumero(obtenerValorCelda(row.getCell(9)));
    const t3_e = aNumero(obtenerValorCelda(row.getCell(12)));
    const t4_e = aNumero(obtenerValorCelda(row.getCell(15)));
    const ejecTotalTrim = t1_e + t2_e + t3_e + t4_e;

    let estado = EstadoMeta.ABIERTA;
    if (ejecTotalTrim >= metaValor && metaValor > 0) {
      estado = EstadoMeta.CUMPLIDA;
    } else if (!responsableId) {
      estado = EstadoMeta.PENDIENTE_COMPLETAR;
    }

    // Upsert de la Meta
    const metaBd = await prisma.meta.upsert({
      where: { codigo: codigoMeta },
      update: {
        descripcion,
        unidadId: unidadBd.id,
        valorMeta: metaValor,
        fechaInicio,
        fechaFinOficial,
        fechaCorte,
        areaId: areaBd.id,
        componenteId: compBd ? compBd.id : null,
        responsableId,
        fuenteRecursoId: fuenteBd ? fuenteBd.id : null,
        presupuestoProgramado: apropiacion > 0 ? apropiacion : null,
        poblacionSujetoId: pobBd ? pobBd.id : null,
        estado,
        distribucionUniforme: false,
      },
      create: {
        codigo: codigoMeta,
        descripcion,
        unidadId: unidadBd.id,
        valorMeta: metaValor,
        fechaInicio,
        fechaFinOficial,
        fechaCorte,
        areaId: areaBd.id,
        componenteId: compBd ? compBd.id : null,
        responsableId,
        fuenteRecursoId: fuenteBd ? fuenteBd.id : null,
        presupuestoProgramado: apropiacion > 0 ? apropiacion : null,
        poblacionSujetoId: pobBd ? pobBd.id : null,
        estado,
        distribucionUniforme: false,
      },
    });

    metasCreadas++;

    // --------------------------------------------------------------------------
    // PROGRAMACIÓN MENSUAL (12 MESES)
    // --------------------------------------------------------------------------
    // Extraer programación por trimestres
    const t1_p = aNumero(obtenerValorCelda(row.getCell(5)));
    const t2_p = aNumero(obtenerValorCelda(row.getCell(8)));
    const t3_p = aNumero(obtenerValorCelda(row.getCell(11)));
    const t4_p = aNumero(obtenerValorCelda(row.getCell(14)));

    // Extraer programación mensual detallada si existe
    const progMeses = new Map();
    for (const m of mesesColumnas) {
      const v = row.getCell(m.colProg).value;
      if (v != null && v !== '' && !isNaN(Number(v))) {
        progMeses.set(m.mes, aNumero(v));
      }
    }

    // Para cada mes de 1 a 12, calcular su valor programado
    for (let mes = 1; mes <= 12; mes++) {
      let valProg = 0;
      if (progMeses.has(mes)) {
        valProg = progMeses.get(mes);
      } else {
        // Distribuir del trimestre respectivo
        if (mes <= 3) valProg = t1_p / 3;
        else if (mes <= 6) valProg = t2_p / 3;
        else if (mes <= 9) valProg = t3_p / 3;
        else valProg = t4_p / 3;
      }

      await prisma.programacionMeta.upsert({
        where: {
          metaId_anio_mes: {
            metaId: metaBd.id,
            anio: 2026,
            mes,
          },
        },
        update: { valorProgramado: Math.round(valProg * 100) / 100 },
        create: {
          metaId: metaBd.id,
          anio: 2026,
          mes,
          valorProgramado: Math.round(valProg * 100) / 100,
        },
      });
      totalProgramacionesCreadas++;
    }

    // --------------------------------------------------------------------------
    // REPORTES MENSUALES DE AVANCE Y COSTO EJECUTADO
    // --------------------------------------------------------------------------
    // Extraer ejecución mensual reportada si existe
    const ejecMeses = new Map();
    let tieneEjecMensual = false;
    for (const m of mesesColumnas) {
      const v = row.getCell(m.colEjec).value;
      if (v != null && v !== '' && !isNaN(Number(v))) {
        ejecMeses.set(m.mes, aNumero(v));
        tieneEjecMensual = true;
      }
    }

    const usuarioReportaId = responsableId || usuarioSecretaria.id;

    if (tieneEjecMensual) {
      // Registrar cada mes con su ejecución
      for (const [mes, valEjec] of ejecMeses.entries()) {
        let pctBinario = null;
        if (unidadBd.esBinaria) {
          pctBinario = metaValor > 0 ? Math.min(100, Math.round((valEjec / metaValor) * 100)) : 0;
        }

        // Si es junio (mes 6) o el mes con reporte del semestre, asignamos el valor efectivamente pagado (Col 28)
        const costoMes = mes === 6 && pagado > 0 ? pagado : 0;

        await prisma.reporteMensual.upsert({
          where: {
            metaId_anio_mes: {
              metaId: metaBd.id,
              anio: 2026,
              mes,
            },
          },
          update: {
            valorEjecutado: valEjec,
            porcentajeBinario: pctBinario,
            costoEjecutado: costoMes,
            observacion: 'Avance mensual registrado en Plan Territorial de Salud 2026',
            origen: OrigenReporte.CARGA_INICIAL,
            reportadoPor: usuarioReportaId,
          },
          create: {
            metaId: metaBd.id,
            anio: 2026,
            mes,
            valorEjecutado: valEjec,
            porcentajeBinario: pctBinario,
            costoEjecutado: costoMes,
            observacion: 'Avance mensual registrado en Plan Territorial de Salud 2026',
            origen: OrigenReporte.CARGA_INICIAL,
            reportadoPor: usuarioReportaId,
          },
        });
        totalReportesCreados++;
      }
    } else if (ejecTotalTrim > 0) {
      // Distribuir trimestres reportados
      // T1 -> Mes 1, 2, 3
      if (t1_e > 0) {
        for (let m = 1; m <= 3; m++) {
          const valEj = Math.round((t1_e / 3) * 100) / 100;
          let pctBinario = unidadBd.esBinaria && metaValor > 0 ? Math.min(100, Math.round((valEj / metaValor) * 100)) : null;
          const costoMesT1 = m === 3 && t2_e === 0 && pagado > 0 ? pagado : 0;
          await prisma.reporteMensual.upsert({
            where: { metaId_anio_mes: { metaId: metaBd.id, anio: 2026, mes: m } },
            update: { valorEjecutado: valEj, porcentajeBinario: pctBinario, costoEjecutado: costoMesT1, reportadoPor: usuarioReportaId },
            create: {
              metaId: metaBd.id,
              anio: 2026,
              mes: m,
              valorEjecutado: valEj,
              porcentajeBinario: pctBinario,
              costoEjecutado: costoMesT1,
              observacion: 'Avance Trimestre I distribuido desde Plan de Salud',
              origen: OrigenReporte.CARGA_INICIAL,
              reportadoPor: usuarioReportaId,
            },
          });
          totalReportesCreados++;
        }
      }

      // T2 -> Mes 4, 5, 6
      if (t2_e > 0) {
        for (let m = 4; m <= 6; m++) {
          const valEj = Math.round((t2_e / 3) * 100) / 100;
          let pctBinario = unidadBd.esBinaria && metaValor > 0 ? Math.min(100, Math.round((valEj / metaValor) * 100)) : null;
          // En mes 6 asignamos el valor pagado de Col 28
          const costoMes = m === 6 && pagado > 0 ? pagado : 0;
          await prisma.reporteMensual.upsert({
            where: { metaId_anio_mes: { metaId: metaBd.id, anio: 2026, mes: m } },
            update: { valorEjecutado: valEj, porcentajeBinario: pctBinario, costoEjecutado: costoMes, reportadoPor: usuarioReportaId },
            create: {
              metaId: metaBd.id,
              anio: 2026,
              mes: m,
              valorEjecutado: valEj,
              porcentajeBinario: pctBinario,
              costoEjecutado: costoMes,
              observacion: 'Avance Trimestre II distribuido desde Plan de Salud',
              origen: OrigenReporte.CARGA_INICIAL,
              reportadoPor: usuarioReportaId,
            },
          });
          totalReportesCreados++;
        }
      }

      // T3 -> Mes 7, 8, 9 (si hubo reporte en T3)
      if (t3_e > 0) {
        for (let m = 7; m <= 9; m++) {
          const valEj = Math.round((t3_e / 3) * 100) / 100;
          let pctBinario = unidadBd.esBinaria && metaValor > 0 ? Math.min(100, Math.round((valEj / metaValor) * 100)) : null;
          await prisma.reporteMensual.upsert({
            where: { metaId_anio_mes: { metaId: metaBd.id, anio: 2026, mes: m } },
            update: { valorEjecutado: valEj, porcentajeBinario: pctBinario, reportadoPor: usuarioReportaId },
            create: {
              metaId: metaBd.id,
              anio: 2026,
              mes: m,
              valorEjecutado: valEj,
              porcentajeBinario: pctBinario,
              costoEjecutado: 0,
              observacion: 'Avance Trimestre III distribuido desde Plan de Salud',
              origen: OrigenReporte.CARGA_INICIAL,
              reportadoPor: usuarioReportaId,
            },
          });
          totalReportesCreados++;
        }
      }
    }
  }

  console.log(`✔ ${metasCreadas} Metas creadas en base de datos.`);
  console.log(`✔ ${totalProgramacionesCreadas} Programaciones mensuales generadas (12 meses x meta).`);
  console.log(`✔ ${totalReportesCreados} Reportes mensuales de avance físico y financiero creados.`);

  // ----------------------------------------------------------------------------
  // 6. REGISTRO EN AUDITORÍA
  // ----------------------------------------------------------------------------
  console.log('\n[6/7] Registrando evento de auditoría...');
  const adminUser = await prisma.usuario.findFirst({
    where: { rol: RolUsuario.ADMINISTRADOR },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: adminUser?.id,
      accion: 'IMPORTACION_PLAN_TERRITORIAL_SALUD_2026',
      entidad: 'metas',
      motivo: 'Carga oficial del Plan Territorial de Salud PAS 2026 y Talento Humano. Secretaria de Salud: Magda Karina Alarcón Gómez.',
      datosDespues: {
        totalMetas: metasCreadas,
        totalUsuarios: totalUsuariosCreados + 2, // personal + secretaria + admin
        totalProgramaciones: totalProgramacionesCreadas,
        totalReportes: totalReportesCreados,
        presupuestoTotalApropiado: sumaPresupuestoGlobal,
        obligacionesTotales: sumaObligacionesGlobal,
      },
    },
  });

  // ----------------------------------------------------------------------------
  // 7. BALANCE FINAL
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  RESUMEN FINAL DE CARGA EN BASE DE DATOS');
  console.log('================================================================');
  const [conteoMetasFinal, conteoUsuariosFinal, conteoReportesFinal, conteoProgramacionesFinal, conteoAreasFinal, conteoCompFinal] =
    await Promise.all([
      prisma.meta.count(),
      prisma.usuario.count(),
      prisma.reporteMensual.count(),
      prisma.programacionMeta.count(),
      prisma.area.count(),
      prisma.componente.count(),
    ]);

  console.log(`- Metas en el sistema:             ${conteoMetasFinal}`);
  console.log(`- Programaciones (12 meses):       ${conteoProgramacionesFinal}`);
  console.log(`- Reportes Mensuales de avance:    ${conteoReportesFinal}`);
  console.log(`- Usuarios (Talento Humano):       ${conteoUsuariosFinal}`);
  console.log(`- Áreas funcionales:               ${conteoAreasFinal}`);
  console.log(`- Componentes de salud:            ${conteoCompFinal}`);
  console.log(`- Presupuesto Total Apropiado:     $${sumaPresupuestoGlobal.toLocaleString('es-CO')} COP`);
  console.log(`- Obligaciones Totales Causadas:   $${sumaObligacionesGlobal.toLocaleString('es-CO')} COP`);
  console.log('================================================================');
  console.log('✔ ¡La base de datos de MÉTRICA está 100% cargada y lista!');
}

main()
  .catch((err) => {
    console.error('ERROR durante la importación:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
