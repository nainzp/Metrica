import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  Download,
  User,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { SemaforoBadge } from '../../componentes/ui/SemaforoBadge';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';

interface MetaItem {
  id: string;
  codigo: string;
  descripcion: string;
  valorMeta: number;
  estado: 'PENDIENTE_COMPLETAR' | 'ABIERTA' | 'CUMPLIDA' | 'CERRADA_SIN_CUMPLIR';
  area: { id: string; codigo: string; nombre: string };
  componente?: { id: string; codigo: string; nombre: string } | null;
  responsable?: { id: string; nombre: string; correo: string; cargo?: string } | null;
  unidad: { id: string; codigo: string; nombre: string; esBinaria: boolean };
  valorEjecutadoAcum: number;
  costoEjecutadoAcum: number;
  avanceIndicador: number;
  avanceIndicadorReal?: number;
  avancePlaneado: number;
  avanceOperativo?: number | null;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';
  brecha: number;
  ultimoMesReportado?: { anio: number; mes: number } | number | null;
  tieneObservacionPendiente?: boolean;
}

export const ListaMetas: React.FC = () => {
  const { usuario } = useSesion();
  const navigate = useNavigate();

  // Estados de datos
  const [metas, setMetas] = useState<MetaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogos para filtros
  const [areas, setAreas] = useState<{ id: string; codigo: string; nombre: string }[]>([]);
  const [componentes, setComponentes] = useState<{ id: string; areaId: string; codigo: string; nombre: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; codigo: string; nombre: string }[]>([]);

  // Filtros
  const [vistaRapida, setVistaRapida] = useState<'todas' | 'mis_metas' | 'pendientes_reporte'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [componenteSeleccionado, setComponenteSeleccionado] = useState('');
  const [semaforoFiltro, setSemaforoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamano] = useState(25);

  // Modal Crear Meta
  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);
  const [nuevaMeta, setNuevaMeta] = useState({
    codigo: '',
    descripcion: '',
    areaId: '',
    componenteId: '',
    unidadId: '',
    valorMeta: '',
    fechaInicio: '2026-01-01',
    fechaFinOficial: '2026-12-31',
    fechaCorte: '2026-11-30',
    presupuestoProgramado: '',
  });

  // Cargar catálogos iniciales
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [areasRes, compRes, unidRes] = await Promise.allSettled([
          api.get('/areas'),
          api.get('/componentes'),
          api.get('/catalogos/unidades'),
        ]);

        if (areasRes.status === 'fulfilled') {
          setAreas(areasRes.value.data || []);
        } else {
          console.error('Error cargando áreas:', areasRes.reason);
        }

        if (compRes.status === 'fulfilled') {
          setComponentes(compRes.value.data || []);
        } else {
          console.error('Error cargando componentes:', compRes.reason);
        }

        if (unidRes.status === 'fulfilled') {
          setUnidades(unidRes.value.data || []);
        } else {
          console.error('Error cargando unidades:', unidRes.reason);
        }
      } catch (err: any) {
        console.error('Error cargando catálogos:', err);
      }
    };
    cargarCatalogos();
  }, []);

  // Cargar listado de metas con filtros
  const cargarMetas = async () => {
    setCargando(true);
    setError(null);
    try {
      const params: any = {
        pagina,
        tamano,
      };
      if (busqueda.trim()) params.busqueda = busqueda.trim();
      if (areaSeleccionada) params.areaId = areaSeleccionada;
      if (componenteSeleccionado) params.componenteId = componenteSeleccionado;
      if (semaforoFiltro) params.semaforo = semaforoFiltro;
      if (estadoFiltro) params.estado = estadoFiltro;

      if (vistaRapida === 'mis_metas' && usuario?.id) {
        params.responsableId = usuario.id;
      }
      if (vistaRapida === 'pendientes_reporte') {
        params.sinReporte = 'true';
        if (usuario?.rol === 'FUNCIONARIO' && usuario?.id) {
          params.responsableId = usuario.id;
        }
      }

      const res = await api.get('/metas', { params });
      setMetas(res.data.datos || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Error al consultar metas:', err);
      setError('No fue posible cargar las metas del Plan de Acción.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMetas();
  }, [pagina, areaSeleccionada, componenteSeleccionado, semaforoFiltro, estadoFiltro, vistaRapida]);

  // Debounce para búsqueda por texto
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(1);
      cargarMetas();
    }, 350);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Filtrar componentes según el área elegida
  const componentesFiltrados = useMemo(() => {
    if (!areaSeleccionada) return componentes;
    return componentes.filter((c) => c.areaId === areaSeleccionada);
  }, [areaSeleccionada, componentes]);

  // Manejar creación de meta
  const handleCrearMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCreacion(null);
    if (!nuevaMeta.codigo || !nuevaMeta.descripcion || !nuevaMeta.areaId || !nuevaMeta.unidadId || !nuevaMeta.valorMeta) {
      setErrorCreacion('Por favor completa todos los campos obligatorios.');
      return;
    }

    setCreando(true);
    try {
      const payload: any = {
        codigo: nuevaMeta.codigo.trim(),
        descripcion: nuevaMeta.descripcion.trim(),
        areaId: nuevaMeta.areaId,
        unidadId: nuevaMeta.unidadId,
        valorMeta: Number(nuevaMeta.valorMeta),
        fechaInicio: nuevaMeta.fechaInicio,
        fechaFinOficial: nuevaMeta.fechaFinOficial,
        fechaCorte: nuevaMeta.fechaCorte,
      };
      if (nuevaMeta.componenteId) payload.componenteId = nuevaMeta.componenteId;
      if (nuevaMeta.presupuestoProgramado) payload.presupuestoProgramado = Number(nuevaMeta.presupuestoProgramado);

      const res = await api.post('/metas', payload);
      setMostrarCrearModal(false);
      setNuevaMeta({
        codigo: '',
        descripcion: '',
        areaId: '',
        componenteId: '',
        unidadId: '',
        valorMeta: '',
        fechaInicio: '2026-01-01',
        fechaFinOficial: '2026-12-31',
        fechaCorte: '2026-11-30',
        presupuestoProgramado: '',
      });
      // Navegar a la ficha de la nueva meta
      navigate(`/metas/${res.data.id}`);
    } catch (err: any) {
      setErrorCreacion(err.response?.data?.mensaje || 'Error al crear la meta.');
    } finally {
      setCreando(false);
    }
  };

  const [exportandoExcel, setExportandoExcel] = useState(false);

  const handleDescargarExcel = async () => {
    try {
      setExportandoExcel(true);
      const response = await api.get('/exportacion/metas/excel', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `METRICA_Matriz_Metas_2026_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar matriz a Excel:', err);
      alert('Ocurrió un error al generar la matriz oficial en Excel.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const puedeCrear = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'LIDER_AREA';

  const totalPaginas = Math.ceil(total / tamano) || 1;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Plan de Acción en Salud — Metas 2026
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-full">
              {total} Metas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitoreo, avances normativos (RN-01 a RN-19) y programación mensual de la Secretaría de Salud.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Boton
            variante="secundario"
            tamano="sm"
            icono={<Download className="w-4 h-4 text-slate-600" />}
            onClick={handleDescargarExcel}
            cargando={exportandoExcel}
          >
            Exportar Matriz Excel (CU-12)
          </Boton>
          {usuario?.rol === 'ADMINISTRADOR' && (
            <Link to="/admin/importar">
              <Boton variante="secundario" tamano="sm" icono={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                Importar Excel
              </Boton>
            </Link>
          )}
          {puedeCrear && (
            <Boton
              variante="primario"
              tamano="sm"
              icono={<Plus className="w-4 h-4" />}
              onClick={() => setMostrarCrearModal(true)}
            >
              Nueva Meta
            </Boton>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { setSemaforoFiltro(''); setEstadoFiltro(''); setPagina(1); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-institucional-azul/40 transition-all"
        >
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Metas</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Plan 2026</div>
        </div>

        <div
          onClick={() => { setSemaforoFiltro('VERDE'); setEstadoFiltro(''); setPagina(1); }}
          className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-sm cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Verde</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {metas.filter((m) => m.semaforo === 'VERDE').length > 0 ? 'En meta' : 'Verde'}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Cumplidas o a tiempo</div>
        </div>

        <div
          onClick={() => { setSemaforoFiltro('AMARILLO'); setEstadoFiltro(''); setPagina(1); }}
          className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 shadow-sm cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Amarillo</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">Alerta</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Brecha ≤ 15%</div>
        </div>

        <div
          onClick={() => { setSemaforoFiltro('ROJO'); setEstadoFiltro(''); setPagina(1); }}
          className="bg-red-50/60 p-3.5 rounded-xl border border-red-200/80 shadow-sm cursor-pointer hover:border-red-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider">Rojo</span>
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">Crítico</div>
          <div className="text-[11px] text-red-700 mt-0.5">Brecha &gt; 15% o vencida</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('CUMPLIDA'); setSemaforoFiltro(''); setPagina(1); }}
          className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200/80 shadow-sm cursor-pointer hover:border-indigo-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Cumplidas</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-900 mt-1">100%</div>
          <div className="text-[11px] text-indigo-700 mt-0.5">Alcanzadas</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('PENDIENTE_COMPLETAR'); setSemaforoFiltro(''); setPagina(1); }}
          className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Pendientes</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1">Por Asignar</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sin responsable</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Pestañas de Vista Rápida */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => { setVistaRapida('todas'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              vistaRapida === 'todas'
                ? 'bg-institucional-azul text-white shadow-sm font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas las Metas
          </button>
          <button
            type="button"
            onClick={() => { setVistaRapida('mis_metas'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              vistaRapida === 'mis_metas'
                ? 'bg-institucional-azul text-white shadow-sm font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Mis Metas Asignadas
          </button>
          <button
            type="button"
            onClick={() => { setVistaRapida('pendientes_reporte'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              vistaRapida === 'pendientes_reporte'
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendientes de Reporte Mensual (RN-16)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por código (ej: 226, 401) o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          {/* Filtro por Área */}
          <div>
            <select
              value={areaSeleccionada}
              onChange={(e) => {
                setAreaSeleccionada(e.target.value);
                setComponenteSeleccionado('');
                setPagina(1);
              }}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Todas las Áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} — {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Componente */}
          <div>
            <select
              value={componenteSeleccionado}
              onChange={(e) => {
                setComponenteSeleccionado(e.target.value);
                setPagina(1);
              }}
              disabled={!areaSeleccionada || componentesFiltrados.length === 0}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Todos los Componentes</option>
              {componentesFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Semáforo / Estado */}
          <div className="flex gap-2">
            <select
              value={semaforoFiltro}
              onChange={(e) => {
                setSemaforoFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-1/2 py-2 px-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Semáforo</option>
              <option value="VERDE">Verde</option>
              <option value="AMARILLO">Amarillo</option>
              <option value="ROJO">Rojo</option>
              <option value="GRIS">Gris</option>
            </select>

            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-1/2 py-2 px-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Estado</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CUMPLIDA">Cumplida</option>
              <option value="PENDIENTE_COMPLETAR">Pendiente</option>
              <option value="CERRADA_SIN_CUMPLIR">Cerrada</option>
            </select>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        {(busqueda || areaSeleccionada || componenteSeleccionado || semaforoFiltro || estadoFiltro || vistaRapida !== 'todas') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Filtros activos aplicados {vistaRapida !== 'todas' && `(${vistaRapida === 'mis_metas' ? 'Mis metas' : 'Pendientes de reporte'})`}. Mostrando {metas.length} de {total} metas encontradas.
            </span>
            <button
              onClick={() => {
                setVistaRapida('todas');
                setBusqueda('');
                setAreaSeleccionada('');
                setComponenteSeleccionado('');
                setSemaforoFiltro('');
                setEstadoFiltro('');
                setPagina(1);
              }}
              className="text-institucional-azul hover:underline font-medium"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Metas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-4 border-institucional-azul border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium">Cargando metas y calculando semáforos normativos...</p>
          </div>
        ) : error ? (
          <div className="p-8">
            <Alerta tipo="error" mensaje={error} />
          </div>
        ) : metas.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No se encontraron metas</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No hay registros que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-20">Cód.</th>
                  <th className="py-3 px-4 min-w-[280px]">Descripción de la Meta</th>
                  <th className="py-3 px-4">Área / Comp.</th>
                  <th className="py-3 px-4 text-center">Unidad</th>
                  <th className="py-3 px-4 text-right">Meta</th>
                  <th className="py-3 px-4 text-right">Ejec. Acum</th>
                  <th className="py-3 px-4 min-w-[130px] text-center">Avance Indicador</th>
                  <th className="py-3 px-4 text-center">Planeado</th>
                  <th className="py-3 px-4 text-center">Semáforo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metas.map((m) => {
                  const pctAvance = m.avanceIndicador ?? 0;
                  const pctPlan = m.avancePlaneado ?? 0;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/metas/${m.id}`)}
                    >
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-bold text-institucional-azul">
                        <span className="bg-slate-100 group-hover:bg-institucional-azul group-hover:text-white px-2 py-0.5 rounded text-[11px] transition-colors">
                          {m.codigo}
                        </span>
                      </td>

                      {/* Descripción */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 line-clamp-2" title={m.descripcion}>
                          {m.descripcion}
                        </div>
                        {m.responsable ? (
                          <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>Resp: <span className="text-slate-600">{m.responsable.nombre}</span></span>
                            {m.ultimoMesReportado ? (
                              <span className="text-slate-500">
                                · Últ. rep: Mes {typeof m.ultimoMesReportado === 'object' ? m.ultimoMesReportado.mes : m.ultimoMesReportado}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">· Sin reportes</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 mt-0.5 font-medium">
                            Sin responsable asignado
                          </div>
                        )}
                      </td>

                      {/* Área / Componente */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">{m.area.codigo}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {m.componente?.nombre || m.area.nombre}
                        </div>
                      </td>

                      {/* Unidad */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {m.unidad.nombre}
                        </span>
                      </td>

                      {/* Valor Meta */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {m.valorMeta.toLocaleString()}
                      </td>

                      {/* Ejecutado Acumulado */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {m.valorEjecutadoAcum.toLocaleString()}
                      </td>

                      {/* Avance Indicador con mini barra */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pctAvance >= 100
                                  ? 'bg-emerald-500'
                                  : pctAvance >= 50
                                  ? 'bg-institucional-azul'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(pctAvance, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold w-10 text-right">
                            {pctAvance.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Avance Planeado */}
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {pctPlan.toFixed(1)}%
                      </td>

                      {/* Semáforo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <SemaforoBadge
                          color={m.semaforo}
                          brecha={m.brecha}
                          tamano="sm"
                          mostrarIcono={false}
                        />
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.estado === 'CUMPLIDA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.estado === 'ABIERTA'
                              ? 'bg-blue-100 text-blue-800'
                              : m.estado === 'CERRADA_SIN_CUMPLIR'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.estado === 'PENDIENTE_COMPLETAR'
                            ? 'PENDIENTE'
                            : m.estado === 'CERRADA_SIN_CUMPLIR'
                            ? 'CERRADA'
                            : m.estado}
                        </span>
                      </td>

                      {/* Botón Ver */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-institucional-azul group-hover:translate-x-0.5 transition-transform font-medium">
                          Ver <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {total > 0 && (
          <div className="py-3 px-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Mostrando <span className="font-bold text-slate-800">{(pagina - 1) * tamano + 1}</span> a{' '}
              <span className="font-bold text-slate-800">
                {Math.min(pagina * tamano, total)}
              </span>{' '}
              de <span className="font-bold text-slate-800">{total}</span> metas
            </div>

            <div className="flex items-center gap-2">
              <Boton
                variante="secundario"
                tamano="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                icono={<ChevronLeft className="w-4 h-4" />}
              >
                Anterior
              </Boton>
              <span className="font-medium px-2">
                Pág. {pagina} de {totalPaginas}
              </span>
              <Boton
                variante="secundario"
                tamano="sm"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                icono={<ChevronRight className="w-4 h-4" />}
              >
                Siguiente
              </Boton>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Nueva Meta */}
      <Modal
        abierto={mostrarCrearModal}
        alCerrar={() => setMostrarCrearModal(false)}
        titulo="Crear Nueva Meta en el Plan de Acción"
      >
        <form onSubmit={handleCrearMeta} className="space-y-4">
          {errorCreacion && <Alerta tipo="error" mensaje={errorCreacion} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Institucional *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 501"
                value={nuevaMeta.codigo}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, codigo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Meta Anual (2026) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Ej: 100"
                value={nuevaMeta.valorMeta}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, valorMeta: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción de la Actividad / Meta *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Descripción detallada de la meta..."
              value={nuevaMeta.descripcion}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Área Responsable *
              </label>
              <select
                required
                value={nuevaMeta.areaId}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, areaId: e.target.value, componenteId: '' })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              >
                <option value="">Seleccione un Área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} — {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Componente (opcional)
              </label>
              <select
                value={nuevaMeta.componenteId}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, componenteId: e.target.value })}
                disabled={!nuevaMeta.areaId}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              >
                <option value="">Ninguno / Toda el Área</option>
                {componentes
                  .filter((c) => c.areaId === nuevaMeta.areaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unidad de Medida *
              </label>
              <select
                required
                value={nuevaMeta.unidadId}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, unidadId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              >
                <option value="">Seleccione una Unidad...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Presupuesto Programado ($ COP)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Opcional"
                value={nuevaMeta.presupuestoProgramado}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, presupuestoProgramado: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={nuevaMeta.fechaInicio}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, fechaInicio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Oficial Fin</label>
              <input
                type="date"
                value={nuevaMeta.fechaFinOficial}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, fechaFinOficial: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Corte</label>
              <input
                type="date"
                value={nuevaMeta.fechaCorte}
                onChange={(e) => setNuevaMeta({ ...nuevaMeta, fechaCorte: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            ℹ️ Al crear la meta, MÉTRICA generará automáticamente la programación uniforme en 12 meses (RN-18/19), la cual podrá ser ajustada posteriormente desde su ficha.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setMostrarCrearModal(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" tipo="submit" cargando={creando}>
              Crear Meta
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
