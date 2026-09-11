import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar as CalendarIcon, User, Check, ExternalLink, Key } from 'lucide-react';
import { useSesion } from '../../estado/sesion.contexto';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/cliente';
import { CambiarClaveModal } from './CambiarClaveModal';

interface EncabezadoProps {
  titulo?: string;
  subtitulo?: string;
}

export const Encabezado: React.FC<EncabezadoProps> = ({ titulo, subtitulo }) => {
  const { usuario } = useSesion();
  const navigate = useNavigate();

  const [noLeidas, setNoLeidas] = useState(0);
  const [mostrarMenuNotif, setMostrarMenuNotif] = useState(false);
  const [notificacionesRecientes, setNotificacionesRecientes] = useState<any[]>([]);
  const [cargandoNotif, setCargandoNotif] = useState(false);
  const [mostrarModalClave, setMostrarModalClave] = useState(false);
  const refMenu = useRef<HTMLDivElement>(null);

  const cargarConteo = async () => {
    if (!usuario) return;
    try {
      const res = await api.get('/notificaciones/no-leidas/conteo');
      setNoLeidas(res.data.noLeidas || 0);
    } catch (err) {
      // Silencioso
    }
  };

  const cargarRecientes = async () => {
    setCargandoNotif(true);
    try {
      const res = await api.get('/notificaciones', { params: { tamano: 5 } });
      setNotificacionesRecientes(res.data.datos || []);
    } catch (err) {
      // Silencioso
    } finally {
      setCargandoNotif(false);
    }
  };

  useEffect(() => {
    cargarConteo();
    const interval = setInterval(cargarConteo, 60000); // Actualiza cada minuto
    return () => clearInterval(interval);
  }, [usuario]);

  // Clic fuera del menú para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (refMenu.current && !refMenu.current.contains(event.target as Node)) {
        setMostrarMenuNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => {
    if (!mostrarMenuNotif) {
      cargarRecientes();
    }
    setMostrarMenuNotif(!mostrarMenuNotif);
  };

  const handleMarcarLeida = async (id: string, enlace?: string) => {
    try {
      await api.patch(`/notificaciones/${id}/leida`);
      setNoLeidas((n) => Math.max(0, n - 1));
      setNotificacionesRecientes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
      if (enlace) {
        setMostrarMenuNotif(false);
        navigate(enlace);
      }
    } catch (err) {
      // Silencioso
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await api.patch('/notificaciones/marcar-todas-leidas');
      setNoLeidas(0);
      setNotificacionesRecientes((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      // Silencioso
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        {titulo && <h2 className="text-lg font-bold text-slate-900 leading-tight">{titulo}</h2>}
        {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Indicador de Fecha de Corte */}
        <div className="hidden md:flex items-center gap-2 bg-institucional-hielo text-institucional-marino px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium">
          <CalendarIcon className="w-3.5 h-3.5 text-institucional-azul" />
          <span>Corte de seguimiento: <strong>30/11/2026</strong></span>
        </div>

        {/* Campana de Notificaciones con Dropdown */}
        <div className="relative" ref={refMenu}>
          <button
            onClick={toggleMenu}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-semaforo-rojo text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {noLeidas > 99 ? '99+' : noLeidas}
              </span>
            )}
          </button>

          {/* Menú Desplegable */}
          {mostrarMenuNotif && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Notificaciones
                  </h3>
                  {noLeidas > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
                      {noLeidas} nuevas
                    </span>
                  )}
                </div>
                {noLeidas > 0 && (
                  <button
                    onClick={handleMarcarTodasLeidas}
                    className="text-[11px] text-institucional-azul hover:underline font-medium"
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {cargandoNotif ? (
                  <div className="py-6 text-center text-xs text-slate-400">Cargando avisos...</div>
                ) : notificacionesRecientes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No tienes notificaciones pendientes.
                  </div>
                ) : (
                  notificacionesRecientes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarcarLeida(n.id, n.enlace)}
                      className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors flex gap-2.5 ${
                        !n.leida ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.tipo?.esAlerta ? (
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full mt-1 ${!n.leida ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {n.titulo}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                          {n.mensaje}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          {new Date(n.creadaEn).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 px-4 border-t border-slate-100 text-center">
                <Link
                  to="/notificaciones"
                  onClick={() => setMostrarMenuNotif(false)}
                  className="text-xs text-institucional-azul font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Ver todas las notificaciones <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Perfil y Cambio de Contraseña (Punto 6) */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-institucional-hielo text-institucional-azul flex items-center justify-center font-bold text-xs border border-blue-200">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">{usuario?.nombre}</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">{usuario?.cargo || usuario?.rol}</p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalClave(true)}
            className="p-1.5 text-slate-400 hover:text-institucional-azul hover:bg-slate-100 rounded-lg transition-colors ml-1"
            title="Cambiar mi contraseña"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Cambio de Contraseña Propio */}
      <CambiarClaveModal
        abierto={mostrarModalClave}
        alCerrar={() => setMostrarModalClave(false)}
      />
    </header>
  );
};
