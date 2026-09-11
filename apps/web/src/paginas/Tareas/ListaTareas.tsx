import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  Paperclip,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  Layers,
  RotateCcw,
  XCircle,
  Eye,
  FileText,
} from 'lucide-react';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { Boton } from '../../componentes/ui/Boton';
import { Modal } from '../../componentes/ui/Modal';
import { Alerta } from '../../componentes/ui/Alerta';
import { AutoSuggestMeta } from '../../componentes/ui/AutoSuggestMeta';

interface TareaItem {
  id: string;
  metaId: string;
  titulo: string;
  descripcion?: string | null;
  fase?: string | null;
  categoriaId?: string | null;
  responsableId: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  lugar?: string | null;
  requiereSecretaria: boolean;
  estadoPresencia?: 'PENDIENTE' | 'CONFIRMADA' | 'DECLINADA' | null;
  motivoDeclinacion?: string | null;
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'VENCIDA' | 'FINALIZADA' | 'CANCELADA';
  finalizadaEn?: string | null;
  observacionCierre?: string | null;
  meta: {
    id: string;
    codigo: string;
    descripcion: string;
    estado: string;
    area: { id: string; codigo: string; nombre: string };
    componente?: { id: string; codigo: string; nombre: string } | null;
  };
  responsable: {
    id: string;
    nombre: string;
    correo: string;
    cargo?: string | null;
  };
  categoria?: { id: string; nombre: string } | null;
  recursos: Array<{
    recurso: { id: string; nombre: string };
    cantidad: number;
    nota?: string | null;
  }>;
  soportes: Array<{
    id: string;
    nombreOriginal: string;
    tipoMime: string;
    tamanoBytes: number;
    subidoEn: string;
  }>;
}

