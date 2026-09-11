import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';

export const AgendaDespacho: React.FC = () => {
  const { usuario } = useSesion();

  // Pestaña activa
  const [pestana, setPestana] = useState<'pendientes' | 'confirmadas' | 'historial' | 'recursos'>('pendientes');

  // Datos
  const [tareasDespacho, setTareasDespacho] = useState<any[]>([]);
  const [recursosSemanales, setRecursosSemanales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal Declinar Presencia (RN-28)
  const [modalDeclinar, setModalDeclinar] = useState(false);
  const [tareaADeclinar, setTareaADeclinar] = useState<any | null>(null);
  const [motivoDeclinacion, setMotivoDeclinacion] = useState('');
  const [guardandoDeclinacion, setGuardandoDeclinacion] = useState(false);
  const [errorDeclinacion, setErrorDeclinacion] = useState<string | null>(null);

  // Alerta cruce confirmación
  const [alertaCruceDespacho, setAlertaCruceDespacho] = useState<string | null>(null);

  const cargarAgenda = async () => {
    setCargando(true);
    setError(null);
    try {
      if (pestana === 'recursos') {
        const res = await api.get('/agenda/recursos-semana');
        setRecursosSemanales(res.data || []);
      } else {
        const res = await api.get('/agenda/despacho');
        setTareasDespacho(res.data || []);
      }
    } catch (err: any) {
      console.error('Error cargando agenda del Despacho:', err);
      setError('No fue posible cargar la agenda del Despacho.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAgenda();
  }, [pestana]);

  // Manejar Confirmación de Presencia (CU-10, RN-28, RN-29)
  const handleConfirmarPresencia = async (tarea: any) => {
    setAlertaCruceDespacho(null);
    try {
      const res = await api.post(`/tareas/${tarea.id}/presencia`, {
        accion: 'CONFIRMAR',
      });
      setMensajeExito(`Asistencia confirmada para "${tarea.titulo}".`);
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarAgenda();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al confirmar presencia.');
    }
  };

  // Abrir modal declinar
  const abrirModalDeclinar = (tarea: any) => {
    setTareaADeclinar(tarea);
    setMotivoDeclinacion('');
    setErrorDeclinacion(null);
    setModalDeclinar(true);
  };

  // Manejar Declinación con Motivo (RN-28)
  const handleDeclinarPresencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaADeclinar) return;
    if (!motivoDeclinacion.trim() || motivoDeclinacion.trim().length < 5) {
      setErrorDeclinacion('El motivo de declinación es obligatorio (mínimo 5 caracteres) (RN-28).');
      return;
    }

    setGuardandoDeclinacion(true);
    try {
      await api.post(`/tareas/${tareaADeclinar.id}/presencia`, {
        accion: 'DECLINAR',
        motivo: motivoDeclinacion.trim(),
      });
      setModalDeclinar(false);
      setMensajeExito(`Presencia declinada para "${tareaADeclinar.titulo}".`);
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarAgenda();
    } catch (err: any) {
      setErrorDeclinacion(err.response?.data?.mensaje || 'Error al declinar presencia.');
    } finally {
      setGuardandoDeclinacion(false);
    }
  };

  const puedeGestionarPresencia =
    usuario?.rol === 'SECRETARIA' ||
    usuario?.rol === 'ASISTENTE_DESPACHO' ||
    usuario?.rol === 'ADMINISTRADOR';

  // Filtrado según pestaña
  const tareasPendientes = tareasDespacho.filter(
    (t) => t.estadoPresencia === 'PENDIENTE' || !t.estadoPresencia,
  );
  const tareasConfirmadas = tareasDespacho.filter(
    (t) => t.estadoPresencia === 'CONFIRMADA',
  );
  const tareasHistorial = tareasDespacho.filter(
    (t) => t.estadoPresencia === 'DECLINADA' || t.estado === 'FINALIZADA',
  );

  return (
    <div className="space-y-6">
      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
              Agenda del Despacho — Secretaria de Salud
            </h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
              {tareasPendientes.length} Pendientes
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Confirmación de compromisos institucionales (RN-28, RN-29) y control de recursos logísticos.
          </p>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setPestana('pendientes')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            pestana === 'pendientes'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Solicitudes Pendientes ({tareasPendientes.length})
        </button>

        <button
          type="button"
          onClick={() => setPestana('confirmadas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            pestana === 'confirmadas'
              ? 'bg-institucional-azul text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Agenda Confirmada ({tareasConfirmadas.length})
        </button>

        <button
          type="button"
          onClick={() => setPestana('historial')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            pestana === 'historial'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Historial / Declinadas ({tareasHistorial.length})
        </button>

        <button
          type="button"
          onClick={() => setPestana('recursos')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            pestana === 'recursos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Recursos Logísticos Semanales
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {cargando ? (
        <div className="p-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando compromisos del Despacho...</p>
        </div>
      ) : pestana === 'recursos' ? (
        /* Matriz de Recursos Logísticos Semanales */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Consolidado de Recursos Logísticos de la Semana
            </h3>
            <p className="text-xs text-slate-500">
              Disponibilidad y demanda de proyectores, sonido, transporte y salones por día.
            </p>
          </div>

          {recursosSemanales.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No hay requerimientos logísticos programados esta semana.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recursosSemanales.map((rec) => (
                <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-sm text-slate-900">{rec.nombre}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      {rec.tareas.length} Asignación{rec.tareas.length > 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rec.tareas.map((t: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                        <div className="font-semibold text-slate-800">{t.tareaTitulo}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Fecha: <span className="font-mono text-slate-700">{t.fecha}</span> {t.horaInicio ? `(${t.horaInicio}-${t.horaFin})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Resp: <span className="text-slate-700">{t.responsable}</span> · Cant: {t.cantidad}
                        </div>
                        {t.nota && <div className="text-[10px] text-amber-700 mt-0.5">Nota: {t.nota}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Listado de Solicitudes / Compromisos */
        <div className="space-y-3">
          {(pestana === 'pendientes'
            ? tareasPendientes
            : pestana === 'confirmadas'
            ? tareasConfirmadas
            : tareasHistorial
          ).length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {pestana === 'pendientes'
                  ? 'No hay solicitudes de presencia pendientes de confirmación.'
                  : pestana === 'confirmadas'
                  ? 'No hay compromisos confirmados en agenda actualmente.'
                  : 'No hay registros en el historial.'}
              </p>
            </div>
          ) : (
            (pestana === 'pendientes'
              ? tareasPendientes
              : pestana === 'confirmadas'
              ? tareasConfirmadas
              : tareasHistorial
            ).map((t) => (
              <div
                key={t.id}
                className={`bg-white p-4 rounded-xl border shadow-sm transition-all ${
                  t.estadoPresencia === 'PENDIENTE'
                    ? 'border-amber-300 ring-1 ring-amber-200/50'
                    : t.estadoPresencia === 'CONFIRMADA'
                    ? 'border-purple-200 bg-purple-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        Meta #{t.meta.codigo}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {t.meta.area.nombre}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.estadoPresencia === 'CONFIRMADA'
                            ? 'bg-purple-100 text-purple-800'
                            : t.estadoPresencia === 'DECLINADA'
                            ? 'bg-slate-100 text-slate-600 line-through'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {t.estadoPresencia || 'PENDIENTE'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{t.titulo}</h3>
                    {t.descripcion && <p className="text-xs text-slate-600">{t.descripcion}</p>}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {t.fechaInicio.slice(0, 10)}
                      </div>
                      {t.horaInicio && (
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {t.horaInicio} - {t.horaFin}
                        </div>
                      )}
                      {t.lugar && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {t.lugar}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Convoca: <span className="font-semibold text-slate-700">{t.responsable.nombre}</span>
                      </div>
                    </div>

                    {/* Motivo si fue declinada */}
                    {t.motivoDeclinacion && (
                      <div className="text-[11px] text-red-700 bg-red-50 p-2 rounded border border-red-200 mt-2">
                        <span className="font-bold">Motivo de declinación: </span>
                        {t.motivoDeclinacion}
                      </div>
                    )}
                  </div>

                  {/* Acciones de Presencia */}
                  {puedeGestionarPresencia && t.estadoPresencia === 'PENDIENTE' && (
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => abrirModalDeclinar(t)}
                        icono={<XCircle className="w-4 h-4 text-red-600" />}
                      >
                        Declinar
                      </Boton>
                      <Boton
                        variante="primario"
                        tamano="sm"
                        onClick={() => handleConfirmarPresencia(t)}
                        icono={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Confirmar Asistencia
                      </Boton>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Declinar Presencia (RN-28) */}
      <Modal
        abierto={modalDeclinar}
        alCerrar={() => setModalDeclinar(false)}
        titulo="Declinar Presencia de la Secretaria"
        ancho="md"
      >
        <form onSubmit={handleDeclinarPresencia} className="space-y-4">
          {errorDeclinacion && <Alerta tipo="error" mensaje={errorDeclinacion} />}

          <p className="text-xs text-slate-600">
            Debe indicar obligatoriamente el motivo formal por el cual la Secretaria no asistirá al compromiso (RN-28).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de la Declinación * (Mínimo 5 caracteres)
            </label>
            <textarea
              required
              rows={3}
              value={motivoDeclinacion}
              onChange={(e) => setMotivoDeclinacion(e.target.value)}
              placeholder="Ej: Compromiso previo en Despacho del Gobernador / Cruce de agenda..."
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={() => setModalDeclinar(false)}
            >
              Cancelar
            </Boton>
            <Boton
              type="submit"
              variante="peligro"
              tamano="sm"
              cargando={guardandoDeclinacion}
            >
              Confirmar y Declinar
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
