import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Briefcase,
  Download,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Clock,
  Building2,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { Tarjeta } from '../../componentes/ui/Tarjeta';
import { AnilloAvance } from '../../componentes/ui/AnilloAvance';
import { SemaforoBadge } from '../../componentes/ui/SemaforoBadge';
import { Boton } from '../../componentes/ui/Boton';

export const TableroPrincipal: React.FC = () => {
  const { usuario } = useSesion();

  // Filtros de navegación
  const [areaId, setAreaId] = useState<string>('');
  const [componenteId, setComponenteId] = useState<string>('');
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [pestanaAlertas, setPestanaAlertas] = useState<'rojas' | 'sinReporte' | 'sobrecosto' | 'vencidas'>('rojas');
  const [areasExpandidas, setAreasExpandidas] = useState<Record<string, boolean>>({});

  // 1. Consulta del Resumen Ejecutivo (CU-11, RN-09, RN-10)
  const { data: resumen, isLoading: cargandoResumen, refetch: refetchResumen } = useQuery({
    queryKey: ['tablero-resumen', areaId, componenteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (areaId) params.append('areaId', areaId);
      if (componenteId) params.append('componenteId', componenteId);
      const { data } = await api.get(`/tablero/resumen?${params.toString()}`);
      return data;
    },
  });

  // 2. Consulta de la Curva de Avance 12 Meses (CU-11, 6.6)
  const { data: curva = [], isLoading: cargandoCurva } = useQuery({
    queryKey: ['tablero-curva', areaId, componenteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (areaId) params.append('areaId', areaId);
      if (componenteId) params.append('componenteId', componenteId);
      const { data } = await api.get(`/tablero/curva?${params.toString()}`);
      return Array.isArray(data) ? data : [];
    },
  });

  // 3. Consulta de Desglose por Áreas y Componentes
  const { data: desgloseAreas = [], isLoading: cargandoDesglose } = useQuery({
    queryKey: ['tablero-desglose-areas'],
    queryFn: async () => {
      const { data } = await api.get('/tablero/desglose-areas');
      return Array.isArray(data) ? data : [];
    },
  });

  // 4. Consulta de Alertas Críticas (CU-11)
  const { data: alertas, isLoading: cargandoAlertas } = useQuery({
    queryKey: ['tablero-alertas-criticas', areaId, componenteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (areaId) params.append('areaId', areaId);
      if (componenteId) params.append('componenteId', componenteId);
      const { data } = await api.get(`/tablero/alertas-criticas?${params.toString()}`);
      return data;
    },
  });

  // Componentes filtrados para el combo dependiente
  const componentesDisponibles = useMemo(() => {
    if (!areaId) return [];
    const area = desgloseAreas.find((a: any) => a.id === areaId);
    return area?.componentes || [];
  }, [areaId, desgloseAreas]);

  // Manejador de descarga Excel oficial (CU-12)
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

  const toggleAreaExpandida = (id: string) => {
    setAreasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Formato monetario
  const formatMoneda = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className={`space-y-6 transition-all duration-300 ${modoPresentacion ? 'bg-slate-900 text-white p-6 rounded-3xl min-h-screen' : ''}`}>
      {/* BARRA SUPERIOR DE ACCIONES Y FILTROS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl lg:text-3xl font-black tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
              Tablero de Control Gerencial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-institucional-azul/10 text-institucional-azul border border-institucional-azul/20">
              Vigencia 2026
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${modoPresentacion ? 'text-slate-400' : 'text-slate-500'}`}>
            Monitoreo en tiempo real del Plan de Acción en Salud (PAS) · Secretaría de Salud Departamental
          </p>
        </div>

        {/* Controles de Vista y Descarga */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Área */}
          <select
            value={areaId}
            onChange={(e) => {
              setAreaId(e.target.value);
              setComponenteId('');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
              modoPresentacion
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <option value="">Todas las Áreas (Consolidado)</option>
            {desgloseAreas.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.codigo} - {a.nombre}
              </option>
            ))}
          </select>

          {/* Selector de Componente */}
          {areaId && componentesDisponibles.length > 0 && (
            <select
              value={componenteId}
              onChange={(e) => setComponenteId(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                modoPresentacion
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="">Todos los Componentes</option>
              {componentesDisponibles.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Botón Modo Presentación */}
          <button
            type="button"
            onClick={() => setModoPresentacion(!modoPresentacion)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all ${
              modoPresentacion
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Alternar modo presentación de alto impacto para Despacho"
          >
            {modoPresentacion ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{modoPresentacion ? 'Salir Presentación' : 'Modo Presentación'}</span>
          </button>

          {/* Botón Exportar Matriz Oficial Excel (CU-12) */}
          <button
            type="button"
            onClick={handleDescargarExcel}
            disabled={exportandoExcel}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportandoExcel ? 'Generando...' : 'Exportar Excel Oficial'}</span>
          </button>
        </div>
      </div>

      {/* TARJETAS KPI DE ALTO NIVEL (RN-09, RN-10, CU-11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Avance Físico Global (Promedio Simple RN-09/RN-10) */}
        <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avance Físico Global (RN-09)
            </span>
            <SemaforoBadge
              color={resumen?.semaforoGlobal || 'VERDE'}
              tamano="sm"
            />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-institucional-azul">
              {resumen?.avanceGlobalFisico != null ? `${resumen.avanceGlobalFisico.toFixed(1)}%` : '—'}
            </span>
            <div className="text-xs">
              <span className="text-slate-400">Planeado: </span>
              <span className={`font-bold ${modoPresentacion ? 'text-slate-300' : 'text-slate-600'}`}>
                {resumen?.avanceGlobalPlaneado != null ? `${resumen.avanceGlobalPlaneado.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5">
            <span
              className={`font-bold ${
                (resumen?.brecha || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {(resumen?.brecha || 0) >= 0 ? `+${resumen?.brecha}%` : `${resumen?.brecha}%`}
            </span>
            <span className="text-slate-400">brecha vs curva esperada</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                resumen?.semaforoGlobal === 'VERDE'
                  ? 'bg-emerald-500'
                  : resumen?.semaforoGlobal === 'AMARILLO'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(resumen?.avanceGlobalFisico || 0, 100)}%` }}
            />
          </div>
        </Tarjeta>

        {/* KPI 2: Distribución de Semáforos */}
        <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Distribución de Semáforos
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {resumen?.distribucionEstados?.total || 276} metas
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Verde</span>
              <span className="text-xl font-black text-emerald-800 block">
                {resumen?.distribucionSemaforos?.verde ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Amarillo</span>
              <span className="text-xl font-black text-amber-800 block">
                {resumen?.distribucionSemaforos?.amarillo ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 uppercase block">Rojo</span>
              <span className="text-xl font-black text-rose-800 block">
                {resumen?.distribucionSemaforos?.rojo ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Cumplidas: <span className={`font-bold ${modoPresentacion ? 'text-slate-300' : 'text-slate-600'}`}>{resumen?.distribucionEstados?.cumplidas || 0}</span> · Abiertas: <span className={`font-bold ${modoPresentacion ? 'text-slate-300' : 'text-slate-600'}`}>{resumen?.distribucionEstados?.abiertas || 0}</span>
          </p>
        </Tarjeta>

        {/* KPI 3: Ejecución Presupuestal */}
        <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ejecución Presupuestal
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
              {resumen?.financiero?.porcentajeEjecucion != null ? `${resumen.financiero.porcentajeEjecucion}%` : '0%'}
            </span>
          </div>
          <div className="mt-2 text-xs space-y-0.5">
            <div className="flex justify-between text-slate-400">
              <span>Ejecutado:</span>
              <span className={`font-mono font-semibold ${modoPresentacion ? 'text-slate-200' : 'text-slate-800'}`}>
                {formatMoneda(resumen?.financiero?.totalCostoEjecutado || 0)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Apropiación:</span>
              <span className="font-mono">
                {formatMoneda(resumen?.financiero?.totalPresupuesto || 0)}
              </span>
            </div>
          </div>
        </Tarjeta>

        {/* KPI 4: Gestión Operativa de Tareas */}
        <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gestión de Tareas
            </span>
            <Briefcase className="w-4 h-4 text-institucional-azul" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
              {resumen?.operativo?.totalTareas || 0}
            </span>
            <span className="text-xs text-slate-400">actividades</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-center">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Prog/Curso</span>
              <span className="font-bold text-slate-700">
                {(resumen?.operativo?.programadas || 0) + (resumen?.operativo?.enCurso || 0)}
              </span>
            </div>
            <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
              <span className="text-emerald-600 block text-[10px]">Finalizadas</span>
              <span className="font-bold text-emerald-700">{resumen?.operativo?.finalizadas || 0}</span>
            </div>
            <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
              <span className="text-rose-600 block text-[10px]">Vencidas</span>
              <span className="font-bold text-rose-700">{resumen?.operativo?.vencidas || 0}</span>
            </div>
          </div>
          {Boolean(resumen?.operativo?.compromisosDespacho) && (
            <p className="text-[10px] text-purple-600 font-bold mt-1 text-center">
              ★ {resumen.operativo.compromisosDespacho} tareas requieren presencia del Despacho
            </p>
          )}
        </Tarjeta>
      </div>

      {/* CURVA DE AVANCE ACUMULADO (12 MESES) - RECHARTS */}
      <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className={`text-base font-bold tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
              Curva de Avance Acumulado — Vigencia 2026
            </h2>
            <p className="text-xs text-slate-400">
              Comparativa mensual del porcentaje acumulado programado vs ejecutado real con fecha de corte oficial.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span className="text-slate-400">Planeado Acumulado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500" />
              <span className="text-slate-400">Ejecutado Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
              <span className="text-rose-600 font-bold">Corte 30-Nov</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={curva}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={modoPresentacion ? '#334155' : '#e2e8f0'} />
              <XAxis
                dataKey="nombreMes"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                unit="%"
                domain={[0, 100]}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                        <p className="font-bold border-b border-slate-700 pb-1">
                          Mes de {label} {dataPoint.esFechaCorte ? '(Corte Oficial 30-Nov)' : ''}
                        </p>
                        <p className="text-blue-400">
                          Planeado: <span className="font-bold font-mono">{dataPoint.planeado}%</span>
                        </p>
                        <p className="text-emerald-400">
                          Ejecutado:{' '}
                          <span className="font-bold font-mono">
                            {dataPoint.ejecutado != null ? `${dataPoint.ejecutado}%` : 'Sin datos'}
                          </span>
                        </p>
                        {dataPoint.ejecutado != null && (
                          <p className={dataPoint.ejecutado >= dataPoint.planeado ? 'text-emerald-400' : 'text-rose-400'}>
                            Brecha: {dataPoint.ejecutado - dataPoint.planeado > 0 ? '+' : ''}
                            {(dataPoint.ejecutado - dataPoint.planeado).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Línea de Fecha de Corte: Noviembre (Index 10) */}
              <ReferenceLine
                x="Nov"
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'Corte Oficial (30 Nov)',
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              />
              <Line
                type="monotone"
                dataKey="planeado"
                name="Planeado"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="ejecutado"
                name="Ejecutado"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>

      {/* DESGLOSE POR ÁREAS Y COMPONENTES (DRILL-DOWN) */}
      <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className={`text-base font-bold tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
              Desglose de Desempeño por Áreas y Componentes
            </h2>
            <p className="text-xs text-slate-400">
              Despliegue interactivo para auditar el cumplimiento y presupuesto de cada dependencia.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {desgloseAreas.length} Áreas Organizacionales
          </span>
        </div>

        <div className="space-y-3">
          {desgloseAreas.map((area: any) => {
            const expandida = Boolean(areasExpandidas[area.id]);
            return (
              <div
                key={area.id}
                className={`border rounded-2xl transition-all ${
                  modoPresentacion
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  onClick={() => toggleAreaExpandida(area.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {expandida ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-institucional-azul">
                          {area.codigo}
                        </span>
                        <h3 className={`text-sm font-bold ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
                          {area.nombre}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {area.totalMetas} metas · {area.componentes?.length || 0} componentes
                      </p>
                    </div>
                  </div>

                  {/* Avance físico del área con semáforo */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-slate-400">Físico:</span>
                        <span className={`text-sm font-black font-mono ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
                          {area.avanceFisico != null ? `${area.avanceFisico.toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                        <span>Plan: {area.avancePlaneado != null ? `${area.avancePlaneado.toFixed(1)}%` : '0%'}</span>
                      </div>
                    </div>

                    <SemaforoBadge
                      color={area.semaforo}
                      tamano="sm"
                    />

                    {/* Presupuesto */}
                    <div className="text-right hidden sm:block">
                      <span className={`text-[11px] font-mono font-semibold block ${modoPresentacion ? 'text-slate-300' : 'text-slate-700'}`}>
                        {formatMoneda(area.costoEjecutado || 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        de {formatMoneda(area.presupuestoProgramado || 0)} ({area.porcentajePresupuesto || 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acordeón expandido con lista de componentes */}
                {expandida && (
                  <div className={`border-t p-4 rounded-b-2xl space-y-2 ${modoPresentacion ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50/70'}`}>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Componentes de {area.nombre}
                    </h4>
                    {area.componentes && area.componentes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {area.componentes.map((comp: any) => (
                          <div
                            key={comp.id}
                            className={`p-3 border rounded-xl flex items-center justify-between shadow-xs ${
                              modoPresentacion
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-white border-slate-200/80'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <span className="text-[10px] font-mono font-bold text-slate-400 block">
                                {comp.codigo}
                              </span>
                              <span className={`text-xs font-bold line-clamp-1 ${modoPresentacion ? 'text-white' : 'text-slate-800'}`}>
                                {comp.nombre}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                {comp.totalMetas} metas asignadas
                              </span>
                            </div>
                            <div className="text-right space-y-1">
                              <span className={`text-xs font-black font-mono block ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
                                {comp.avanceFisico != null ? `${comp.avanceFisico.toFixed(1)}%` : '0%'}
                              </span>
                              <SemaforoBadge color={comp.semaforo} tamano="sm" mostrarIcono={false} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay subcomponentes registrados para esta área.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Tarjeta>

      {/* BANDEJA DE ALERTAS CRÍTICAS (CU-11) */}
      <Tarjeta className={`${modoPresentacion ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white'} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <div>
              <h2 className={`text-base font-bold tracking-tight ${modoPresentacion ? 'text-white' : 'text-slate-900'}`}>
                Bandeja de Alertas Críticas y Desviaciones
              </h2>
              <p className="text-xs text-slate-400">
                Identificación automática de riesgos, retrasos mayores a 15 puntos y metas sin reporte periódico.
              </p>
            </div>
          </div>

          {/* Selector de tipo de alerta */}
          <div className={`flex items-center gap-1.5 p-1 rounded-xl text-xs font-semibold ${modoPresentacion ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button
              type="button"
              onClick={() => setPestanaAlertas('rojas')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pestanaAlertas === 'rojas'
                  ? 'bg-white text-rose-700 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semáforo Rojo ({alertas?.metasRojas?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setPestanaAlertas('sinReporte')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pestanaAlertas === 'sinReporte'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sin Reporte ({alertas?.metasSinReporte?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setPestanaAlertas('sobrecosto')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pestanaAlertas === 'sobrecosto'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sobrecosto ({alertas?.metasSobrecosto?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setPestanaAlertas('vencidas')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pestanaAlertas === 'vencidas'
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tareas Vencidas ({alertas?.tareasVencidas?.length || 0})
            </button>
          </div>
        </div>

        {/* Contenido de la alerta seleccionada */}
        <div className="mt-4">
          {pestanaAlertas === 'rojas' && (
            <div className="space-y-2.5">
              {!alertas?.metasRojas || alertas.metasRojas.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded-xl font-medium">
                  ✓ No existen metas en semáforo rojo. Toda la operación se mantiene dentro de los límites esperados.
                </div>
              ) : (
                alertas.metasRojas.map((meta: any) => (
                  <div
                    key={meta.id}
                    className="p-3.5 border border-rose-200 bg-rose-50/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-rose-700">
                          Meta #{meta.codigo}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {meta.area} · {meta.componente || 'General'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {meta.descripcion}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Responsable: <span className="font-semibold">{meta.responsable || 'Sin asignar'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-rose-700 block">
                          Brecha: {meta.brecha}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Avance: {meta.avanceIndicador}% vs Plan: {meta.avancePlaneado}%
                        </span>
                      </div>
                      <Link to={`/metas/${meta.id}`}>
                        <Boton variante="secundario" tamano="sm" className="text-xs">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Ver Ficha
                        </Boton>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {pestanaAlertas === 'sinReporte' && (
            <div className="space-y-2.5">
              {!alertas?.metasSinReporte || alertas.metasSinReporte.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded-xl font-medium">
                  ✓ Todas las metas se encuentran al día con sus reportes mensuales obligatorios.
                </div>
              ) : (
                alertas.metasSinReporte.map((meta: any) => (
                  <div
                    key={meta.id}
                    className="p-3.5 border border-amber-200 bg-amber-50/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-amber-800">
                          Meta #{meta.codigo}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {meta.area}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {meta.descripcion}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Responsable: <span className="font-semibold">{meta.responsable || 'Sin asignar'}</span> · Último reporte: mes {meta.ultimoMesReportado || 'Ninguno'}
                      </p>
                    </div>
                    <Link to={`/metas/${meta.id}`}>
                      <Boton variante="secundario" tamano="sm" className="text-xs">
                        Reportar Avance
                      </Boton>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {pestanaAlertas === 'sobrecosto' && (
            <div className="space-y-2.5">
              {!alertas?.metasSobrecosto || alertas.metasSobrecosto.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded-xl font-medium">
                  ✓ No se registran metas con costos ejecutados por encima de la apropiación presupuestal.
                </div>
              ) : (
                alertas.metasSobrecosto.map((meta: any) => (
                  <div
                    key={meta.id}
                    className="p-3.5 border border-purple-200 bg-purple-50/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-black font-mono text-purple-800">
                        Meta #{meta.codigo}
                      </span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {meta.descripcion}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-purple-700 block">
                        Exceso: +{formatMoneda(meta.exceso)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Ejecutado: {formatMoneda(meta.costoEjecutadoAcum)} de {formatMoneda(meta.presupuestoProgramado)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {pestanaAlertas === 'vencidas' && (
            <div className="space-y-2.5">
              {!alertas?.tareasVencidas || alertas.tareasVencidas.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded-xl font-medium">
                  ✓ No hay actividades operativas con fecha límite vencida.
                </div>
              ) : (
                alertas.tareasVencidas.map((tarea: any) => (
                  <div
                    key={tarea.id}
                    className="p-3.5 border border-rose-200 bg-rose-50/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-bold text-rose-700">
                        Tarea Vencida: {tarea.titulo}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Meta #{tarea.meta?.codigo} · Resp: {tarea.responsable?.nombre}
                      </p>
                    </div>
                    <Link to={`/tareas?tareaId=${tarea.id}`}>
                      <Boton variante="secundario" tamano="sm" className="text-xs">
                        Ver Tarea
                      </Boton>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Tarjeta>
    </div>
  );
};
