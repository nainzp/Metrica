import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  UserCheck,
  Edit3,
  RotateCcw,
  Lock,
  Percent,
  PlusCircle,
  FileCheck,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  Paperclip,
  ExternalLink,
  MessageSquare,
  Briefcase,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { SemaforoBadge } from '../../componentes/ui/SemaforoBadge';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const FichaMeta: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useSesion();

  // Estado de la meta
  const [meta, setMeta] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pestaña activa
  const [pestanaActiva, setPestanaActiva] = useState<
    'general' | 'programacion' | 'reportes' | 'tareas' | 'observaciones' | 'operador'
  >('general');

  // Modal Asignar Responsable
  const [modalResponsable, setModalResponsable] = useState(false);
  const [usuariosArea, setUsuariosArea] = useState<any[]>([]);
  const [nuevoResponsableId, setNuevoResponsableId] = useState('');
  const [guardandoResponsable, setGuardandoResponsable] = useState(false);

  // Modal Editar Meta
  const [modalEditar, setModalEditar] = useState(false);
  const [formEditar, setFormEditar] = useState<any>({});
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal Programación Mensual
  const [modalProgramacion, setModalProgramacion] = useState(false);
  const [valoresProg, setValoresProg] = useState<number[]>(new Array(12).fill(0));
  const [guardandoProg, setGuardandoProg] = useState(false);

  // Modal Registrar Reporte Mensual (CU-05)
  const [modalReporte, setModalReporte] = useState(false);
  const [guardandoReporte, setGuardandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [formReporte, setFormReporte] = useState({
    anio: 2026,
    mes: 1,
    valorEjecutado: '',
    costoEjecutado: '',
    porcentajeBinario: '',
    observacion: '',
  });
  const [proyeccionReporte, setProyeccionReporte] = useState<any>(null);
  const [calculandoProyeccion, setCalculandoProyeccion] = useState(false);

  // Modal Corregir Reporte (CU-06)
  const [modalCorreccion, setModalCorreccion] = useState(false);
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  const [errorCorreccion, setErrorCorreccion] = useState<string | null>(null);
  const [reporteACorregir, setReporteACorregir] = useState<any>(null);
  const [formCorreccion, setFormCorreccion] = useState({
    valorEjecutado: '',
    costoEjecutado: '',
    porcentajeBinario: '',
    observacion: '',
    motivo: '',
  });

  // Modal Cerrar / Reabrir
  const [modalCerrar, setModalCerrar] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState('');
  const [guardandoCierre, setGuardandoCierre] = useState(false);

  const [modalReabrir, setModalReabrir] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [guardandoReapertura, setGuardandoReapertura] = useState(false);

  // Modal Crear Observación Despacho (CU-04)
  const [modalObservacion, setModalObservacion] = useState(false);
  const [textoObservacion, setTextoObservacion] = useState('');
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);
  const [errorObservacion, setErrorObservacion] = useState<string | null>(null);

  // Modal Atender Observación Despacho
  const [modalAtenderObs, setModalAtenderObs] = useState(false);
  const [obsSeleccionada, setObsSeleccionada] = useState<any>(null);
  const [respuestaObs, setRespuestaObs] = useState('');
  const [guardandoRespuestaObs, setGuardandoRespuestaObs] = useState(false);
  const [errorRespuestaObs, setErrorRespuestaObs] = useState<string | null>(null);

  // Mensaje temporal de éxito o error
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarMeta = async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const res = await api.get(`/metas/${id}`);
      setMeta(res.data);
      setFormEditar({
        descripcion: res.data.descripcion,
        valorMeta: res.data.valorMeta,
        fechaInicio: res.data.fechaInicio ? res.data.fechaInicio.slice(0, 10) : '2026-01-01',
        fechaFinOficial: res.data.fechaFinOficial ? res.data.fechaFinOficial.slice(0, 10) : '2026-12-31',
        fechaCorte: res.data.fechaCorte ? res.data.fechaCorte.slice(0, 10) : '2026-11-30',
        presupuestoProgramado: res.data.presupuestoProgramado || '',
      });

      // Inicializar valores de programación
      const progArray = new Array(12).fill(0);
      if (res.data.programaciones && Array.isArray(res.data.programaciones)) {
        res.data.programaciones.forEach((p: any) => {
          if (p.mes >= 1 && p.mes <= 12) {
            progArray[p.mes - 1] = Number(p.valorProgramado);
          }
        });
      }
      setValoresProg(progArray);
    } catch (err: any) {
      console.error('Error cargando meta:', err);
      setError('No fue posible cargar la información de la meta.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMeta();
  }, [id]);

  // Cargar usuarios del área cuando se abre el modal de responsable
  const abrirModalResponsable = async () => {
    if (!meta) return;
    try {
      const res = await api.get('/usuarios', { params: { areaId: meta.areaId, todos: false } });
      setUsuariosArea(res.data || []);
      setNuevoResponsableId(meta.responsableId || '');
      setModalResponsable(true);
    } catch (err) {
      console.error('Error cargando usuarios del área:', err);
    }
  };

  const handleGuardarResponsable = async () => {
    if (!nuevoResponsableId) return;
    setGuardandoResponsable(true);
    try {
      await api.patch(`/metas/${meta.id}/responsable`, { responsableId: nuevoResponsableId });
      setModalResponsable(false);
      setMensajeExito('Responsable asignado correctamente.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al asignar responsable.');
    } finally {
      setGuardandoResponsable(false);
    }
  };

  const handleGuardarEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoEditar(true);
    try {
      await api.patch(`/metas/${meta.id}`, {
        descripcion: formEditar.descripcion,
        valorMeta: Number(formEditar.valorMeta),
        fechaInicio: formEditar.fechaInicio,
        fechaFinOficial: formEditar.fechaFinOficial,
        fechaCorte: formEditar.fechaCorte,
        presupuestoProgramado: formEditar.presupuestoProgramado ? Number(formEditar.presupuestoProgramado) : null,
      });
      setModalEditar(false);
      setMensajeExito('Datos de la meta actualizados correctamente.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al actualizar meta.');
    } finally {
      setGuardandoEditar(false);
    }
  };

  const sumaProg = useMemo(() => {
    return Math.round(valoresProg.reduce((a, b) => a + Number(b || 0), 0) * 100) / 100;
  }, [valoresProg]);

  const difProg = useMemo(() => {
    if (!meta) return 0;
    return Math.round((Number(meta.valorMeta) - sumaProg) * 100) / 100;
  }, [meta, sumaProg]);

  const handleGuardarProgramacion = async () => {
    if (Math.abs(difProg) > 0.01) {
      alert(`La suma mensual (${sumaProg}) debe coincidir exactamente con el valor de la meta (${meta.valorMeta}). Diferencia: ${difProg}`);
      return;
    }

    setGuardandoProg(true);
    try {
      const payload = valoresProg.map((val, idx) => ({
        anio: 2026,
        mes: idx + 1,
        valorProgramado: Number(val),
      }));

      await api.put(`/metas/${meta.id}/programacion`, { programacion: payload });
      setModalProgramacion(false);
      setMensajeExito('Programación mensual actualizada con éxito.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al guardar programación.');
    } finally {
      setGuardandoProg(false);
    }
  };

  const handleRestablecerUniforme = async () => {
    if (!window.confirm('¿Está seguro de restablecer la programación mensual a la distribución uniforme oficial (RN-18/19)?')) {
      return;
    }
    try {
      await api.post(`/metas/${meta.id}/programacion/uniforme`);
      setMensajeExito('Programación uniforme restablecida.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al restablecer distribución.');
    }
  };

  // --- Manejo de Reporte Mensual (CU-05) ---

  // Meses disponibles para reportar (del mes de inicio hasta mes actual que no tengan reporte)
  const mesesDisponiblesParaReportar = useMemo(() => {
    if (!meta) return [];
    const mesInicio = meta.fechaInicio ? new Date(meta.fechaInicio).getUTCMonth() + 1 : 1;
    const mesActual = new Date().getUTCMonth() + 1;
    const mesesConReporte = new Set((meta.reportes || []).map((r: any) => r.mes));

    const disponibles: number[] = [];
    for (let m = mesInicio; m <= mesActual; m++) {
      if (!mesesConReporte.has(m)) {
        disponibles.push(m);
      }
    }
    return disponibles;
  }, [meta]);


  const handleCrearObservacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta || textoObservacion.trim().length < 5) return;
    setGuardandoObservacion(true);
    setErrorObservacion(null);
    try {
      await api.post('/observaciones', {
        metaId: meta.id,
        texto: textoObservacion.trim(),
      });
      setMensajeExito('Observación del Despacho emitida y notificada exitosamente.');
      setModalObservacion(false);
      setTextoObservacion('');
      cargarMeta();
    } catch (err: any) {
      setErrorObservacion(err.response?.data?.mensaje || 'Error al emitir observación');
    } finally {
      setGuardandoObservacion(false);
    }
  };

  const handleAtenderObservacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsSeleccionada || respuestaObs.trim().length < 5) return;
    setGuardandoRespuestaObs(true);
    setErrorRespuestaObs(null);
    try {
      await api.post(`/observaciones/${obsSeleccionada.id}/atender`, {
        respuesta: respuestaObs.trim(),
      });
      setMensajeExito('Respuesta y plan de choque registrados con éxito.');
      setModalAtenderObs(false);
      setRespuestaObs('');
      setObsSeleccionada(null);
      cargarMeta();
    } catch (err: any) {
      setErrorRespuestaObs(err.response?.data?.mensaje || 'Error al responder observación');
    } finally {
      setGuardandoRespuestaObs(false);
    }
  };

  const abrirModalReporte = () => {
    if (mesesDisponiblesParaReportar.length === 0) {
      alert('Todos los meses habilitados ya cuentan con reporte registrado. Puede realizar correcciones en la pestaña de Reportes Históricos.');
      return;
    }
    const primerMes = mesesDisponiblesParaReportar[0];
    setFormReporte({
      anio: 2026,
      mes: primerMes,
      valorEjecutado: '',
      costoEjecutado: '',
      porcentajeBinario: '',
      observacion: '',
    });
    setProyeccionReporte(null);
    setErrorReporte(null);
    setModalReporte(true);
  };

  // Simulación proyectada en vivo del reporte (debounce)
  useEffect(() => {
    if (!modalReporte || !meta) return;

    const timer = setTimeout(async () => {
      setCalculandoProyeccion(true);
      try {
        const payload: any = {
          anio: 2026,
          mes: formReporte.mes,
          valorEjecutado: formReporte.valorEjecutado ? Number(formReporte.valorEjecutado) : 0,
          costoEjecutado: formReporte.costoEjecutado ? Number(formReporte.costoEjecutado) : 0,
        };
        if (meta.unidad?.esBinaria && formReporte.porcentajeBinario) {
          payload.porcentajeBinario = Number(formReporte.porcentajeBinario);
        }
        const res = await api.post(`/metas/${meta.id}/reportes/proyectar`, payload);
        setProyeccionReporte(res.data);
      } catch (err) {
        // Silencioso
      } finally {
        setCalculandoProyeccion(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    modalReporte,
    formReporte.mes,
    formReporte.valorEjecutado,
    formReporte.costoEjecutado,
    formReporte.porcentajeBinario,
    meta,
  ]);

  const handleCrearReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorReporte(null);
    setGuardandoReporte(true);

    try {
      const payload: any = {
        anio: 2026,
        mes: Number(formReporte.mes),
        valorEjecutado: formReporte.valorEjecutado ? Number(formReporte.valorEjecutado) : 0,
        costoEjecutado: formReporte.costoEjecutado ? Number(formReporte.costoEjecutado) : 0,
        observacion: formReporte.observacion.trim() || undefined,
      };

      if (meta.unidad?.esBinaria) {
        payload.porcentajeBinario = formReporte.porcentajeBinario ? Number(formReporte.porcentajeBinario) : 0;
      }

      await api.post(`/metas/${meta.id}/reportes`, payload);
      setModalReporte(false);
      setMensajeExito(`Reporte del mes ${NOMBRES_MESES[formReporte.mes - 1]} registrado con éxito.`);
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      setErrorReporte(err.response?.data?.mensaje || 'Error al guardar el reporte mensual.');
    } finally {
      setGuardandoReporte(false);
    }
  };

  // --- Manejo de Corrección de Reporte (CU-06) ---
  const abrirModalCorreccion = (reporte: any) => {
    setReporteACorregir(reporte);
    setFormCorreccion({
      valorEjecutado: reporte.valorEjecutado?.toString() || '',
      costoEjecutado: reporte.costoEjecutado?.toString() || '',
      porcentajeBinario: reporte.porcentajeBinario?.toString() || '',
      observacion: reporte.observacion || '',
      motivo: '',
    });
    setErrorCorreccion(null);
    setModalCorreccion(true);
  };

  const handleCorregirReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCorreccion.motivo || formCorreccion.motivo.trim().length < 5) {
      setErrorCorreccion('El motivo de la corrección es obligatorio (mínimo 5 caracteres).');
      return;
    }

    setGuardandoCorreccion(true);
    setErrorCorreccion(null);
    try {
      const payload: any = {
        valorEjecutado: formCorreccion.valorEjecutado ? Number(formCorreccion.valorEjecutado) : 0,
        costoEjecutado: formCorreccion.costoEjecutado ? Number(formCorreccion.costoEjecutado) : 0,
        observacion: formCorreccion.observacion.trim() || undefined,
        motivo: formCorreccion.motivo.trim(),
      };
      if (meta.unidad?.esBinaria && formCorreccion.porcentajeBinario !== '') {
        payload.porcentajeBinario = Number(formCorreccion.porcentajeBinario);
      }

      await api.patch(`/reportes/${reporteACorregir.id}`, payload);
      setModalCorreccion(false);
      setMensajeExito('Reporte mensual corregido con éxito. Bitácora de auditoría actualizada.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      setErrorCorreccion(err.response?.data?.mensaje || 'Error al corregir reporte.');
    } finally {
      setGuardandoCorreccion(false);
    }
  };

  // --- Cierre y Reapertura ---
  const handleCerrarMeta = async () => {
    if (!motivoCierre || motivoCierre.trim().length < 5) {
      alert('Debe ingresar un motivo de cierre de al menos 5 caracteres.');
      return;
    }
    setGuardandoCierre(true);
    try {
      await api.post(`/metas/${meta.id}/cerrar`, { motivo: motivoCierre.trim() });
      setModalCerrar(false);
      setMotivoCierre('');
      setMensajeExito('Meta cerrada sin cumplir.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al cerrar meta.');
    } finally {
      setGuardandoCierre(false);
    }
  };

  const handleReabrirMeta = async () => {
    if (!motivoReapertura || motivoReapertura.trim().length < 5) {
      alert('Debe ingresar un motivo de reapertura de al menos 5 caracteres.');
      return;
    }
    setGuardandoReapertura(true);
    try {
      await api.post(`/metas/${meta.id}/reabrir`, { motivo: motivoReapertura.trim() });
      setModalReabrir(false);
      setMotivoReapertura('');
      setMensajeExito('Meta reabierta con éxito.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarMeta();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al reabrir meta.');
    } finally {
      setGuardandoReapertura(false);
    }
  };

  // Permisos según rol
  const puedeEditarMeta = usuario?.rol === 'ADMINISTRADOR' || (usuario?.rol === 'LIDER_AREA' && usuario.areaId === meta?.areaId);
  const puedeEditarProg = puedeEditarMeta || (usuario?.rol === 'LIDER_COMPONENTE' && usuario.componenteId === meta?.componenteId);
  const puedeReportar = puedeEditarMeta || (usuario?.id === meta?.responsableId);
  const puedeReabrir = usuario?.rol === 'ADMINISTRADOR';

  if (cargando) {
    return (
      <div className="p-16 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-institucional-azul border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">Cargando ficha integral de la meta...</p>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="space-y-4">
        <Link to="/metas" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver al listado de metas
        </Link>
        <Alerta tipo="error" mensaje={error || 'Meta no encontrada.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón de retroceso y Alerta de Éxito */}
      <div className="flex items-center justify-between">
        <Link
          to="/metas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-institucional-azul font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al listado de metas
        </Link>

        {meta.esDatoPrueba && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
            Dato de Prueba
          </span>
        )}
      </div>

      {mensajeExito && <Alerta tipo="exito" mensaje={mensajeExito} />}

      {/* Cabecera de la Ficha */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-institucional-azul text-white">
                META #{meta.codigo}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                {meta.area?.codigo} — {meta.area?.nombre}
              </span>
              {meta.componente && (
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-blue-50 text-blue-700">
                  {meta.componente.nombre}
                </span>
              )}
              <span className="text-xs px-2.5 py-1 rounded font-medium bg-slate-100 text-slate-600">
                {meta.unidad?.nombre}
              </span>
              {meta.tieneOperador && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-700" />
                  Operador Contratado ({meta.actividadesOperador?.length || 0} act.)
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {meta.descripcion}
            </h1>

            {meta.responsable ? (
              <p className="text-xs text-slate-500">
                Responsable: <span className="font-semibold text-slate-800">{meta.responsable.nombre}</span>
                {meta.responsable.cargo && ` (${meta.responsable.cargo})`} · {meta.responsable.correo}
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Meta pendiente por completar responsable
              </p>
            )}
          </div>

          {/* Badges de Estado y Acciones */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <SemaforoBadge
                color={meta.semaforo}
                brecha={meta.brecha}
                tamano="lg"
              />
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  meta.estado === 'CUMPLIDA'
                    ? 'bg-emerald-100 text-emerald-800'
                    : meta.estado === 'ABIERTA'
                    ? 'bg-blue-100 text-blue-800'
                    : meta.estado === 'CERRADA_SIN_CUMPLIR'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {meta.estado === 'PENDIENTE_COMPLETAR' ? 'PENDIENTE' : meta.estado}
              </span>
            </div>

            {/* Botonera de Gestión */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Reportar Avance */}
              {puedeReportar && meta.estado === 'ABIERTA' && (
                <Boton
                  variante="primario"
                  tamano="sm"
                  icono={<PlusCircle className="w-4 h-4" />}
                  onClick={abrirModalReporte}
                >
                  Reportar Mes
                </Boton>
              )}

              {puedeEditarMeta && (
                <>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={<UserCheck className="w-3.5 h-3.5 text-slate-600" />}
                    onClick={abrirModalResponsable}
                  >
                    Asignar Responsable
                  </Boton>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={<Edit3 className="w-3.5 h-3.5 text-slate-600" />}
                    onClick={() => setModalEditar(true)}
                  >
                    Editar Meta
                  </Boton>
                </>
              )}

              {puedeEditarMeta && meta.estado === 'ABIERTA' && (
                <Boton
                  variante="peligro"
                  tamano="sm"
                  icono={<Lock className="w-3.5 h-3.5" />}
                  onClick={() => setModalCerrar(true)}
                >
                  Cerrar
                </Boton>
              )}

              {puedeReabrir && (meta.estado === 'CUMPLIDA' || meta.estado === 'CERRADA_SIN_CUMPLIR') && (
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={<RotateCcw className="w-3.5 h-3.5 text-indigo-600" />}
                  onClick={() => setModalReabrir(true)}
                >
                  Reabrir Meta
                </Boton>
              )}
            </div>
          </div>
        </div>

        {/* Banner de Advertencia si hay sobrepresupuesto o sobreavance */}
        {(meta.sobrePresupuesto || meta.sobreAvance) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Alerta Normativa de Presupuesto (RN-14 / RN-15): </span>
              {meta.sobrePresupuesto && 'El costo acumulado ejecutado supera el presupuesto total programado. '}
              {meta.sobreAvance && 'El % de costo excede en más de 20 puntos porcentuales al avance del indicador. '}
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de Avances y Cálculos (RN-01 a RN-06) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Meta vs Ejecutado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Meta vs. Ejecutado
          </div>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-2xl font-bold text-slate-900">
              {meta.valorEjecutadoAcum?.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              / {meta.valorMeta?.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{meta.unidad?.nombre}</div>
        </div>

        {/* Avance del Indicador */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Avance Indicador</span>
            <Percent className="w-3.5 h-3.5 text-institucional-azul" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {meta.avanceIndicador?.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                meta.avanceIndicador >= 100 ? 'bg-emerald-500' : 'bg-institucional-azul'
              }`}
              style={{ width: `${Math.min(meta.avanceIndicador || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Avance Planeado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Avance Planeado
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1 font-mono">
            {meta.avancePlaneado?.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Brecha: {meta.brecha > 0 ? `+${meta.brecha}%` : `${meta.brecha}%`}
          </div>
        </div>

        {/* Avance Operativo (Tareas) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Avance Operativo
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1 font-mono">
            {meta.avanceOperativo != null ? `${meta.avanceOperativo.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {meta.totalTareas > 0
              ? `${meta.tareasFinalizadas || 0} de ${meta.totalTareas} tareas finalizadas`
              : 'Sin tareas creadas'}
          </div>
        </div>

        {/* Presupuesto Ejecutado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Presupuesto Pagado</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono truncate" title={`$ ${meta.costoEjecutadoAcum?.toLocaleString()}`}>
            $ {meta.costoEjecutadoAcum ? meta.costoEjecutadoAcum.toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {meta.presupuestoProgramado
              ? `Prog: $ ${Number(meta.presupuestoProgramado).toLocaleString()}`
              : 'Sin presupuesto'}
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setPestanaActiva('general')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              pestanaActiva === 'general'
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Información General
          </button>
          <button
            onClick={() => setPestanaActiva('programacion')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              pestanaActiva === 'programacion'
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Programación Mensual ({meta.programaciones?.length || 0})
          </button>
          <button
            onClick={() => setPestanaActiva('reportes')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              pestanaActiva === 'reportes'
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Reportes Históricos ({meta.reportes?.length || 0})
          </button>
          <button
            onClick={() => setPestanaActiva('tareas')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              pestanaActiva === 'tareas'
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tareas Asociadas ({meta.tareas?.length || 0})
          </button>
          <button
            onClick={() => setPestanaActiva('observaciones')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              pestanaActiva === 'observaciones'
                ? 'border-institucional-azul text-institucional-azul'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Observaciones y Trazabilidad ({meta.observaciones?.length || 0})
          </button>
          {meta.tieneOperador && (
            <button
              onClick={() => setPestanaActiva('operador')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                pestanaActiva === 'operador'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-indigo-600 hover:text-indigo-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              Contrato Operador ({meta.actividadesOperador?.length || 0})
            </button>
          )}
        </nav>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {pestanaActiva === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Detalles Metodológicos y Fechas
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Código Oficial:</span>
                <span className="font-mono font-bold text-slate-800">{meta.codigo}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Tipo de Meta:</span>
                <span className="font-medium text-slate-800">
                  {meta.unidad?.esBinaria ? 'Documento / Hito Binario' : 'Cuantitativa / Numérica'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Unidad de Medida:</span>
                <span className="font-medium text-slate-800">{meta.unidad?.nombre}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Fecha de Inicio:</span>
                <span className="font-mono text-slate-800">
                  {meta.fechaInicio ? new Date(meta.fechaInicio).toLocaleDateString() : '01/01/2026'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Fecha Fin Oficial (PAS):</span>
                <span className="font-mono text-slate-800">
                  {meta.fechaFinOficial ? new Date(meta.fechaFinOficial).toLocaleDateString() : '31/12/2026'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Fecha de Corte (Seguimiento):</span>
                <span className="font-mono font-semibold text-institucional-azul">
                  {meta.fechaCorte ? new Date(meta.fechaCorte).toLocaleDateString() : '30/11/2026'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Distribución de Programación:</span>
                <span className="font-medium text-slate-800">
                  {meta.distribucionUniforme ? 'Uniforme Oficial (RN-18)' : 'Personalizada por el Responsable'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clasificación y Contexto Institucional
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Área Responsable:</span>
                <span className="font-medium text-slate-800">{meta.area?.nombre}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Componente / Subárea:</span>
                <span className="font-medium text-slate-800">
                  {meta.componente?.nombre || 'General del Área'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Fuente de Recurso:</span>
                <span className="font-medium text-slate-800">
                  {meta.fuenteRecurso?.nombre || 'No especificada'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Población Sujeto:</span>
                <span className="font-medium text-slate-800 line-clamp-2 text-right max-w-xs">
                  {meta.poblacionSujeto?.nombre || 'Población General'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Presupuesto Asignado:</span>
                <span className="font-mono font-bold text-slate-900">
                  {meta.presupuestoProgramado
                    ? `$ ${Number(meta.presupuestoProgramado).toLocaleString()} COP`
                    : 'Sin presupuesto asignado'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Último Mes Reportado:</span>
                <span className="font-semibold text-slate-800">
                  {meta.ultimoMesReportado ? NOMBRES_MESES[meta.ultimoMesReportado - 1] : 'Sin reportes registrados'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {pestanaActiva === 'programacion' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Programación Mensual de Metas (Vigencia 2026)
              </h3>
              <p className="text-xs text-slate-500">
                Distribución mes a mes para el cálculo normativo del avance planeado acumulado (RN-02 y RN-18).
              </p>
            </div>
            {puedeEditarProg && (
              <div className="flex items-center gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
                  onClick={handleRestablecerUniforme}
                >
                  Restablecer Uniforme
                </Boton>
                <Boton
                  variante="primario"
                  tamano="sm"
                  icono={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => setModalProgramacion(true)}
                >
                  Editar Programación
                </Boton>
              </div>
            )}
          </div>

          {/* Grid de los 12 meses */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {NOMBRES_MESES.map((nombreMes, idx) => {
              const mesNum = idx + 1;
              const val = valoresProg[idx] || 0;
              const pct = meta.valorMeta > 0 ? (val / Number(meta.valorMeta)) * 100 : 0;
              const esPasado = mesNum <= 6;

              return (
                <div
                  key={mesNum}
                  className={`p-3 rounded-xl border text-center ${
                    esPasado
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200 hover:border-institucional-azul/30'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {nombreMes}
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {val.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Totales */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500">Suma Total Programada: </span>
                <span className="font-mono font-bold text-slate-900">{sumaProg.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Valor Meta Anual: </span>
                <span className="font-mono font-bold text-slate-900">{Number(meta.valorMeta).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {Math.abs(difProg) < 0.01 ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Programación 100% calibrada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" /> Descuadre: {difProg > 0 ? `Faltan ${difProg}` : `Excede en ${Math.abs(difProg)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {pestanaActiva === 'reportes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Reportes Mensuales Registrados
              </h3>
              <p className="text-xs text-slate-500">
                Registros oficiales de valor ejecutado y costo mensual (RN-08, RN-11 y RN-13).
              </p>
            </div>
            {puedeReportar && meta.estado === 'ABIERTA' && (
              <Boton
                variante="primario"
                tamano="sm"
                icono={<PlusCircle className="w-4 h-4" />}
                onClick={abrirModalReporte}
              >
                Registrar Reporte Mensual
              </Boton>
            )}
          </div>

          {meta.reportes?.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No hay reportes mensuales registrados para esta meta aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <th className="py-2.5 px-3">Mes / Año</th>
                    <th className="py-2.5 px-3 text-right">Valor Ejecutado</th>
                    <th className="py-2.5 px-3 text-right">Costo Ejecutado</th>
                    <th className="py-2.5 px-3">Origen</th>
                    <th className="py-2.5 px-3">Observación</th>
                    <th className="py-2.5 px-3">Fecha Reporte</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {meta.reportes.map((rep: any) => (
                    <tr key={rep.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {NOMBRES_MESES[rep.mes - 1]} {rep.anio}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {rep.valorEjecutado?.toLocaleString()}
                        {rep.porcentajeBinario != null && (
                          <span className="text-[10px] text-blue-600 block">
                            ({rep.porcentajeBinario}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        $ {Number(rep.costoEjecutado || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rep.origen === 'CORRECCION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {rep.origen}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={rep.observacion}>
                        {rep.observacion || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">
                        {new Date(rep.reportadoEn).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {puedeEditarProg && (
                          <button
                            onClick={() => abrirModalCorreccion(rep)}
                            className="text-institucional-azul hover:underline font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Corregir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pestanaActiva === 'tareas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Tareas Operativas Asociadas
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Avance Operativo (RN-04): {meta.avanceOperativo != null ? `${meta.avanceOperativo}%` : '0%'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Plan de trabajo operativo para el cumplimiento de esta meta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Boton
                tamano="sm"
                variante="secundario"
                onClick={() => navigate(`/tareas?metaId=${meta.id}`)}
                className="flex items-center gap-1 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver en Módulo de Tareas
              </Boton>
              {(meta.estado === 'ABIERTA' || meta.estado === 'CUMPLIDA') && (
                <Boton
                  tamano="sm"
                  variante="primario"
                  onClick={() => navigate(`/tareas?metaId=${meta.id}&crear=true`)}
                  className="flex items-center gap-1 text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nueva Tarea
                </Boton>
              )}
            </div>
          </div>

          {/* Resumen KPIs Operativos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Tareas
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {meta.tareas?.length || 0}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Finalizadas
              </span>
              <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                {meta.tareas?.filter((t: any) => t.estado === 'FINALIZADA').length || 0}
              </span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                En Curso / Prog.
              </span>
              <span className="text-lg font-black text-amber-800 mt-0.5 block">
                {meta.tareas?.filter((t: any) => t.estado === 'EN_CURSO' || t.estado === 'PROGRAMADA').length || 0}
              </span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                Vencidas
              </span>
              <span className="text-lg font-black text-rose-800 mt-0.5 block">
                {meta.tareas?.filter((t: any) => t.estado === 'VENCIDA').length || 0}
              </span>
            </div>
          </div>

          {meta.tareas?.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">
                Esta meta aún no tiene tareas operativas programadas.
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Las tareas permiten estructurar actividades con cronograma, reservas de logística y evidencias de ejecución.
              </p>
              {(meta.estado === 'ABIERTA' || meta.estado === 'CUMPLIDA') && (
                <Boton
                  tamano="sm"
                  variante="primario"
                  onClick={() => navigate(`/tareas?metaId=${meta.id}&crear=true`)}
                  className="mx-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Crear Primera Tarea
                </Boton>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {meta.tareas.map((t: any) => {
                const colorEstado: Record<string, string> = {
                  PROGRAMADA: 'bg-sky-50 text-sky-700 border-sky-200',
                  EN_CURSO: 'bg-amber-50 text-amber-700 border-amber-200',
                  VENCIDA: 'bg-rose-50 text-rose-700 border-rose-200',
                  FINALIZADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  CANCELADA: 'bg-slate-100 text-slate-500 border-slate-200',
                };
                return (
                  <div
                    key={t.id}
                    className="p-4 border border-slate-200/80 rounded-xl hover:shadow-sm transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorEstado[t.estado] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {t.estado}
                        </span>
                        {t.categoria && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {t.categoria.nombre}
                          </span>
                        )}
                        {t.requiereSecretaria && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.estadoPresencia === 'CONFIRMADA'
                                ? 'bg-purple-100 text-purple-800'
                                : t.estadoPresencia === 'DECLINADA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Despacho: {t.estadoPresencia || 'PENDIENTE'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {t.titulo}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {t.fechaInicio ? t.fechaInicio.slice(0, 10) : ''}
                          {t.fechaFin && t.fechaFin !== t.fechaInicio ? ` al ${t.fechaFin.slice(0, 10)}` : ''}
                        </span>
                        {t.horaInicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {t.horaInicio} - {t.horaFin || ''}
                          </span>
                        )}
                        {t.responsable && (
                          <span className="text-slate-600 font-medium">
                            Resp: {t.responsable.nombre}
                          </span>
                        )}
                        {t.soportes && t.soportes.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Paperclip className="w-3 h-3 text-slate-400" />
                            {t.soportes.length} soporte(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <Boton
                        tamano="sm"
                        variante="secundario"
                        onClick={() => navigate(`/tareas?metaId=${meta.id}`)}
                        className="text-xs"
                      >
                        Gestionar
                      </Boton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {pestanaActiva === 'observaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Observaciones del Despacho y Trazabilidad (CU-04)
              </h3>
              <p className="text-xs text-slate-500">
                Comentarios formales emitidos por la Secretaría de Salud y planes de acción de los responsables.
              </p>
            </div>
            {(usuario?.rol === 'SECRETARIA' || usuario?.rol === 'ASISTENTE_DESPACHO' || usuario?.rol === 'ADMINISTRADOR') && (
              <Boton
                variante="primario"
                tamano="sm"
                icono={<PlusCircle className="w-4 h-4" />}
                onClick={() => {
                  setErrorObservacion(null);
                  setTextoObservacion('');
                  setModalObservacion(true);
                }}
              >
                Emitir Observación
              </Boton>
            )}
          </div>

          {!meta.observaciones || meta.observaciones.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No hay observaciones registradas para esta meta.
              </p>
              <p className="text-[11px] text-slate-400">
                Las observaciones del Despacho quedan registradas con trazabilidad y notifican al responsable para su atención formal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meta.observaciones.map((obs: any) => {
                const puedeAtender = !obs.atendida && (meta.responsableId === usuario?.id || usuario?.rol === 'ADMINISTRADOR');
                return (
                  <div
                    key={obs.id}
                    className={`p-4 border rounded-xl space-y-2.5 transition-all ${
                      obs.atendida
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {obs.autor?.nombre || 'Despacho de Salud'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {obs.autor?.cargo || obs.autor?.rol} · {obs.creadoEn ? new Date(obs.creadoEn).toLocaleDateString('es-CO') : ''}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit ${
                          obs.atendida ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {obs.atendida ? 'Atendida' : 'Pendiente de Respuesta'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      "{obs.texto}"
                    </p>

                    {obs.respuesta ? (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span className="font-semibold text-slate-700">Respuesta / Plan de Choque del Responsable:</span>
                          <span>{obs.atendidaEn ? new Date(obs.atendidaEn).toLocaleDateString('es-CO') : ''}</span>
                        </div>
                        <p className="text-slate-700">{obs.respuesta}</p>
                      </div>
                    ) : puedeAtender ? (
                      <div className="pt-2 flex justify-end">
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          className="text-xs font-semibold"
                          onClick={() => {
                            setObsSeleccionada(obs);
                            setRespuestaObs('');
                            setErrorRespuestaObs(null);
                            setModalAtenderObs(true);
                          }}
                        >
                          Responder / Atender Observación
                        </Boton>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {pestanaActiva === 'operador' && (
        <div className="space-y-6">
          {/* Tarjeta Ejecutiva del Operador */}
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    <Briefcase className="w-3 h-3" /> Contrato de Gestión 2026
                  </span>
                  <span className="text-xs text-indigo-300">Ejecución tercerizada bajo supervisión</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Actividades Asignadas al Operador Externo
                </h3>
                <p className="text-xs text-indigo-200/90 max-w-3xl leading-relaxed">
                  Las siguientes actividades forman parte del cumplimiento de esta meta y son ejecutadas por la empresa contratada bajo la supervisión técnica del área de <strong className="text-white">{meta.area?.nombre}</strong> de la Secretaría de Salud.
                </p>
              </div>

              {meta.resumenOperador?.porcentajeCumplimiento !== null && (
                <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/20 text-center shrink-0">
                  <span className="text-[11px] uppercase font-bold text-indigo-200 tracking-wider block">
                    Avance Operador
                  </span>
                  <span className="text-3xl font-extrabold text-white">
                    {meta.resumenOperador?.porcentajeCumplimiento}%
                  </span>
                  <div className="w-24 bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden mx-auto">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(meta.resumenOperador?.porcentajeCumplimiento || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Micro-indicadores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-700/50 text-xs">
              <div className="bg-indigo-950/50 rounded-lg p-2.5 border border-indigo-700/30">
                <span className="text-indigo-300 text-[10px] uppercase font-bold block">Total Actividades</span>
                <span className="text-base font-bold text-white">{meta.actividadesOperador?.length || 0}</span>
              </div>
              <div className="bg-indigo-950/50 rounded-lg p-2.5 border border-indigo-700/30">
                <span className="text-emerald-300 text-[10px] uppercase font-bold block">Ejecutadas</span>
                <span className="text-base font-bold text-emerald-300">
                  {meta.actividadesOperador?.filter((a: any) => a.estado === 'EJECUTADA').length || 0}
                </span>
              </div>
              <div className="bg-indigo-950/50 rounded-lg p-2.5 border border-indigo-700/30">
                <span className="text-blue-300 text-[10px] uppercase font-bold block">En Ejecución</span>
                <span className="text-base font-bold text-blue-300">
                  {meta.actividadesOperador?.filter((a: any) => a.estado === 'EN_EJECUCION').length || 0}
                </span>
              </div>
              <div className="bg-indigo-950/50 rounded-lg p-2.5 border border-indigo-700/30">
                <span className="text-amber-300 text-[10px] uppercase font-bold block">Pendientes</span>
                <span className="text-base font-bold text-amber-300">
                  {meta.actividadesOperador?.filter((a: any) => a.estado === 'PENDIENTE').length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Listado de Actividades Detalladas */}
          {(!meta.actividadesOperador || meta.actividadesOperador.length === 0) ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No hay actividades del operador asociadas a esta meta.
              </p>
              <p className="text-[11px] text-slate-400">
                Esta meta se gestiona directamente por el talento humano de la Secretaría de Salud.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meta.actividadesOperador.map((act: any) => {
                const badgeStyle =
                  act.estado === 'EJECUTADA'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : act.estado === 'EN_EJECUCION'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : act.estado === 'A_DEMANDA'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300';

                const estadoTexto =
                  act.estado === 'EJECUTADA'
                    ? 'Ejecutada'
                    : act.estado === 'EN_EJECUCION'
                    ? 'En Ejecución'
                    : act.estado === 'A_DEMANDA'
                    ? 'A Demanda'
                    : 'Pendiente';

                const pctNum = act.porcentajeCumplimiento !== null && act.porcentajeCumplimiento !== undefined
                  ? Number(act.porcentajeCumplimiento)
                  : null;

                return (
                  <div
                    key={act.id || act.consecutivo}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-indigo-300 transition-colors"
                  >
                    {/* Encabezado de la actividad */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          Item #{act.consecutivo}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                          {estadoTexto}
                        </span>
                      </div>

                      {/* Progreso Numérico */}
                      <div className="flex items-center gap-3">
                        {act.denominador !== null && act.numerador !== null && (
                          <div className="text-right text-xs">
                            <span className="text-slate-500 font-medium">Ejecutado / Meta: </span>
                            <span className="font-bold text-slate-800 font-mono">
                              {Number(act.numerador)} / {Number(act.denominador)}
                            </span>
                          </div>
                        )}
                        {pctNum !== null && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pctNum >= 100
                                    ? 'bg-emerald-500'
                                    : pctNum > 0
                                    ? 'bg-blue-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min(pctNum, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-slate-800 font-mono w-10 text-right">
                              {pctNum}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descripción de la Actividad */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Actividad a Desarrollar
                      </span>
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {act.actividad}
                      </p>
                    </div>

                    {/* Grid de Obligación y Compromiso */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {act.obligacion && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                          <span className="font-bold text-slate-600 block text-[11px]">
                            Obligación Contractual:
                          </span>
                          <p className="text-slate-700 leading-relaxed">{act.obligacion}</p>
                        </div>
                      )}

                      {act.resumenCompromiso && (
                        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-1">
                          <span className="font-bold text-indigo-900 block text-[11px]">
                            Resumen del Compromiso:
                          </span>
                          <p className="text-indigo-900/90 leading-relaxed">{act.resumenCompromiso}</p>
                        </div>
                      )}
                    </div>

                    {/* Soportes y Observaciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      {act.soportesVerificacion && (
                        <div className="space-y-1">
                          <span className="font-bold text-slate-500 block text-[11px]">
                            Soportes de Verificación Exigidos:
                          </span>
                          <p className="text-slate-600 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200/50 leading-relaxed">
                            {act.soportesVerificacion}
                          </p>
                        </div>
                      )}

                      {act.observaciones && (
                        <div className="space-y-1">
                          <span className="font-bold text-slate-500 block text-[11px]">
                            Observaciones / Estado Actual:
                          </span>
                          <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                            {act.observaciones}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REGISTRAR REPORTE MENSUAL (CU-05) CON SIMULACIÓN PROYECTADA EN VIVO */}
      <Modal
        abierto={modalReporte}
        alCerrar={() => setModalReporte(false)}
        titulo={`Registrar Reporte Mensual — Meta #${meta.codigo}`}
      >
        <form onSubmit={handleCrearReporte} className="space-y-4">
          {errorReporte && <Alerta tipo="error" mensaje={errorReporte} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mes a Reportar (Vigencia 2026) *
              </label>
              <select
                required
                value={formReporte.mes}
                onChange={(e) => setFormReporte({ ...formReporte, mes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium"
              >
                {mesesDisponiblesParaReportar.map((m) => (
                  <option key={m} value={m}>
                    {NOMBRES_MESES[m - 1]} 2026
                  </option>
                ))}
              </select>
            </div>

            {meta.unidad?.esBinaria ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Porcentaje de Avance Binario (0 a 100%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  required
                  placeholder="0 a 100"
                  value={formReporte.porcentajeBinario}
                  onChange={(e) =>
                    setFormReporte({ ...formReporte, porcentajeBinario: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-lg"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Unidades Documento: Si reporta entre 1% y 99% la observación es obligatoria (RN-08).
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Ejecutado en el Mes ({meta.unidad?.nombre}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej: 15"
                  value={formReporte.valorEjecutado}
                  onChange={(e) =>
                    setFormReporte({ ...formReporte, valorEjecutado: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Costo Ejecutado en el Mes ($ COP)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0 si no hubo gasto financiero"
              value={formReporte.costoEjecutado}
              onChange={(e) =>
                setFormReporte({ ...formReporte, costoEjecutado: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones / Justificación de la Ejecución
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre las acciones realizadas o justificación de desviaciones..."
              value={formReporte.observacion}
              onChange={(e) =>
                setFormReporte({ ...formReporte, observacion: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          {/* PANEL DE PROYECCIÓN EN VIVO DEL IMPACTO (CU-05) */}
          {proyeccionReporte && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                <span>Impacto Proyectado tras este Reporte:</span>
                {calculandoProyeccion && (
                  <span className="text-[10px] text-slate-400 font-normal">Calculando...</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Nuevo Acumulado</div>
                  <div className="text-sm font-bold font-mono text-slate-800">
                    {proyeccionReporte.proyectado.acumulado.toLocaleString()}{' '}
                    <span className="text-[10px] text-slate-400">/ {proyeccionReporte.valorMeta}</span>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Nuevo Avance %</div>
                  <div className="text-sm font-bold font-mono text-slate-800">
                    {proyeccionReporte.proyectado.avance.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-slate-400 uppercase">Semáforo Proyectado</div>
                  <div className="mt-0.5">
                    <SemaforoBadge
                      color={proyeccionReporte.proyectado.semaforo}
                      brecha={proyeccionReporte.proyectado.brecha}
                      tamano="sm"
                    />
                  </div>
                </div>
              </div>

              {proyeccionReporte.proyectado.cumpleMeta && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ¡Excelente! Este reporte llevará la meta al 100% y pasará automáticamente al estado CUMPLIDA.
                </div>
              )}

              {proyeccionReporte.proyectado.sobrePresupuesto && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  Alerta: El costo acumulado superará el presupuesto programado. Se exige observación obligatoria (RN-14).
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalReporte(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" tipo="submit" cargando={guardandoReporte}>
              Guardar Reporte Mensual
            </Boton>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CORREGIR REPORTE MENSUAL EXISTENTE (CU-06) */}
      <Modal
        abierto={modalCorreccion}
        alCerrar={() => setModalCorreccion(false)}
        titulo={`Corregir Reporte de ${reporteACorregir ? NOMBRES_MESES[reporteACorregir.mes - 1] : ''} ${reporteACorregir?.anio || ''}`}
      >
        <form onSubmit={handleCorregirReporte} className="space-y-4">
          {errorCorreccion && <Alerta tipo="error" mensaje={errorCorreccion} />}

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Auditoría Normativa de Corrección (RN-13)
            </div>
            <div>
              Esta modificación reemplazará los valores del mes y quedará registrada en la bitácora inmutable con el motivo y los valores anteriores.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meta.unidad?.esBinaria ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Porcentaje de Avance Binario (0 a 100%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  required
                  value={formCorreccion.porcentajeBinario}
                  onChange={(e) =>
                    setFormCorreccion({ ...formCorreccion, porcentajeBinario: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-lg"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Ejecutado Corregido ({meta.unidad?.nombre}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formCorreccion.valorEjecutado}
                  onChange={(e) =>
                    setFormCorreccion({ ...formCorreccion, valorEjecutado: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Costo Ejecutado Corregido ($ COP)
              </label>
              <input
                type="number"
                step="any"
                value={formCorreccion.costoEjecutado}
                onChange={(e) =>
                  setFormCorreccion({ ...formCorreccion, costoEjecutado: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observación del Reporte (opcional)
            </label>
            <input
              type="text"
              value={formCorreccion.observacion}
              onChange={(e) =>
                setFormCorreccion({ ...formCorreccion, observacion: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo Formal de la Corrección * (mínimo 5 caracteres)
            </label>
            <textarea
              rows={2}
              required
              placeholder="Explique la causa de la modificación para el registro de auditoría..."
              value={formCorreccion.motivo}
              onChange={(e) =>
                setFormCorreccion({ ...formCorreccion, motivo: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalCorreccion(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              tipo="submit"
              cargando={guardandoCorreccion}
              disabled={formCorreccion.motivo.trim().length < 5}
            >
              Confirmar Corrección
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Responsable */}
      <Modal
        abierto={modalResponsable}
        alCerrar={() => setModalResponsable(false)}
        titulo="Asignar Responsable de la Meta"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Selecciona al funcionario responsable de reportar los avances mensuales de esta meta:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Funcionario del Área ({meta.area?.codigo})
            </label>
            <select
              value={nuevoResponsableId}
              onChange={(e) => setNuevoResponsableId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Seleccione un usuario...</option>
              {usuariosArea.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} — {u.cargo || u.rol} ({u.correo})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalResponsable(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              cargando={guardandoResponsable}
              onClick={handleGuardarResponsable}
              disabled={!nuevoResponsableId}
            >
              Guardar Asignación
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Meta */}
      <Modal
        abierto={modalEditar}
        alCerrar={() => setModalEditar(false)}
        titulo="Editar Datos Básicos de la Meta"
      >
        <form onSubmit={handleGuardarEditar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción de la Actividad / Meta *
            </label>
            <textarea
              required
              rows={3}
              value={formEditar.descripcion}
              onChange={(e) => setFormEditar({ ...formEditar, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Meta Anual *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formEditar.valorMeta}
                onChange={(e) => setFormEditar({ ...formEditar, valorMeta: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Presupuesto Programado ($ COP)
              </label>
              <input
                type="number"
                step="any"
                value={formEditar.presupuestoProgramado}
                onChange={(e) => setFormEditar({ ...formEditar, presupuestoProgramado: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={formEditar.fechaInicio}
                onChange={(e) => setFormEditar({ ...formEditar, fechaInicio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Fin Oficial</label>
              <input
                type="date"
                value={formEditar.fechaFinOficial}
                onChange={(e) => setFormEditar({ ...formEditar, fechaFinOficial: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Corte</label>
              <input
                type="date"
                value={formEditar.fechaCorte}
                onChange={(e) => setFormEditar({ ...formEditar, fechaCorte: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalEditar(false)}>
              Cancelar
            </Boton>
            <Boton variante="primario" tipo="submit" cargando={guardandoEditar}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Programación Mensual */}
      <Modal
        abierto={modalProgramacion}
        alCerrar={() => setModalProgramacion(false)}
        titulo="Editar Programación Mensual de la Meta"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Distribuye el valor anual ({meta.valorMeta} {meta.unidad?.nombre}) en cada mes. La suma de los 12 meses debe ser exactamente igual al valor meta anual.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[350px] overflow-y-auto p-1">
            {NOMBRES_MESES.map((nombreMes, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {nombreMes}
                </label>
                <input
                  type="number"
                  step="any"
                  value={valoresProg[idx]}
                  onChange={(e) => {
                    const nuevoArr = [...valoresProg];
                    nuevoArr[idx] = Number(e.target.value);
                    setValoresProg(nuevoArr);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded bg-white"
                />
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600">Suma actual: </span>
              <span className="font-bold font-mono text-slate-900">{sumaProg}</span>
              <span className="text-slate-400"> / {meta.valorMeta}</span>
            </div>
            <div>
              {Math.abs(difProg) < 0.01 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Suma exacta
                </span>
              ) : (
                <span className="text-red-700 font-bold">
                  {difProg > 0 ? `Faltan ${difProg}` : `Excede en ${Math.abs(difProg)}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalProgramacion(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              cargando={guardandoProg}
              disabled={Math.abs(difProg) >= 0.01}
              onClick={handleGuardarProgramacion}
            >
              Guardar Programación
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Modal Cerrar Meta */}
      <Modal
        abierto={modalCerrar}
        alCerrar={() => setModalCerrar(false)}
        titulo="Cerrar Meta sin Cumplir"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Esta acción marcará la meta como <strong>CERRADA_SIN_CUMPLIR</strong>. Debe justificar el motivo normativo para la bitácora de auditoría.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo del Cierre * (mínimo 5 caracteres)
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explique la justificación técnica / administrativa..."
              value={motivoCierre}
              onChange={(e) => setMotivoCierre(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalCerrar(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              cargando={guardandoCierre}
              disabled={motivoCierre.trim().length < 5}
              onClick={handleCerrarMeta}
            >
              Confirmar Cierre
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Modal Reabrir Meta */}
      <Modal
        abierto={modalReabrir}
        alCerrar={() => setModalReabrir(false)}
        titulo="Reabrir Meta (RN-06)"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Solo el Administrador del Sistema puede reabrir una meta cerrada o cumplida. Se registrará en la auditoría.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de Reapertura * (mínimo 5 caracteres)
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explique la justificación de la reapertura..."
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalReabrir(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              cargando={guardandoReapertura}
              disabled={motivoReapertura.trim().length < 5}
              onClick={handleReabrirMeta}
            >
              Reabrir Meta
            </Boton>
          </div>
        </div>
      </Modal>
      {/* Modal Emitir Observación Despacho (CU-04) */}
      <Modal
        abierto={modalObservacion}
        alCerrar={() => setModalObservacion(false)}
        titulo="Emitir Observación Formal del Despacho (CU-04)"
      >
        <form onSubmit={handleCrearObservacion} className="space-y-4">
          {errorObservacion && <Alerta tipo="error" mensaje={errorObservacion} />}

          <p className="text-xs text-slate-600">
            Esta observación se notificará inmediatamente al responsable de la meta y quedará registrada en la bitácora oficial de seguimiento.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observación / Requerimiento del Despacho *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Indique el llamado de atención, solicitud de aclaración o directriz para el responsable..."
              value={textoObservacion}
              onChange={(e) => setTextoObservacion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
            <span className="text-[10px] text-slate-400">Mínimo 5 caracteres.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalObservacion(false)}>
              Cancelar
            </Boton>
            <Boton
              tipo="submit"
              variante="primario"
              cargando={guardandoObservacion}
              disabled={textoObservacion.trim().length < 5}
            >
              Emitir Observación
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Atender Observación Despacho */}
      <Modal
        abierto={modalAtenderObs}
        alCerrar={() => setModalAtenderObs(false)}
        titulo="Atender Observación del Despacho (CU-04)"
      >
        <form onSubmit={handleAtenderObservacion} className="space-y-4">
          {errorRespuestaObs && <Alerta tipo="error" mensaje={errorRespuestaObs} />}

          {obsSeleccionada && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-slate-700 block">Observación formulada:</span>
              <p className="text-slate-600 italic">"{obsSeleccionada.texto}"</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Respuesta / Plan de Acción Inmediato *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Explique las medidas adoptadas, avances recientes o aclaraciones solicitadas..."
              value={respuestaObs}
              onChange={(e) => setRespuestaObs(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
            <span className="text-[10px] text-slate-400">Mínimo 5 caracteres.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Boton variante="secundario" onClick={() => setModalAtenderObs(false)}>
              Cancelar
            </Boton>
            <Boton
              tipo="submit"
              variante="primario"
              cargando={guardandoRespuestaObs}
              disabled={respuestaObs.trim().length < 5}
            >
              Registrar Respuesta
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
