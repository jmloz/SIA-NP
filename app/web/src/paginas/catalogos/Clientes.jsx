// Alta y edición de clientes (destinatarios de las notas de salida).
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones } from '../../componentes/ui.jsx';
import { useLista, Herramientas, Estado, Casilla, RFC_OK } from './comun.jsx';

const VACIO = { nombre: '', rfc: '', telefono: '', activo: true };

function Formulario({ id, alTerminar }) {
  const [f, setF] = useState(VACIO);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (id) api.get(`/catalogos/clientes/${id}`).then((c) => setF({ nombre: c.nombre, rfc: c.rfc ?? '', telefono: c.telefono ?? '', activo: !!c.activo })).catch((e) => setError(e.message));
  }, [id]);

  const errs = {};
  if (intento) {
    if (!f.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
    if (f.rfc.trim() && !RFC_OK(f.rfc.trim())) errs.rfc = 'El RFC debe tener 12 o 13 caracteres.';
  }
  async function guardar(ev) {
    ev.preventDefault();
    setIntento(true); setError('');
    if (!f.nombre.trim() || (f.rfc.trim() && !RFC_OK(f.rfc.trim()))) return;
    try {
      id ? await api.put(`/catalogos/clientes/${id}`, f) : await api.post('/catalogos/clientes', f);
      alTerminar(id ? 'Cliente actualizado.' : 'Cliente creado.');
    } catch (err) { setError(err.message); }
  }
  return (
    <Pantalla titulo={id ? 'Edición de cliente' : 'Alta de cliente'} pie="Alta y edición de clientes.">
      <form onSubmit={guardar} noValidate>
        <Alerta tipo="error">{error}</Alerta>
        <Seccion titulo="Datos del cliente">
          <div className="campos">
            <Campo etiqueta="Nombre" req full error={errs.nombre}><input value={f.nombre} maxLength={150} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
            <Campo etiqueta="RFC" hint="Opcional; 12 o 13 caracteres." error={errs.rfc}><input value={f.rfc} maxLength={13} onChange={(e) => setF({ ...f, rfc: e.target.value })} /></Campo>
            <Campo etiqueta="Teléfono"><input value={f.telefono} maxLength={15} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
            <Campo etiqueta="Estado"><Casilla valor={f.activo} onChange={(v) => setF({ ...f, activo: v })} texto="Cliente activo" /></Campo>
          </div>
        </Seccion>
        <Botones>
          <button type="button" className="btn btn-sec" onClick={() => alTerminar()}>Cancelar</button>
          <button className="btn btn-prim">Guardar cliente</button>
        </Botones>
      </form>
    </Pantalla>
  );
}

export default function Clientes() {
  const lista = useLista('/catalogos/clientes');
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState('');
  if (vista) return <Formulario id={vista === 'nuevo' ? null : vista} alTerminar={(m) => { setVista(null); if (m) setAviso(m); lista.recargar(); }} />;
  return (
    <Pantalla titulo="Clientes" pie="Catálogo de clientes.">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{lista.error}</Alerta>
      <Herramientas lista={lista} placeholder="Buscar por nombre o RFC…"
        nuevo={<button className="btn btn-prim" onClick={() => { setAviso(''); setVista('nuevo'); }}>Nuevo cliente</button>} />
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>RFC</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {!lista.filas ? <tr><td colSpan="5" className="vacio">Cargando…</td></tr>
              : lista.filas.length === 0 ? <tr><td colSpan="5" className="vacio">Sin clientes.</td></tr>
              : lista.filas.map((c) => (
                <tr key={c.id_cliente}>
                  <td><b>{c.nombre}</b></td><td>{c.rfc ?? '—'}</td><td>{c.telefono ?? '—'}</td><td><Estado activo={c.activo} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sec btn-chico" onClick={() => { setAviso(''); setVista(c.id_cliente); }}>Editar</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
