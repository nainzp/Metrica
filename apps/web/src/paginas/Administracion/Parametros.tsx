import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { Boton } from '../../componentes/ui/Boton';
import { Alerta } from '../../componentes/ui/Alerta';
import { Mail, Check, Sliders } from 'lucide-react';

export const Parametros: React.FC = () => {
  const queryClient = useQueryClient();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const { data: parametros, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: async () => (await api.get('/parametros')).data,
  });

  const actualizarMutation = useMutation({
    mutationFn: async ({ clave, valor }: { clave: string; valor: string }) => {
      return (await api.patch(`/parametros/${clave}`, { valor })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
      setMensajeExito(`Parámetro '${data.clave}' actualizado correctamente.`);
      setTimeout(() => setMensajeExito(null), 3000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al actualizar el parámetro');
    },
  });

  const pruebaCorreoMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/parametros/correo-prueba', {})).data;
    },
    onSuccess: (data) => {
      alert(data.mensaje);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Parámetros Globales</h1>
          <p className="text-sm text-slate-500">
            Reglas de negocio, umbrales de alerta y configuración institucional del sistema.
          </p>
        </div>
        <Boton
          variante="secundario"
          icono={<Mail className="w-4 h-4 text-institucional-azul" />}
          onClick={() => pruebaCorreoMutation.mutate()}
          cargando={pruebaCorreoMutation.isPending}
        >
          Probar Envío de Correo
        </Boton>
      </div>

      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}

      <Tarjeta className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Cargando parámetros...</div>
          ) : (
            parametros?.map((p: any) => (
              <div key={p.clave} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{p.clave}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {p.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{p.descripcion}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={p.valor}
                    disabled={!p.editable}
                    onBlur={(e) => {
                      if (e.target.value !== p.valor) {
                        actualizarMutation.mutate({ clave: p.clave, valor: e.target.value });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-medium focus:ring-2 focus:ring-institucional-azul outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  {p.editable && (
                    <span title="Guarda al salir del campo" className="text-slate-300">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Tarjeta>
    </div>
  );
};
