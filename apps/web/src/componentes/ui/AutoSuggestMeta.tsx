import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Target, ChevronDown } from 'lucide-react';

export interface MetaResumen {
  id: string;
  codigo: string;
  descripcion: string;
  estado?: string;
  area?: { id?: string; codigo: string; nombre?: string };
  componente?: { id?: string; codigo?: string; nombre?: string } | null;
}

interface AutoSuggestMetaProps {
  metas: MetaResumen[];
  valor: string; // metaId
  onChange: (metaId: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const AutoSuggestMeta: React.FC<AutoSuggestMetaProps> = ({
  metas,
  valor,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Buscar meta por código (ej: 226, 397) o descripción...',
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Meta actualmente seleccionada
  const metaSeleccionada = useMemo(() => {
    return metas.find((m) => m.id === valor) || null;
  }, [metas, valor]);

  // Filtrar metas en tiempo real
  const metasFiltradas = useMemo(() => {
    if (!busqueda.trim()) {
      return metas.slice(0, 15);
    }
    const q = busqueda.trim().toLowerCase();
    return metas
      .filter(
        (m) =>
          m.codigo.toLowerCase().includes(q) ||
          m.descripcion.toLowerCase().includes(q) ||
          m.area?.codigo?.toLowerCase().includes(q) ||
          m.componente?.nombre?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [metas, busqueda]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  const handleSeleccionar = (m: MetaResumen) => {
    onChange(m.id);
    setBusqueda('');
    setAbierto(false);
  };

  const handleLimpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setBusqueda('');
  };

  return (
    <div ref={contenedorRef} className="relative w-full">
      {/* Si hay una meta seleccionada, mostrar la tarjeta elegante */}
      {metaSeleccionada ? (
        <div className="flex items-start justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
          <div className="flex items-start gap-2 min-w-0">
            <Target className="w-4 h-4 text-institucional-azul mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="font-mono font-bold text-institucional-azul bg-white px-1.5 py-0.5 rounded border border-blue-200">
                  Meta #{metaSeleccionada.codigo}
                </span>
                {metaSeleccionada.area?.codigo && (
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {metaSeleccionada.area.codigo}
                  </span>
                )}
                {metaSeleccionada.componente?.nombre && (
                  <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {metaSeleccionada.componente.nombre}
                  </span>
                )}
              </div>
              <p className="text-slate-800 font-medium line-clamp-2" title={metaSeleccionada.descripcion}>
                {metaSeleccionada.descripcion}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleLimpiar}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-colors"
              title="Cambiar meta seleccionada"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* Si no hay meta seleccionada, mostrar el input con autosuggest */
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              disabled={disabled}
              required={required && !valor}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-institucional-azul/20 focus:border-institucional-azul"
            />
            <ChevronDown
              onClick={() => !disabled && setAbierto(!abierto)}
              className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 cursor-pointer"
            />
          </div>

          {/* Menú desplegable flotante con resultados */}
          {abierto && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
              <div className="p-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
                <span>Resultados ({metasFiltradas.length})</span>
                <span className="text-[10px] text-slate-400">Total {metas.length} metas</span>
              </div>
              {metasFiltradas.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No se encontraron metas con "{busqueda}".
                </div>
              ) : (
                metasFiltradas.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSeleccionar(m)}
                    className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-institucional-azul bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          #{m.codigo}
                        </span>
                        {m.area?.codigo && (
                          <span className="font-semibold text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {m.area.codigo}
                          </span>
                        )}
                        {m.componente?.nombre && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {m.componente.nombre}
                          </span>
                        )}
                      </div>
                      {m.estado && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            m.estado === 'ABIERTA'
                              ? 'bg-emerald-50 text-emerald-700'
                              : m.estado === 'CUMPLIDA'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {m.estado}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 font-medium line-clamp-2">
                      {m.descripcion}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
