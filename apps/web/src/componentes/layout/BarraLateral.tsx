import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Calendar,
  Clock,
  Bell,
  Settings,
  ShieldCheck,
  Building2,
  Users,
  Database,
  Sliders,
  FileSpreadsheet,
  Wrench,
  LogOut,
} from 'lucide-react';
import { useSesion } from '../../estado/sesion.contexto';

export const BarraLateral: React.FC = () => {
  const { usuario, cerrarSesion, esAdmin, esSecretaria, tieneRol } = useSesion();

  const enlacesPrincipales = [
    { to: '/tablero', label: 'Tablero de Control', icono: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/metas', label: 'Plan de Metas', icono: <Target className="w-5 h-5" /> },
    { to: '/tareas', label: 'Tareas y Evidencias', icono: <CheckSquare className="w-5 h-5" /> },
    { to: '/calendario', label: 'Calendario', icono: <Calendar className="w-5 h-5" /> },
  ];

  if (esSecretaria || tieneRol('ASISTENTE_DESPACHO')) {
    enlacesPrincipales.push({
      to: '/agenda',
      label: 'Agenda Despacho',
      icono: <Clock className="w-5 h-5" />,
    });
  }

  const enlacesAdmin = [
    { to: '/admin/estructura', label: 'Áreas y Componentes', icono: <Building2 className="w-4 h-4" /> },
    { to: '/admin/usuarios', label: 'Usuarios y Roles', icono: <Users className="w-4 h-4" /> },
    { to: '/admin/catalogos', label: 'Catálogos', icono: <Database className="w-4 h-4" /> },
    { to: '/admin/importar', label: 'Importador Excel', icono: <FileSpreadsheet className="w-4 h-4" /> },
    { to: '/admin/parametros', label: 'Parámetros Globales', icono: <Sliders className="w-4 h-4" /> },
    { to: '/admin/auditoria', label: 'Bitácora de Auditoría', icono: <ShieldCheck className="w-4 h-4" /> },
    { to: '/admin/herramientas', label: 'Herramientas y Backups', icono: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-institucional-marino text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-blue-950">
      {/* Cabecera institucional */}
      <div className="px-6 py-5 border-b border-blue-900/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-institucional-azul flex items-center justify-center font-black text-xl text-white shadow-md shadow-blue-500/20">
          M
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">MÉTRICA</h1>
          <p className="text-[11px] text-institucional-azulClaro font-medium leading-none mt-0.5">
            Gobernación del Magdalena
          </p>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Seguimiento 2026
          </p>
          {enlacesPrincipales.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-institucional-azul text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icono}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {esAdmin && (
          <div className="space-y-1 pt-2 border-t border-blue-900/40">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Administración
            </p>
            {enlacesAdmin.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.icono}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Usuario y Cierre de Sesión */}
      <div className="p-3 border-t border-blue-900/60 bg-blue-950/40">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">{usuario?.nombre}</p>
            <p className="text-[10px] text-institucional-azulClaro font-medium truncate">
              {usuario?.rol} · {usuario?.areaCodigo || 'Área'}
            </p>
          </div>
          <button
            onClick={() => cerrarSesion()}
            title="Cerrar sesión"
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
