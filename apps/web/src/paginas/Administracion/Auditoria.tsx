import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { ShieldCheck } from 'lucide-react';

export const Auditoria: React.FC = () => {
  const [pagina, setPagina] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', pagina],
    queryFn: async () => {
      const res = await api.get(`/auditoria?pagina=${pagina}&tamano=25`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bitácora de Auditoría Inmutable</h1>
        <p className="text-sm text-slate-500">
          Registro inmutable de toda creación, modificación y evento relevante en el sistema (RN-34).
        </p>
      </div>

      <Tarjeta className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Fecha / Hora</th>
                <th className="px-6 py-3.5">Acción</th>
                <th className="px-6 py-3.5">Entidad</th>
                <th className="px-6 py-3.5">Usuario</th>
                <th className="px-6 py-3.5">Motivo / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : data?.datos?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Sin eventos registrados.
                  </td>
                </tr>
              ) : (
                data?.datos?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {new Date(item.fecha).toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs font-bold text-institucional-azul bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.accion}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 capitalize">
                      {item.entidad}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      {item.usuario ? (
                        <div>
                          <div className="font-semibold text-slate-900">{item.usuario.nombre}</div>
                          <div className="text-slate-400">{item.usuario.correo}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sistema / Anónimo</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {item.motivo && <div className="font-medium text-slate-700">{item.motivo}</div>}
                      {item.ip && <div className="text-[11px] font-mono text-slate-400">IP: {item.ip}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
};
