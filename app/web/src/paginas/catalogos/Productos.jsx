// IE-003 Alta y edición de productos (RF2).
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useSesion } from '../../sesion.jsx';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { useLista, Herramientas, Estado, esNum } from './comun.jsx';

const UNIDADES = ['PZA', 'M', 'KG', 'LT', 'JGO', 'ROLLO'];
const VACIO = { codigo_interno: '', codigo_barras: '', descripcion: '', id_familia: '', unidad_medida: 'PZA', minimo: '', maximo: '', punto_reorden: '', costo_unitario: '', precio_venta: '', imagen_url: '', id_ubicacion: '' };

function validar(f) {
  const e = {};
  if (!f.codigo_interno.trim()) e.codigo_interno = 'El código interno es obligatorio.';
  if (!f.descripcion.trim()) e.descripcion = 'La descripción es obligatoria.';
  if (!f.id_familia) e.id_familia = 'Seleccione la familia.';
  for (const [k, n] of [['minimo', 'El mínimo'], ['maximo', 'El máximo'], ['punto_reorden', 'El punto de reorden'], ['costo_unitario', 'El costo'], ['precio_venta', 'El precio']]) {
    if (!esNum(f[k])) e[k] = `${n} es obligatorio.`;
    else if (Number(f[k]) < 0) e[k] = `${n} no puede ser negativo.`;
  }
  if (!e.minimo && !e.maximo && Number(f.maximo) < Number(f.minimo)) e.maximo = 'El máximo debe ser mayor o igual al mínimo.';
  if (!e.minimo && !e.maximo && !e.punto_reorden && (Number(f.punto_reorden) < Number(f.minimo) || Number(f.punto_reorden) > Number(f.maximo)))
    e.punto_reorden = 'Debe estar entre el mínimo y el máximo.';
  return e;
}

