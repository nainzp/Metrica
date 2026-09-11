import React from 'react';
import { Outlet } from 'react-router-dom';
import { BarraLateral } from './BarraLateral';
import { Encabezado } from './Encabezado';

export const LayoutPrincipal: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <BarraLateral />
      <div className="flex-1 flex flex-col min-w-0">
        <Encabezado />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
