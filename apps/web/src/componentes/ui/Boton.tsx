import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'exito';
  tamano?: 'sm' | 'md' | 'lg';
  cargando?: boolean;
  icono?: React.ReactNode;
  tipo?: 'button' | 'submit' | 'reset';
}

export const Boton: React.FC<BotonProps> = ({
  children,
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  icono,
  tipo,
  type,
  className,
  disabled,
  ...props
}) => {
  const buttonType = type || tipo || 'button';
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantes = {
    primario:
      'bg-institucional-azul hover:bg-institucional-marino text-white focus:ring-institucional-azul',
    secundario:
      'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-institucional-azul',
    peligro:
      'bg-semaforo-rojo hover:bg-red-700 text-white focus:ring-semaforo-rojo',
    exito:
      'bg-semaforo-verde hover:bg-emerald-600 text-white focus:ring-semaforo-verde',
    fantasma:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-400',
  };

  const tamanos = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={buttonType}
      className={twMerge(clsx(base, variantes[variante], tamanos[tamano], className))}
      disabled={disabled || cargando}
      {...props}
    >
      {cargando ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : icono ? (
        <span className="shrink-0">{icono}</span>
      ) : null}
      {children}
    </button>
  );
};
