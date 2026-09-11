import React, { useState } from 'react';
import { api } from '../../api/cliente';
import { Modal } from '../ui/Modal';
import { Boton } from '../ui/Boton';
import { Alerta } from '../ui/Alerta';
import { Key, Lock, CheckCircle2 } from 'lucide-react';

interface CambiarClaveModalProps {
  abierto: boolean;
  alCerrar: () => void;
}

export const CambiarClaveModal: React.FC<CambiarClaveModalProps> = ({ abierto, alCerrar }) => {
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (claveNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (claveNueva !== confirmarClave) {
      setError('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    setCargando(true);
    try {
      await api.patch('/yo', {
        claveActual,
        claveNueva,
      });
      setExito(true);
      setTimeout(() => {
        setExito(false);
        setClaveActual('');
        setClaveNueva('');
        setConfirmarClave('');
        alCerrar();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  const cerrarModal = () => {
    setError(null);
    setExito(false);
    setClaveActual('');
    setClaveNueva('');
    setConfirmarClave('');
    alCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrarModal}
      titulo="Cambiar Contraseña"
      subtitulo="Actualice su clave de acceso personal en el sistema"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alerta tipo="error" mensaje={error} />}
        {exito && <Alerta tipo="exito" mensaje="¡Contraseña actualizada exitosamente!" />}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Contraseña Actual *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={claveActual}
              onChange={(e) => setClaveActual(e.target.value)}
              placeholder="Ingrese su contraseña actual"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Nueva Contraseña *
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              minLength={6}
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Confirmar Nueva Contraseña *
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmarClave}
              onChange={(e) => setConfirmarClave(e.target.value)}
              placeholder="Repita la nueva contraseña"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-institucional-azul outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Boton variante="secundario" type="button" onClick={cerrarModal} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" cargando={cargando} disabled={exito}>
            Actualizar Contraseña
          </Boton>
        </div>
      </form>
    </Modal>
  );
};
