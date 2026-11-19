// IE-010 Alta y edición de usuarios (RF1). Solo el Administrador.
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { useLista, Herramientas, Estado, Casilla, CORREO_OK } from './comun.jsx';

const VACIO = { nombre_usuario: '', nombre_completo: '', correo: '', id_rol: '', activo: true, password: '', confirmar: '' };

function Formulario({ id, alTerminar }) {
  const [f, setF] = useState(VACIO);
  const [roles, setRoles] = useState([]);
  const [u, setU] = useState(null);                 // usuario cargado (para bloqueo)
  const [nueva, setNueva] = useState('');           // contraseña de restablecimiento
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => { api.get('/catalogos/roles').then(setRoles); }, []);
  useEffect(() => {
    if (id) api.get(`/catalogos/usuarios/${id}`).then((x) => {
      setU(x);
      setF({ ...VACIO, nombre_usuario: x.nombre_usuario, nombre_completo: x.nombre_completo, correo: x.correo ?? '', id_rol: x.id_rol, activo: !!x.activo });
    }).catch((e) => setError(e.message));
  }, [id]);

  function validar() {
    const e = {};
    if (f.nombre_usuario.trim().length < 4) e.nombre_usuario = 'Mínimo 4 caracteres.';
    if (!f.nombre_completo.trim()) e.nombre_completo = 'El nombre completo es obligatorio.';
    if (!f.id_rol) e.id_rol = 'Seleccione el rol.';
    if (f.correo.trim() && !CORREO_OK(f.correo.trim())) e.correo = 'Use el formato nombre@dominio.ext.';
    if (!id) {
      if (f.password.length < 8) e.password = 'Mínimo 8 caracteres.';
      if (f.confirmar !== f.password) e.confirmar = 'No coincide con la contraseña.';
    }
    return e;
  }
  const errs = intento ? validar() : {};
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(ev) {
    ev.preventDefault();
    setIntento(true); setError('');
    if (Object.keys(validar()).length) return;
    try {
      id ? await api.put(`/catalogos/usuarios/${id}`, f) : await api.post('/catalogos/usuarios', f);
      alTerminar(id ? 'Usuario actualizado.' : 'Usuario creado.');
    } catch (err) { setError(err.message); }
  }
  async function accion(fn, msg) {
    setError(''); setAviso('');
    try { setU(await fn()); setAviso(msg); } catch (err) { setError(err.message); }
  }
  const bloqueado = u && u.intentos_fallidos >= 3;

  return (
    <Pantalla titulo={id ? 'Edición de usuario' : 'Alta de usuario'} id="IE-010" pie="Alta y edición de usuarios del sistema (RF1).">
      <form onSubmit={guardar} noValidate>
        <Alerta tipo="error">{error}</Alerta>
        <Alerta tipo="ok">{aviso}</Alerta>
        <Seccion titulo="Cuenta">
          <div className="campos">
            <Campo etiqueta="Nombre de usuario" req hint="Único; mínimo 4 caracteres." error={errs.nombre_usuario}>
              <input value={f.nombre_usuario} maxLength={30} onChange={cambia('nombre_usuario')} autoComplete="off" />
            </Campo>
            <Campo etiqueta="Rol" req error={errs.id_rol}>
              <select value={f.id_rol} onChange={(e) => setF({ ...f, id_rol: Number(e.target.value) || '' })}>
                <option value="">Seleccione…</option>
                {roles.map((r) => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Nombre completo" req full error={errs.nombre_completo}>
              <input value={f.nombre_completo} maxLength={100} onChange={cambia('nombre_completo')} />
            </Campo>
            <Campo etiqueta="Correo electrónico" hint="Formato nombre@dominio.ext." error={errs.correo}>
              <input value={f.correo} maxLength={100} onChange={cambia('correo')} />
            </Campo>
            <Campo etiqueta="Cuenta activa">
              <Casilla valor={f.activo} onChange={(v) => setF({ ...f, activo: v })} texto="El usuario puede iniciar sesión" />
            </Campo>
          </div>
        </Seccion>
        {!id ? (
          <Seccion titulo="Contraseña">
            <div className="campos">
              <Campo etiqueta="Contraseña" req hint="Mínimo 8 caracteres; se guarda cifrada (hash)." error={errs.password}>
                <input type="password" value={f.password} onChange={cambia('password')} autoComplete="new-password" />
              </Campo>
              <Campo etiqueta="Confirmar contraseña" req hint="Debe coincidir con la anterior." error={errs.confirmar}>
                <input type="password" value={f.confirmar} onChange={cambia('confirmar')} autoComplete="new-password" />
              </Campo>
            </div>
          </Seccion>
        ) : (
          <Seccion titulo="Seguridad de la cuenta">
            <div className="campos">
              <Campo etiqueta="Bloqueo por intentos fallidos">
                <div className="static">{bloqueado ? 'Bloqueado' : 'No bloqueado'} ({u?.intentos_fallidos ?? 0} de 3 intentos)</div>
                <div><button type="button" className="btn btn-sec btn-chico" style={{ marginTop: 8 }} disabled={!u?.intentos_fallidos}
                  onClick={() => accion(() => api.post(`/catalogos/usuarios/${id}/desbloquear`), 'Cuenta desbloqueada.')}>Desbloquear</button></div>
              </Campo>
              <Campo etiqueta="Restablecer contraseña" hint="Nueva contraseña, mínimo 8 caracteres.">
                <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" />
                <div><button type="button" className="btn btn-sec btn-chico" style={{ marginTop: 8 }} disabled={nueva.length < 8}
                  onClick={() => accion(async () => { const r = await api.post(`/catalogos/usuarios/${id}/restablecer`, { password: nueva }); setNueva(''); return r; }, 'Contraseña restablecida.')}>Restablecer contraseña</button></div>
              </Campo>
            </div>
          </Seccion>
        )}
        <Botones>
          <button type="button" className="btn btn-sec" onClick={() => alTerminar()}>Cancelar</button>
          <button className="btn btn-prim">Guardar usuario</button>
        </Botones>
      </form>
    </Pantalla>
  );
}

export default function Usuarios() {
  const lista = useLista('/catalogos/usuarios');
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState('');
  if (vista) return <Formulario id={vista === 'nuevo' ? null : vista} alTerminar={(m) => { setVista(null); if (m) setAviso(m); lista.recargar(); }} />;
  return (
    <Pantalla titulo="Usuarios" id="IE-010" pie="Usuarios del sistema (RF1).">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{lista.error}</Alerta>
      <Herramientas lista={lista} placeholder="Buscar por usuario o nombre…"
        nuevo={<button className="btn btn-prim" onClick={() => { setAviso(''); setVista('nuevo'); }}>Nuevo usuario</button>} />
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {!lista.filas ? <tr><td colSpan="6" className="vacio">Cargando…</td></tr>
              : lista.filas.length === 0 ? <tr><td colSpan="6" className="vacio">Sin usuarios.</td></tr>
              : lista.filas.map((u) => (
                <tr key={u.id_usuario}>
                  <td><b>{u.nombre_usuario}</b></td><td>{u.nombre_completo}</td><td>{u.rol_nombre}</td>
                  <td>{fmt.fechaHora(u.ultimo_acceso) || '—'}</td>
                  <td><Estado activo={u.activo} />{u.intentos_fallidos >= 3 && <> <span className="etiqueta ambar">Bloqueado</span></>}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sec btn-chico" onClick={() => { setAviso(''); setVista(u.id_usuario); }}>Editar</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
