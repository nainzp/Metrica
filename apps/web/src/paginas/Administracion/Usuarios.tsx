import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';
import {
  UserPlus,
  Key,
  Shield,
  Search,
  Edit2,
  Power,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const Usuarios: React.FC = () => {
  const queryClient = useQueryClient();

  // Estados de modales
  const [modalCrear, setModalCrear] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<any | null>(null);
  const [usuarioAInactivar, setUsuarioAInactivar] = useState<any | null>(null);
  const [modalClave, setModalClave] = useState<{ nombre: string; clave: string } | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  // Formulario nuevo usuario
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('FUNCIONARIO');
  const [areaId, setAreaId] = useState('');
  const [componenteId, setComponenteId] = useState('');
  const [cargo, setCargo] = useState('');
  const [fechaFinContrato, setFechaFinContrato] = useState('');

  // Formulario editar usuario
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('FUNCIONARIO');
  const [editAreaId, setEditAreaId] = useState('');
  const [editComponenteId, setEditComponenteId] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editFechaFinContrato, setEditFechaFinContrato] = useState('');

  // Cargar áreas
  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => (await api.get('/areas')).data,
  });

  // Cargar componentes del área del modal crear
  const { data: componentesCrear } = useQuery({
    queryKey: ['componentes', areaId],
    queryFn: async () => (await api.get(`/componentes?areaId=${areaId}`)).data,
    enabled: !!areaId,
  });

  // Cargar componentes del área del modal editar
  const { data: componentesEditar } = useQuery({
    queryKey: ['componentes', editAreaId],
    queryFn: async () => (await api.get(`/componentes?areaId=${editAreaId}`)).data,
    enabled: !!editAreaId,
  });

  // Cargar usuarios
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', busqueda],
    queryFn: async () => {
      const { data } = await api.get(`/usuarios?todos=true&busqueda=${busqueda}`);
      return data;
    },
  });

  // Mutación crear
  const crearMutation = useMutation({
    mutationFn: async (datos: any) => {
      return (await api.post('/usuarios', datos)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalCrear(false);
      setModalClave({
        nombre: data.usuario.nombre,
        clave: data.claveGenerada,
      });
      setNombre('');
      setCorreo('');
      setCargo('');
      setFechaFinContrato('');
      setError(null);
      mostrarExito('Usuario creado exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al crear usuario.');
    },
  });

  // Mutación actualizar
  const actualizarMutation = useMutation({
    mutationFn: async (datos: { id: string; payload: any }) => {
      return (await api.patch(`/usuarios/${datos.id}`, datos.payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setUsuarioAEditar(null);
      setError(null);
      mostrarExito('Usuario actualizado exitosamente.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.mensaje || 'Error al actualizar usuario.');
    },
  });

  // Mutación alternar activo (Inactivar / Activar con RN-26)
  const alternarActivoMutation = useMutation({
    mutationFn: async (datos: { id: string; activo: boolean }) => {
      return (await api.patch(`/usuarios/${datos.id}`, { activo: datos.activo })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setUsuarioAInactivar(null);
      mostrarExito(`Usuario ${data.activo ? 'activado' : 'inactivado'} correctamente.`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.mensaje || 'No fue posible cambiar el estado del usuario.';
      const detalles = err.response?.data?.detalles;
      let detalleTxt = '';
      if (detalles) {
        if (detalles.metas?.length) detalleTxt += ` Metas a cargo: ${detalles.metas.join(', ')}.`;
        if (detalles.tareas?.length) detalleTxt += ` Tareas activas: ${detalles.tareas.join(', ')}.`;
      }
      alert(msg + (detalleTxt ? '\n\n' + detalleTxt : ''));
    },
  });

  // Mutación resetear clave
  const resetearMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/usuarios/${id}/restablecer-clave`)).data;
    },
    onSuccess: (data, id) => {
      const user = usuarios?.find((u: any) => u.id === id);
      setModalClave({
        nombre: user ? user.nombre : 'Usuario',
        clave: data.claveTemporal,
      });
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al restablecer contraseña');
    },
  });

  // Abrir modal editar
  const abrirEditar = (u: any) => {
    setError(null);
    setUsuarioAEditar(u);
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setEditAreaId(u.areaId);
    setEditComponenteId(u.componenteId || '');
    setEditCargo(u.cargo || '');
    setEditFechaFinContrato(u.fechaFinContrato ? u.fechaFinContrato.slice(0, 10) : '');
  };

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rol === 'CONTRATISTA' && !fechaFinContrato) {
      setError('Para el rol de CONTRATISTA la fecha de finalización de contrato es obligatoria.');
      return;
    }

    crearMutation.mutate({
      nombre,
      correo,
      rol,
      areaId,
      componenteId: componenteId || null,
      cargo,
      fechaFinContrato: rol === 'CONTRATISTA' ? fechaFinContrato : null,
    });
  };

  const handleActualizar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editRol === 'CONTRATISTA' && !editFechaFinContrato) {
      setError('Para el rol de CONTRATISTA la fecha de finalización de contrato es obligatoria.');
      return;
    }

    actualizarMutation.mutate({
      id: usuarioAEditar.id,
      payload: {
        nombre: editNombre,
        rol: editRol,
        areaId: editAreaId,
        componenteId: editComponenteId || null,
        cargo: editCargo,
        fechaFinContrato: editRol === 'CONTRATISTA' ? editFechaFinContrato : null,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Usuarios y Permisos</h1>
          <p className="text-sm text-slate-500">
            Administración integral de cuentas, roles, contratistas y control de acceso seguro.
          </p>
        </div>
        <Boton
          variante="primario"
          icono={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            setError(null);
            setModalCrear(true);
          }}
        >
          Nuevo Usuario
        </Boton>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo o cargo..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
        />
      </div>

      {/* Tabla de usuarios */}
      <Tarjeta className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Funcionario / Contratista</th>
                <th className="px-6 py-3.5">Rol Institucional</th>
                <th className="px-6 py-3.5">Área / Componente</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Cargando directorio de usuarios...
                  </td>
                </tr>
              ) : usuarios?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                usuarios?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{u.nombre}</div>
                      <div className="text-xs text-slate-500">{u.correo}</div>
                      {u.cargo && <div className="text-[11px] text-slate-400 mt-0.5">{u.cargo}</div>}
                      {u.rol === 'CONTRATISTA' && u.fechaFinContrato && (
                        <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1 border border-amber-200">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          Contrato vence: {u.fechaFinContrato.slice(0, 10)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.rol === 'CONTRATISTA'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-blue-50 text-institucional-azul border border-blue-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-800">{u.area?.nombre}</div>
                      {u.componente && (
                        <div className="text-[11px] text-slate-500">Comp: {u.componente?.nombre}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          u.activo
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirEditar(u)}
                          className="p-1.5 text-slate-600 hover:text-institucional-azul hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar información de usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsuarioAInactivar(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.activo
                              ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={u.activo ? 'Inactivar usuario (RN-26)' : 'Reactivar usuario'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => resetearMutation.mutate(u.id)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Restablecer contraseña"
                        >
                          <Key className="w-4 h-4" />
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

      {/* Modal Crear Usuario */}
      <Modal
        abierto={modalCrear}
        alCerrar={() => setModalCrear(false)}
        titulo="Registrar Nuevo Usuario"
        subtitulo="La contraseña inicial será generada automáticamente y mostrada en pantalla"
      >
        {error && (
          <div className="mb-4">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}
        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Carlos Valderrama"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Institucional *</label>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="cvalderrama@magdalena.gov.co"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol *</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                <option value="FUNCIONARIO">FUNCIONARIO</option>
                <option value="CONTRATISTA">CONTRATISTA</option>
                <option value="LIDER_COMPONENTE">LIDER_COMPONENTE</option>
                <option value="LIDER_AREA">LIDER_AREA</option>
                <option value="ASISTENTE_DESPACHO">ASISTENTE_DESPACHO</option>
                <option value="SECRETARIA">SECRETARIA</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej. Epidemiólogo / Profesional"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
              />
            </div>
          </div>

          {/* Campo obligatorio si es CONTRATISTA */}
          {rol === 'CONTRATISTA' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              <label className="block text-xs font-bold text-amber-900 uppercase">
                Fecha de Finalización del Contrato * (Obligatoria)
              </label>
              <input
                type="date"
                required
                value={fechaFinContrato}
                onChange={(e) => setFechaFinContrato(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-[11px] text-amber-700 mt-0.5">
                ℹ️ El sistema notificará al líder de área una semana antes y lo inactivará automáticamente al vencer.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Área *</label>
              <select
                required
                value={areaId}
                onChange={(e) => {
                  setAreaId(e.target.value);
                  setComponenteId('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                <option value="">Seleccione área...</option>
                {areas?.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Componente</label>
              <select
                value={componenteId}
                onChange={(e) => setComponenteId(e.target.value)}
                disabled={!areaId}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                <option value="">Ninguno / Toda el área</option>
                {componentesCrear?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setModalCrear(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={crearMutation.isPending}>
              Guardar Usuario
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal
        abierto={Boolean(usuarioAEditar)}
        alCerrar={() => setUsuarioAEditar(null)}
        titulo="Editar Usuario"
        subtitulo={`Modificando usuario: ${usuarioAEditar?.correo}`}
      >
        {error && (
          <div className="mb-4">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}
        <form onSubmit={handleActualizar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol *</label>
              <select
                value={editRol}
                onChange={(e) => setEditRol(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                <option value="FUNCIONARIO">FUNCIONARIO</option>
                <option value="CONTRATISTA">CONTRATISTA</option>
                <option value="LIDER_COMPONENTE">LIDER_COMPONENTE</option>
                <option value="LIDER_AREA">LIDER_AREA</option>
                <option value="ASISTENTE_DESPACHO">ASISTENTE_DESPACHO</option>
                <option value="SECRETARIA">SECRETARIA</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo</label>
              <input
                type="text"
                value={editCargo}
                onChange={(e) => setEditCargo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
              />
            </div>
          </div>

          {/* Campo obligatorio si es CONTRATISTA */}
          {editRol === 'CONTRATISTA' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              <label className="block text-xs font-bold text-amber-900 uppercase">
                Fecha de Finalización del Contrato * (Obligatoria)
              </label>
              <input
                type="date"
                required
                value={editFechaFinContrato}
                onChange={(e) => setEditFechaFinContrato(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Área *</label>
              <select
                required
                value={editAreaId}
                onChange={(e) => {
                  setEditAreaId(e.target.value);
                  setEditComponenteId('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                {areas?.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Componente</label>
              <select
                value={editComponenteId}
                onChange={(e) => setEditComponenteId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-institucional-azul outline-none"
              >
                <option value="">Ninguno / Toda el área</option>
                {componentesEditar?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" type="button" onClick={() => setUsuarioAEditar(null)}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={actualizarMutation.isPending}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Inactivación / Activación (RN-26) */}
      <Modal
        abierto={Boolean(usuarioAInactivar)}
        alCerrar={() => setUsuarioAInactivar(null)}
        titulo={usuarioAInactivar?.activo ? 'Inactivar Usuario' : 'Activar Usuario'}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              {usuarioAInactivar?.activo ? (
                <>
                  ¿Está seguro de que desea inactivar a <strong>{usuarioAInactivar?.nombre}</strong>?
                  <br />
                  <span className="text-[11px] text-amber-700 block mt-1">
                    (Regla RN-26): Si el usuario tiene metas o tareas pendientes asignadas, la acción será rechazada hasta que dichas actividades sean reasignadas.
                  </span>
                </>
              ) : (
                <>¿Desea reactivar la cuenta de <strong>{usuarioAInactivar?.nombre}</strong>?</>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setUsuarioAInactivar(null)}>
              Cancelar
            </Boton>
            <Boton
              variante={usuarioAInactivar?.activo ? 'peligro' : 'primario'}
              cargando={alternarActivoMutation.isPending}
              onClick={() => {
                alternarActivoMutation.mutate({
                  id: usuarioAInactivar.id,
                  activo: !usuarioAInactivar.activo,
                });
              }}
            >
              {usuarioAInactivar?.activo ? 'Inactivar' : 'Activar'}
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Modal Mostrar Clave Generada */}
      <Modal
        abierto={Boolean(modalClave)}
        alCerrar={() => setModalClave(null)}
        titulo="Contraseña del Usuario"
        subtitulo="Copie y entregue esta contraseña al funcionario"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
            <div className="text-xs font-semibold text-emerald-800">
              Usuario: {modalClave?.nombre}
            </div>
            <div className="text-lg font-mono font-bold text-emerald-950 bg-white py-2 px-3 rounded-lg border border-emerald-300 select-all">
              {modalClave?.clave}
            </div>
            <p className="text-[11px] text-emerald-700">
              Esta clave solo se muestra en este momento. El usuario podrá cambiarla al ingresar.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Boton variante="primario" onClick={() => setModalClave(null)}>
              Entendido
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
