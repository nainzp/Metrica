import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RolUsuario, EstadoMeta, OrigenReporte } from '@prisma/client';
import { generarProgramacionUniforme } from '../comun/calculos/programacion';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface FilaPrevisualizacion {
  fila: number;
  codigo: string;
  descripcion: string;
  meta: number;
  unidad: string;
  area: string;
  componente?: string | null;
  responsable?: string | null;
  presupuesto?: number | null;
  poblacion?: string | null;
  fuente?: string | null;
  ejecucionJunio: number;
  cumplimientoCalculado: number;
  estado: 'CORRECTA' | 'ADVERTENCIA' | 'ERROR';
  mensajes: string[];
}

export interface ResultadoPrevisualizacion {
  totalFilas: number;
  filasCorrectas: number;
  filasConAdvertencia: number;
  filasConError: number;
  filas: FilaPrevisualizacion[];
}

@Injectable()
export class ImportacionService {
  private informesTemporales = new Map<string, Buffer>();

  constructor(
    private prisma: PrismaService,
    private auditoriaService: AuditoriaService,
  ) {}

  private normalizarTexto(texto: any): string {
    if (texto == null) return '';
    return String(texto)
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private normalizarPoblacion(texto: any): string {
    if (texto == null) return '';
    let t = String(texto)
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.;,]+$/, '');
    if (t.length === 0) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /**
   * CU-02: Previsualizar metas desde un buffer de archivo Excel (hoja PLAN)
   */
  async previsualizarExcel(buffer: Buffer): Promise<ResultadoPrevisualizacion> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet('PLAN');
    if (!sheet) {
      throw new BadRequestException("El archivo no contiene la hoja requerida 'PLAN'.");
    }

    // Cargar catálogos y estructuras existentes en memoria
    const [unidades, areas, componentes, usuarios] = await Promise.all([
      this.prisma.unidadMedida.findMany(),
      this.prisma.area.findMany(),
      this.prisma.componente.findMany(),
      this.prisma.usuario.findMany({ where: { activo: true } }),
    ]);

    const filas: FilaPrevisualizacion[] = [];
    let filasCorrectas = 0;
    let filasConAdvertencia = 0;
    let filasConError = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const idRaw = row.getCell(1).value;
      if (!idRaw) continue; // Fila vacía

      const codigo = String(idRaw).trim();
      const actividad = String(row.getCell(2).value || '')
        .trim()
        .replace(/\n{2,}/g, '\n');
      const metaValor = Number(row.getCell(3).value) || 0;
      const unidadTexto = String(row.getCell(4).value || '').trim();
      const fInicioRaw = row.getCell(5).value;
      const fFinRaw = row.getCell(6).value;
      const codFuente = row.getCell(7).value ? String(row.getCell(7).value).trim() : null;
      const descFuente = row.getCell(8).value ? String(row.getCell(8).value).trim() : null;
      const presupuestoRaw = row.getCell(9).value;
      const poblacionRaw = row.getCell(10).value;
      const areaTexto = String(row.getCell(11).value || '').trim();
      const componenteTexto = row.getCell(12).value ? String(row.getCell(12).value).trim() : null;
      const responsableTexto = row.getCell(13).value ? String(row.getCell(13).value).trim() : null;
      const meta2026Raw = row.getCell(15).value;
      const ejecJunio = Number(row.getCell(16).value) || 0;
      const cumpExcel = row.getCell(17).value != null ? Number(row.getCell(17).value) : null;

      const mensajes: string[] = [];
      let tieneError = false;

      // 1. Validar Actividad
      if (!actividad) {
        mensajes.push('Descripción de la actividad vacía.');
        tieneError = true;
      }

      // 2. Validar Meta
      if (metaValor <= 0) {
        mensajes.push(`Valor de meta inválido (${metaValor}). Debe ser mayor a 0.`);
        tieneError = true;
      }

      // 3. Validar Unidad
      const unidadNorm = this.normalizarTexto(unidadTexto);
      const unidad = unidades.find((u) => this.normalizarTexto(u.nombre) === unidadNorm);
      if (!unidad) {
        mensajes.push(`Unidad de medida '${unidadTexto}' no existe en el catálogo.`);
        tieneError = true;
      }