function Formulario({ id, puedeEditar, alTerminar }) {
  const [f, setF] = useState(VACIO);
  const [existencia, setExistencia] = useState(null);
  const [familias, setFamilias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/catalogos/familias').then(setFamilias);
    api.get('/catalogos/ubicaciones').then(setUbicaciones);
    if (id) api.get(`/catalogos/productos/${id}`).then((p) => {
      setExistencia(p.existencia);
      setF(Object.fromEntries(Object.keys(VACIO).map((k) => [k, p[k] ?? ''])));
    }).catch((e) => setError(e.message));
  }, [id]);

  const errs = intento ? validar(f) : {};
  const cambia = (k) => (ev) => setF({ ...f, [k]: ev.target.value });

  async function guardar(ev) {
    ev.preventDefault();
    setIntento(true);
    setError('');
    if (Object.keys(validar(f)).length) return;
    setGuardando(true);
    try {
      id ? await api.put(`/catalogos/productos/${id}`, f) : await api.post('/catalogos/productos', f);
      alTerminar(id ? 'Producto actualizado.' : 'Producto creado.');
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  const deshab = !puedeEditar;
  return (
    <Pantalla titulo={id ? 'Edición de producto' : 'Alta de producto'} id="IE-003" pie="Alta y edición de productos del catálogo (RF2).">
      <form onSubmit={guardar} noValidate>
        <Alerta tipo="error">{error}</Alerta>
        <fieldset disabled={deshab} style={{ border: 0 }}>
          <Seccion titulo="Identificación">
            <div className="campos">
              <Campo etiqueta="Código interno (SKU)" req hint="Único; no puede repetirse." error={errs.codigo_interno}>
                <input value={f.codigo_interno} onChange={cambia('codigo_interno')} maxLength={20} placeholder="RAC-0408" />
              </Campo>
              <Campo etiqueta="Código de barras" hint="Opcional, pero no se repite.">
                <input value={f.codigo_barras} onChange={cambia('codigo_barras')} maxLength={30} placeholder="7501000000028" />
              </Campo>
              <Campo etiqueta="Descripción" req full hint="Obligatoria." error={errs.descripcion}>
                <input value={f.descripcion} onChange={cambia('descripcion')} maxLength={150} />
              </Campo>
              <Campo etiqueta="Familia" req error={errs.id_familia}>
                <select value={f.id_familia} onChange={cambia('id_familia')}>
                  <option value="">Seleccione…</option>
                  {familias.map((x) => <option key={x.id_familia} value={x.id_familia}>{x.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Unidad de medida" req>
                <select value={f.unidad_medida} onChange={cambia('unidad_medida')}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="URL de imagen" full>
                <input value={f.imagen_url} onChange={cambia('imagen_url')} maxLength={255} placeholder="Opcional" />
              </Campo>
            </div>
          </Seccion>
          <Seccion titulo="Existencias y precios">
            <div className="campos">
              <Campo etiqueta="Mínimo" req hint="Mayor o igual a 0." error={errs.minimo}>
                <input type="number" step="any" min="0" value={f.minimo} onChange={cambia('minimo')} />
              </Campo>
              <Campo etiqueta="Máximo" req hint="Mayor o igual al mínimo." error={errs.maximo}>
                <input type="number" step="any" min="0" value={f.maximo} onChange={cambia('maximo')} />
              </Campo>
              <Campo etiqueta="Punto de reorden" req hint="Entre el mínimo y el máximo." error={errs.punto_reorden}>
                <input type="number" step="any" min="0" value={f.punto_reorden} onChange={cambia('punto_reorden')} />
              </Campo>
              <Campo etiqueta="Costo unitario" req hint="Mayor o igual a 0." error={errs.costo_unitario}>
                <input type="number" step="0.01" min="0" value={f.costo_unitario} onChange={cambia('costo_unitario')} />
              </Campo>
              <Campo etiqueta="Precio de venta" req hint="Mayor o igual a 0." error={errs.precio_venta}>
                <input type="number" step="0.01" min="0" value={f.precio_venta} onChange={cambia('precio_venta')} />
              </Campo>
              <Campo etiqueta="Ubicación">
                <select value={f.id_ubicacion} onChange={cambia('id_ubicacion')}>
                  <option value="">Sin ubicación</option>
                  {ubicaciones.map((u) => <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.clave}</option>)}
                </select>
              </Campo>
              {id && (
                <Campo etiqueta="Existencia actual" hint="Solo cambia con movimientos de almacén.">
                  <div className="static">{fmt.num(existencia)} {f.unidad_medida}</div>
                </Campo>
              )}
            </div>
          </Seccion>
        </fieldset>
        <Botones>
          <button type="button" className="btn btn-sec" onClick={() => alTerminar()}>{puedeEditar ? 'Cancelar' : 'Volver'}</button>
          {puedeEditar && <button className="btn btn-prim" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar producto'}</button>}
        </Botones>
      </form>
    </Pantalla>
  );
}

export default function Productos() {
  const { usuario } = useSesion();
  const puedeEditar = ['E', 'X'].includes(usuario.rol);
  const lista = useLista('/catalogos/productos');
  const [vista, setVista] = useState(null);      // null = lista, 'nuevo' o id
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  function terminar(msg) { setVista(null); if (msg) setAviso(msg); lista.recargar(); }
  async function baja(p) {
    if (!confirm(`¿Dar de baja el producto ${p.codigo_interno}?`)) return;
    try { await api.del(`/catalogos/productos/${p.id_producto}`); setAviso('Producto dado de baja.'); setError(''); lista.recargar(); }
    catch (e) { setError(e.message); }
  }
  async function reactivar(p) {
    try { await api.post(`/catalogos/productos/${p.id_producto}/reactivar`); setAviso('Producto reactivado.'); setError(''); lista.recargar(); }
    catch (e) { setError(e.message); }
  }

  if (vista) return <Formulario id={vista === 'nuevo' ? null : vista} puedeEditar={puedeEditar} alTerminar={terminar} />;
  return (
    <Pantalla titulo="Productos" id="IE-003" pie="Catálogo de productos (RF2).">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{error || lista.error}</Alerta>
      <Herramientas lista={lista} placeholder="Código, código de barras, descripción o familia…"
        nuevo={puedeEditar && <button className="btn btn-prim" onClick={() => { setAviso(''); setVista('nuevo'); }}>Nuevo producto</button>} />
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Código</th><th>Descripción</th><th>Familia</th><th>Ubicación</th><th className="num">Existencia</th><th className="num">Precio</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {!lista.filas ? <tr><td colSpan="8" className="vacio">Cargando…</td></tr>
              : lista.filas.length === 0 ? <tr><td colSpan="8" className="vacio">Sin productos.</td></tr>
              : lista.filas.map((p) => (
                <tr key={p.id_producto}>
                  <td><b>{p.codigo_interno}</b></td>
                  <td>{p.descripcion}</td>
                  <td>{p.familia}</td>
                  <td>{p.ubicacion ?? '—'}</td>
                  <td className="num">{fmt.num(p.existencia)} {p.unidad_medida}</td>
                  <td className="num">{fmt.dinero(p.precio_venta)}</td>
                  <td><Estado activo={p.activo} /></td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className="btn btn-sec btn-chico" onClick={() => { setAviso(''); setVista(p.id_producto); }}>{puedeEditar ? 'Editar' : 'Ver'}</button>{' '}
                    {puedeEditar && (p.activo
                      ? <button className="btn btn-peligro btn-chico" onClick={() => baja(p)}>Baja</button>
                      : <button className="btn btn-sec btn-chico" onClick={() => reactivar(p)}>Reactivar</button>)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
