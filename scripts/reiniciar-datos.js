/**
 * ==============================================================================
 * MÉTRICA - Script de Respaldo y Reinicio Completo de Base de Datos
 * ==============================================================================
 * 1. Genera una copia de seguridad integral (pg_dump SQL + JSON completo + soportes + manifiesto)
 * 2. Desvincula líderes en Áreas y Componentes
 * 3. Elimina metas, tareas, reportes, soportes, observaciones, notificaciones y auditorías
 * 4. Elimina todos los usuarios excepto el Administrador del Sistema
 * 5. Limpia archivos físicos en carpeta soportes/
 * 6. Depura catálogos no normativos y sincroniza la estructura base
 * 7. Registra evento de reinicio en auditoría
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JSZip = require('jszip');

// 1. Cargar variables de entorno de apps/api/.env
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

const { PrismaClient, RolUsuario, TipoParametro } = require(path.resolve(rutaBase, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

const rutaBackups = path.resolve(process.env.RUTA_BACKUPS || path.join(rutaBase, 'backups'));
const rutaSoportes = path.resolve(process.env.RUTA_SOPORTES || path.join(rutaBase, 'soportes'));

if (!fs.existsSync(rutaBackups)) fs.mkdirSync(rutaBackups, { recursive: true });
if (!fs.existsSync(rutaSoportes)) fs.mkdirSync(rutaSoportes, { recursive: true });

async function ejecutarReinicio() {
  console.log('===============================================================');
  console.log('  MÉTRICA — INICIO DE PROCESO DE RESPALDO Y PURGA DE DATOS');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // PASO 1: Consulta de estado actual
  // --------------------------------------------------------------------------
  console.log('\n[1/6] Evaluando estado actual de la base de datos...');
  const [
    conteoMetas,
    conteoProgramaciones,
    conteoReportes,
    conteoTareas,
    conteoRecursosTarea,
    conteoObservaciones,
    conteoNotificaciones,
    conteoAuditoria,
    conteoUsuarios,
    conteoPoblaciones,
    conteoFuentes,
    conteoAreas,
    conteoComponentes,
    conteoUnidades,
    conteoRecursos,
    conteoCategorias,
    conteoTiposNotif,
    conteoParametros
  ] = await Promise.all([
    prisma.meta.count(),
    prisma.programacionMeta.count(),
    prisma.reporteMensual.count(),
    prisma.tarea.count(),
    prisma.tareaRecurso.count(),
    prisma.observacion.count(),
    prisma.notificacion.count(),
    prisma.auditoria.count(),
    prisma.usuario.count(),
    prisma.poblacionSujeto.count(),
    prisma.fuenteRecurso.count(),
    prisma.area.count(),
    prisma.componente.count(),
    prisma.unidadMedida.count(),
    prisma.recurso.count(),
    prisma.categoriaTarea.count(),
    prisma.tipoNotificacion.count(),
    prisma.parametro.count(),
  ]);

  console.log(`- Metas actuales:            ${conteoMetas}`);
  console.log(`- Programaciones mensuales:  ${conteoProgramaciones}`);
  console.log(`- Reportes mensuales:        ${conteoReportes}`);
  console.log(`- Tareas:                    ${conteoTareas}`);
  console.log(`- Observaciones:             ${conteoObservaciones}`);
  console.log(`- Notificaciones:            ${conteoNotificaciones}`);
  console.log(`- Auditoría:                 ${conteoAuditoria}`);
  console.log(`- Usuarios:                  ${conteoUsuarios}`);
  console.log(`- Poblaciones sujeto:        ${conteoPoblaciones}`);
  console.log(`- Fuentes de recursos:       ${conteoFuentes}`);
  console.log(`- Áreas:                     ${conteoAreas}`);
  console.log(`- Componentes:               ${conteoComponentes}`);

  // --------------------------------------------------------------------------
  // PASO 2: Generar Copia de Seguridad Preventiva Completa (Backup)
  // --------------------------------------------------------------------------
  console.log('\n[2/6] Generando copia de seguridad preventiva obligatoria...');
  const timestampIso = new Date().toISOString().replace(/[:.]/g, '-');
  const nombreZip = `backup_metrica_previo_reinicio_${timestampIso}.zip`;
  const rutaArchivoZip = path.join(rutaBackups, nombreZip);

  const zip = new JSZip();

  // Exportar todas las tablas a JSON
  console.log('  -> Extrayendo datos de todas las tablas para JSON...');
  const [
    tblAreas,
    tblComponentes,
    tblUsuarios,
    tblUnidades,
    tblFuentes,
    tblPoblaciones,
    tblRecursos,
    tblCategorias,
    tblMetas,
    tblProgramaciones,
    tblReportes,
    tblTareas,
    tblTareasRecursos,
    tblSoportes,
    tblObservaciones,
    tblNotificaciones,
    tblParametros,
    tblAuditoria
  ] = await Promise.all([
    prisma.area.findMany(),
    prisma.componente.findMany(),
    prisma.usuario.findMany(),
    prisma.unidadMedida.findMany(),
    prisma.fuenteRecurso.findMany(),
    prisma.poblacionSujeto.findMany(),
    prisma.recurso.findMany(),
    prisma.categoriaTarea.findMany(),
    prisma.meta.findMany(),
    prisma.programacionMeta.findMany(),
    prisma.reporteMensual.findMany(),
    prisma.tarea.findMany(),
    prisma.tareaRecurso.findMany(),
    prisma.soporte.findMany(),
    prisma.observacion.findMany(),
    prisma.notificacion.findMany(),
    prisma.parametro.findMany(),
    prisma.auditoria.findMany(),
  ]);

  const baseDatosJson = {
    sistema: 'MÉTRICA',
    esquema: 'metrica',
    version: '1.0.0',
    exportadoEn: new Date().toISOString(),
    tablas: {
      areas: tblAreas,
      componentes: tblComponentes,
      usuarios: tblUsuarios,
      unidades: tblUnidades,
      fuentes: tblFuentes,
      poblaciones: tblPoblaciones,
      recursos: tblRecursos,
      categorias: tblCategorias,
      metas: tblMetas,
      programaciones: tblProgramaciones,
      reportes: tblReportes,
      tareas: tblTareas,
      tareasRecursos: tblTareasRecursos,
      soportes: tblSoportes,
      observaciones: tblObservaciones,
      notificaciones: tblNotificaciones,
      parametros: tblParametros,
      auditoria: tblAuditoria,
    },
  };
  const jsonReplacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);
  zip.file('base_datos.json', JSON.stringify(baseDatosJson, jsonReplacer, 2));

  // Volcado SQL nativo mediante pg_dump
  const pgDumpExe = process.env.PG_DUMP_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  if (fs.existsSync(pgDumpExe)) {
    console.log('  -> Ejecutando pg_dump para respaldo SQL nativo...');
    try {
      const sqlDump = execSync(
        `"${pgDumpExe}" -h localhost -p 5432 -U postgres -d metrica -n metrica --clean --if-exists`,
        {
          env: { ...process.env, PGPASSWORD: '123456/*' },
          maxBuffer: 64 * 1024 * 1024,
        }
      );
      zip.file('base_datos.sql', sqlDump);
      console.log('  ✔ Volcado SQL incluido en el backup.');
    } catch (errPgDump) {
      console.warn('  ⚠ Advertencia: no se pudo generar base_datos.sql con pg_dump:', errPgDump.message);
    }
  }

  // Empaquetar archivos físicos de soporte
  const carpetaSoportesZip = zip.folder('soportes');
  let archivosSoporteEmpaquetados = 0;
  if (fs.existsSync(rutaSoportes)) {
    const archivos = fs.readdirSync(rutaSoportes);
    for (const archivo of archivos) {
      const rutaCompleta = path.join(rutaSoportes, archivo);
      if (fs.statSync(rutaCompleta).isFile()) {
        const buffer = fs.readFileSync(rutaCompleta);
        carpetaSoportesZip.file(archivo, buffer);
        archivosSoporteEmpaquetados++;
      }
    }
  }
  console.log(`  -> Archivos físicos de soporte empaquetados: ${archivosSoporteEmpaquetados}`);

  // Manifiesto de respaldo
  const manifiesto = {
    sistema: 'MÉTRICA — Monitoreo de Metas en Salud',
    entidad: 'Gobernación del Magdalena · Secretaría de Salud',
    vigencia: '2026',
    tipo: 'RESPALDO_PREVIO_REINICIO_TOTAL',
    generadoEn: new Date().toISOString(),
    archivoZip: nombreZip,
    resumenRegistros: {
      metas: tblMetas.length,
      programaciones: tblProgramaciones.length,
      reportes: tblReportes.length,
      tareas: tblTareas.length,
      usuarios: tblUsuarios.length,
      soportes: tblSoportes.length,
      archivosFisicos: archivosSoporteEmpaquetados,
      auditorias: tblAuditoria.length,
    },
  };
  zip.file('manifiesto.json', JSON.stringify(manifiesto, null, 2));

  // Comprimir y guardar en disco
  const bufferZip = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(rutaArchivoZip, bufferZip);
  const tamanoMb = (bufferZip.length / (1024 * 1024)).toFixed(2);
  console.log(`✔ Copia de seguridad creada exitosamente: ${nombreZip} (${tamanoMb} MB) en ${rutaBackups}`);

  // --------------------------------------------------------------------------
  // PASO 3: Desvinculación de referencias foráneas
  // --------------------------------------------------------------------------
  console.log('\n[3/6] Desvinculando líderes de áreas y componentes...');
  await prisma.area.updateMany({ data: { liderId: null } });
  await prisma.componente.updateMany({ data: { liderId: null } });
  console.log('✔ Líderes desvinculados de áreas y componentes.');

  // --------------------------------------------------------------------------
  // PASO 4: Eliminación atómica en Base de Datos (Transacción)
  // --------------------------------------------------------------------------
  console.log('\n[4/6] Ejecutando purga en base de datos...');
  
  // Guardar datos del usuario administrador para garantizar su preservación absoluta
  const adminUser = await prisma.usuario.findFirst({
    where: { correo: 'admin@magdalena.gov.co' },
  });
  if (!adminUser) {
    throw new Error('FATAL: No se encontró el usuario admin@magdalena.gov.co en la base de datos.');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Soportes
    const delSoportes = await tx.soporte.deleteMany({});
    console.log(`  - Soportes eliminados:            ${delSoportes.count}`);

    // 2. Tareas y recursos
    const delTareaRecurso = await tx.tareaRecurso.deleteMany({});
    console.log(`  - Recursos de tareas eliminados:  ${delTareaRecurso.count}`);
    const delTareas = await tx.tarea.deleteMany({});
    console.log(`  - Tareas eliminadas:              ${delTareas.count}`);

    // 3. Reportes mensuales
    const delReportes = await tx.reporteMensual.deleteMany({});
    console.log(`  - Reportes mensuales eliminados:  ${delReportes.count}`);

    // 4. Observaciones
    const delObservaciones = await tx.observacion.deleteMany({});
    console.log(`  - Observaciones eliminadas:       ${delObservaciones.count}`);

    // 5. Programaciones y Metas
    const delProgramaciones = await tx.programacionMeta.deleteMany({});
    console.log(`  - Programaciones eliminadas:      ${delProgramaciones.count}`);
    const delMetas = await tx.meta.deleteMany({});
    console.log(`  - Metas eliminadas:               ${delMetas.count}`);

    // 6. Notificaciones
    const delNotificaciones = await tx.notificacion.deleteMany({});
    console.log(`  - Notificaciones eliminadas:      ${delNotificaciones.count}`);

    // 7. Poblaciones Sujeto (dinámicas de importación previa)
    const delPoblaciones = await tx.poblacionSujeto.deleteMany({});
    console.log(`  - Poblaciones sujeto eliminadas:  ${delPoblaciones.count}`);

    // 8. Fuentes de recursos adicionales (dejar solo las 3 normativas)
    const delFuentes = await tx.fuenteRecurso.deleteMany({
      where: {
        codigo: { notIn: ['1.2.4.2.02', '1.2.4.2.01', 'RP'] },
      },
    });
    console.log(`  - Fuentes auxiliares eliminadas:  ${delFuentes.count}`);

    // 9. Componentes no normativos
    // Normativos son los pertenecientes a Salud Pública (área SP)
    const areaSP = await tx.area.findUnique({ where: { codigo: 'SP' } });
    if (areaSP) {
      const delCompNoSP = await tx.componente.deleteMany({
        where: {
          areaId: { not: areaSP.id },
        },
      });
      console.log(`  - Componentes fuera de SP eliminados: ${delCompNoSP.count}`);
    }

    // 10. Áreas no normativas (dejar solo las 6 normativas: SP, PLA, PRE, ASE, EMD, DES)
    const codigosNormativos = ['SP', 'PLA', 'PRE', 'ASE', 'EMD', 'DES'];
    const delAreasNoNormativas = await tx.area.deleteMany({
      where: {
        codigo: { notIn: codigosNormativos },
      },
    });
    console.log(`  - Áreas no normativas eliminadas: ${delAreasNoNormativas.count}`);

    // 11. Usuarios (eliminar todos excepto el admin)
    const delUsuarios = await tx.usuario.deleteMany({
      where: {
        id: { not: adminUser.id },
      },
    });
    console.log(`  - Usuarios eliminados:            ${delUsuarios.count}`);

    // 12. Depurar logs antiguos de auditoría
    const delAuditoria = await tx.auditoria.deleteMany({});
    console.log(`  - Registros de auditoría purgados: ${delAuditoria.count}`);
  });

  console.log('✔ Purga atómica en base de datos completada.');

  // --------------------------------------------------------------------------
  // PASO 5: Limpieza de archivos físicos de soporte
  // --------------------------------------------------------------------------
  console.log('\n[5/6] Limpiando almacenamiento físico de soportes...');
  let archivosFisicosBorrados = 0;
  if (fs.existsSync(rutaSoportes)) {
    const archivos = fs.readdirSync(rutaSoportes);
    for (const a of archivos) {
      const pFisico = path.join(rutaSoportes, a);
      if (fs.statSync(pFisico).isFile()) {
        fs.unlinkSync(pFisico);
        archivosFisicosBorrados++;
      }
    }
  }
  console.log(`✔ Archivos físicos borrados de ${rutaSoportes}: ${archivosFisicosBorrados}`);

  // --------------------------------------------------------------------------
  // PASO 6: Asegurar Catálogos Normativos y Registrar Auditoría
  // --------------------------------------------------------------------------
  console.log('\n[6/6] Verificando integridad normativa y registrando auditoría...');

  // Registrar auditoría de reinicio total
  await prisma.auditoria.create({
    data: {
      usuarioId: adminUser.id,
      accion: 'REINICIO_TOTAL_SISTEMA',
      entidad: 'sistema',
      entidadId: adminUser.id,
      motivo: 'Purga integral de metas, tareas, reportes y usuarios para carga de nuevo archivo de datos. Backup previo generado.',
      datosAntes: {
        totalMetas: conteoMetas,
        totalTareas: conteoTareas,
        totalReportes: conteoReportes,
        totalUsuarios: conteoUsuarios,
        backupPrevio: nombreZip,
      },
      datosDespues: {
        totalMetas: 0,
        totalTareas: 0,
        totalReportes: 0,
        totalUsuarios: 1,
      },
    },
  });

  // Estado final
  const [
    finalMetas,
    finalTareas,
    finalReportes,
    finalSoportes,
    finalNotificaciones,
    finalUsuarios,
    finalAreas,
    finalComponentes,
    finalUnidades,
    finalFuentes,
    finalRecursos,
    finalCategorias,
    finalAuditoria
  ] = await Promise.all([
    prisma.meta.count(),
    prisma.tarea.count(),
    prisma.reporteMensual.count(),
    prisma.soporte.count(),
    prisma.notificacion.count(),
    prisma.usuario.count(),
    prisma.area.count(),
    prisma.componente.count(),
    prisma.unidadMedida.count(),
    prisma.fuenteRecurso.count(),
    prisma.recurso.count(),
    prisma.categoriaTarea.count(),
    prisma.auditoria.count(),
  ]);

  console.log('\n===============================================================');
  console.log('  RESUMEN FINAL POST-PURGA');
  console.log('===============================================================');
  console.log(`- Metas:                    ${finalMetas}`);
  console.log(`- Tareas:                   ${finalTareas}`);
  console.log(`- Reportes Mensuales:       ${finalReportes}`);
  console.log(`- Soportes (BD):            ${finalSoportes}`);
  console.log(`- Notificaciones:           ${finalNotificaciones}`);
  console.log(`- Usuarios:                 ${finalUsuarios} (Único: ${adminUser.correo})`);
  console.log(`- Áreas normativas:         ${finalAreas} (SP, PLA, PRE, ASE, EMD, DES)`);
  console.log(`- Componentes de SP:        ${finalComponentes}`);
  console.log(`- Unidades de medida:       ${finalUnidades}`);
  console.log(`- Fuentes de recursos:      ${finalFuentes}`);
  console.log(`- Recursos logísticos:      ${finalRecursos}`);
  console.log(`- Categorías de tarea:      ${finalCategorias}`);
  console.log(`- Registros de auditoría:   ${finalAuditoria}`);
  console.log(`- Respaldo previo creado:   ${nombreZip}`);
  console.log('===============================================================');
  console.log('✔ ¡Base de datos reiniciada y lista para cargar nuevo archivo!');
}

ejecutarReinicio()
  .catch((err) => {
    console.error('ERROR durante el reinicio:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
