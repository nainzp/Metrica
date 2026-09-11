import React from 'react';

interface AnilloAvanceProps {
  porcentaje: number;
  tamano?: number;
  grosor?: number;
  etiqueta?: string;
  color?: 'azul' | 'verde' | 'ambar' | 'rojo';
}

export const AnilloAvance: React.FC<AnilloAvanceProps> = ({
  porcentaje,
  tamano = 80,
  grosor = 8,
  etiqueta,
  color = 'azul',
}) => {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const pctSeguro = Math.min(100, Math.max(0, porcentaje));
  const desplazamiento = circunferencia - (pctSeguro / 100) * circunferencia;

  const coloresTrazo = {
    azul: '#1E5FD9',
    verde: '#2BB673',
    ambar: '#F5A623',
    rojo: '#E5484D',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: tamano, height: tamano }}>
        <svg width={tamano} height={tamano} className="transform -rotate-90">
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke="#E2E8F0"
            strokeWidth={grosor}
            fill="transparent"
          />
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            stroke={coloresTrazo[color]}
            strokeWidth={grosor}
            strokeDasharray={circunferencia}
            strokeDashoffset={desplazamiento}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-sm font-bold text-slate-800">
          {porcentaje != null ? `${Math.round(porcentaje)}%` : '—'}
        </span>
      </div>
      {etiqueta && <span className="text-xs font-medium text-slate-500 mt-1">{etiqueta}</span>}
    </div>
  );
};
