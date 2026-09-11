import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSesion } from './estado/sesion.contexto';
import { IniciarSesion } from './paginas/Acceso/IniciarSesion';
import { LayoutPrincipal } from './componentes/layout/LayoutPrincipal';
import { TableroPrincipal } from './paginas/Tablero/TableroPrincipal';
import { ListaMetas } from './paginas/Metas/ListaMetas';
import { FichaMeta } from './paginas/Metas/FichaMeta';
import { ListaTareas } from './paginas/Tareas/ListaTareas';
import { CalendarioTareas } from './paginas/Tareas/CalendarioTareas';
import { AgendaDespacho } from './paginas/Agenda/AgendaDespacho';
import { Notificaciones } from './paginas/Notificaciones/Notificaciones';
import { Estructura } from './paginas/Administracion/Estructura';
import { Usuarios } from './paginas/Administracion/Usuarios';
import { Catalogos } from './paginas/Administracion/Catalogos';
import { Parametros } from './paginas/Administracion/Parametros';
import { ImportarMetas } from './paginas/Administracion/ImportarMetas';
import { Auditoria } from './paginas/Administracion/Auditoria';
import { Herramientas } from './paginas/Administracion/Herramientas';

const RutaProtegida: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Cargando MÉTRICA...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  return <>{children}</>;
};

export const AppRutas: React.FC = () => {
  return (
    <Routes>
      <Route path="/acceso" element={<IniciarSesion />} />

      <Route
        path="/"
        element={
          <RutaProtegida>
            <LayoutPrincipal />
          </RutaProtegida>
        }
      >
        <Route index element={<Navigate to="/tablero" replace />} />
        <Route path="tablero" element={<TableroPrincipal />} />
        <Route path="metas" element={<ListaMetas />} />
        <Route path="metas/:id" element={<FichaMeta />} />
        <Route path="tareas" element={<ListaTareas />} />
        <Route path="calendario" element={<CalendarioTareas />} />
        <Route path="agenda" element={<AgendaDespacho />} />
        <Route path="notificaciones" element={<Notificaciones />} />

        {/* Rutas de administración */}
        <Route path="admin/estructura" element={<Estructura />} />
        <Route path="admin/usuarios" element={<Usuarios />} />
        <Route path="admin/catalogos" element={<Catalogos />} />
        <Route path="admin/parametros" element={<Parametros />} />
        <Route path="admin/importar" element={<ImportarMetas />} />
        <Route path="admin/auditoria" element={<Auditoria />} />
        <Route path="admin/herramientas" element={<Herramientas />} />
      </Route>

      <Route path="*" element={<Navigate to="/tablero" replace />} />
    </Routes>
  );
};
