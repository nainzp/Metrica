import { formatInTimeZone, toDate } from 'date-fns-tz';
import { parseISO, format, isValid } from 'date-fns';

export const ZONA_HORARIA = 'America/Bogota';

/**
 * Obtiene la fecha actual en la zona horaria de Bogotá como string YYYY-MM-DD
 */
export function obtenerHoyBogotaString(): string {
  return formatInTimeZone(new Date(), ZONA_HORARIA, 'yyyy-MM-dd');
}

/**
 * Obtiene la fecha actual en Bogotá como objeto Date en medianoche UTC
 */
export function obtenerHoyBogota(): Date {
  const str = obtenerHoyBogotaString();
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Retorna año y mes actual en Bogotá (1..12)
 */
export function obtenerAnioMesActualBogota(): { anio: number; mes: number } {
  const anio = parseInt(formatInTimeZone(new Date(), ZONA_HORARIA, 'yyyy'), 10);
  const mes = parseInt(formatInTimeZone(new Date(), ZONA_HORARIA, 'M'), 10);
  return { anio, mes };
}

/**
 * Formatea un objeto Date o string a YYYY-MM-DD en Bogotá
 */
export function formatearFechaBogota(fecha: Date | string): string {
  if (typeof fecha === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    fecha = new Date(fecha);
  }
  return formatInTimeZone(fecha, ZONA_HORARIA, 'yyyy-MM-dd');
}

/**
 * Retorna el último día del mes en formato Date (UTC)
 */
export function obtenerUltimoDiaMes(anio: number, mes: number): Date {
  // En JS, mes siguiente con día 0 es el último día del mes actual
  // mes va de 1 a 12
  const d = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
  return d;
}

/**
 * Convierte string YYYY-MM-DD a Date medianoche UTC para persistencia Prisma @db.Date
 */
export function parsearFechaUtc(fechaStr: string | Date): Date {
  if (fechaStr instanceof Date) return fechaStr;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaStr);
  if (!match) throw new Error(`Formato de fecha inválido: ${fechaStr}`);
  const [, a, m, d] = match;
  return new Date(Date.UTC(parseInt(a, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
}
