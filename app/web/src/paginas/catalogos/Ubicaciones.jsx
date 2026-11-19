// IE-004 Alta y edición de ubicaciones (RF5).
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones } from '../../componentes/ui.jsx';
import { Casilla } from './comun.jsx';

const VACIO = { clave: '', pasillo: 'B', anaquel: '', nivel: '', descripcion: '', disponible: true };
const sugerir = (f) => (f.pasillo === 'P' ? '' : f.anaquel && f.nivel ? `${f.pasillo}-${String(f.anaquel).padStart(2, '0')}-${f.nivel}` : '');

function validar(f) {
  const e = {};
  if (f.pasillo === 'P') {
    if (!f.clave.trim()) e.clave = 'Capture la clave de la ubicación del patio.';
  } else {
    const a = Number(f.anaquel), n = Number(f.nivel);
    if (!Number.isInteger(a) || a < 1 || a > 8) e.anaquel = 'Capture un anaquel de 1 a 8.';
    if (!Number.isInteger(n) || n < 1 || n > 3) e.nivel = 'Capture un nivel de 1 a 3.';
  }
  return e;
}

function Formulario({ id, alTerminar }) {
  const [f, setF] = useState(VACIO);
  const [clavePropia, setClavePropia] = useState(false);   // true si el usuario capturó la clave a mano
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.get(`/catalogos/ubicaciones/${id}`).then((u) => {
      setF({ clave: u.clave, pasillo: u.pasillo, anaquel: u.anaquel ?? '', nivel: u.nivel ?? '', descripcion: u.descripcion ?? '', disponible: !!u.disponible });
      setClavePropia(true);
    }).catch((e) => setError(e.message));
  }, [id]);

  function cambiar(cambios) {
    let nuevo = { ...f, ...cambios };
    if (nuevo.pasillo === 'P') nuevo = { ...nuevo, anaquel: '', nivel: '' };
    if (!clavePropia && !('clave' in cambios)) nuevo.clave = sugerir(nuevo);
    setF(nuevo);
  }
  const patio = f.pasillo === 'P';
  const errs = intento ? validar(f) : {};

  async function guardar(ev) {
    ev.preventDefault();
    setIntento(true); setError('');
    if (Object.keys(validar(f)).length) return;
    try {
      id ? await api.put(`/catalogos/ubicaciones/${id}`, f) : await api.post('/catalogos/ubicaciones', f);
      alTerminar(id ? 'Ubicación actualizada.' : 'Ubicación creada.');
    } catch (err) { setError(err.message); }
  }

  return (
    <Pantalla titulo={id ? 'Edición de ubicación' : 'Alta de ubicación'} id="IE-004" pie="Alta y edición de ubicaciones físicas del almacén (RF5).">
      <form onSubmit={guardar} noValidate>
        <Alerta tipo="error">{error}</Alerta>
        <Seccion titulo="Ubicación física">
          <div className="campos">
            <Campo etiqueta="Clave" req hint={patio ? 'Única; capture la clave del patio, p. ej. P-01.' : 'Única, p. ej. B-04-2 (se sugiere sola).'} error={errs.clave}>
              <input value={f.clave} maxLength={10} onChange={(e) => { setClavePropia(true); cambiar({ clave: e.target.value }); }} placeholder={patio ? 'P-01' : 'B-04-2'} />
            </Campo>
            <Campo etiqueta="Pasillo" req hint="A, B, C o P (patio techado).">
              <select value={f.pasillo} onChange={(e) => cambiar({ pasillo: e.target.value })}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="P">P (patio)</option>
              </select>
            </Campo>
            <Campo etiqueta="Anaquel" hint="De 1 a 8; vacío en el patio." error={errs.anaquel}>
              <input type="number" min="1" max="8" disabled={patio} value={f.anaquel} onChange={(e) => cambiar({ anaquel: e.target.value })} />
            </Campo>
            <Campo etiqueta="Nivel" hint="De 1 a 3; vacío en el patio." error={errs.nivel}>
              <input type="number" min="1" max="3" disabled={patio} value={f.nivel} onChange={(e) => cambiar({ nivel: e.target.value })} />
            </Campo>
            <Campo etiqueta="Descripción" full>
              <input value={f.descripcion} maxLength={100} onChange={(e) => cambiar({ descripcion: e.target.value })}
                placeholder={patio ? 'Patio techado' : 'Pasillo B, anaquel 4, nivel 2'} />
            </Campo>
            <Campo etiqueta="Disponible para asignar" full>
              <Casilla valor={f.disponible} onChange={(v) => cambiar({ disponible: v })} texto="La ubicación está disponible" />
            </Campo>
          </div>
        </Seccion>
        <Botones>
          <button type="button" className="btn btn-sec" onClick={() => alTerminar()}>Cancelar</button>
          <button className="btn btn-prim">Guardar ubicación</button>
        </Botones>
      </form>
    </Pantalla>
  );
}

export default function Ubicaciones() {
  const [filas, setFilas] = useState(null);
  const [q, setQ] = useState('');
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const cargar = () => api.get('/catalogos/ubicaciones').then(setFilas).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);

  if (vista) return <Formulario id={vista === 'nuevo' ? null : vista} alTerminar={(m) => { setVista(null); if (m) setAviso(m); cargar(); }} />;
  const vis = (filas ?? []).filter((u) => !q || `${u.clave} ${u.descripcion ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Pantalla titulo="Ubicaciones" id="IE-004" pie="Ubicaciones físicas del almacén (RF5).">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{error}</Alerta>
      <div className="herramientas">
        <input className="input" placeholder="Buscar por clave o descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="espacio" />
        <button className="btn btn-prim" onClick={() => { setAviso(''); setVista('nuevo'); }}>Nueva ubicación</button>
      </div>
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Clave</th><th>Pasillo</th><th>Anaquel</th><th>Nivel</th><th>Descripción</th><th>Disponible</th><th></th></tr></thead>
          <tbody>
            {!filas ? <tr><td colSpan="7" className="vacio">Cargando…</td></tr>
              : vis.length === 0 ? <tr><td colSpan="7" className="vacio">Sin ubicaciones.</td></tr>
              : vis.map((u) => (
                <tr key={u.id_ubicacion}>
                  <td><b>{u.clave}</b></td><td>{u.pasillo}</td><td>{u.anaquel ?? '—'}</td><td>{u.nivel ?? '—'}</td>
                  <td>{u.descripcion}</td>
                  <td><span className={`etiqueta ${u.disponible ? 'verde' : 'ambar'}`}>{u.disponible ? 'Sí' : 'No'}</span></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sec btn-chico" onClick={() => { setAviso(''); setVista(u.id_ubicacion); }}>Editar</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
