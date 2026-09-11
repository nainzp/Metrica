import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { Boton } from '../../componentes/ui/Boton';
import { Alerta } from '../../componentes/ui/Alerta';

export const Notificaciones: React.FC = () => {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tamano] = useState(15);

  const cargarNotificaciones = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await api.get('/notificaciones', {
        params: {
          soloNoLeidas,
          pagina,
          tamano,
        },
      });
      setNotificaciones(res.data.datos || []);
      setTotal(res.data.total || 0);
      setNoLeidas(res.data.noLeidas || 0);
    } catch (err) {
      setError('No fue posible cargar las notificaciones.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, [soloNoLeidas, pagina]);

  const handleMarcarLeida = async (id: string, enlace?: string) => {
    try {
      await api.patch(`/notificaciones/${id}/leida`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
      setNoLeidas((c) => Math.max(0, c - 1));
      if (enlace) {
        navigate(enlace);
      }
    } catch (err) {
      // Silencioso
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (err) {
      alert('Error al marcar notificaciones.');
    }
  };

  const notificacionesFiltradas = filtroAlerta
    ? notificaciones.filter((n) => n.tipo?.esAlerta)
    : notificaciones;

  const totalPaginas = Math.ceil(total / tamano) || 1;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Centro de Notificaciones
            </h1>
            {noLeidas > 0 && (
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full">
                {noLeidas} no leídas
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Recordatorios de reportes mensuales, alertas presupuestales, cumplimientos y cambios de estado.
          </p>
        </div>

        {noLeidas > 0 && (
          <Boton
            variante="secundario"
            tamano="sm"
            icono={<Check className="w-4 h-4 text-emerald-600" />}
            onClick={handleMarcarTodas}
          >
            Marcar todas como leídas
          </Boton>
        )}
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSoloNoLeidas(false); setFiltroAlerta(false); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              !soloNoLeidas && !filtroAlerta
                ? 'bg-institucional-azul text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({total})
          </button>
          <button
            onClick={() => { setSoloNoLeidas(true); setFiltroAlerta(false); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              soloNoLeidas && !filtroAlerta
                ? 'bg-institucional-azul text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solo No Leídas ({noLeidas})
          </button>
          <button
            onClick={() => { setFiltroAlerta(!filtroAlerta); }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filtroAlerta
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Solo Alertas Críticas
          </button>
        </div>

        <span className="text-slate-400">
          Página {pagina} de {totalPaginas}
        </span>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {cargando ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-institucional-azul border-t-transparent rounded-full mx-auto mb-2" />
            Cargando notificaciones...
          </div>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-700">No hay notificaciones</h3>
            <p className="text-xs text-slate-500 mt-1">
              Estás al día con todos tus avisos y alertas del sistema.
            </p>
          </div>
        ) : (
          notificacionesFiltradas.map((n) => {
            const esAlerta = n.tipo?.esAlerta;

            return (
              <div
                key={n.id}
                onClick={() => handleMarcarLeida(n.id, n.enlace)}
                className={`p-4 transition-colors hover:bg-slate-50/80 cursor-pointer flex items-start gap-4 ${
                  !n.leida ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Icono de Tipo */}
                <div className="shrink-0 mt-0.5">
                  {esAlerta ? (
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  ) : n.tipoCodigo === 'META_CUMPLIDA' ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-institucional-azul flex items-center justify-center">
                      <Bell className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold ${!n.leida ? 'text-slate-900 font-bold' : 'text-slate-800'}`}>
                        {n.titulo}
                      </h4>
                      {!n.leida && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(n.creadaEn).toLocaleDateString()} · {new Date(n.creadaEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.mensaje}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {n.tipoCodigo}
                    </span>
                    {n.enlace && (
                      <span className="text-xs text-institucional-azul font-medium flex items-center gap-1 hover:underline">
                        Abrir registro <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Paginación */}
        {total > tamano && (
          <div className="p-4 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
            <div>
              Mostrando <span className="font-bold">{(pagina - 1) * tamano + 1}</span> a{' '}
              <span className="font-bold">{Math.min(pagina * tamano, total)}</span> de{' '}
              <span className="font-bold">{total}</span>
            </div>
            <div className="flex gap-2">
              <Boton
                variante="secundario"
                tamano="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                icono={<ChevronLeft className="w-4 h-4" />}
              >
                Anterior
              </Boton>
              <Boton
                variante="secundario"
                tamano="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                icono={<ChevronRight className="w-4 h-4" />}
              >
                Siguiente
              </Boton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
