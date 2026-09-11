import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/cliente';
import { useSesion } from '../../estado/sesion.contexto';
import { Boton } from '../../componentes/ui/Boton';
import { Alerta } from '../../componentes/ui/Alerta';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

export const IniciarSesion: React.FC = () => {
  const navigate = useNavigate();
  const { iniciarSesion } = useSesion();

  const [correo, setCorreo] = useState('admin@magdalena.gov.co');
  const [clave, setClave] = useState('Admin2026*!');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const { data } = await api.post('/auth/ingresar', { correo, clave });
      iniciarSesion(data.tokenAcceso, data.usuario);
      navigate('/tablero');
    } catch (err: any) {
      const mensaje =
        err.response?.data?.mensaje ||
        'Error al conectar con el servidor. Verifique sus credenciales.';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        {/* Identidad Institucional */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-institucional-marino text-white rounded-2xl flex items-center justify-center font-black text-3xl mx-auto mb-4 shadow-lg shadow-blue-950/20">
            M
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">MÉTRICA</h2>
          <p className="text-xs font-semibold text-institucional-azul uppercase tracking-wider mt-1">
            Gobernación del Magdalena
          </p>
          <p className="text-xs text-slate-500">Secretaría de Salud · Seguimiento PAS 2026</p>
        </div>

        {error && (
          <div className="mb-6">
            <Alerta tipo="error" mensaje={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Correo Institucional
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="usuario@magdalena.gov.co"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul focus:border-institucional-azul transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contraseña
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul focus:border-institucional-azul transition-all outline-none"
              />
            </div>
          </div>

          <Boton
            type="submit"
            variante="primario"
            cargando={cargando}
            className="w-full py-3 text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10"
          >
            Ingresar al Sistema
          </Boton>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Acceso seguro con cifrado y auditoría</span>
        </div>
      </div>
    </div>
  );
};