export const ListaTareas: React.FC = () => {
  const { usuario } = useSesion();
  const [searchParams] = useSearchParams();

  // Estados de datos
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Catálogos
  const [areas, setAreas] = useState<any[]>([]);
  const [componentes, setComponentes] = useState<any[]>([]);
  const [metasDisponibles, setMetasDisponibles] = useState<any[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [recursosCatalogo, setRecursosCatalogo] = useState<any[]>([]);

  // Filtros
  const [vistaRapida, setVistaRapida] = useState<'todas' | 'mis_tareas' | 'despacho' | 'vencidas'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [componenteFiltro, setComponenteFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamano] = useState(25);

  // Modal Crear/Editar Tarea
  const [modalCrear, setModalCrear] = useState(false);
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [errorTarea, setErrorTarea] = useState<string | null>(null);
  const [formTarea, setFormTarea] = useState({
    metaId: searchParams.get('metaId') || '',
    titulo: '',
    descripcion: '',
    fase: '',
    categoriaId: '',
    responsableId: usuario?.id || '',
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFin: new Date().toISOString().slice(0, 10),
    tieneHorario: false,
    horaInicio: '08:00',
    horaFin: '10:00',
    lugar: '',
    requiereSecretaria: false,
    recursosSeleccionados: [] as Array<{ recursoId: string; cantidad: number; nota: string }>,
  });

  // Alerta de cruces de agenda en modal
  const [alertaCruces, setAlertaCruces] = useState<any>(null);
  const [verificandoCruces, setVerificandoCruces] = useState(false);

  // Modal Finalizar Tarea (CU-08)
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [tareaAFinalizar, setTareaAFinalizar] = useState<TareaItem | null>(null);
  const [observacionCierre, setObservacionCierre] = useState('');
  const [archivosSoporte, setArchivosSoporte] = useState<File[]>([]);
  const [subiendoSoportes, setSubiendoSoportes] = useState(false);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);

  // Modal Reabrir Tarea (CU-09)
  const [modalReabrir, setModalReabrir] = useState(false);
  const [tareaAReabrir, setTareaAReabrir] = useState<TareaItem | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [guardandoReapertura, setGuardandoReapertura] = useState(false);
  const [errorReapertura, setErrorReapertura] = useState<string | null>(null);

  // Modal Cancelar Tarea (RN-24)
  const [modalCancelar, setModalCancelar] = useState(false);
  const [tareaACancelar, setTareaACancelar] = useState<TareaItem | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [guardandoCancelacion, setGuardandoCancelacion] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null);

  // Modal Ver Detalle / Soportes
  const [modalDetalle, setModalDetalle] = useState(false);
  const [tareaDetalle, setTareaDetalle] = useState<TareaItem | null>(null);

  // Cargar catálogos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [areasRes, compRes, metasRes, userRes, catRes, recRes] = await Promise.all([
          api.get('/areas'),
          api.get('/componentes'),
          api.get('/metas', { params: { tamano: 300 } }),
          api.get('/usuarios', { params: { tamano: 150 } }),
          api.get('/catalogos/categorias-tarea').catch(() => ({ data: [] })),
          api.get('/catalogos/recursos').catch(() => ({ data: [] })),
        ]);
        setAreas(areasRes.data || []);
        setComponentes(compRes.data || []);
        setMetasDisponibles(metasRes.data?.datos || []);
        setUsuariosDisponibles(userRes.data?.datos || userRes.data || []);
        setCategorias(catRes.data || []);
        setRecursosCatalogo(recRes.data || []);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };
    cargarDatos();
  }, []);

  // Cargar tareas
  const cargarTareas = async () => {
    setCargando(true);
    setError(null);
    try {
      const params: any = {
        pagina,
        tamano,
      };
      if (busqueda.trim()) params.busqueda = busqueda.trim();
      if (areaFiltro) params.areaId = areaFiltro;
      if (componenteFiltro) params.componenteId = componenteFiltro;
      if (estadoFiltro) params.estado = estadoFiltro;

      if (vistaRapida === 'mis_tareas' && usuario?.id) {
        params.responsableId = usuario.id;
      }
      if (vistaRapida === 'despacho') {
        params.requiereSecretaria = 'true';
      }
      if (vistaRapida === 'vencidas') {
        params.estado = 'VENCIDA';
      }

      const res = await api.get('/tareas', { params });
      setTareas(res.data.datos || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Error cargando tareas:', err);
      setError('No fue posible cargar el listado de tareas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
  }, [pagina, areaFiltro, componenteFiltro, estadoFiltro, vistaRapida]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagina(1);
      cargarTareas();
    }, 350);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Componentes filtrados
  const componentesFiltrados = useMemo(() => {
    if (!areaFiltro) return componentes;
    return componentes.filter((c) => c.areaId === areaFiltro);
  }, [areaFiltro, componentes]);

  // Manejar verificación de cruces en caliente (RN-27)
  const verificarCrucesAgenda = async () => {
    if (!formTarea.tieneHorario || !formTarea.horaInicio || !formTarea.horaFin) {
      setAlertaCruces(null);
      return;
    }
    setVerificandoCruces(true);
    try {
      const res = await api.post('/tareas/verificar-cruces', {
        fecha: formTarea.fechaInicio,
        horaInicio: formTarea.horaInicio,
        horaFin: formTarea.horaFin,
        responsableId: formTarea.responsableId,
        requiereSecretaria: formTarea.requiereSecretaria,
      });
      setAlertaCruces(res.data.hayCruces ? res.data : null);
    } catch (err) {
      console.error('Error verificando cruces:', err);
    } finally {
      setVerificandoCruces(false);
    }
  };

  useEffect(() => {
    if (modalCrear && formTarea.tieneHorario) {
      const timer = setTimeout(() => {
        verificarCrucesAgenda();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [
    modalCrear,
    formTarea.tieneHorario,
    formTarea.fechaInicio,
    formTarea.horaInicio,
    formTarea.horaFin,
    formTarea.responsableId,
    formTarea.requiereSecretaria,
  ]);

  // Manejar creación de tarea (CU-07)
  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTarea(null);

    if (!formTarea.metaId || !formTarea.titulo.trim() || !formTarea.responsableId) {
      setErrorTarea('Por favor completa los campos obligatorios (Meta, Título y Responsable).');
      return;
    }

    if (formTarea.tieneHorario && formTarea.horaFin <= formTarea.horaInicio) {
      setErrorTarea('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    setGuardandoTarea(true);
    try {
      const payload: any = {
        metaId: formTarea.metaId,
        titulo: formTarea.titulo.trim(),
        descripcion: formTarea.descripcion.trim() || undefined,
        fase: formTarea.fase.trim() || undefined,
        categoriaId: formTarea.categoriaId || undefined,
        responsableId: formTarea.responsableId,
        fechaInicio: formTarea.fechaInicio,
        fechaFin: formTarea.tieneHorario ? formTarea.fechaInicio : formTarea.fechaFin,
        requiereSecretaria: formTarea.requiereSecretaria,
        recursos: formTarea.recursosSeleccionados.map((r) => ({
          recursoId: r.recursoId,
          cantidad: r.cantidad || 1,
          nota: r.nota || undefined,
        })),
      };

      if (formTarea.tieneHorario) {
        payload.horaInicio = formTarea.horaInicio;
        payload.horaFin = formTarea.horaFin;
      }
      if (formTarea.lugar.trim()) {
        payload.lugar = formTarea.lugar.trim();
      }

      await api.post('/tareas', payload);
      setModalCrear(false);
      setMensajeExito('Tarea creada exitosamente con trazabilidad normativa.');
      setTimeout(() => setMensajeExito(null), 4000);
      setFormTarea({
        metaId: '',
        titulo: '',
        descripcion: '',
        fase: '',
        categoriaId: '',
        responsableId: usuario?.id || '',
        fechaInicio: new Date().toISOString().slice(0, 10),
        fechaFin: new Date().toISOString().slice(0, 10),
        tieneHorario: false,
        horaInicio: '08:00',
        horaFin: '10:00',
        lugar: '',
        requiereSecretaria: false,
        recursosSeleccionados: [],
      });
      setAlertaCruces(null);
      await cargarTareas();
    } catch (err: any) {
      setErrorTarea(err.response?.data?.mensaje || 'Error al crear la tarea.');
    } finally {
      setGuardandoTarea(false);
    }
  };

  // Abrir modal finalizar
  const abrirModalFinalizar = (tarea: TareaItem) => {
    setTareaAFinalizar(tarea);
    setObservacionCierre('');
    setArchivosSoporte([]);
    setErrorFinalizar(null);
    setModalFinalizar(true);
  };

  // Manejar finalizar tarea (CU-08, RN-22)
  const handleFinalizarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaAFinalizar) return;
    setErrorFinalizar(null);

    const totalSoportes = tareaAFinalizar.soportes.length + archivosSoporte.length;
    if (totalSoportes === 0) {
      setErrorFinalizar('Para finalizar la tarea es obligatorio adjuntar al menos un archivo de soporte (RN-22).');
      return;
    }

    if (!observacionCierre.trim() || observacionCierre.trim().length < 5) {
      setErrorFinalizar('La observación de cierre es obligatoria (mínimo 5 caracteres).');
      return;
    }

    setSubiendoSoportes(true);
    try {
      // 1. Subir archivos si hay nuevos
      if (archivosSoporte.length > 0) {
        const formData = new FormData();
        formData.append('tareaId', tareaAFinalizar.id);
        for (const file of archivosSoporte) {
          formData.append('archivos', file);
        }
        await api.post('/soportes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 2. Finalizar la tarea
      await api.post(`/tareas/${tareaAFinalizar.id}/finalizar`, {
        observacionCierre: observacionCierre.trim(),
      });

      setModalFinalizar(false);
      setMensajeExito(`Tarea "${tareaAFinalizar.titulo}" finalizada con éxito y evidencias registradas.`);
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarTareas();
    } catch (err: any) {
      setErrorFinalizar(err.response?.data?.mensaje || 'Error al finalizar la tarea.');
    } finally {
      setSubiendoSoportes(false);
    }
  };

  // Abrir modal reabrir
  const abrirModalReabrir = (tarea: TareaItem) => {
    setTareaAReabrir(tarea);
    setMotivoReapertura('');
    setErrorReapertura(null);
    setModalReabrir(true);
  };

  const handleReabrirTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaAReabrir) return;
    if (!motivoReapertura.trim() || motivoReapertura.trim().length < 5) {
      setErrorReapertura('El motivo de reapertura es obligatorio (mínimo 5 caracteres).');
      return;
    }

    setGuardandoReapertura(true);
    try {
      await api.post(`/tareas/${tareaAReabrir.id}/reabrir`, {
        motivo: motivoReapertura.trim(),
      });
      setModalReabrir(false);
      setMensajeExito('Tarea reabierta correctamente.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarTareas();
    } catch (err: any) {
      setErrorReapertura(err.response?.data?.mensaje || 'Error al reabrir la tarea.');
    } finally {
      setGuardandoReapertura(false);
    }
  };

  // Abrir modal cancelar
  const abrirModalCancelar = (tarea: TareaItem) => {
    setTareaACancelar(tarea);
    setMotivoCancelacion('');
    setErrorCancelacion(null);
    setModalCancelar(true);
  };

  const handleCancelarTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaACancelar) return;
    if (!motivoCancelacion.trim() || motivoCancelacion.trim().length < 5) {
      setErrorCancelacion('El motivo de cancelación es obligatorio (mínimo 5 caracteres).');
      return;
    }

    setGuardandoCancelacion(true);
    try {
      await api.post(`/tareas/${tareaACancelar.id}/cancelar`, {
        motivo: motivoCancelacion.trim(),
      });
      setModalCancelar(false);
      setMensajeExito('Tarea cancelada.');
      setTimeout(() => setMensajeExito(null), 4000);
      await cargarTareas();
    } catch (err: any) {
      setErrorCancelacion(err.response?.data?.mensaje || 'Error al cancelar la tarea.');
    } finally {
      setGuardandoCancelacion(false);
    }
  };

  const puedeCrear =
    usuario?.rol === 'ADMINISTRADOR' ||
    usuario?.rol === 'LIDER_AREA' ||
    usuario?.rol === 'LIDER_COMPONENTE' ||
    usuario?.rol === 'FUNCIONARIO' ||
    usuario?.rol === 'ASISTENTE_DESPACHO';

  const puedeReabrir =
    usuario?.rol === 'ADMINISTRADOR' ||
    usuario?.rol === 'LIDER_AREA' ||
    usuario?.rol === 'LIDER_COMPONENTE';

  return (
    <div className="space-y-6">
      {/* Mensaje de Éxito */}
      {mensajeExito && (
        <Alerta tipo="exito" mensaje={mensajeExito} />
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tareas Operativas y Evidencias
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-1 rounded-full">
              {total} Registradas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Planificación diaria, soportes de ejecución (RN-22) y seguimiento de compromisos en salud.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/calendario">
            <Boton variante="secundario" tamano="sm" icono={<Calendar className="w-4 h-4 text-institucional-azul" />}>
              Ver Calendario
            </Boton>
          </Link>
          {puedeCrear && (
            <Boton
              variante="primario"
              tamano="sm"
              icono={<Plus className="w-4 h-4" />}
              onClick={() => setModalCrear(true)}
            >
              Nueva Tarea
            </Boton>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { setVistaRapida('todas'); setEstadoFiltro(''); setPagina(1); }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-institucional-azul/40 transition-all"
        >
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tareas</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vigencia 2026</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('EN_CURSO'); setVistaRapida('todas'); setPagina(1); }}
          className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80 shadow-sm cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">En Curso</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">Activas</div>
          <div className="text-[11px] text-blue-700 mt-0.5">En ejecución</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('PROGRAMADA'); setVistaRapida('todas'); setPagina(1); }}
          className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Programadas</span>
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-1">Futuras</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Por iniciar</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('VENCIDA'); setVistaRapida('todas'); setPagina(1); }}
          className="bg-red-50/60 p-3.5 rounded-xl border border-red-200/80 shadow-sm cursor-pointer hover:border-red-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider">Vencidas</span>
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">Alerta</div>
          <div className="text-[11px] text-red-700 mt-0.5">Sin soporte de cierre</div>
        </div>

        <div
          onClick={() => { setEstadoFiltro('FINALIZADA'); setVistaRapida('todas'); setPagina(1); }}
          className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-sm cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Finalizadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">Con Evidencias</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">RN-22 completadas</div>
        </div>

        <div
          onClick={() => { setVistaRapida('despacho'); setEstadoFiltro(''); setPagina(1); }}
          className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 shadow-sm cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Despacho</span>
            <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">Secretaria</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Requieren presencia</div>
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
            Todas las Tareas
          </button>
          <button
            type="button"
            onClick={() => { setVistaRapida('mis_tareas'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              vistaRapida === 'mis_tareas'
                ? 'bg-institucional-azul text-white shadow-sm font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Mis Tareas Asignadas
          </button>
          <button
            type="button"
            onClick={() => { setVistaRapida('despacho'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              vistaRapida === 'despacho'
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
            Presencia de la Secretaria (RN-28)
          </button>
          <button
            type="button"
            onClick={() => { setVistaRapida('vencidas'); setPagina(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              vistaRapida === 'vencidas'
                ? 'bg-red-600 text-white shadow-sm font-semibold'
                : 'bg-red-50 text-red-800 border border-red-200/80 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Vencidas sin Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por título, lugar o código de meta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
          </div>

          {/* Filtro por Área */}
          <div>
            <select
              value={areaFiltro}
              onChange={(e) => {
                setAreaFiltro(e.target.value);
                setComponenteFiltro('');
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
              value={componenteFiltro}
              onChange={(e) => {
                setComponenteFiltro(e.target.value);
                setPagina(1);
              }}
              disabled={!areaFiltro || componentesFiltrados.length === 0}
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

          {/* Filtro por Estado */}
          <div>
            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setPagina(1);
              }}
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            >
              <option value="">Todos los Estados</option>
              <option value="EN_CURSO">En Curso</option>
              <option value="PROGRAMADA">Programada</option>
              <option value="VENCIDA">Vencida</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Tareas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-4 border-institucional-azul border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium">Cargando tareas y verificando estados temporales...</p>
          </div>
        ) : error ? (
          <div className="p-8">
            <Alerta tipo="error" mensaje={error} />
          </div>
        ) : tareas.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No se encontraron tareas</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No hay tareas registradas que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 min-w-[260px]">Tarea / Actividad</th>
                  <th className="py-3 px-4">Meta Vinculada</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4">Fechas y Horario</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Despacho</th>
                  <th className="py-3 px-4 text-center">Soportes</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tareas.map((t) => {
                  const inicio = t.fechaInicio.slice(0, 10);
                  const fin = t.fechaFin.slice(0, 10);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tarea / Actividad */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.titulo}</div>
                        {t.descripcion && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {t.descripcion}
                          </div>
                        )}
                        {t.lugar && (
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {t.lugar}
                          </div>
                        )}
                      </td>

                      {/* Meta Vinculada */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          to={`/metas/${t.meta.id}?tab=tareas`}
                          className="font-mono font-bold text-institucional-azul hover:underline flex items-center gap-1.5"
                        >
                          <span className="bg-blue-50 text-institucional-azul px-1.5 py-0.5 rounded text-[11px]">
                            #{t.meta.codigo}
                          </span>
                          <span className="text-[11px] text-slate-600 font-sans font-normal truncate max-w-[130px]" title={t.meta.descripcion}>
                            {t.meta.area.codigo}
                          </span>
                        </Link>
                      </td>

                      {/* Responsable */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{t.responsable.nombre}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {t.responsable.cargo || t.responsable.correo}
                        </div>
                      </td>

                      {/* Fechas y Horario */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-mono text-[11px]">
                          {inicio === fin ? inicio : `${inicio} → ${fin}`}
                        </div>
                        {t.horaInicio && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {t.horaInicio} - {t.horaFin}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.estado === 'FINALIZADA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.estado === 'EN_CURSO'
                              ? 'bg-blue-100 text-blue-800'
                              : t.estado === 'VENCIDA'
                              ? 'bg-red-100 text-red-800'
                              : t.estado === 'CANCELADA'
                              ? 'bg-slate-200 text-slate-600 line-through'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.estado}
                        </span>
                      </td>

                      {/* Presencia Despacho */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {t.requiereSecretaria ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              t.estadoPresencia === 'CONFIRMADA'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : t.estadoPresencia === 'DECLINADA'
                                ? 'bg-slate-100 text-slate-600 border-slate-300 line-through'
                                : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                            }`}
                            title={t.motivoDeclinacion || undefined}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            {t.estadoPresencia || 'PENDIENTE'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Soportes */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {t.soportes.length > 0 ? (
                          <button
                            onClick={() => { setTareaDetalle(t); setModalDetalle(true); }}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            <Paperclip className="w-3 h-3" />
                            {t.soportes.length} doc{t.soportes.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">Sin soporte</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setTareaDetalle(t); setModalDetalle(true); }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="Ver detalles y soportes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {t.estado !== 'FINALIZADA' && t.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => abrirModalFinalizar(t)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] flex items-center gap-1"
                              title="Finalizar tarea (adjuntar evidencias)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Finalizar
                            </button>
                          )}

                          {t.estado === 'FINALIZADA' && puedeReabrir && (
                            <button
                              onClick={() => abrirModalReabrir(t)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] flex items-center gap-1"
                              title="Reabrir tarea (RN-23)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reabrir
                            </button>
                          )}

                          {t.estado !== 'FINALIZADA' && t.estado !== 'CANCELADA' && (
                            <button
                              onClick={() => abrirModalCancelar(t)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Cancelar tarea"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
              de <span className="font-bold text-slate-800">{total}</span> tareas
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
                Pág. {pagina} de {Math.ceil(total / tamano) || 1}
              </span>
              <Boton
                variante="secundario"
                tamano="sm"
                disabled={pagina >= Math.ceil(total / tamano)}
                onClick={() => setPagina((p) => p + 1)}
                icono={<ChevronRight className="w-4 h-4" />}
              >
                Siguiente
              </Boton>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Tarea (CU-07) */}
      <Modal
        abierto={modalCrear}
        alCerrar={() => setModalCrear(false)}
        titulo="Nueva Tarea Operativa"
        ancho="2xl"
      >
        <form onSubmit={handleCrearTarea} className="space-y-4">
          {errorTarea && <Alerta tipo="error" mensaje={errorTarea} />}

          {/* Advertencia de cruces (RN-27) */}
          {alertaCruces && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Advertencia de Cruce de Agenda (RN-27)
              </div>
              <p>{alertaCruces.mensaje}</p>
              {alertaCruces.crucesResponsable?.length > 0 && (
                <div>
                  <span className="font-semibold">Cruce con responsable: </span>
                  {alertaCruces.crucesResponsable.map((c: any) => `"${c.titulo}" (${c.horaInicio}-${c.horaFin})`).join(', ')}
                </div>
              )}
              {alertaCruces.crucesSecretaria?.length > 0 && (
                <div>
                  <span className="font-semibold">Cruce con Despacho: </span>
                  {alertaCruces.crucesSecretaria.map((c: any) => `"${c.titulo}" (${c.horaInicio}-${c.horaFin})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Meta Vinculada (AutoSuggest - Punto 3) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meta Vinculada del Plan de Acción * (Búsqueda predictiva)
            </label>
            <AutoSuggestMeta
              metas={metasDisponibles}
              valor={formTarea.metaId}
              onChange={(id) => setFormTarea({ ...formTarea, metaId: id })}
              required
            />
          </div>

          {/* Título de la tarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título de la Tarea / Actividad *
            </label>
            <input
              type="text"
              required
              value={formTarea.titulo}
              onChange={(e) => setFormTarea({ ...formTarea, titulo: e.target.value })}
              placeholder="Ej: Mesa técnica de concertación de indicadores PAI"
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          {/* Responsable y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsable de Ejecución *
              </label>
              <select
                value={formTarea.responsableId}
                onChange={(e) => setFormTarea({ ...formTarea, responsableId: e.target.value })}
                required
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
              >
                <option value="">Seleccionar funcionario...</option>
                {usuariosDisponibles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.cargo || u.rol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría / Fase
              </label>
              <input
                type="text"
                value={formTarea.fase}
                onChange={(e) => setFormTarea({ ...formTarea, fase: e.target.value })}
                placeholder="Ej: Fase 1, Alistamiento, Visita"
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Inicio *
              </label>
              <input
                type="date"
                required
                value={formTarea.fechaInicio}
                onChange={(e) => {
                  const nuevaInicio = e.target.value;
                  setFormTarea({
                    ...formTarea,
                    fechaInicio: nuevaInicio,
                    fechaFin: formTarea.tieneHorario ? nuevaInicio : formTarea.fechaFin < nuevaInicio ? nuevaInicio : formTarea.fechaFin,
                  });
                }}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Fin *
              </label>
              <input
                type="date"
                required
                disabled={formTarea.tieneHorario}
                value={formTarea.tieneHorario ? formTarea.fechaInicio : formTarea.fechaFin}
                onChange={(e) => setFormTarea({ ...formTarea, fechaFin: e.target.value })}
                className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
              />
            </div>
          </div>

          {/* Horario Específico Checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formTarea.tieneHorario}
                onChange={(e) => {
                  const activa = e.target.checked;
                  setFormTarea({
                    ...formTarea,
                    tieneHorario: activa,
                    fechaFin: activa ? formTarea.fechaInicio : formTarea.fechaFin,
                  });
                }}
                className="rounded border-slate-300 text-institucional-azul focus:ring-institucional-azul"
              />
              <span className="text-xs font-semibold text-slate-800">
                Tiene horario específico y lugar (Evento de Agenda)
              </span>
            </label>

            {formTarea.tieneHorario && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Hora Inicio *
                  </label>
                  <input
                    type="time"
                    required={formTarea.tieneHorario}
                    value={formTarea.horaInicio}
                    onChange={(e) => setFormTarea({ ...formTarea, horaInicio: e.target.value })}
                    className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Hora Fin *
                  </label>
                  <input
                    type="time"
                    required={formTarea.tieneHorario}
                    value={formTarea.horaFin}
                    onChange={(e) => setFormTarea({ ...formTarea, horaFin: e.target.value })}
                    className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Lugar / Salón
                  </label>
                  <input
                    type="text"
                    value={formTarea.lugar}
                    onChange={(e) => setFormTarea({ ...formTarea, lugar: e.target.value })}
                    placeholder="Ej: Sala de Juntas Despacho"
                    className="w-full py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Presencia de la Secretaria (RN-28) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formTarea.requiereSecretaria}
                onChange={(e) => setFormTarea({ ...formTarea, requiereSecretaria: e.target.checked })}
                className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Requiere presencia formal de la Secretaria de Salud (RN-28)
                </span>
                <span className="text-[11px] text-amber-700 block mt-0.5">
                  Se notificará inmediatamente al Despacho. El compromiso quedará en estado PENDIENTE hasta ser confirmado o declinado por la Secretaria o su asistente.
                </span>
              </div>
            </label>
          </div>

          {/* Selección de Recursos Logísticos Requeridos (Punto 4) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recursos Logísticos Requeridos (Opcional)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {formTarea.recursosSeleccionados.length} seleccionados
              </span>
            </div>

            {/* Selector para añadir recurso */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <select
                id="select-recurso-tarea"
                className="w-full sm:w-auto flex-1 py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-institucional-azul/20"
                defaultValue=""
                onChange={(e) => {
                  const rId = e.target.value;
                  if (!rId) return;
                  if (formTarea.recursosSeleccionados.some((r) => r.recursoId === rId)) return;
                  setFormTarea({
                    ...formTarea,
                    recursosSeleccionados: [
                      ...formTarea.recursosSeleccionados,
                      { recursoId: rId, cantidad: 1, nota: '' },
                    ],
                  });
                  e.target.value = '';
                }}
              >
                <option value="">+ Seleccionar recurso para solicitar...</option>
                {recursosCatalogo
                  .filter((rec) => !formTarea.recursosSeleccionados.some((r) => r.recursoId === rec.id))
                  .map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.nombre}
                    </option>
                  ))}
              </select>
            </div>

            {/* Lista de recursos agregados */}
            {formTarea.recursosSeleccionados.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                {formTarea.recursosSeleccionados.map((item, idx) => {
                  const recInfo = recursosCatalogo.find((r) => r.id === item.recursoId);
                  return (
                    <div
                      key={item.recursoId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-institucional-azul" />
                        {recInfo?.nombre || 'Recurso'}
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">Cant:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => {
                              const nuevaCant = Math.max(1, parseInt(e.target.value) || 1);
                              const copia = [...formTarea.recursosSeleccionados];
                              copia[idx].cantidad = nuevaCant;
                              setFormTarea({ ...formTarea, recursosSeleccionados: copia });
                            }}
                            className="w-14 py-1 px-1.5 text-xs text-center border border-slate-200 rounded"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Nota (ej: Para 30 personas)"
                          value={item.nota}
                          onChange={(e) => {
                            const copia = [...formTarea.recursosSeleccionados];
                            copia[idx].nota = e.target.value;
                            setFormTarea({ ...formTarea, recursosSeleccionados: copia });
                          }}
                          className="flex-1 sm:w-44 py-1 px-2 text-xs border border-slate-200 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormTarea({
                              ...formTarea,
                              recursosSeleccionados: formTarea.recursosSeleccionados.filter(
                                (_, i) => i !== idx,
                              ),
                            });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 font-bold"
                          title="Quitar recurso"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción y Objetivos de la Actividad
            </label>
            <textarea
              rows={2}
              value={formTarea.descripcion}
              onChange={(e) => setFormTarea({ ...formTarea, descripcion: e.target.value })}
              placeholder="Detalles sobre entregables y compromisos esperados..."
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={() => setModalCrear(false)}
            >
              Cancelar
            </Boton>
            <Boton
              type="submit"
              variante="primario"
              tamano="sm"
              cargando={guardandoTarea}
            >
              {alertaCruces ? 'Guardar de todas formas (RN-27)' : 'Guardar Tarea'}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Finalizar Tarea (CU-08, RN-22) */}
      <Modal
        abierto={modalFinalizar}
        alCerrar={() => setModalFinalizar(false)}
        titulo="Finalizar Tarea y Adjuntar Evidencias"
        ancho="xl"
      >
        <form onSubmit={handleFinalizarTarea} className="space-y-4">
          {errorFinalizar && <Alerta tipo="error" mensaje={errorFinalizar} />}

          {tareaAFinalizar && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-900">{tareaAFinalizar.titulo}</div>
              <div className="text-slate-500">
                Meta: #{tareaAFinalizar.meta.codigo} — {tareaAFinalizar.meta.descripcion.substring(0, 70)}...
              </div>
            </div>
          )}

          {/* Soportes Existentes */}
          {tareaAFinalizar && tareaAFinalizar.soportes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Soportes Ya Registrados ({tareaAFinalizar.soportes.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {tareaAFinalizar.soportes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded border border-slate-200">
                    <span className="truncate max-w-[300px] text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {s.nombreOriginal}
                    </span>
                    <a
                      href={`/api/soportes/${s.id}/descargar`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-institucional-azul hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3 h-3" /> Descargar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjuntar nuevos soportes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjuntar Archivos de Soporte / Evidencias * (PDF, Word, Excel, Imágenes - Máx 20 MB)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc"
              onChange={(e) => {
                if (e.target.files) {
                  setArchivosSoporte(Array.from(e.target.files));
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-institucional-azul file:text-white hover:file:bg-institucional-azul/90"
            />
            {archivosSoporte.length > 0 && (
              <div className="text-[11px] text-slate-500 mt-1.5 font-medium">
                {archivosSoporte.length} archivo(s) seleccionado(s) para subir.
              </div>
            )}
          </div>

          {/* Observación de cierre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observación de Cierre / Resultados Obtenidos * (Mínimo 5 caracteres)
            </label>
            <textarea
              required
              rows={3}
              value={observacionCierre}
              onChange={(e) => setObservacionCierre(e.target.value)}
              placeholder="Describa el cumplimiento de la actividad, actas generadas y conclusiones..."
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={() => setModalFinalizar(false)}
            >
              Cancelar
            </Boton>
            <Boton
              type="submit"
              variante="primario"
              tamano="sm"
              cargando={subiendoSoportes}
            >
              Confirmar y Finalizar Tarea
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Reabrir Tarea (CU-09, RN-23) */}
      <Modal
        abierto={modalReabrir}
        alCerrar={() => setModalReabrir(false)}
        titulo="Reabrir Tarea Finalizada"
        ancho="md"
      >
        <form onSubmit={handleReabrirTarea} className="space-y-4">
          {errorReapertura && <Alerta tipo="error" mensaje={errorReapertura} />}

          <p className="text-xs text-slate-600">
            La tarea volverá al estado temporal correspondiente según su calendario. Debe justificar el motivo formal de la reapertura (RN-23).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de la Reapertura *
            </label>
            <textarea
              required
              rows={3}
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              placeholder="Explique qué soporte o compromiso quedó pendiente de subsanar..."
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={() => setModalReabrir(false)}
            >
              Cancelar
            </Boton>
            <Boton
              type="submit"
              variante="primario"
              tamano="sm"
              cargando={guardandoReapertura}
            >
              Reabrir Tarea
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Cancelar Tarea (RN-24) */}
      <Modal
        abierto={modalCancelar}
        alCerrar={() => setModalCancelar(false)}
        titulo="Cancelar Tarea"
        ancho="md"
      >
        <form onSubmit={handleCancelarTarea} className="space-y-4">
          {errorCancelacion && <Alerta tipo="error" mensaje={errorCancelacion} />}

          <p className="text-xs text-slate-600">
            Una tarea cancelada no cuenta en el avance operativo de la meta (RN-24). Indique el motivo formal de cancelación.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de Cancelación *
            </label>
            <textarea
              required
              rows={3}
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Indique la causa justificada de la cancelación..."
              className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-institucional-azul/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Boton
              type="button"
              variante="secundario"
              tamano="sm"
              onClick={() => setModalCancelar(false)}
            >
              Cerrar
            </Boton>
            <Boton
              type="submit"
              variante="peligro"
              tamano="sm"
              cargando={guardandoCancelacion}
            >
              Confirmar Cancelación
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Detalle de Tarea */}
      <Modal
        abierto={modalDetalle}
        alCerrar={() => setModalDetalle(false)}
        titulo="Ficha de Tarea y Evidencias"
        ancho="2xl"
      >
        {tareaDetalle && (
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Meta #{tareaDetalle.meta.codigo} — {tareaDetalle.meta.area.nombre}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {tareaDetalle.titulo}
              </h3>
              {tareaDetalle.descripcion && (
                <p className="text-slate-600 mt-1">{tareaDetalle.descripcion}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Responsable</span>
                <div className="font-semibold text-slate-800">{tareaDetalle.responsable.nombre}</div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Fechas</span>
                <div className="font-semibold text-slate-800">
                  {tareaDetalle.fechaInicio.slice(0, 10)}
                  {tareaDetalle.fechaFin !== tareaDetalle.fechaInicio && ` al ${tareaDetalle.fechaFin.slice(0, 10)}`}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Horario</span>
                <div className="font-semibold text-slate-800">
                  {tareaDetalle.horaInicio ? `${tareaDetalle.horaInicio} - ${tareaDetalle.horaFin}` : 'Sin hora fijada'}
                </div>
              </div>
              {tareaDetalle.lugar && (
                <div className="col-span-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Lugar</span>
                  <div className="font-semibold text-slate-800">{tareaDetalle.lugar}</div>
                </div>
              )}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Presencia Despacho</span>
                <div className="font-semibold text-slate-800">
                  {tareaDetalle.requiereSecretaria ? (tareaDetalle.estadoPresencia || 'PENDIENTE') : 'No requerida'}
                </div>
              </div>
            </div>

            {/* Soportes Adjuntos */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-institucional-azul" />
                Soportes y Evidencias Adjuntas ({tareaDetalle.soportes.length})
              </h4>
              {tareaDetalle.soportes.length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 rounded-lg text-center">
                  No hay archivos adjuntos en esta tarea.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tareaDetalle.soportes.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 truncate max-w-[380px]">
                        <FileText className="w-4 h-4 text-institucional-azul flex-shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{s.nombreOriginal}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({(s.tamanoBytes / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <a
                        href={`/api/soportes/${s.id}/descargar`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Descargar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observación de cierre si está finalizada */}
            {tareaDetalle.observacionCierre && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Observación de Cierre (RN-22)
                </span>
                <p className="text-emerald-900 mt-1">{tareaDetalle.observacionCierre}</p>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <Boton
                type="button"
                variante="secundario"
                tamano="sm"
                onClick={() => setModalDetalle(false)}
              >
                Cerrar
              </Boton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
