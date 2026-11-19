// IE-005 Alta y edición de proveedores (RF11) y precios por producto.
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { useLista, Herramientas, Estado, Casilla, esNum, RFC_OK, CORREO_OK } from './comun.jsx';

const VACIO = { rfc: '', razon_social: '', clasificacion: 'LOCAL', nombre_contacto: '', telefono: '', correo: '', lead_time_dias: 7, activo: true };
const CLASIF = { LOCAL: 'Local', NACIONAL: 'Nacional', IMPORTACION: 'Importación' };

function validar(f) {
  const e = {};
  if (!RFC_OK(f.rfc.trim())) e.rfc = 'El RFC debe tener 12 o 13 caracteres.';
  if (!f.razon_social.trim()) e.razon_social = 'La razón social es obligatoria.';
  if (f.correo.trim() && !CORREO_OK(f.correo.trim())) e.correo = 'Use el formato nombre@dominio.ext.';
  const l = Number(f.lead_time_dias);
  if (!esNum(f.lead_time_dias) || !Number.isInteger(l) || l < 0 || l > 180) e.lead_time_dias = 'Debe ser un entero entre 0 y 180 días.';
  return e;
}

function Precios({ id, precios, setPrecios }) {
  const [productos, setProductos] = useState([]);
  const [n, setN] = useState({ id_producto: '', codigo_proveedor: '', precio_compra: '', moneda: 'MXN' });
  const [error, setError] = useState('');
  useEffect(() => { api.get('/catalogos/productos?estado=activos').then(setProductos); }, []);

  async function agregar() {
    setError('');
    if (!n.id_producto) return setError('Seleccione el producto.');
    if (!esNum(n.precio_compra) || Number(n.precio_compra) <= 0) return setError('El precio de compra debe ser mayor a 0.');
    try {
      setPrecios(await api.post(`/catalogos/proveedores/${id}/precios`, n));
      setN({ id_producto: '', codigo_proveedor: '', precio_compra: '', moneda: 'MXN' });
    } catch (e) { setError(e.message); }
  }
  async function quitar(p) {
    try { setPrecios(await api.del(`/catalogos/proveedores/${id}/precios/${p.id_producto}`)); }
    catch (e) { setError(e.message); }
  }
  return (
    <Seccion titulo="Precios por producto">
      <Alerta tipo="error">{error}</Alerta>
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Producto</th><th>Código del proveedor</th><th className="num">Precio de compra</th><th>Moneda</th><th>Actualizado</th><th></th></tr></thead>
          <tbody>
            {precios.length === 0 && <tr><td colSpan="6" className="vacio">Sin productos asignados.</td></tr>}
            {precios.map((p) => (
              <tr key={p.id_producto}>
                <td><b>{p.codigo_interno}</b> {p.descripcion}</td><td>{p.codigo_proveedor ?? '—'}</td>
                <td className="num">{fmt.num(p.precio_compra)}</td><td>{p.moneda}</td><td>{fmt.fecha(p.fecha_actualizacion)}</td>
                <td style={{ textAlign: 'right' }}><button type="button" className="btn btn-peligro btn-chico" onClick={() => quitar(p)}>Quitar</button></td>
              </tr>
            ))}
            <tr>
              <td><select value={n.id_producto} onChange={(e) => setN({ ...n, id_producto: e.target.value })}>
                <option value="">Agregar producto…</option>
                {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.codigo_interno} — {p.descripcion}</option>)}
              </select></td>
              <td><input value={n.codigo_proveedor} maxLength={30} onChange={(e) => setN({ ...n, codigo_proveedor: e.target.value })} /></td>
              <td><input type="number" step="0.01" min="0" className="num" value={n.precio_compra} onChange={(e) => setN({ ...n, precio_compra: e.target.value })} /></td>
              <td><select value={n.moneda} onChange={(e) => setN({ ...n, moneda: e.target.value })}><option>MXN</option><option>USD</option></select></td>
              <td></td>
              <td style={{ textAlign: 'right' }}><button type="button" className="btn btn-sec btn-chico" onClick={agregar}>Agregar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

