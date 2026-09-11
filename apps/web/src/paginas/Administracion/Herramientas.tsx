import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Download,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Archive,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Lock,
  FileCheck,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';

export const Herramientas: React.FC = () => {
  const queryClient = useQueryClient();

  // Estados locales
  const [modalPurga, setModalPurga] = useState(false);
  const [palabraConfirmacion, setPalabraConfirmacion] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorPurga, setErrorPurga] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // 1. Conteo de Datos de Prueba (CU-16)
  const {
    data: conteo,
    isLoading: cargandoConteo,
    refetch: refetchConteo,
  } = useQuery({
    queryKey: ['datos-prueba-conteo'],
    queryFn: async () => {
      const { data } = await api.get('/herramientas/datos-prueba/conteo');
      return data;
    },
  });

  // 2. Listado de Copias de Seguridad (CU-17)
  const {
    data: backups = [],
    isLoading: cargandoBackups,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ['herramientas-backups'],
    queryFn: async () => {
      const { data } = await api.get('/herramientas/backups');
      return Array.isArray(data) ? data : [];
    },
  });

  // Mutación: Generar Backup
  const mutacionBackup = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/herramientas/backups/generar');
      return data;
    },
    onSuccess: (data) => {
      setMensajeExito(`Copia de seguridad "${data.nombre}" generada exitosamente.`);
      queryClient.invalidateQueries({ queryKey: ['herramientas-backups'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al generar copia de seguridad.');
    },
  });

  // Mutación: Descargar Backup
  const handleDescargarBackup = async (nombre: string) => {
    try {
      const response = await api.get(`/herramientas/backups/${encodeURIComponent(nombre)}/descargar`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombre);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar la copia de seguridad.');
    }
  };

  // Mutación: Eliminar Backup
  const mutacionEliminarBackup = useMutation({
    mutationFn: async (nombre: string) => {
      await api.delete(`/herramientas/backups/${encodeURIComponent(nombre)}`);
    },
    onSuccess: () => {
      setMensajeExito('Copia de seguridad eliminada del almacenamiento.');
      queryClient.invalidateQueries({ queryKey: ['herramientas-backups'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al eliminar copia de seguridad.');
    },
  });

  // Mutación: Inyectar Datos de Demostración
  const mutacionInyectar = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/herramientas/datos-prueba/inyectar');
      return data;
    },
    onSuccess: (data) => {
      setMensajeExito(`${data.mensaje} (Meta ${data.meta.codigo}).`);
      queryClient.invalidateQueries({ queryKey: ['datos-prueba-conteo'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.mensaje || 'Error al inyectar datos de prueba.');
    },
  });

  // Mutación: Purgar Datos de Prueba
  const mutacionPurgar = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/herramientas/datos-prueba/borrar', {
        palabraConfirmacion,
        contrasena,
      });
      return data;
    },
    onSuccess: (data) => {
      setMensajeExito(
        `Purga completada. Se generó el backup previo "${data.backupPrevio}". Registros eliminados: ${JSON.stringify(data.resumen)}`,
      );
      setModalPurga(false);
      setPalabraConfirmacion('');
      setContrasena('');
      setErrorPurga(null);
      queryClient.invalidateQueries({ queryKey: ['datos-prueba-conteo'] });
      queryClient.invalidateQueries({ queryKey: ['herramientas-backups'] });
    },
    onError: (err: any) => {
      setErrorPurga(err.response?.data?.mensaje || 'Error al ejecutar la purga.');
    },
  });

  const handleEjecutarPurga = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPurga(null);
    mutacionPurgar.mutate();
  };

  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Herramientas de Administración y Copias de Seguridad
          </h1>
          <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-full">
            CU-16 · CU-17
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestión de respaldos globales, purga de datos de prueba e inyección para validación del sistema.
        </p>
      </div>

      {mensajeExito && (
        <Alerta
          tipo="exito"
          mensaje={mensajeExito}
        />
      )}

      {/* SECCIÓN 1: COPIAS DE SEGURIDAD (CU-17) */}
      <Tarjeta className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-institucional-azul rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Copias de Seguridad del Sistema (Backups)
              </h2>
              <p className="text-xs text-slate-500">
                Paquete comprimido .zip que incluye la base de datos PostgreSQL completa, archivos de soporte y manifiesto de integridad.
              </p>
            </div>
          </div>

          <Boton
            variante="primario"
            tamano="sm"
            icono={<RefreshCw className="w-4 h-4" />}
            cargando={mutacionBackup.isPending}
            onClick={() => mutacionBackup.mutate()}
          >
            Generar Copia de Seguridad Ahora
          </Boton>
        </div>

        {/* Tabla de Backups */}
        <div className="overflow-x-auto">
          {cargandoBackups ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando historial de copias de seguridad...
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No hay copias de seguridad generadas en el servidor.
              </p>
              <p className="text-[11px] text-slate-400">
                Haga clic en el botón superior para crear el primer respaldo completo.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Archivo de Respaldo</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Tamaño</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b: any) => (
                  <tr key={b.nombre} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {b.nombre}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(b.creadoEn).toLocaleString('es-CO')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {formatearTamano(b.tamanoBytes)}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDescargarBackup(b.nombre)}
                        className="inline-flex items-center gap-1 text-institucional-azul hover:text-blue-800 font-semibold text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Está seguro de eliminar la copia ${b.nombre}?`)) {
                            mutacionEliminarBackup.mutate(b.nombre);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold text-xs ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Tarjeta>

      {/* SECCIÓN 2: PURGA SEGURA DE DATOS DE PRUEBA (CU-16) */}
      <Tarjeta className="p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Purga Segura de Datos de Prueba (CU-16)
            </h2>
            <p className="text-xs text-slate-500">
              Elimina de forma controlada los registros de prueba generados durante homologaciones y capacitaciones, dejando el sistema limpio para producción.
            </p>
          </div>
        </div>

        {/* Tarjetas de Conteo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Metas Prueba</span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {conteo?.metas ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Reportes Prueba</span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {conteo?.reportes ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tareas Prueba</span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {conteo?.tareas ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Usuarios Prueba</span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {conteo?.usuarios ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Soportes Prueba</span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {conteo?.soportes ?? 0}
            </span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Total a Purgar</span>
            <span className="text-xl font-black text-rose-800 block mt-0.5">
              {conteo?.total ?? 0}
            </span>
          </div>
        </div>

        {/* Garantías de Seguridad */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Mecanismo de Doble Protección y Respaldo Obligatorio</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-1">
            <li>Antes de ejecutar la eliminación se genera un <strong>backup completo automático</strong> de forma obligatoria.</li>
            <li>Únicamente se eliminan registros con la marca técnica <code>es_dato_prueba = true</code>. Las 276 metas oficiales y sus reportes reales están 100% blindados.</li>
            <li>La bitácora de auditoría forense <strong>nunca se borra</strong> y conservará el registro inmutable de la purga.</li>
            <li>Se requiere ingresar la palabra clave <strong>BORRAR</strong> y la contraseña de su cuenta de Administrador.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Boton
            variante="secundario"
            tamano="sm"
            icono={<PlusCircle className="w-4 h-4 text-slate-600" />}
            cargando={mutacionInyectar.isPending}
            onClick={() => mutacionInyectar.mutate()}
          >
            Inyectar Registro de Demostración
          </Boton>

          <Boton
            variante="peligro"
            tamano="sm"
            icono={<Trash2 className="w-4 h-4" />}
            disabled={!conteo || conteo.total === 0}
            onClick={() => {
              setPalabraConfirmacion('');
              setContrasena('');
              setErrorPurga(null);
              setModalPurga(true);
            }}
          >
            Iniciar Purga de Datos de Prueba ({conteo?.total ?? 0})
          </Boton>
        </div>
      </Tarjeta>

      {/* MODAL DE CONFIRMACIÓN DE PURGA */}
      <Modal
        abierto={modalPurga}
        alCerrar={() => setModalPurga(false)}
        titulo="Confirmación de Purga de Datos de Prueba (CU-16)"
      >
        <form onSubmit={handleEjecutarPurga} className="space-y-4">
          {errorPurga && <Alerta tipo="error" mensaje={errorPurga} />}

          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 text-rose-900">
            <span className="font-bold block">Acción Crítica e Irreversible:</span>
            <p className="text-[11px] leading-relaxed">
              Se eliminarán <strong>{conteo?.total || 0} registros de prueba</strong> y sus archivos adjuntos. Se creará automáticamente un archivo de respaldo previo en <code>datos/backups/</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Escriba la palabra <span className="text-rose-600 font-mono font-bold">BORRAR</span> en mayúsculas *
            </label>
            <input
              type="text"
              required
              placeholder="BORRAR"
              value={palabraConfirmacion}
              onChange={(e) => setPalabraConfirmacion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Confirme con su Contraseña de Administrador *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalPurga(false)}>
              Cancelar
            </Boton>
            <Boton
              tipo="submit"
              variante="peligro"
              cargando={mutacionPurgar.isPending}
              disabled={palabraConfirmacion !== 'BORRAR' || contrasena.trim().length === 0}
            >
              Confirmar y Ejecutar Purga
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