      // 4. Validar Área
      const areaNorm = this.normalizarTexto(areaTexto);
      const area = areas.find((a) => this.normalizarTexto(a.nombre) === areaNorm);
      if (!area) {
        mensajes.push(`Área '${areaTexto}' no encontrada.`);
        tieneError = true;
      }

      // 5. Validar Componente
      if (area && componenteTexto) {
        const compNorm = this.normalizarTexto(componenteTexto);
        const comp = componentes.find(
          (c) => c.areaId === area.id && this.normalizarTexto(c.nombre) === compNorm,
        );
        if (!comp) {
          mensajes.push(`Componente '${componenteTexto}' no existe en el área (se creará inactivo).`);
        }
      } else if (area && area.codigo === 'SP' && !componenteTexto) {
        mensajes.push('Meta de Salud Pública sin componente asignado.');
      }

      // 6. Validar Fechas
      let fInicio = fInicioRaw instanceof Date ? fInicioRaw : new Date(String(fInicioRaw));
      let fFin = fFinRaw instanceof Date ? fFinRaw : new Date(String(fFinRaw));

      if (isNaN(fInicio.getTime())) {
        mensajes.push('Fecha de inicio inválida.');
        tieneError = true;
      } else if (fInicio < new Date('2026-01-01')) {
        mensajes.push('Fecha de inicio anterior a 2026-01-01 (se ajustará al 01/01/2026).');
      }

      if (isNaN(fFin.getTime())) {
        mensajes.push('Fecha de fin oficial inválida.');
        tieneError = true;
      }

      // 7. Validar Presupuesto
      const presupuesto = presupuestoRaw != null ? Number(presupuestoRaw) : null;
      if (presupuesto == null || presupuesto === 0) {
        mensajes.push('Sin presupuesto asignado.');
      }

      // 8. Validar Responsable
      if (!responsableTexto) {
        mensajes.push('Sin responsable asignado (quedará PENDIENTE_COMPLETAR).');
      } else {
        const respNorm = this.normalizarTexto(responsableTexto);
        const usuarioResp = usuarios.find(
          (u) =>
            this.normalizarTexto(u.correo) === respNorm ||
            this.normalizarTexto(u.nombre) === respNorm,
        );
        if (!usuarioResp) {
          mensajes.push(`Responsable '${responsableTexto}' no encontrado o inactivo.`);
        }
      }

      // 9. Validar META 2026 vs META
      if (meta2026Raw != null && Number(meta2026Raw) !== metaValor) {
        mensajes.push(`META 2026 (${meta2026Raw}) difiere de META (${metaValor}). Se usará META.`);
      }

      // 10. Recalcular cumplimiento y comparar
      let cumpCalculado = metaValor > 0 ? (ejecJunio / metaValor) * 100 : 0;
      if (unidad?.esBinaria) {
        cumpCalculado = Math.min(100, (ejecJunio / metaValor) * 100);
      }
      cumpCalculado = Math.round(cumpCalculado * 10) / 10;

      if (cumpExcel != null) {
        const cumpExcelPct = cumpExcel <= 1 && metaValor > 1 ? cumpExcel * 100 : cumpExcel;
        if (Math.abs(cumpCalculado - cumpExcelPct) > 1) {
          mensajes.push(
            `Revisar cumplimiento: Excel reporta ${Math.round(cumpExcelPct)}%, recalculado es ${cumpCalculado}%.`,
          );
        }
      }

      if (cumpCalculado >= 100) {
        mensajes.push(`Cumplimiento alcanzado o superado (${cumpCalculado}%). Se marcará CUMPLIDA.`);
      }

      let estadoFila: 'CORRECTA' | 'ADVERTENCIA' | 'ERROR' = 'CORRECTA';
      if (tieneError) {
        estadoFila = 'ERROR';
        filasConError++;
      } else if (mensajes.length > 0) {
        estadoFila = 'ADVERTENCIA';
        filasConAdvertencia++;
      } else {
        filasCorrectas++;
      }

