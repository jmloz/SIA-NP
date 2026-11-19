import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando, null = sin sesión
  useEffect(() => { api.get('/sesion/actual').then(setUsuario).catch(() => setUsuario(null)); }, []);
  const entrar = async (u, p) => setUsuario(await api.post('/sesion/login', { usuario: u, password: p }));
  const salir = async () => { await api.post('/sesion/logout'); setUsuario(null); };
  return <Ctx.Provider value={{ usuario, entrar, salir }}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);

/** true si el usuario tiene alguno de los roles (E, A, C, D, X). */
export function tieneRol(usuario, roles) {
  return !roles || roles.includes(usuario?.rol);
}
