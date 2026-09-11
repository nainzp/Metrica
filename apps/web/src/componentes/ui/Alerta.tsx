import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertaProps {
  tipo?: 'info' | 'exito' | 'advertencia' | 'error';
  titulo?: string;
  mensaje: string;
}

export const Alerta: React.FC<AlertaProps> = ({
  tipo = 'info',
  titulo,
  mensaje,
}) => {
  const configs = {
    info: {
      fondo: 'bg-blue-50 border-blue-200 text-blue-800',
      icono: <Info className="w-5 h-5 text-institucional-azul shrink-0" />,
    },
    exito: {
      fondo: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icono: <CheckCircle className="w-5 h-5 text-semaforo-verde shrink-0" />,
    },
    advertencia: {
      fondo: 'bg-amber-50 border-amber-200 text-amber-900',
      icono: <AlertTriangle className="w-5 h-5 text-semaforo-ambar shrink-0" />,
    },
    error: {
      fondo: 'bg-red-50 border-red-200 text-red-800',
      icono: <AlertCircle className="w-5 h-5 text-semaforo-rojo shrink-0" />,
    },
  };

  const actual = configs[tipo];

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${actual.fondo}`}>
      {actual.icono}
      <div className="flex-1">
        {titulo && <h4 className="font-semibold mb-0.5">{titulo}</h4>}
        <p>{mensaje}</p>
      </div>
    </div>
  );
};
