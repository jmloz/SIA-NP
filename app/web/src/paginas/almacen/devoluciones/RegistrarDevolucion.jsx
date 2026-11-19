// CU4 Registrar devolución de cliente (RF7, IE-008).
// Pasos: 2 cliente → 3 notas → 4 productos → 5 cantidad, motivo y estado → 6 validación → 7 confirmación → 8–9 folio.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../../componentes/ui.jsx';
import { useSesion } from '../../../sesion.jsx';
import BuscadorProducto from '../BuscadorProducto.jsx';
import '../almacen.css';
import './devoluciones.css';

const cant = (n) => fmt.num(n, Number(n) % 1 ? 2 : 0);
const MANUAL = 'manual';

export default function RegistrarDevolucion() {
  const { usuario } = useSesion();
  const esEncargado = usuario?.rol === 'E';

  // Paso 2: cliente
  const [textoCliente, setTextoCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [clienteNoExiste, setClienteNoExiste] = useState('');
  // Paso 3: notas del cliente; idNota = id de la nota o MANUAL (3a)
  const [notas, setNotas] = useState([]);
  const [idNota, setIdNota] = useState('');
  const [nota, setNota] = useState(null);             // { folio, productos: [...] }
  // Pasos 4–5: productos elegidos { producto, cantidad, motivo, estado }
  const [elegidos, setElegidos] = useState([]);
  const [textoProd, setTextoProd] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [hecha, setHecha] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const refCliente = useRef(null);
  const refProd = useRef(null);

  const cargarRecientes = () => api.get('/devoluciones').then(setRecientes).catch(() => {});
  useEffect(() => { cargarRecientes(); }, []);

  async function buscarCliente() {
    const t = textoCliente.trim();
    setClientes([]); setClienteNoExiste(''); setAviso(null);
    if (!t) return setAviso({ tipo: 'error', texto: 'Capture el nombre o RFC del cliente.' });
    try {
      const lista = await api.get('/devoluciones/clientes?q=' + encodeURIComponent(t));
      if (lista.length === 0) setClienteNoExiste(t);     // 2a
      else if (lista.length === 1) elegirCliente(lista[0]);
      else setClientes(lista);
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  }

  async function elegirCliente(c) {
    setCliente(c); setTextoCliente(c.nombre); setClientes([]); setHecha(null);
    setIdNota(''); setNota(null); setElegidos([]);
    try {
      const ns = await api.get(`/devoluciones/clientes/${c.id_cliente}/notas`);
      setNotas(ns);
      if (ns.length) elegirNota(String(ns[0].id_nota_salida));
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  }

  async function elegirNota(v) {
    setIdNota(v); setNota(null); setElegidos([]); setAviso(null);
    if (!v || v === MANUAL) return;
    try { setNota(await api.get(`/devoluciones/notas/${v}`)); }
    catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  }

  // Paso 4: marcar o desmarcar un producto de la nota
  function alternar(p) {
    setElegidos((es) => es.some((x) => x.producto.id_producto === p.id_producto)
      ? es.filter((x) => x.producto.id_producto !== p.id_producto)
      : [...es, { producto: p, cantidad: '', motivo: '', estado: 'BUENA' }]);
  }
  // 3a: agregar producto libremente con el buscador
  function agregarManual(p) {
    setTextoProd('');
    setElegidos((es) => es.some((x) => x.producto.id_producto === p.id_producto) ? es
      : [...es, { producto: p, cantidad: '', motivo: '', estado: 'BUENA' }]);
  }
  const cambiar = (id, campo, v) => setElegidos((es) => es.map((x) => (x.producto.id_producto === id ? { ...x, [campo]: v } : x)));
  const quitar = (id) => setElegidos((es) => es.filter((x) => x.producto.id_producto !== id));

  // Paso 6 / 6a: no exceder lo vendido menos lo ya devuelto
  const problema = (x) => {
    const c = Number(x.cantidad);
    if (x.cantidad === '' || !(c > 0)) return 'Capture una cantidad mayor a 0.';
    if (Math.round(c * 100) !== c * 100) return 'Máximo dos decimales.';
    if (nota && c > Number(x.producto.disponible))
      return `Excede lo vendido menos lo ya devuelto: disponible ${cant(x.producto.disponible)} (6a).`;
    if (!x.motivo.trim()) return 'El motivo es obligatorio.';
    if (x.estado === 'BUENA' && !x.producto.id_ubicacion) return 'El producto no tiene ubicación para reingresarlo.';
    return null;
  };
  const manual = idNota === MANUAL;
  const puedeCapturar = cliente && (nota || (manual && esEncargado));

  function revisar() {
    setAviso(null);
    if (!cliente) return setAviso({ tipo: 'error', texto: 'Busque y seleccione al cliente (paso 2).' });
    if (elegidos.length === 0) return setAviso({ tipo: 'error', texto: 'Seleccione al menos un producto a devolver.' });
    const malo = elegidos.find(problema);
    if (malo) return setAviso({ tipo: 'error', texto: `${malo.producto.codigo_interno}: ${problema(malo)} No se puede continuar.` });
    setConfirmar(true);
  }

  function limpiar() {
    setTextoCliente(''); setClientes([]); setCliente(null); setClienteNoExiste('');
    setNotas([]); setIdNota(''); setNota(null); setElegidos([]); setTextoProd(''); setConfirmar(false);
  }
  function cancelar() {
    limpiar(); setHecha(null);
    setAviso({ tipo: 'info', texto: 'Devolución cancelada. El inventario no cambió.' });
    setTimeout(() => refCliente.current?.focus(), 0);
  }

  async function guardar() {
    setGuardando(true);
    try {
      const r = await api.post('/devoluciones', {
        idCliente: cliente.id_cliente,
        idNotaSalida: manual ? null : Number(idNota),
        partidas: elegidos.map((x) => ({ idProducto: x.producto.id_producto, cantidad: Number(x.cantidad), motivo: x.motivo.trim(), estado: x.estado })),
      });
      limpiar(); setHecha(r); setAviso(null);
      cargarRecientes();
    } catch (e) {
      setConfirmar(false);
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setGuardando(false); }
  }

  const buenas = elegidos.filter((x) => x.estado === 'BUENA');
  const danadas = elegidos.filter((x) => x.estado === 'DANADA');
  const unidad = (p) => (p.unidad_medida ?? '').toLowerCase();

  return (
    <>
      <Pantalla id="IE-008" pie="Captura de devoluciones de cliente (CU4).">
        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
        {hecha && <Resultado r={hecha} />}

        <fieldset disabled={confirmar} style={{ border: 'none' }}>
          <Seccion titulo="Documento de venta">
            <div className="campos">
              <Campo etiqueta="Cliente" req hint="Si no existe, se puede dar de alta.">
                <div className="alm-buscar">
                  <input ref={refCliente} value={textoCliente} autoFocus placeholder="Nombre o RFC del cliente y Enter"
                    onChange={(e) => { setTextoCliente(e.target.value); setClienteNoExiste(''); if (cliente) { setCliente(null); setNotas([]); setIdNota(''); setNota(null); setElegidos([]); } }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarCliente(); } }} />
                  <button type="button" className="btn btn-sec" onClick={buscarCliente}>Buscar</button>
                </div>
                {clientes.length > 0 && (
                  <div className="alm-lista" role="listbox" aria-label="Clientes encontrados">
                    {clientes.map((c) => (
                      <button type="button" key={c.id_cliente} onClick={() => elegirCliente(c)}>
                        <span className="cod">{c.rfc ?? 'Sin RFC'}</span><span>{c.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
                {clienteNoExiste && (
                  <div style={{ marginTop: 8 }}>
                    <Alerta tipo="aviso">
                      No existe un cliente con «{clienteNoExiste}» (2a).{' '}
                      <Link to="/catalogos/clientes">Darlo de alta en Clientes</Link> o{' '}
                      <button type="button" className="btn btn-sec btn-chico" onClick={cancelar}>Cancelar</button>
                    </Alerta>
                  </div>
                )}
              </Campo>
              <Campo etiqueta="Nota de salida / factura" req hint="Respalda la venta original.">
                <select value={idNota} onChange={(e) => elegirNota(e.target.value)} disabled={!cliente}>
                  {!cliente && <option value="">Primero elija al cliente</option>}
                  {cliente && notas.length === 0 && <option value="">El cliente no tiene notas de salida</option>}
                  {notas.map((n) => (
                    <option key={n.id_nota_salida} value={n.id_nota_salida}>
                      {n.folio} ({fmt.fecha(n.fecha)}) · {n.partidas} partida(s) · {fmt.dinero(n.total ?? 0)}
                    </option>
                  ))}
                  {cliente && (
                    <option value={MANUAL} disabled={!esEncargado}>
                      {esEncargado ? 'No se localiza el documento (registro manual)' : 'Registro manual: requiere autorización del Encargado de Almacén'}
                    </option>
                  )}
                </select>
              </Campo>
            </div>
            {manual && (esEncargado
              ? <div className="dev-aviso"><Alerta tipo="aviso">Registro manual sin documento original (3a): quedará autorizado por {usuario.nombre}. Elija los productos con el buscador.</Alerta></div>
              : <div className="dev-aviso"><Alerta tipo="error">El registro manual requiere autorización del Encargado de Almacén (3a).</Alerta></div>)}
            {cliente && !esEncargado && (
              <div className="hint">Si no se localiza el documento original, el registro manual requiere autorización del Encargado de Almacén (3a).</div>
            )}
          </Seccion>

          <Seccion titulo="Mercancía devuelta">
            {!puedeCapturar && <div className="vacio dev-vacio">Elija al cliente y la nota de salida para ver los productos vendidos.</div>}

            {nota && (
              <div className="tabla-env">
                <table className="tabla">
                  <thead><tr>
                    <th style={{ width: 70 }}>Devolver</th><th>Código</th><th>Descripción</th>
                    <th className="num">Vendida</th><th className="num">Ya devuelta</th><th className="num">Disponible</th>
                  </tr></thead>
                  <tbody>
                    {nota.productos.map((p) => {
                      const marcado = elegidos.some((x) => x.producto.id_producto === p.id_producto);
                      const agotado = Number(p.disponible) <= 0;
                      return (
                        <tr key={p.id_producto}>
                          <td><input type="checkbox" checked={marcado} disabled={agotado && !marcado} onChange={() => alternar(p)}
                            aria-label={`Devolver ${p.codigo_interno}`} /></td>
                          <td><b>{p.codigo_interno}</b></td><td>{p.descripcion}</td>
                          <td className="num">{cant(p.vendida)} {unidad(p)}</td>
                          <td className="num">{cant(p.devuelta)}</td>
                          <td className="num">{agotado ? <span className="etiqueta">Ya devuelto</span> : cant(p.disponible)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {manual && esEncargado && (
              <Campo etiqueta="Agregar producto (código o escáner)" hint="Sin nota no hay cantidad vendida que comparar.">
                <BuscadorProducto ref={refProd} texto={textoProd} setTexto={setTextoProd} onElegir={agregarManual} autoFocus={false} />
              </Campo>
            )}

            {puedeCapturar && elegidos.map((x) => {
              const p = x.producto, err = problema(x), id = p.id_producto;
              const excede = nota && Number(x.cantidad) > Number(p.disponible);
              return (
                <div key={id} className={`dev-producto${err ? ' con-error' : ''}`}>
                  <div className="campos">
                    <Campo etiqueta="Producto" full>
                      <div className="dev-prod-fila">
                        <div className="static">{p.codigo_interno} — {p.descripcion}</div>
                        <button type="button" className="btn btn-sec btn-chico" onClick={() => quitar(id)}>Quitar</button>
                      </div>
                    </Campo>
                    <Campo etiqueta="Cantidad vendida">
                      <div className="static">
                        {nota ? `${cant(p.vendida)} ${unidad(p)} · ya devuelta ${cant(p.devuelta)} · disponible ${cant(p.disponible)}` : '— (sin nota de salida)'}
                      </div>
                    </Campo>
                    <Campo etiqueta="Cantidad devuelta" req hint={nota ? 'No puede exceder la cantidad vendida menos lo ya devuelto.' : 'Mayor a 0.'}
                      error={excede ? `Excede lo disponible para devolver (${cant(p.disponible)}) (6a).` : null}>
                      <input type="number" inputMode="decimal" min="0" step="any" value={x.cantidad}
                        aria-label={`Cantidad devuelta de ${p.codigo_interno}`} onChange={(e) => cambiar(id, 'cantidad', e.target.value)} />
                    </Campo>
                    <Campo etiqueta="Estado de la mercancía" req full
                      hint={x.estado === 'BUENA' ? `Reingresa al inventario en ${p.ubicacion ?? 'su ubicación'}.` : 'Se marca como no disponible y no suma a la existencia (7a).'}>
                      <div className="opciones" role="radiogroup" aria-label={`Estado de ${p.codigo_interno}`}>
                        <label className="op"><input type="radio" name={`estado-${id}`} checked={x.estado === 'BUENA'} onChange={() => cambiar(id, 'estado', 'BUENA')} />Buen estado (reingresa)</label>
                        <label className="op"><input type="radio" name={`estado-${id}`} checked={x.estado === 'DANADA'} onChange={() => cambiar(id, 'estado', 'DANADA')} />Dañada (resguardo)</label>
                      </div>
                    </Campo>
                    <Campo etiqueta="Motivo de la devolución" req full hint="Obligatorio.">
                      <textarea rows={2} maxLength={200} value={x.motivo} placeholder="Ej. Pieza con rosca equivocada; en buen estado."
                        onChange={(e) => cambiar(id, 'motivo', e.target.value)} />
                    </Campo>
                  </div>
                </div>
              );
            })}
            {puedeCapturar && elegidos.length === 0 && (
              <div className="vacio dev-vacio">{nota ? 'Marque los productos que el cliente devuelve.' : 'Busque y agregue los productos devueltos.'}</div>
            )}
          </Seccion>
        </fieldset>

        {!confirmar ? (
          <Botones>
            <button type="button" className="btn btn-sec" onClick={cancelar}>Cancelar</button>
            <button type="button" className="btn btn-prim" onClick={revisar} disabled={!puedeCapturar || elegidos.length === 0}>Registrar devolución</button>
          </Botones>
        ) : (
          <Seccion titulo="Confirme la devolución">
            <div className="alm-resumen">
              <div><span>Cliente</span><b>{cliente.nombre}</b></div>
              <div><span>Documento original</span><b>{manual ? `Registro manual, autoriza ${usuario.nombre}` : nota.folio}</b></div>
              {buenas.map((x) => (
                <div key={x.producto.id_producto}>
                  <span>{x.producto.codigo_interno} · {x.producto.descripcion} — {x.motivo}</span>
                  <b>+{cant(x.cantidad)} {unidad(x.producto)} al inventario</b>
                </div>
              ))}
              {danadas.map((x) => (
                <div key={x.producto.id_producto}>
                  <span>{x.producto.codigo_interno} · {x.producto.descripcion} — {x.motivo}</span>
                  <b className="dev-danada">{cant(x.cantidad)} {unidad(x.producto)} dañada: no disponible, no suma a la existencia</b>
                </div>
              ))}
            </div>
            <Botones>
              <button type="button" className="btn btn-sec" onClick={() => setConfirmar(false)} disabled={guardando}>Corregir</button>
              <button type="button" className="btn btn-peligro" onClick={cancelar} disabled={guardando}>Cancelar</button>
              <button type="button" className="btn btn-prim" onClick={guardar} disabled={guardando} autoFocus>{guardando ? 'Guardando…' : 'Confirmar devolución'}</button>
            </Botones>
          </Seccion>
        )}
      </Pantalla>

      <Pantalla titulo="Devoluciones recientes" pie="Devoluciones de cliente registradas (RF7).">
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Nota</th><th>Productos</th><th>Estado</th></tr></thead>
            <tbody>
              {recientes.length === 0 && <tr><td colSpan={6} className="vacio">Aún no hay devoluciones.</td></tr>}
              {recientes.map((d) => (
                <tr key={d.folio}>
                  <td><b>{d.folio}</b></td>
                  <td>{fmt.fechaHora(d.fecha)}</td>
                  <td>{d.cliente}</td>
                  <td>{d.nota ?? <span title={`Autorizó ${d.autorizado_por}`}>Manual · {d.autorizado_por}</span>}</td>
                  <td>{d.detalle}</td>
                  <td>{d.danadas === 0 ? <span className="etiqueta verde">Reingresó</span>
                    : d.buenas === 0 ? <span className="etiqueta roja">No disponible</span>
                      : <span className="etiqueta ambar">Parcial</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Pantalla>
    </>
  );
}

/** Paso 9: folio, lo que entró al inventario y lo que quedó como no disponible. */
function Resultado({ r }) {
  return (
    <div className="dev-resultado">
      <Alerta tipo="ok">
        Devolución <b>{r.folio}</b> registrada para {r.cliente} ({r.nota ? `nota ${r.nota}` : 'registro manual autorizado'}).
      </Alerta>
      <div className="alm-resumen">
        {r.entraron.map((x) => (
          <div key={x.codigo}><span>{x.codigo} · {x.descripcion} — entró al inventario en {x.ubicacion} ({x.folioMovimiento})</span>
            <b>+{cant(x.cantidad)} {x.unidad.toLowerCase()} · existencia {cant(x.saldo)}</b></div>
        ))}
        {r.noDisponibles.map((x) => (
          <div key={x.codigo}><span>{x.codigo} · {x.descripcion} — dañada, quedó como no disponible</span>
            <b className="dev-danada">{cant(x.cantidad)} {x.unidad.toLowerCase()} · no sumó a la existencia</b></div>
        ))}
      </div>
    </div>
  );
}
