// IE-007 Recepción de mercancía contra orden de compra (CU6). Roles C y E.
// Alternos: 2a orden no localizada, 4a recepción parcial, 6a no conforme, 7a excedente con autorización.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { EtiquetaEstado } from './comun.jsx';

export default function Recepcion() {
  const [params] = useSearchParams();
  const [texto, setTexto] = useState('');
  const [abiertas, setAbiertas] = useState([]);
  const [buscado, setBuscado] = useState(null);       // texto de la última búsqueda sin resultados (2a)
  const [ubicaciones, setUbicaciones] = useState([]);
  const [orden, setOrden] = useState(null);
  const [filas, setFilas] = useState([]);             // { id_producto, cantidad, no_conforme, id_ubicacion }
  const [factura, setFactura] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [paso, setPaso] = useState('captura');        // captura | confirmar | excedente
  const [autorizo, setAutorizo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function buscar(e) {
    e?.preventDefault();
    setError('');
    try {
      const r = await api.get('/compras/recepcion/ordenes?q=' + encodeURIComponent(texto.trim()));
      setAbiertas(r);
      setBuscado(r.length ? null : texto.trim());
      if (r.length === 1 && texto.trim()) await elegir(r[0].id_oc);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => {
    api.get('/compras/recepcion/ubicaciones').then(setUbicaciones).catch((e) => setError(e.message));
    api.get('/compras/recepcion/ordenes').then(setAbiertas).catch((e) => setError(e.message));
    if (params.get('oc')) elegir(params.get('oc'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Paso 3: productos con solicitado, recibido y pendiente; ubicación por defecto la del producto
  async function elegir(idOc) {
    setError(''); setResultado(null); setPaso('captura'); setAutorizo(false);
    if (!idOc) { setOrden(null); return; }
    try {
      const o = await api.get(`/compras/recepcion/ordenes/${idOc}`);
      setOrden(o);
      setFilas(o.partidas.map((p) => ({ id_producto: p.id_producto, cantidad: '', no_conforme: '', id_ubicacion: p.id_ubicacion ?? '' })));
      setFactura(''); setObservaciones('');
    } catch (err) { setOrden(null); setError(err.message); }
  }

  const cambiar = (i, campo, valor) => { setPaso('captura'); setFilas(filas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f))); };

  // Tipo de recepción: Total llena lo pendiente de cada producto
  const esTotal = orden && orden.partidas.every((p, i) => Number(filas[i]?.cantidad || 0) >= p.pendiente);
  function recibirTodo() {
    setPaso('captura');
    setFilas(filas.map((f, i) => ({ ...f, cantidad: String(orden.partidas[i].pendiente) })));
  }

  const capturadas = filas.filter((f) => Number(f.cantidad) > 0 || Number(f.no_conforme) > 0);

  function revisar() {
    setError('');
    if (!factura.trim()) return setError('Capture el número de factura o remisión del proveedor.');
    if (!capturadas.length) return setError('Capture al menos una cantidad recibida.');
    if (filas.some((f) => Number(f.cantidad) < 0 || Number(f.no_conforme) < 0)) return setError('Las cantidades no pueden ser negativas.');
    if (filas.some((f) => Number(f.cantidad) > 0 && !f.id_ubicacion)) return setError('Indique la ubicación de cada producto recibido.');
    setPaso('confirmar'); // paso 6
  }

  async function registrar(autorizar) {
    setError(''); setOcupado(true);
    try {
      const r = await api.post(`/compras/recepcion/ordenes/${orden.id_oc}`, {
        numero_factura: factura.trim(), observaciones, autorizar_excedente: autorizar,
        partidas: capturadas.map((f) => ({ id_producto: f.id_producto, cantidad: Number(f.cantidad) || 0,
          no_conforme: Number(f.no_conforme) || 0, id_ubicacion: f.id_ubicacion ? Number(f.id_ubicacion) : null })),
      });
      setResultado(r);
      setOrden(null); setFactura(''); setObservaciones(''); setTexto(''); setPaso('captura');
      setAbiertas(await api.get('/compras/recepcion/ordenes'));
    } catch (err) {
      if (err.status === 409) { setPaso('excedente'); setAutorizo(false); } // 7a
      else setError(err.message);
    } finally { setOcupado(false); }
  }

  const producto = (id) => orden.partidas.find((p) => p.id_producto === id);

  return (
    <Pantalla intro="Busque la orden de compra y capture las cantidades recibidas; el saldo pendiente se calcula solo."
      id="IE-007" pie="Registro de recepción de mercancía contra una orden de compra (CU6).">
      <Alerta tipo="error">{error}</Alerta>
      {resultado && (
        <Alerta tipo="ok">
          Recepción <b>{resultado.folio}</b> registrada: las entradas ya están en el inventario y el kardex.
          La orden <b>{resultado.folio_oc}</b> queda <b>{resultado.estado_nombre}</b>
          {resultado.estado === 'RECIBIDA_PARCIAL' && ' (el saldo pendiente sigue abierto)'}.
        </Alerta>
      )}

      <Seccion titulo="Orden y factura">
        <form className="herramientas" onSubmit={buscar}>
          <input className="input" placeholder="Buscar orden por folio o proveedor" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button className="btn btn-sec">Buscar</button>
        </form>
        {buscado !== null && (
          <Alerta tipo="aviso">No se localizó ninguna orden emitida o parcialmente recibida con «{buscado}» (2a). Intente otra búsqueda.</Alerta>
        )}
        <div className="campos">
          <Campo etiqueta="Orden de compra" req hint="Debe existir y estar abierta.">
            <select value={orden?.id_oc ?? ''} onChange={(e) => elegir(e.target.value)}>
              <option value="">Seleccione…</option>
              {abiertas.map((o) => <option key={o.id_oc} value={o.id_oc}>{o.folio} — {o.proveedor} ({o.estado_nombre})</option>)}
              {orden && !abiertas.some((o) => o.id_oc === orden.id_oc) && <option value={orden.id_oc}>{orden.folio} — {orden.proveedor} ({orden.estado_nombre})</option>}
            </select>
          </Campo>
          <Campo etiqueta="Factura del proveedor" req hint="Obligatoria (factura o remisión).">
            <input value={factura} maxLength={40} onChange={(e) => { setFactura(e.target.value); setPaso('captura'); }} disabled={!orden} placeholder="F-A-88213" />
          </Campo>
          <Campo etiqueta="Tipo de recepción" req>
            <div className="opciones">
              <label className="op"><input type="radio" checked={!!orden && esTotal} onChange={recibirTodo} disabled={!orden} /> Total</label>
              <label className="op"><input type="radio" checked={!!orden && !esTotal} readOnly disabled={!orden} /> Parcial</label>
            </div>
          </Campo>
          <Campo etiqueta="Fecha de recepción">
            <div className="static">{new Date().toLocaleDateString('es-MX')}</div>
          </Campo>
        </div>
      </Seccion>

      {orden && (
        <Seccion titulo={<>Productos recibidos · {orden.folio} <EtiquetaEstado estado={orden.estado} /></>}>
          <div className="tabla-env">
            <table className="tabla">
              <thead>
                <tr><th>Producto</th><th className="num">Solicitado</th><th className="num">Recibido</th><th className="num">Pendiente</th>
                  <th style={{ width: 110 }}>Recibido ahora</th><th style={{ width: 110 }}>No conforme</th><th style={{ width: 150 }}>Ubicación de entrada</th></tr>
              </thead>
              <tbody>
                {orden.partidas.map((p, i) => (
                  <tr key={p.id_producto}>
                    <td><b>{p.codigo_interno}</b> — {p.descripcion}</td>
                    <td className="num">{fmt.num(p.cantidad_solicitada)}</td>
                    <td className="num">{fmt.num(p.cantidad_recibida)}</td>
                    <td className="num">{fmt.num(p.pendiente)}</td>
                    <td><input type="number" min="0" step="any" value={filas[i]?.cantidad ?? ''} onChange={(e) => cambiar(i, 'cantidad', e.target.value)} aria-label={`Recibido de ${p.codigo_interno}`} /></td>
                    <td><input type="number" min="0" step="any" value={filas[i]?.no_conforme ?? ''} onChange={(e) => cambiar(i, 'no_conforme', e.target.value)} aria-label={`No conforme de ${p.codigo_interno}`} /></td>
                    <td>
                      <select value={filas[i]?.id_ubicacion ?? ''} onChange={(e) => cambiar(i, 'id_ubicacion', e.target.value)} aria-label={`Ubicación de ${p.codigo_interno}`}>
                        <option value="">—</option>
                        {ubicaciones.map((u) => <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.clave}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hint"><span className="v">✓</span>No puede exceder el saldo pendiente (si excede, se pide autorización). La mercancía no conforme se anota pero no entra al inventario.</div>
          <div className="campos" style={{ marginTop: 12 }}>
            <Campo etiqueta="Observaciones" full>
              <input value={observaciones} maxLength={250} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional: estado del embarque, defectos encontrados…" />
            </Campo>
          </div>
        </Seccion>
      )}

      {orden && paso !== 'captura' && (
        <Alerta tipo={paso === 'excedente' ? 'aviso' : 'info'}>
          {paso === 'excedente' && <p style={{ marginBottom: 8 }}><b>La cantidad recibida excede la solicitada (7a).</b> Para continuar se requiere autorización.</p>}
          <p style={{ marginBottom: 6 }}><b>Resumen de la recepción</b> — {orden.folio}, factura {factura.trim()}:</p>
          <ul style={{ margin: '0 0 8px 20px' }}>
            {capturadas.map((f) => {
              const p = producto(f.id_producto);
              const ub = ubicaciones.find((u) => String(u.id_ubicacion) === String(f.id_ubicacion));
              const excede = Number(f.cantidad || 0) > p.pendiente;
              return (
                <li key={f.id_producto}>
                  {p.codigo_interno}: recibe {fmt.num(Number(f.cantidad) || 0)} en {ub?.clave ?? '—'}
                  {Number(f.no_conforme) > 0 && `, ${fmt.num(Number(f.no_conforme))} no conforme`}
                  {excede && <b> (excede el pendiente de {fmt.num(p.pendiente)})</b>}
                </li>
              );
            })}
          </ul>
          {paso === 'excedente' ? (
            <>
              <label className="op" style={{ marginBottom: 8 }}><input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} /> Autorizo recibir la cantidad excedente</label>
              <button className="btn btn-prim btn-chico" disabled={!autorizo || ocupado} onClick={() => registrar(true)}>Confirmar con autorización</button>{' '}
            </>
          ) : (
            <><button className="btn btn-prim btn-chico" disabled={ocupado} onClick={() => registrar(false)}>Confirmar recepción</button>{' '}</>
          )}
          <button className="btn btn-sec btn-chico" onClick={() => setPaso('captura')}>Corregir cantidades</button>
        </Alerta>
      )}

      <Botones>
        {orden ? <button className="btn btn-sec" onClick={() => elegir('')}>Cancelar</button> : <Link className="btn btn-sec" to="/">Cancelar</Link>}
        <button className="btn btn-prim" disabled={!orden || paso !== 'captura'} onClick={revisar}>Registrar recepción</button>
      </Botones>
    </Pantalla>
  );
}
