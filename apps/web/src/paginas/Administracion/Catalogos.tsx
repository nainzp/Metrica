import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';
import { Plus, Edit2, Power, CheckCircle2, AlertTriangle } from 'lucide-react';

export const Catalogos: React.FC = () => {
  const queryClient = useQueryClient();
  const [tipoActivo, setTipoActivo] = useState('unidades');

  const pestañas = [
    { id: 'unidades', label: 'Unidades de Medida' },
    { id: 'fuentes', label: 'Fuentes de Recursos' },
    { id: 'recursos', label: 'Recursos Logísticos' },
    { id: 'categorias', label: 'Categorías de Tareas' },
    { id: 'poblaciones', label: 'Poblaciones Sujeto' },
  ];

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [itemAEditar, setItemAEditar] = useState<any | null>(null);
  const [itemAInactivar, setItemAInactivar] = useState<any | null>(null);

  // Form crear
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaEsBinaria, setNuevaEsBinaria] = useState(false);

  // Form editar
  const [editCodigo, setEditCodigo] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editEsBinaria, setEditEsBinaria] = useState(false);
  const [editActivo, setEditActivo] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const { data: elementos, isLoading } = useQuery({
    queryKey: ['catalogo', tipoActivo],
    queryFn: async () => (await api.get(`/catalogos/${tipoActivo}?todos=true`)).data,
  });

  // Mutación crear
  const crearMutation = useMutation({
    mutationFn: async (datos: any) => {
      return (await api.post(`/catalogos/${tipoActivo}`, datos)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', tipoActivo] });
      setModalCrear(false);
      setNuevoCodigo('');
      setNuevoNombre('');
      setNuevaEsBinaria(false);
      mostrarExito('Elemento registrado exitosamente en el catálogo.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al registrar elemento.');
    },
  });

  // Mutación actualizar
  const actualizarMutation = useMutation({
    mutationFn: async (datos: { id: string; payload: any }) => {
      return (await api.patch(`/catalogos/${tipoActivo}/${datos.id}`, datos.payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', tipoActivo] });
      setItemAEditar(null);
      mostrarExito('Elemento actualizado correctamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al actualizar elemento.');
    },
  });

  // Mutación alternar activo
  const alternarActivoMutation = useMutation({
    mutationFn: async (datos: { id: string; activo: boolean }) => {
      return (await api.patch(`/catalogos/${tipoActivo}/${datos.id}`, { activo: datos.activo })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', tipoActivo] });
      setItemAInactivar(null);
      mostrarExito(`Elemento ${data.activo ? 'activado' : 'inactivado'} correctamente.`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al cambiar estado.');
    },
  });

  const abrirEditar = (item: any) => {
    setError(null);
    setItemAEditar(item);
    setEditCodigo(item.codigo || '');
    setEditNombre(item.nombre || '');
    setEditEsBinaria(Boolean(item.esBinaria));
    setEditActivo(Boolean(item.activo));
  };

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    crearMutation.mutate({
      codigo: nuevoCodigo || undefined,
      nombre: nuevoNombre,
      esBinaria: nuevaEsBinaria,
    });
  };

  const handleActualizar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    actualizarMutation.mutate({
      id: itemAEditar.id,
      payload: {
        codigo: editCodigo || undefined,
        nombre: editNombre,
        esBinaria: editEsBinaria,
        activo: editActivo,
      },
    });
  };

  const pestañaActual = pestañas.find((p) => p.id === tipoActivo);

  return (
    <div className="space-y-6">
      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catálogos del Sistema</h1>
          <p className="text-sm text-slate-500">
            Administración completa de clasificadores, unidades, fuentes y recursos logísticos.
          </p>
        </div>
        <Boton
          variante="primario"
          icono={<Plus className="w-4 h-4" />}
          onClick={() => {
            setError(null);
            setNuevoCodigo('');
            setNuevoNombre('');
            setNuevaEsBinaria(false);
            setModalCrear(true);
          }}
        >
          Nuevo Elemento
        </Boton>
      </div>

      {/* Selector de pestañas */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {pestañas.map((p) => (
          <button
            key={p.id}
            onClick={() => setTipoActivo(p.id)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              tipoActivo === p.id
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Tarjeta className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Código / Identificador</th>
                <th className="px-6 py-3.5">Nombre / Descripción</th>
                <th className="px-6 py-3.5">Detalles</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : elementos?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Sin elementos registrados en esta categoría.
                  </td>
                </tr>
              ) : (
                elementos?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-800">
                      {item.codigo || item.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.nombre}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {item.esBinaria ? 'Unidad Binaria (Documento)' : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirEditar(item)}
                          className="p-1.5 text-slate-600 hover:text-institucional-azul hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar elemento"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemAInactivar(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.activo
                              ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={item.activo ? 'Inactivar elemento' : 'Activar elemento'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      {/* Modal Crear Elemento */}
      <Modal
        abierto={modalCrear}
        alCerrar={() => setModalCrear(false)}
        titulo={`Nuevo Elemento en ${pestañaActual?.label}`}
        subtitulo="Ingrese los datos requeridos para el clasificador maestro"
      >
        {error && (
          <div className="mb-4">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}
        <form onSubmit={handleCrear} className="space-y-4">
          {(tipoActivo === 'unidades' || tipoActivo === 'fuentes') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código *</label>
              <input
                type="text"
                required
                value={nuevoCodigo}
                onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. UNID, SGP, 1.2..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre / Descripción *</label>
            <input
              type="text"
              required
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej. Auditorio Departamental, Kilogramos..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          {tipoActivo === 'unidades' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="nuevaEsBinaria"
                checked={nuevaEsBinaria}
                onChange={(e) => setNuevaEsBinaria(e.target.checked)}
                className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
              />
              <label htmlFor="nuevaEsBinaria" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Es Unidad Binaria (0 o 1, Documento / Acto Administrativo - RN-08)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setModalCrear(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={crearMutation.isPending}>
              Guardar Elemento
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Elemento */}
      <Modal
        abierto={Boolean(itemAEditar)}
        alCerrar={() => setItemAEditar(null)}
        titulo={`Editar Elemento en ${pestañaActual?.label}`}
        subtitulo={`Modificando: ${itemAEditar?.nombre}`}
      >
        {error && (
          <div className="mb-4">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}
        <form onSubmit={handleActualizar} className="space-y-4">
          {(tipoActivo === 'unidades' || tipoActivo === 'fuentes') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código *</label>
              <input
                type="text"
                required
                value={editCodigo}
                onChange={(e) => setEditCodigo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre / Descripción *</label>
            <input
              type="text"
              required
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          {tipoActivo === 'unidades' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editEsBinaria"
                checked={editEsBinaria}
                onChange={(e) => setEditEsBinaria(e.target.checked)}
                className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
              />
              <label htmlFor="editEsBinaria" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Es Unidad Binaria (RN-08)
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editActivo"
              checked={editActivo}
              onChange={(e) => setEditActivo(e.target.checked)}
              className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
            />
            <label htmlFor="editActivo" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Elemento Activo en el Sistema
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setItemAEditar(null)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={actualizarMutation.isPending}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Inactivar / Activar */}
      <Modal
        abierto={Boolean(itemAInactivar)}
        alCerrar={() => setItemAInactivar(null)}
        titulo={itemAInactivar?.activo ? 'Inactivar Elemento' : 'Activar Elemento'}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              ¿Está seguro de que desea {itemAInactivar?.activo ? 'inactivar' : 'reactivar'} el elemento{' '}
              <strong>{itemAInactivar?.nombre}</strong>?
              {itemAInactivar?.activo && (
                <span className="block text-[11px] text-amber-700 mt-1">
                  Los registros existentes conservarán este valor histórico, pero no aparecerá en nuevos formularios.
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setItemAInactivar(null)}>
              Cancelar
            </Boton>
            <Boton
              variante={itemAInactivar?.activo ? 'peligro' : 'primario'}
              cargando={alternarActivoMutation.isPending}
              onClick={() => {
                alternarActivoMutation.mutate({
                  id: itemAInactivar.id,
                  activo: !itemAInactivar.activo,
                });
              }}
            >
              {itemAInactivar?.activo ? 'Inactivar' : 'Activar'}
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
