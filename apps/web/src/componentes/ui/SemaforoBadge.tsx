import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SemaforoBadgeProps {
  color: 'VERDE' | 'AMARILLO' | 'ROJO' | string;
  brecha?: number | null;
  mostrarIcono?: boolean;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SemaforoBadge: React.FC<SemaforoBadgeProps> = ({
  color,
  brecha,
  mostrarIcono = true,
  tamano = 'md',
  className,
}) => {
  const c = color?.toUpperCase();

  const configs = {
    VERDE: {
      fondo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      punto: 'bg-semaforo-verde',
      icono: <CheckCircle2 className="w-3.5 h-3.5 text-semaforo-verde shrink-0" />,
      texto: 'Verde (En meta)',
    },
    AMARILLO: {
      fondo: 'bg-amber-50 text-amber-800 border-amber-200',
      punto: 'bg-semaforo-ambar',
      icono: <AlertTriangle className="w-3.5 h-3.5 text-semaforo-ambar shrink-0" />,
      texto: 'Amarillo (Alerta)',
    },
    ROJO: {
      fondo: 'bg-red-50 text-red-700 border-red-200',
      punto: 'bg-semaforo-rojo',
      icono: <AlertCircle className="w-3.5 h-3.5 text-semaforo-rojo shrink-0" />,
      texto: 'Rojo (Crítico)',
    },
    GRIS: {
      fondo: 'bg-slate-100 text-slate-700 border-slate-200',
      punto: 'bg-slate-400',
      icono: <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
      texto: 'Gris (Sin evaluar)',
    },
  };

  const actual = configs[c as keyof typeof configs] || configs.GRIS;

  const tamanos = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border',
          actual.fondo,
          tamanos[tamano],
          className,
        ),
      )}
      title={brecha != null ? `Brecha: ${brecha > 0 ? '+' : ''}${brecha}%` : undefined}
    >
      {mostrarIcono ? actual.icono : <span className={clsx('w-2 h-2 rounded-full shrink-0', actual.punto)} />}
      <span>{actual.texto}</span>
      {brecha != null && (
        <span className="text-[10px] font-mono opacity-80 border-l border-current pl-1 ml-0.5">
          {brecha > 0 ? `+${brecha}%` : `${brecha}%`}
        </span>
      )}
    </span>
  );
};
