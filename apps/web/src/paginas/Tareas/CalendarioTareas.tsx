import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Layers,
  FileText,
  Download,
  Eye,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const CalendarioTareas: React.FC = () => {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [tareas, setTareas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<any | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);

  const anio = fechaActual.getFullYear();
  const mes = fechaActual.getMonth(); // 0 a 11

  // Cargar tareas del mes
  useEffect(() => {
    const cargarTareasMes = async () => {
      setCargando(true);
      try {
        const primerDia = new Date(anio, mes, 1).toISOString().slice(0, 10);
        const ultimoDia = new Date(anio, mes + 1, 0).toISOString().slice(0, 10);

        const res = await api.get('/tareas', {
          params: {
            desde: primerDia,
            hasta: ultimoDia,
            tamano: 200,
          },
        });
        setTareas(res.data.datos || []);
      } catch (err) {
        console.error('Error cargando tareas del calendario:', err);
      } finally {
        setCargando(false);
      }
    };
    cargarTareasMes();
  }, [anio, mes]);

  // Navegación de fechas
  const mesAnterior = () => {
    setFechaActual(new Date(anio, mes - 1, 1));
  };
  const mesSiguiente = () => {
    setFechaActual(new Date(anio, mes + 1, 1));
  };
  const irHoy = () => {
    setFechaActual(new Date());
  };

  // Cálculo de la cuadrícula mensual
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = [];
  // Rellenar días del mes anterior
  for (let i = 0; i < primerDiaSemana; i++) {
    celdas.push({ dia: null, fechaStr: '' });
  }
  // Rellenar días del mes actual
  for (let d = 1; d <= diasEnMes; d++) {
    const mesFormateado = String(mes + 1).padStart(2, '0');
    const diaFormateado = String(d).padStart(2, '0');
    const fechaStr = `${anio}-${mesFormateado}-${diaFormateado}`;
    celdas.push({ dia: d, fechaStr });
  }

  const hoyStr = new Date().toISOString().slice(0, 10);

  // Mapear color por estado (RN-30)
  const getClaseEstado = (estado: string, requiereSec: boolean, estadoPresencia?: string) => {
    let base = 'border-l-3 rounded-md px-2 py-1 transition-all ';
    if (requiereSec) {
      if (estadoPresencia === 'CONFIRMADA') {
        base += 'ring-1 ring-purple-400/50 bg-purple-50/90 text-purple-900 border-l-purple-600 hover:bg-purple-100 ';
      } else if (estadoPresencia === 'DECLINADA') {
        base += 'bg-slate-100 text-slate-500 line-through border-l-slate-400 ';
      } else {
        base += 'ring-1 ring-amber-400/60 bg-amber-50/90 text-amber-900 border-l-amber-500 hover:bg-amber-100 ';
      }
      return base;
    }

    switch (estado) {
      case 'FINALIZADA':
        return base + 'bg-emerald-50/90 text-emerald-900 border-l-emerald-600 hover:bg-emerald-100';
      case 'EN_CURSO':
        return base + 'bg-blue-50/90 text-blue-900 border-l-blue-600 hover:bg-blue-100';
      case 'VENCIDA':
        return base + 'bg-red-50/90 text-red-900 border-l-red-600 hover:bg-red-100';
      case 'CANCELADA':
        return base + 'bg-slate-100 text-slate-500 line-through border-l-slate-400';
      default:
        return base + 'bg-slate-50 text-slate-800 border-l-slate-400 hover:bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-institucional-azul rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            Calendario de Actividades — {NOMBRES_MESES[mes]} {anio}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Código de colores institucional por estado y distintivo de presencia de la Secretaria (RN-30).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Boton variante="secundario" tamano="sm" onClick={mesAnterior} icono={<ChevronLeft className="w-4 h-4" />}>
            Anterior
          </Boton>
          <Boton variante="secundario" tamano="sm" onClick={irHoy}>
            Hoy
          </Boton>
          <Boton variante="secundario" tamano="sm" onClick={mesSiguiente} icono={<ChevronRight className="w-4 h-4" />}>
            Siguiente
          </Boton>
        </div>
      </div>

      {/* Leyenda de Colores (RN-30) */}
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 shadow-2xs">
        <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">Leyenda:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-2xs" />
          <span>En Curso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
          <span>Programada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span>Vencida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          <span>Finalizada (con soporte)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500 inline-block" />
          <span className="font-semibold text-amber-800">Presencia Secretaria (RN-28)</span>
        </div>
      </div>

      {/* Grilla Mensual con bordes redondeados y separación entre días (Observación 9) */}
      <div className="bg-slate-100/60 p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-2 sm:gap-2.5 mb-2.5 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2 rounded-lg bg-white/80 border border-slate-200/60 text-[11px]">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas del mes */}
        {cargando ? (
          <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-slate-200">
            <div className="animate-spin w-8 h-8 border-4 border-institucional-azul border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium">Cargando eventos del mes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {celdas.map((celda, idx) => {
              if (!celda.dia) {
                return (
                  <div
                    key={idx}
                    className="bg-slate-200/30 rounded-xl border border-dashed border-slate-200/60 min-h-[125px] p-2 opacity-60"
                  />
                );
              }

              const esHoy = celda.fechaStr === hoyStr;
              // Tareas que ocurren o están activas en este día
              const tareasDelDia = tareas.filter(
                (t) => celda.fechaStr >= t.fechaInicio.slice(0, 10) && celda.fechaStr <= t.fechaFin.slice(0, 10),
              );

              return (
                <div
                  key={idx}
                  className={`min-h-[125px] p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                    esHoy
                      ? 'bg-gradient-to-b from-blue-50/90 to-white border-institucional-azul/40 ring-2 ring-institucional-azul/20 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          esHoy
                            ? 'bg-institucional-azul text-white shadow-2xs'
                            : 'text-slate-700 bg-slate-100'
                        }`}
                      >
                        {celda.dia}
                      </span>
                      {tareasDelDia.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 bg-slate-100 rounded-md">
                          {tareasDelDia.length}
                        </span>
                      )}
                    </div>

                    {/* Listado de Tareas en la Celda */}
                    <div className="space-y-1.5 mt-1">
                      {tareasDelDia.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => { setTareaSeleccionada(t); setModalDetalle(true); }}
                          className={`text-[10px] font-medium cursor-pointer truncate shadow-2xs ${getClaseEstado(
                            t.estado,
                            t.requiereSecretaria,
                            t.estadoPresencia,
                          )}`}
                          title={`${t.titulo} - Meta #${t.meta?.codigo || ''}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {t.requiereSecretaria && (
                              <Star className="w-2.5 h-2.5 fill-current text-amber-600 flex-shrink-0" />
                            )}
                            {t.horaInicio && (
                              <span className="font-mono text-[9px] opacity-75">{t.horaInicio}</span>
                            )}
                            <span className="truncate">{t.titulo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {tareasDelDia.length > 3 && (
                    <div
                      onClick={() => { setTareaSeleccionada(tareasDelDia[3]); setModalDetalle(true); }}
                      className="text-[10px] text-institucional-azul hover:underline font-semibold cursor-pointer pt-1"
                    >
                      +{tareasDelDia.length - 3} más...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detalle de Tarea desde Calendario */}
      <Modal
        abierto={modalDetalle}
        alCerrar={() => setModalDetalle(false)}
        titulo="Detalle de la Actividad"
        ancho="xl"
      >
        {tareaSeleccionada && (
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Meta #{tareaSeleccionada.meta?.codigo} — {tareaSeleccionada.meta?.area?.nombre}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {tareaSeleccionada.titulo}
              </h3>
              {tareaSeleccionada.descripcion && (
                <p className="text-slate-600 mt-1">{tareaSeleccionada.descripcion}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Responsable</span>
                <div className="font-semibold text-slate-800">{tareaSeleccionada.responsable?.nombre}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Estado Temporal</span>
                <div className="font-bold text-slate-800">{tareaSeleccionada.estado}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Fechas</span>
                <div className="font-semibold text-slate-800">
                  {tareaSeleccionada.fechaInicio?.slice(0, 10)}
                  {tareaSeleccionada.fechaFin !== tareaSeleccionada.fechaInicio &&
                    ` al ${tareaSeleccionada.fechaFin?.slice(0, 10)}`}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Horario</span>
                <div className="font-semibold text-slate-800">
                  {tareaSeleccionada.horaInicio
                    ? `${tareaSeleccionada.horaInicio} - ${tareaSeleccionada.horaFin}`
                    : 'Todo el día'}
                </div>
              </div>
              {tareaSeleccionada.lugar && (
                <div className="col-span-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Lugar</span>
                  <div className="font-semibold text-slate-800">{tareaSeleccionada.lugar}</div>
                </div>
              )}
              {tareaSeleccionada.requiereSecretaria && (
                <div className="col-span-2 p-2 bg-amber-50 rounded border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">
                    Presencia Secretaria de Salud: {tareaSeleccionada.estadoPresencia || 'PENDIENTE'}
                  </span>
                  {tareaSeleccionada.motivoDeclinacion && (
                    <span className="text-[11px] text-amber-700 mt-0.5 block">
                      Motivo: {tareaSeleccionada.motivoDeclinacion}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Boton
                type="button"
                variante="secundario"
                tamano="sm"
                onClick={() => setModalDetalle(false)}
              >
                Cerrar
              </Boton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
