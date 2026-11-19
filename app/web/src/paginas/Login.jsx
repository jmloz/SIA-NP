// IE-001 Inicio de sesión (CU8).
import { useState } from 'react';
import { useSesion } from '../sesion.jsx';
import { Logo, Campo, Alerta } from '../componentes/ui.jsx';

export default function Login() {
  const { entrar } = useSesion();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!usuario || !password) return setError('Capture usuario y contraseña.');
    setEnviando(true);
    try { await entrar(usuario, password); }
    catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <div className="login-fondo">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-logo"><Logo claro /></div>
        <h2>Iniciar sesión</h2>
        <p className="login-sub">Sistema de Inventario y Almacén</p>
        <Alerta tipo="error">{error}</Alerta>
        <Campo etiqueta="Usuario" req>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus autoComplete="username" placeholder="p. ej. lpablovich" />
        </Campo>
        <Campo etiqueta="Contraseña" req>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Campo>
        <button className="btn btn-prim" disabled={enviando}>{enviando ? 'Validando…' : 'Iniciar sesión'}</button>
        <div className="login-pie">¿Olvidó su contraseña? Contacte al administrador.</div>
      </form>
      <div className="login-chip"><span className="id-chip">IE-001</span>Pantalla de inicio de sesión del sistema.</div>
    </div>
  );
}
