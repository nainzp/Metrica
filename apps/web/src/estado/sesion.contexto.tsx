import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/cliente';

export type RolUsuario =
  | 'SECRETARIA'
  | 'ASISTENTE_DESPACHO'
  | 'LIDER_AREA'
  | 'LIDER_COMPONENTE'
  | 'FUNCIONARIO'
  | 'ADMINISTRADOR';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  areaId: string;
  componenteId?: string | null;
  areaNombre?: string;
  areaCodigo?: string;
  componenteNombre?: string;
  componenteCodigo?: string;
  cargo?: string | null;
  recibeCorreo?: boolean;
}

interface SesionContextType {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (token: string, usuario: Usuario) => void;
  cerrarSesion: () => Promise<void>;
  tieneRol: (...roles: RolUsuario[]) => boolean;
  esAdmin: boolean;
  esSecretaria: boolean;
  esLider: boolean;
}

const SesionContext = createContext<SesionContextType | undefined>(undefined);

export const SesionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem('tokenAcceso');
      if (token) {
        try {
          const { data } = await api.get('/yo');
          setUsuario(data);
          localStorage.setItem('usuario', JSON.stringify(data));
        } catch {
          setUsuario(null);
          localStorage.removeItem('tokenAcceso');
          localStorage.removeItem('usuario');
        }
      } else {
        setUsuario(null);
      }
      setCargando(false);
    };

    verificarSesion();
  }, []);

  const iniciarSesion = (token: string, u: Usuario) => {
    localStorage.setItem('tokenAcceso', token);
    localStorage.setItem('usuario', JSON.stringify(u));
    setUsuario(u);
  };

  const cerrarSesion = async () => {
    try {
      await api.post('/auth/salir');
    } catch {
      // Ignorar fallo al salir
    } finally {
      localStorage.removeItem('tokenAcceso');
      localStorage.removeItem('usuario');
      setUsuario(null);
      window.location.href = '/acceso';
    }
  };

  const tieneRol = (...roles: RolUsuario[]) => {
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  };

  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const esSecretaria = usuario?.rol === 'SECRETARIA';
  const esLider = usuario?.rol === 'LIDER_AREA' || usuario?.rol === 'LIDER_COMPONENTE';

  return (
    <SesionContext.Provider
      value={{
        usuario,
        cargando,
        iniciarSesion,
        cerrarSesion,
        tieneRol,
        esAdmin,
        esSecretaria,
        esLider,
      }}
    >
      {children}
    </SesionContext.Provider>
  );
};

export const useSesion = () => {
  const context = useContext(SesionContext);
  if (!context) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return context;
};
