// Nota de salida con varias partidas (RF8): genera la nota (S1) y la orden de surtido (S3).
import { useEffect, useRef, useState } from 'react';
import { api, abrirDocumento } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import BuscadorProducto from './BuscadorProducto.jsx';
import './almacen.css';

const cant = (n) => fmt.num(n, Number(n) % 1 ? 2 : 0);

export default function NotaSalida() {
  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState('');
  const [partidas, setPartidas] = useState([]);      // [{ producto, cantidad }]
  const [texto, setTexto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [hecha, setHecha] = useState(null);          // { id, folio }
  const [notas, setNotas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const refBuscar = useRef(null);

  const cargarNotas = () => api.get('/almacen/notas').then(setNotas).catch(() => {});
  useEffect(() => {
    api.get('/almacen/catalogos').then((d) => { setClientes(d.clientes); setIdCliente(String(d.clientes[0]?.id_cliente ?? '')); })
      .catch((e) => setAviso({ tipo: 'error', texto: e.message }));
    cargarNotas();
  }, []);

  // Agrega la partida (si el producto ya está, suma 1 a su cantidad, como al escanear dos veces)
  function agregar(p) {
    setAviso(null); setHecha(null);
    setPartidas((ps) => {
      const i = ps.findIndex((x) => x.producto.id_producto === p.id_producto);
      if (i >= 0) return ps.map((x, j) => (j === i ? { ...x, cantidad: String(Number(x.cantidad || 0) + 1) } : x));
      return [...ps, { producto: p, cantidad: '1' }];
    });
    setTexto('');
    setTimeout(() => refBuscar.current?.focus(), 0);
  }

  const cambiarCantidad = (i, v) => setPartidas((ps) => ps.map((x, j) => (j === i ? { ...x, cantidad: v } : x)));
  const quitar = (i) => setPartidas((ps) => ps.filter((_, j) => j !== i));

  // Validación en pantalla: cantidad > 0 y no mayor a la existencia
  const problema = (x) => {
    const c = Number(x.cantidad);
    if (x.cantidad === '' || !(c > 0)) return 'Cantidad mayor a 0.';
    if (c > Number(x.producto.existencia)) return `Excede la existencia (${cant(x.producto.existencia)}).`;
    if (!x.producto.id_ubicacion) return 'Sin ubicación asignada.';
    return null;
  };
  const hayProblemas = partidas.some(problema);
  const total = partidas.reduce((s, x) => s + (Number(x.cantidad) || 0) * Number(x.producto.precio_venta), 0);
  const cliente = clientes.find((c) => String(c.id_cliente) === idCliente);

  function revisar() {
    setAviso(null);
    if (partidas.length === 0) return setAviso({ tipo: 'error', texto: 'Agregue al menos una partida.' });
    if (hayProblemas) return setAviso({ tipo: 'error', texto: 'Corrija las partidas marcadas antes de continuar.' });
    setConfirmar(true);
  }

  function cancelar() {
    setPartidas([]); setObservaciones(''); setConfirmar(false); setTexto(''); setHecha(null);
    setIdCliente(String(clientes[0]?.id_cliente ?? ''));
    setAviso({ tipo: 'info', texto: 'Captura descartada. El inventario no cambió.' });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const r = await api.post('/almacen/notas', {
        idCliente: Number(idCliente), observaciones,
        partidas: partidas.map((x) => ({ idProducto: x.producto.id_producto, cantidad: Number(x.cantidad) })),
      });
      setHecha(r); setPartidas([]); setObservaciones(''); setConfirmar(false);
      setAviso({ tipo: 'ok', texto: `Nota de salida ${r.folio} registrada con ${r.movimientos.length} partida(s). Se descontó la existencia.` });
      cargarNotas();
    } catch (e) {
      // Si una partida falla se revierte toda la nota; el mensaje dice cuál
      setConfirmar(false);
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setGuardando(false); }
  }

  return (
    <>
      <Pantalla intro="Arme la salida con una o varias partidas. Al confirmar se descuenta la existencia y se generan la nota de salida y la orden de surtido."
        id="S1 · S3" pie="Nota de salida y orden de surtido (RF8).">
        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
        {hecha && (
          <div className="herramientas">
            <button className="btn btn-prim" onClick={() => abrirDocumento(`/almacen/notas/${hecha.id}/pdf`)}>Imprimir nota de salida</button>
            <button className="btn btn-sec" onClick={() => abrirDocumento(`/almacen/notas/${hecha.id}/surtido`)}>Orden de surtido</button>
          </div>
        )}
        <fieldset disabled={confirmar} style={{ border: 'none' }}>
          <Seccion titulo="Datos de la nota">
            <div className="campos">
              <Campo etiqueta="Cliente" req>
                <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)}>
                  {clientes.map((c) => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Fecha" hint="La asigna el sistema al guardar.">
                <div className="static">{new Date().toLocaleDateString('es-MX')}</div>
              </Campo>
            </div>
          </Seccion>
          <Seccion titulo="Partidas">
            <Campo etiqueta="Agregar producto (código o escáner)" hint="Escanee o escriba el código y presione Enter. Escanear de nuevo suma una pieza.">
              <BuscadorProducto ref={refBuscar} texto={texto} setTexto={setTexto} onElegir={agregar} />
            </Campo>
            <div className="tabla-env" style={{ marginTop: 12 }}>
              <table className="tabla">
                <thead><tr>
                  <th>Código</th><th>Descripción</th><th className="alm-ocultar-movil">Ubicación</th><th className="num">Existencia</th>
                  <th style={{ width: 110 }}>Cantidad</th><th className="num alm-ocultar-movil">Precio</th><th className="num">Importe</th><th />
                </tr></thead>
                <tbody>
                  {partidas.length === 0 && <tr><td colSpan={8} className="vacio">Sin partidas. Escanee o busque un producto.</td></tr>}
                  {partidas.map((x, i) => {
                    const err = problema(x);
                    return (
                      <tr key={x.producto.id_producto} className={err ? 'alm-excede' : ''}>
                        <td><b>{x.producto.codigo_interno}</b></td>
                        <td>{x.producto.descripcion}{err && <div className="hint err">✗ {err}</div>}</td>
                        <td className="alm-ocultar-movil">{x.producto.ubicacion ?? '—'}</td>
                        <td className="num">{cant(x.producto.existencia)} {x.producto.unidad_medida.toLowerCase()}</td>
                        <td><input type="number" inputMode="decimal" min="0" step="any" value={x.cantidad}
                          aria-label={`Cantidad de ${x.producto.codigo_interno}`} onChange={(e) => cambiarCantidad(i, e.target.value)} /></td>
                        <td className="num alm-ocultar-movil">{fmt.dinero(x.producto.precio_venta)}</td>
                        <td className="num">{fmt.dinero((Number(x.cantidad) || 0) * Number(x.producto.precio_venta))}</td>
                        <td><button type="button" className="btn btn-peligro btn-chico" onClick={() => quitar(i)} aria-label={`Quitar ${x.producto.codigo_interno}`}>Quitar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="alm-total">Total: {fmt.dinero(total)}</div>
          </Seccion>
          <Seccion titulo="Observaciones">
            <Campo etiqueta="Observaciones">
              <textarea rows={2} maxLength={250} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional: forma de entrega, pedido, etc." />
            </Campo>
          </Seccion>
        </fieldset>

        {!confirmar ? (
          <Botones>
            <button type="button" className="btn btn-sec" onClick={cancelar}>Cancelar</button>
            <button type="button" className="btn btn-prim" onClick={revisar} disabled={partidas.length === 0}>Confirmar nota de salida</button>
          </Botones>
        ) : (
          <Seccion titulo="Confirme la nota de salida">
            <div className="alm-resumen">
              <div><span>Cliente</span><b>{cliente?.nombre}</b></div>
              <div><span>Partidas</span><b>{partidas.length}</b></div>
              {partidas.map((x) => <div key={x.producto.id_producto}><span>{x.producto.codigo_interno} · {x.producto.descripcion}</span><b>{cant(x.cantidad)} {x.producto.unidad_medida.toLowerCase()}</b></div>)}
              <div><span>Total</span><b>{fmt.dinero(total)}</b></div>
            </div>
            <Botones>
              <button type="button" className="btn btn-sec" onClick={() => setConfirmar(false)} disabled={guardando}>Corregir</button>
              <button type="button" className="btn btn-peligro" onClick={cancelar} disabled={guardando}>Cancelar</button>
              <button type="button" className="btn btn-prim" onClick={guardar} disabled={guardando} autoFocus>{guardando ? 'Guardando…' : 'Confirmar y guardar'}</button>
            </Botones>
          </Seccion>
        )}
      </Pantalla>

      <Pantalla titulo="Notas de salida recientes" id="S1" pie="Reimpresión de notas de salida y órdenes de surtido.">
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th className="num">Partidas</th><th className="num">Total</th><th>Imprimir</th></tr></thead>
            <tbody>
              {notas.length === 0 && <tr><td colSpan={6} className="vacio">Aún no hay notas de salida.</td></tr>}
              {notas.map((n) => (
                <tr key={n.id_nota_salida}>
                  <td><b>{n.folio}</b></td><td>{fmt.fechaHora(n.fecha)}</td><td>{n.cliente ?? 'Público en general'}</td>
                  <td className="num">{n.partidas}</td><td className="num">{fmt.dinero(n.total ?? 0)}</td>
                  <td><div className="alm-acciones">
                    <button className="btn btn-sec btn-chico" onClick={() => abrirDocumento(`/almacen/notas/${n.id_nota_salida}/pdf`)}>Nota</button>
                    <button className="btn btn-sec btn-chico" onClick={() => abrirDocumento(`/almacen/notas/${n.id_nota_salida}/surtido`)}>Surtido</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Pantalla>
    </>
  );
}