function Formulario({ id, alTerminar }) {
  const [f, setF] = useState(VACIO);
  const [precios, setPrecios] = useState([]);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.get(`/catalogos/proveedores/${id}`).then((p) => {
      setF(Object.fromEntries(Object.keys(VACIO).map((k) => [k, p[k] ?? (typeof VACIO[k] === 'string' ? '' : VACIO[k])])));
      setPrecios(p.precios);
    }).catch((e) => setError(e.message));
  }, [id]);

  const errs = intento ? validar(f) : {};
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(ev) {
    ev.preventDefault();
    setIntento(true); setError('');
    if (Object.keys(validar(f)).length) return;
    try {
      id ? await api.put(`/catalogos/proveedores/${id}`, f) : await api.post('/catalogos/proveedores', f);
      alTerminar(id ? 'Proveedor actualizado.' : 'Proveedor creado.');
    } catch (err) { setError(err.message); }
  }

  return (
    <Pantalla titulo={id ? 'Edición de proveedor' : 'Alta de proveedor'} id="IE-005" pie="Alta y edición de proveedores (RF11).">
      <form onSubmit={guardar} noValidate>
        <Alerta tipo="error">{error}</Alerta>
        <Seccion titulo="Datos fiscales">
          <div className="campos">
            <Campo etiqueta="RFC" req hint="12 o 13 caracteres; único." error={errs.rfc}>
              <input value={f.rfc} maxLength={13} onChange={cambia('rfc')} placeholder="FIM990101XY2" />
            </Campo>
            <Campo etiqueta="Clasificación" req>
              <select value={f.clasificacion} onChange={cambia('clasificacion')}>
                {Object.entries(CLASIF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Razón social" req full error={errs.razon_social}>
              <input value={f.razon_social} maxLength={150} onChange={cambia('razon_social')} />
            </Campo>
          </div>
        </Seccion>
        <Seccion titulo="Contacto y entrega">
          <div className="campos">
            <Campo etiqueta="Nombre de contacto"><input value={f.nombre_contacto} maxLength={100} onChange={cambia('nombre_contacto')} /></Campo>
            <Campo etiqueta="Teléfono"><input value={f.telefono} maxLength={15} onChange={cambia('telefono')} /></Campo>
            <Campo etiqueta="Correo electrónico" hint="Formato nombre@dominio.ext." error={errs.correo}>
              <input value={f.correo} maxLength={100} onChange={cambia('correo')} />
            </Campo>
            <Campo etiqueta="Tiempo de entrega (días)" req hint="Entre 0 y 180 días." error={errs.lead_time_dias}>
              <input type="number" min="0" max="180" value={f.lead_time_dias} onChange={cambia('lead_time_dias')} />
            </Campo>
            <Campo etiqueta="Estado">
              <Casilla valor={f.activo} onChange={(v) => setF({ ...f, activo: v })} texto="Proveedor activo" />
            </Campo>
          </div>
        </Seccion>
        {id ? <Precios id={id} precios={precios} setPrecios={setPrecios} />
            : <Alerta tipo="info">Guarde el proveedor para poder asignarle productos y precios.</Alerta>}
        <Botones>
          <button type="button" className="btn btn-sec" onClick={() => alTerminar()}>Cancelar</button>
          <button className="btn btn-prim">Guardar proveedor</button>
        </Botones>
      </form>
    </Pantalla>
  );
}

export default function Proveedores() {
  const lista = useLista('/catalogos/proveedores');
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState('');
  if (vista) return <Formulario id={vista === 'nuevo' ? null : vista} alTerminar={(m) => { setVista(null); if (m) setAviso(m); lista.recargar(); }} />;
  return (
    <Pantalla titulo="Proveedores" id="IE-005" pie="Catálogo de proveedores (RF11).">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{lista.error}</Alerta>
      <Herramientas lista={lista} placeholder="Buscar por RFC, razón social o contacto…"
        nuevo={<button className="btn btn-prim" onClick={() => { setAviso(''); setVista('nuevo'); }}>Nuevo proveedor</button>} />
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>RFC</th><th>Razón social</th><th>Clasificación</th><th>Contacto</th><th>Teléfono</th><th className="num">Entrega (días)</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {!lista.filas ? <tr><td colSpan="8" className="vacio">Cargando…</td></tr>
              : lista.filas.length === 0 ? <tr><td colSpan="8" className="vacio">Sin proveedores.</td></tr>
              : lista.filas.map((p) => (
                <tr key={p.id_proveedor}>
                  <td>{p.rfc}</td><td><b>{p.razon_social}</b></td><td>{CLASIF[p.clasificacion]}</td>
                  <td>{p.nombre_contacto ?? '—'}</td><td>{p.telefono ?? '—'}</td><td className="num">{p.lead_time_dias}</td>
                  <td><Estado activo={p.activo} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-sec btn-chico" onClick={() => { setAviso(''); setVista(p.id_proveedor); }}>Editar</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
