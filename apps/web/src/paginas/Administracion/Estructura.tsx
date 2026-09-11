import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';
import {
  Building2,
  Plus,
  Users,
  Layers,
  Edit2,
  UserCheck,
  CheckCircle2,
  XCircle,
  FolderPlus,
} from 'lucide-react';

export const Estructura: React.FC = () => {
  const queryClient = useQueryClient();

  // Modal Crear Área
  const [modalCrearArea, setModalCrearArea] = useState(false);
  const [codigoArea, setCodigoArea] = useState('');
  const [nombreArea, setNombreArea] = useState('');

  // Modal Editar Área
  const [areaAEditar, setAreaAEditar] = useState<any | null>(null);
  const [editNombreArea, setEditNombreArea] = useState('');
  const [editLiderAreaId, setEditLiderAreaId] = useState('');
  const [editActivoArea, setEditActivoArea] = useState(true);

  // Modal Ver Miembros del Equipo
  const [areaParaMiembros, setAreaParaMiembros] = useState<any | null>(null);

  // Modal Crear Componente
  const [areaParaComponente, setAreaParaComponente] = useState<any | null>(null);
  const [codigoComponente, setCodigoComponente] = useState('');
  const [nombreComponente, setNombreComponente] = useState('');
  const [liderComponenteId, setLiderComponenteId] = useState('');

  // Modal Editar Componente
  const [compAEditar, setCompAEditar] = useState<any | null>(null);
  const [editNombreComp, setEditNombreComp] = useState('');
  const [editLiderCompId, setEditLiderCompId] = useState('');
  const [editActivoComp, setEditActivoComp] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Cargar áreas
  const { data: areas, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data } = await api.get('/areas?todas=true');
      return data;
    },
  });

  // Cargar usuarios para asignación de líderes y miembros
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-para-estructura'],
    queryFn: async () => {
      const { data } = await api.get('/usuarios?todos=true');
      return data;
    },
  });

  // Mutación: Crear Área
  const crearAreaMutation = useMutation({
    mutationFn: async (datos: { codigo: string; nombre: string }) => {
      return api.post('/areas', datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setModalCrearArea(false);
      setCodigoArea('');
      setNombreArea('');
      mostrarExito('Área creada exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al crear el área.');
    },
  });

  // Mutación: Actualizar Área
  const actualizarAreaMutation = useMutation({
    mutationFn: async (datos: { id: string; nombre: string; liderId?: string | null; activo: boolean }) => {
      return api.patch(`/areas/${datos.id}`, {
        nombre: datos.nombre,
        liderId: datos.liderId || null,
        activo: datos.activo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setAreaAEditar(null);
      mostrarExito('Área actualizada exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al actualizar el área.');
    },
  });

  // Mutación: Crear Componente
  const crearCompMutation = useMutation({
    mutationFn: async (datos: { areaId: string; codigo: string; nombre: string; liderId?: string | null }) => {
      return api.post('/componentes', datos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setAreaParaComponente(null);
      setCodigoComponente('');
      setNombreComponente('');
      setLiderComponenteId('');
      mostrarExito('Componente creado exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al crear el componente.');
    },
  });

  // Mutación: Actualizar Componente
  const actualizarCompMutation = useMutation({
    mutationFn: async (datos: { id: string; nombre: string; liderId?: string | null; activo: boolean }) => {
      return api.patch(`/componentes/${datos.id}`, {
        nombre: datos.nombre,
        liderId: datos.liderId || null,
        activo: datos.activo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setCompAEditar(null);
      mostrarExito('Componente actualizado exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al actualizar el componente.');
    },
  });

  // Abrir modal editar área
  const abrirEditarArea = (area: any) => {
    setError(null);
    setAreaAEditar(area);
    setEditNombreArea(area.nombre);
    setEditLiderAreaId(area.liderId || '');
    setEditActivoArea(Boolean(area.activo));
  };

  // Abrir modal editar componente
  const abrirEditarComp = (comp: any) => {
    setError(null);
    setCompAEditar(comp);
    setEditNombreComp(comp.nombre);
    setEditLiderCompId(comp.liderId || '');
    setEditActivoComp(Boolean(comp.activo));
  };

  return (
    <div className="space-y-6">
      {/* Alerta de éxito */}
      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}
      {error && <Alerta tipo="error" mensaje={error} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Estructura Organizacional</h1>
          <p className="text-sm text-slate-500">
            Gestión completa de las áreas, asignación de líderes, miembros de equipo y componentes.
          </p>
        </div>
        <Boton
          variante="primario"
          icono={<Plus className="w-4 h-4" />}
          onClick={() => {
            setError(null);
            setModalCrearArea(true);
          }}
        >
          Nueva Área
        </Boton>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="animate-spin w-8 h-8 border-4 border-institucional-azul border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando estructura organizacional...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas?.map((area: any) => (
            <Tarjeta key={area.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
              {/* Encabezado del Área */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-institucional-hielo text-institucional-azul flex items-center justify-center font-bold text-sm">
                    {area.codigo}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">{area.nombre}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      {area.lider ? (
                        <span className="font-semibold text-slate-700">{area.lider.nombre}</span>
                      ) : (
                        <span className="italic text-slate-400">Sin líder asignado</span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    area.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {area.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* Botones de acción del Área */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => abrirEditarArea(area)}
                  className="px-2.5 py-1 text-xs font-semibold text-institucional-azul bg-blue-50/70 hover:bg-blue-100/70 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar Área
                </button>
                <button
                  type="button"
                  onClick={() => setAreaParaMiembros(area)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Users className="w-3 h-3 text-slate-500" />
                  Ver Equipo
                </button>
              </div>

              {/* Componentes Asociados */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-institucional-azul" />
                      <span>Componentes ({area.componentes?.length || 0})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setAreaParaComponente(area);
                        setCodigoComponente('');
                        setNombreComponente('');
                        setLiderComponenteId('');
                      }}
                      className="text-[11px] text-institucional-azul font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  </div>

                  {area.componentes && area.componentes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {area.componentes.map((c: any) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                        >
                          <span
                            className="font-medium truncate max-w-[130px]"
                            title={c.lider ? `${c.nombre} (Líder: ${c.lider.nombre})` : c.nombre}
                          >
                            {c.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirEditarComp(c)}
                            className="text-slate-400 hover:text-institucional-azul ml-0.5"
                            title="Editar componente"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg text-center text-[11px] text-slate-400 italic">
                      Sin componentes subordinados.
                    </div>
                  )}
                </div>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}

      {/* Modal Crear Área */}
      <Modal
        abierto={modalCrearArea}
        alCerrar={() => setModalCrearArea(false)}
        titulo="Crear Nueva Área"
        subtitulo="Agregue una nueva área a la estructura de la Secretaría"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            crearAreaMutation.mutate({ codigo: codigoArea, nombre: nombreArea });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código *</label>
            <input
              type="text"
              required
              value={codigoArea}
              onChange={(e) => setCodigoArea(e.target.value.toUpperCase())}
              placeholder="Ej. TIC"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={nombreArea}
              onChange={(e) => setNombreArea(e.target.value)}
              placeholder="Ej. Tecnologías de la Información"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setModalCrearArea(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={crearAreaMutation.isPending}>
              Guardar Área
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Área */}
      <Modal
        abierto={Boolean(areaAEditar)}
        alCerrar={() => setAreaAEditar(null)}
        titulo="Editar Área"
        subtitulo={`Modificando área ${areaAEditar?.codigo} — ${areaAEditar?.nombre}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            actualizarAreaMutation.mutate({
              id: areaAEditar.id,
              nombre: editNombreArea,
              liderId: editLiderAreaId || null,
              activo: editActivoArea,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Área *</label>
            <input
              type="text"
              required
              value={editNombreArea}
              onChange={(e) => setEditNombreArea(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Líder Responsable del Área</label>
            <select
              value={editLiderAreaId}
              onChange={(e) => setEditLiderAreaId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
            >
              <option value="">Sin líder asignado</option>
              {usuarios
                ?.filter((u: any) => u.activo)
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.cargo || u.rol}) — {u.correo}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editActivoArea"
              checked={editActivoArea}
              onChange={(e) => setEditActivoArea(e.target.checked)}
              className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
            />
            <label htmlFor="editActivoArea" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Área Activa en la Secretaría
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setAreaAEditar(null)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={actualizarAreaMutation.isPending}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Miembros del Equipo */}
      <Modal
        abierto={Boolean(areaParaMiembros)}
        alCerrar={() => setAreaParaMiembros(null)}
        titulo={`Equipo de Trabajo — ${areaParaMiembros?.nombre}`}
        subtitulo="Funcionarios y contratistas asignados a esta área"
        ancho="lg"
      >
        <div className="space-y-4">
          {(() => {
            const miembros = usuarios?.filter((u: any) => u.areaId === areaParaMiembros?.id) || [];
            if (miembros.length === 0) {
              return (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay funcionarios asignados actualmente a esta área.
                </div>
              );
            }
            return (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {miembros.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        {m.nombre}
                        {areaParaMiembros.liderId === m.id && (
                          <span className="text-[10px] bg-blue-100 text-institucional-azul font-bold px-1.5 py-0.2 rounded">
                            Líder
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px]">{m.cargo || m.rol} · {m.correo}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setAreaParaMiembros(null)}>
              Cerrar
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Modal Agregar Componente */}
      <Modal
        abierto={Boolean(areaParaComponente)}
        alCerrar={() => setAreaParaComponente(null)}
        titulo="Agregar Nuevo Componente"
        subtitulo={`Para el área: ${areaParaComponente?.nombre}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            crearCompMutation.mutate({
              areaId: areaParaComponente.id,
              codigo: codigoComponente.toUpperCase().trim(),
              nombre: nombreComponente.trim(),
              liderId: liderComponenteId || null,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código del Componente *</label>
            <input
              type="text"
              required
              value={codigoComponente}
              onChange={(e) => setCodigoComponente(e.target.value.toUpperCase())}
              placeholder="Ej. SALUD_MENTAL"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Componente *</label>
            <input
              type="text"
              required
              value={nombreComponente}
              onChange={(e) => setNombreComponente(e.target.value)}
              placeholder="Ej. Salud Mental y Convivencia"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Líder del Componente (Opcional)</label>
            <select
              value={liderComponenteId}
              onChange={(e) => setLiderComponenteId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
            >
              <option value="">Sin líder asignado</option>
              {usuarios
                ?.filter((u: any) => u.activo)
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.cargo || u.rol})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setAreaParaComponente(null)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={crearCompMutation.isPending}>
              Guardar Componente
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Componente */}
      <Modal
        abierto={Boolean(compAEditar)}
        alCerrar={() => setCompAEditar(null)}
        titulo="Editar Componente"
        subtitulo={`Modificando componente: ${compAEditar?.nombre}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            actualizarCompMutation.mutate({
              id: compAEditar.id,
              nombre: editNombreComp,
              liderId: editLiderCompId || null,
              activo: editActivoComp,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={editNombreComp}
              onChange={(e) => setEditNombreComp(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Líder del Componente</label>
            <select
              value={editLiderCompId}
              onChange={(e) => setEditLiderCompId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
            >
              <option value="">Sin líder asignado</option>
              {usuarios
                ?.filter((u: any) => u.activo)
                .map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.cargo || u.rol})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editActivoComp"
              checked={editActivoComp}
              onChange={(e) => setEditActivoComp(e.target.checked)}
              className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
            />
            <label htmlFor="editActivoComp" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Componente Activo
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setCompAEditar(null)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={actualizarCompMutation.isPending}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
