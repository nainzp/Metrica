import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  abierto: boolean;
  alCerrar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  abierto,
  alCerrar,
  titulo,
  subtitulo,
  children,
  ancho = 'lg',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar();
    };
    if (abierto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  const anchos = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${anchos[ancho]} overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            {titulo && <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>}
            {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={alCerrar}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