      filas.push({
        fila: i,
        codigo,
        descripcion: actividad,
        meta: metaValor,
        unidad: unidadTexto,
        area: areaTexto,
        componente: componenteTexto,
        responsable: responsableTexto,
        presupuesto,
        poblacion: poblacionRaw ? String(poblacionRaw).trim() : null,
        fuente: descFuente || codFuente,
        ejecucionJunio: ejecJunio,
        cumplimientoCalculado: cumpCalculado,
        estado: estadoFila,
        mensajes,
      });
    }

    return {
      totalFilas: filas.length,
      filasCorrectas,
      filasConAdvertencia,
      filasConError,
      filas,
    };
  }

  /**
   * CU-02: Confirmar importación persistiendo las metas en base de datos en transacción por fila
   */
  async confirmarImportacion(
    buffer: Buffer,
    esDatoPrueba = false,
    usuarioId?: string,
  ): Promise<{ resumen: any; idInforme: string }> {
    const previsualizacion = await this.previsualizarExcel(buffer);

    // Cargar catálogos
    const [unidades, areas, paramFechaCorte] = await Promise.all([
      this.prisma.unidadMedida.findMany(),
      this.prisma.area.findMany(),
      this.prisma.parametro.findUnique({ where: { clave: 'fecha_corte_global' } }),
    ]);

    const fechaCorteGlobal = paramFechaCorte?.valor ? new Date(paramFechaCorte.valor) : new Date('2026-11-30');

    let creadas = 0;
    let actualizadas = 0;
    let conError = 0;
    const detalleInforme: any[] = [];

    // Administrador para asignación de reportes iniciales si no hay usuario
    const adminUser = await this.prisma.usuario.findFirst({
      where: { rol: RolUsuario.ADMINISTRADOR },
    });
    const idUsuarioReporte = usuarioId || adminUser?.id;

    for (const f of previsualizacion.filas) {
      if (f.estado === 'ERROR') {
        conError++;
        detalleInforme.push({
          fila: f.fila,
          codigo: f.codigo,
          estado: 'ERROR',
          mensajes: f.mensajes.join(' | '),
        });
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Unidad
          const unidadNorm = this.normalizarTexto(f.unidad);
          const unidad = unidades.find((u) => this.normalizarTexto(u.nombre) === unidadNorm)!;

          // 2. Área
          const areaNorm = this.normalizarTexto(f.area);
          const area = areas.find((a) => this.normalizarTexto(a.nombre) === areaNorm)!;

          // 3. Componente (buscar o crear si no existe)
          let componenteId: string | null = null;
          if (f.componente) {
            const compNorm = this.normalizarTexto(f.componente);
            let comp = await tx.componente.findFirst({
              where: {
                areaId: area.id,
                nombre: { equals: f.componente, mode: 'insensitive' },
              },
            });
            if (!comp) {
              const codComp = f.componente.toUpperCase().replace(/[\s-]/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20);
              comp = await tx.componente.create({
                data: {
                  areaId: area.id,
                  codigo: codComp,
                  nombre: f.componente,
                  activo: false, // creado inactivo sin líder
                },
              });
            }
            componenteId = comp.id;
          }

          // 4. Población sujeto (buscar o crear)
          let poblacionId: string | null = null;
          if (f.poblacion) {
            const pobNorm = this.normalizarPoblacion(f.poblacion);
            if (pobNorm) {
              let pob = await tx.poblacionSujeto.findFirst({
                where: { nombre: { equals: pobNorm, mode: 'insensitive' } },
              });
              if (!pob) {
                pob = await tx.poblacionSujeto.create({ data: { nombre: pobNorm } });
              }
              poblacionId = pob.id;
            }
          }

          // 5. Fuente de recursos (buscar o crear)
          let fuenteId: string | null = null;
          if (f.fuente) {
            const fuenteNorm = this.normalizarTexto(f.fuente);
            let fuente = await tx.fuenteRecurso.findFirst({
              where: {
                OR: [
                  { nombre: { contains: fuenteNorm, mode: 'insensitive' } },
                  { codigo: { contains: fuenteNorm, mode: 'insensitive' } },
                ],
              },
            });
            if (!fuente) {
              fuente = await tx.fuenteRecurso.create({
                data: {
                  codigo: f.fuente.slice(0, 50),
                  nombre: f.fuente,
                },
              });
            }
            fuenteId = fuente.id;
          }

          // 6. Responsable
          let responsableId: string | null = null;
          if (f.responsable) {
            const respNorm = this.normalizarTexto(f.responsable);
            const userResp = await tx.usuario.findFirst({
              where: {
                OR: [
                  { correo: { equals: respNorm, mode: 'insensitive' } },
                  { nombre: { equals: respNorm, mode: 'insensitive' } },
                ],
                activo: true,
              },
            });
            if (userResp) responsableId = userResp.id;
          }

          // 7. Fechas
          const fInicio = new Date('2026-01-01'); // Ajustado si < 2026-01-01
          const fFinOficial = new Date('2027-03-31');
          // fecha_corte: por defecto fecha_corte_global, o fFinOficial si es menor
          const fCorte = fFinOficial < fechaCorteGlobal ? fFinOficial : fechaCorteGlobal;

          // 8. Estado inicial (RN-05, RN-07, HU-05)
          let estadoMeta: EstadoMeta = EstadoMeta.ABIERTA;
          if (f.cumplimientoCalculado >= 100) {
            estadoMeta = EstadoMeta.CUMPLIDA;
          } else if (!responsableId) {
            estadoMeta = EstadoMeta.PENDIENTE_COMPLETAR;
          }

          // Verificar si ya existe por código
          const existente = await tx.meta.findUnique({ where: { codigo: f.codigo } });

          let metaGuardada;
          if (existente) {
            metaGuardada = await tx.meta.update({
              where: { id: existente.id },
              data: {
                descripcion: f.descripcion,
                unidadId: unidad.id,
                valorMeta: f.meta,
                areaId: area.id,
                componenteId,
                responsableId: responsableId || existente.responsableId,
                poblacionSujetoId: poblacionId,
                fuenteRecursoId: fuenteId,
                presupuestoProgramado: f.presupuesto,
                estado: estadoMeta,
                observacionesImportacion: f.mensajes.join(' | ') || null,
                esDatoPrueba,
              },
            });
            actualizadas++;
          } else {
            metaGuardada = await tx.meta.create({
              data: {
                codigo: f.codigo,
                descripcion: f.descripcion,
                unidadId: unidad.id,
                valorMeta: f.meta,
                fechaInicio: fInicio,
                fechaFinOficial: fFinOficial,
                fechaCorte: fCorte,
                areaId: area.id,
                componenteId,
                responsableId,
                poblacionSujetoId: poblacionId,
                fuenteRecursoId: fuenteId,
                presupuestoProgramado: f.presupuesto,
                estado: estadoMeta,
                distribucionUniforme: true,
                observacionesImportacion: f.mensajes.join(' | ') || null,
                esDatoPrueba,
              },
            });
            creadas++;
          }

          // 9. Generar programación uniforme mensual (RN-18 y RN-19)
          const progUniforme = generarProgramacionUniforme(
            f.meta,
            fInicio,
            fCorte,
            2026,
            unidad.esBinaria,
          );

          for (const p of progUniforme) {
            await tx.programacionMeta.upsert({
              where: {
                metaId_anio_mes: {
                  metaId: metaGuardada.id,
                  anio: p.anio,
                  mes: p.mes,
                },
              },
              update: { valorProgramado: p.valorProgramado },
              create: {
                metaId: metaGuardada.id,
                anio: p.anio,
                mes: p.mes,
                valorProgramado: p.valorProgramado,
              },
            });
          }

          // 10. Si EJEC ENE-JUN > 0, crear reporte histórico de corte a junio (mes 6)
          if (f.ejecucionJunio > 0 && idUsuarioReporte) {
            let pctBinario: number | null = null;
            if (unidad.esBinaria) {
              pctBinario = Math.min(100, Math.round((f.ejecucionJunio / f.meta) * 100));
            }

            await tx.reporteMensual.upsert({
              where: {
                metaId_anio_mes: {
                  metaId: metaGuardada.id,
                  anio: 2026,
                  mes: 6,
                },
              },
              update: {
                valorEjecutado: f.ejecucionJunio,
                porcentajeBinario: pctBinario,
                observacion: 'Carga inicial desde Excel: acumulado enero–junio (actualizado)',
              },
              create: {
                metaId: metaGuardada.id,
                anio: 2026,
                mes: 6,
                valorEjecutado: f.ejecucionJunio,
                costoEjecutado: 0,
                porcentajeBinario: pctBinario,
                observacion: 'Carga inicial desde Excel: acumulado enero–junio',
                origen: OrigenReporte.CARGA_INICIAL,
                reportadoPor: idUsuarioReporte,
                esDatoPrueba,
              },
            });
          }
        });

        detalleInforme.push({
          fila: f.fila,
          codigo: f.codigo,
          estado: 'EXITO',
          mensajes: f.mensajes.join(' | ') || 'Cargada correctamente',
        });
      } catch (err: any) {
        conError++;
        detalleInforme.push({
          fila: f.fila,
          codigo: f.codigo,
          estado: 'ERROR',
          mensajes: `Error en BD: ${err.message}`,
        });
      }
    }

    // Auditoría
    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'IMPORTAR',
      entidad: 'meta',
      motivo: `Importación masiva: ${creadas} creadas, ${actualizadas} actualizadas, ${conError} con error.`,
      datosDespues: { creadas, actualizadas, conError, total: previsualizacion.totalFilas },
    });

    // Generar libro de informe descargable en ExcelJS
    const idInforme = `informe_${Date.now()}`;
    const informeBuffer = await this.generarExcelInforme(previsualizacion, creadas, actualizadas, conError, detalleInforme);
    this.informesTemporales.set(idInforme, informeBuffer);

    return {
      resumen: {
        total: previsualizacion.totalFilas,
        creadas,
        actualizadas,
        conError,
      },
      idInforme,
    };
  }

  /**
   * Genera el libro Excel de informe descargable con hojas Resumen y Detalle
   */
  private async generarExcelInforme(
    previs: ResultadoPrevisualizacion,
    creadas: number,
    actualizadas: number,
    conError: number,
    detalle: any[],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();

    // Hoja 1: Resumen
    const wsResumen = wb.addWorksheet('Resumen');
    wsResumen.addRow(['INFORME DE IMPORTACIÓN — MÉTRICA']);
    wsResumen.addRow(['Fecha y hora', new Date().toISOString()]);
    wsResumen.addRow([]);
    wsResumen.addRow(['Métrica', 'Cantidad']);
    wsResumen.addRow(['Total de filas procesadas', previs.totalFilas]);
    wsResumen.addRow(['Metas creadas nuevas', creadas]);
    wsResumen.addRow(['Metas actualizadas', actualizadas]);
    wsResumen.addRow(['Filas con error no cargadas', conError]);
    wsResumen.addRow(['Filas con advertencias', previs.filasConAdvertencia]);

    // Hoja 2: Detalle
    const wsDetalle = wb.addWorksheet('Detalle');
    wsDetalle.addRow(['Fila', 'Código Meta', 'Resultado', 'Observaciones y Advertencias']);
    for (const d of detalle) {
      wsDetalle.addRow([d.fila, d.codigo, d.estado, d.mensajes]);
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  obtenerInformeDescarga(idInforme: string): Buffer | undefined {
    return this.informesTemporales.get(idInforme);
  }

  /**
   * Carga directa del archivo local datos/Metas_Plan_Salud.xlsx
   */
  async cargarArchivoLocal(esDatoPrueba = false, usuarioId?: string) {
    const posiblesRutas = [
      path.resolve(process.cwd(), 'datos', 'Metas_Plan_Salud.xlsx'),
      path.resolve(process.cwd(), '..', '..', 'datos', 'Metas_Plan_Salud.xlsx'),
      path.resolve(process.cwd(), '..', 'datos', 'Metas_Plan_Salud.xlsx'),
      'c:/Desarrollos/Metrica/datos/Metas_Plan_Salud.xlsx',
    ];
    const rutaArchivo = posiblesRutas.find((r) => fs.existsSync(r));
    if (!rutaArchivo) {
      throw new BadRequestException(`No se encontró el archivo en ninguna de las rutas evaluadas.`);
    }
    const buffer = fs.readFileSync(rutaArchivo);
    return this.confirmarImportacion(buffer, esDatoPrueba, usuarioId);
  }
}
