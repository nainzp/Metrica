import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TarjetaProps extends React.HTMLAttributes<HTMLDivElement> {
  titulo?: string;
  subtitulo?: string;
  accion?: React.ReactNode;
}

export const Tarjeta: React.FC<TarjetaProps> = ({
  titulo,
  subtitulo,
  accion,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx('bg-white border border-slate-200 rounded-xl shadow-sm p-5 transition-shadow hover:shadow-md', className),
      )}
      {...props}
    >
      {(titulo || accion) && (
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            {titulo && <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>}
            {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
          </div>
          {accion && <div>{accion}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
