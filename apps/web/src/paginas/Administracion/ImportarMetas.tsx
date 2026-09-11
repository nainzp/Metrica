import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Server,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { Boton } from '../../componentes/ui/Boton';
import { Alerta } from '../../componentes/ui/Alerta';

interface ResumenImportacion {
  total: number;
  creadas: number;
  actualizadas: number;
  conError: number;
}

export const ImportarMetas: React.FC = () => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState<'seleccion' | 'vista_previa' | 'resultado'>('seleccion');

  // Datos de previsualización
  const [vistaPrevia, setVistaPrevia] = useState<any>(null);

  // Resultado tras confirmación
  const [resultado, setResultado] = useState<{
    idBitacora?: string;
    resumen: ResumenImportacion;
    filasConAdvertencia: number;
    filasConError: number;
    detalles: any[];
  } | null>(null);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.xlsx')) {
        setError('El archivo debe ser de formato Excel (.xlsx)');
        return;
      }
      setArchivo(file);
      setError(null);
    }
  };

  // Previsualizar archivo cargado por el usuario
  const handlePrevisualizar = async () => {
    if (!archivo) return;
    setProcesando(true);
    setError(null);

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const res = await api.post('/importacion/metas/previsualizar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVistaPrevia(res.data);
      setPaso('vista_previa');
    } catch (err: any) {
      console.error('Error al previsualizar:', err);
      setError(err.response?.data?.mensaje || 'Error al procesar el archivo Excel para previsualización.');
    } finally {
      setProcesando(false);
    }
  };

  // Carga rápida del archivo local en el servidor (`datos/Metas_Plan_Salud.xlsx`)
  const handleCargaLocal = async () => {
    setProcesando(true);
    setError(null);
    try {
      const res = await api.post('/importacion/cargar-archivo-local');
      setResultado(res.data);
      setPaso('resultado');
    } catch (err: any) {
      console.error('Error cargando archivo local:', err);
      setError(err.response?.data?.mensaje || 'Error al procesar el archivo local del servidor.');
    } finally {
      setProcesando(false);
    }
  };

  // Confirmar importación tras previsualización
  const handleConfirmar = async () => {
    if (!archivo) return;
    setProcesando(true);
    setError(null);

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const res = await api.post('/importacion/metas/confirmar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(res.data);
      setPaso('resultado');
    } catch (err: any) {
      console.error('Error confirmando importación:', err);
      setError(err.response?.data?.mensaje || 'Error al guardar las metas en la base de datos.');
    } finally {
      setProcesando(false);
    }
  };

  // Descargar informe Excel de auditoría
  const handleDescargarInforme = async (idBitacora?: string) => {
    if (!idBitacora) return;
    try {
      const res = await api.get(`/importacion/${idBitacora}/informe.xlsx`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_importacion_${idBitacora.slice(0, 8)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('No fue posible descargar el archivo de informe.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Importador de Metas — Plan de Acción en Salud
        </h1>
        <p className="text-sm text-slate-500">
          Carga inicial y masiva de las 276 metas oficiales desde archivo Excel (.xlsx, hoja PLAN) con validaciones normativas y generación de programación uniforme.
        </p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}

      {/* Paso 1: Selección de Archivo o Carga Directa */}
      {paso === 'seleccion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opción A: Cargar Archivo Local del Servidor */}
            <div className="bg-white p-6 rounded-2xl border-2 border-institucional-azul/20 shadow-sm flex flex-col justify-between space-y-4 hover:border-institucional-azul/50 transition-colors">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-institucional-azul">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Carga Oficial Inmediata (Archivo del Servidor)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Procesa directamente el archivo canónico alojado en <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">datos/Metas_Plan_Salud.xlsx</code>.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    276 Metas del Plan 2026
                  </div>
                  <div>• Crea o actualiza las metas en PostgreSQL</div>
                  <div>• Genera 3,312 registros de programación uniforme</div>
                  <div>• Registra 89 reportes históricos del primer semestre</div>
                </div>
              </div>

              <Boton
                variante="primario"
                cargando={procesando}
                icono={<Server className="w-4 h-4" />}
                onClick={handleCargaLocal}
              >
                Cargar Archivo Canónico Local
              </Boton>
            </div>

            {/* Opción B: Subir Archivo Manualmente */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Subir Archivo Excel Personalizado
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Carga un archivo .xlsx actualizado con la estructura de columnas requerida (hoja PLAN).
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx"
                    id="archivo-excel"
                    className="hidden"
                    onChange={handleSeleccionarArchivo}
                  />
                  <label htmlFor="archivo-excel" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-institucional-azul hover:underline">
                      {archivo ? archivo.name : 'Seleccionar archivo .xlsx'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {archivo ? `${(archivo.size / 1024).toFixed(1)} KB` : 'Arrastra o haz clic para examinar'}
                    </p>
                  </label>
                </div>
              </div>

              <Boton
                variante="secundario"
                cargando={procesando}
                disabled={!archivo}
                icono={<FileCheck className="w-4 h-4" />}
                onClick={handlePrevisualizar}
              >
                Previsualizar Archivo
              </Boton>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Vista Previa y Validaciones */}
      {paso === 'vista_previa' && vistaPrevia && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen de Validación */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Filas Leídas
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {vistaPrevia.resumen?.total || 0}
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <div className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
                Válidas para Importar
              </div>
              <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
                {(vistaPrevia.resumen?.total || 0) - (vistaPrevia.filasConError || 0)}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
              <div className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">
                Con Advertencias
              </div>
              <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
                {vistaPrevia.filasConAdvertencia || 0}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Pendiente responsable u observaciones</div>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
              <div className="text-[11px] font-medium text-red-800 uppercase tracking-wider">
                Con Errores Críticos
              </div>
              <div className="text-2xl font-bold text-red-900 mt-1 font-mono">
                {vistaPrevia.filasConError || 0}
              </div>
            </div>
          </div>

          {/* Tabla de Previsualización */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Muestra de Metas Analizadas (Primeras 20 filas)
                </h3>
                <p className="text-xs text-slate-500">
                  Revisa los datos mapeados antes de confirmar la inserción definitiva.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => { setPaso('seleccion'); setArchivo(null); }}
                >
                  Cambiar Archivo
                </Boton>
                <Boton
                  variante="primario"
                  tamano="sm"
                  cargando={procesando}
                  onClick={handleConfirmar}
                >
                  Confirmar e Importar en Base de Datos
                </Boton>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase">
                    <th className="py-2.5 px-3">Fila</th>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3">Área</th>
                    <th className="py-2.5 px-3">Componente</th>
                    <th className="py-2.5 px-3 text-right">Meta</th>
                    <th className="py-2.5 px-3 text-right">Ejec. Jun</th>
                    <th className="py-2.5 px-3">Advertencias / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(vistaPrevia.filas || []).slice(0, 20).map((f: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-400">{f.fila}</td>
                      <td className="py-2 px-3 font-mono font-bold text-institucional-azul">{f.codigo}</td>
                      <td className="py-2 px-3 max-w-xs truncate" title={f.descripcion}>{f.descripcion}</td>
                      <td className="py-2 px-3 font-medium">{f.areaCodigo}</td>
                      <td className="py-2 px-3 text-slate-500">{f.componenteNombre || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{f.valorMeta}</td>
                      <td className="py-2 px-3 text-right font-mono">{f.ejecutadoHistorico || '0'}</td>
                      <td className="py-2 px-3">
                        {f.advertencias && f.advertencias.length > 0 ? (
                          <span className="text-[10px] text-amber-700 font-medium">
                            {f.advertencias.join(', ')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Válida
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Resultado de Importación */}
      {paso === 'resultado' && resultado && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ¡Carga Masiva Completada con Éxito!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Las metas del Plan de Acción en Salud han sido procesadas e indexadas en el sistema.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Metas Procesadas</div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {resultado.resumen?.total || 0}
              </div>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-[11px] text-emerald-800 font-medium">Creadas / Actualizadas</div>
              <div className="text-xl font-bold text-emerald-900 mt-1 font-mono">
                {(resultado.resumen?.creadas || 0) + (resultado.resumen?.actualizadas || 0)}
              </div>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-[11px] text-amber-800 font-medium">Con Advertencias</div>
              <div className="text-xl font-bold text-amber-900 mt-1 font-mono">
                {resultado.filasConAdvertencia || 0}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {resultado.idBitacora && (
              <Boton
                variante="secundario"
                icono={<Download className="w-4 h-4 text-emerald-600" />}
                onClick={() => handleDescargarInforme(resultado.idBitacora)}
              >
                Descargar Informe Excel (.xlsx)
              </Boton>
            )}
            <Link to="/metas">
              <Boton
                variante="primario"
                icono={<ArrowRight className="w-4 h-4" />}
              >
                Ver Listado de Metas
              </Boton>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
