// IE-006 Generar orden de compra (CU5). También edita un borrador (/compras/ordenes/:id/editar).
// Alternos: 3a proveedor no existe (enlace a catálogos), 4a sugerencia de reorden, 5a importación (nota), 7a borrador.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, abrirDocumento } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { sumarDias, redondear } from './comun.jsx';

// La OC es en MXN: si el precio del proveedor está en USD se precarga el costo del catálogo (pesos).
const costoMXN = (p) => (p.moneda === 'USD' || p.precio_compra == null ? p.costo_unitario : p.precio_compra);

export default function OrdenForm() {
  const { id } = useParams();                 // si viene, se edita un borrador
  const [params] = useSearchParams();         // ?proveedor=2&reorden=1 desde Sugerencias de reorden
  const navegar = useNavigate();

  const [hoy, setHoy] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [idProveedor, setIdProveedor] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [partidas, setPartidas] = useState([]);     // { id_producto, codigo_interno, descripcion, cantidad, costo_unitario }
  const [nueva, setNueva] = useState({ id_producto: '', cantidad: '', costo_unitario: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [emitida, setEmitida] = useState(null);     // resultado del paso 8
  const [ocupado, setOcupado] = useState(false);

  const proveedor = proveedores.find((p) => String(p.id_proveedor) === String(idProveedor));

  // Paso 2: fecha actual y proveedores; si es edición, carga el borrador
  useEffect(() => {
    (async () => {
      try {
        const f = await api.get('/compras/formulario');
        setHoy(f.hoy);
        setProveedores(f.proveedores);
        if (id) {
          const o = await api.get(`/compras/ordenes/${id}`);
          if (o.estado !== 'PENDIENTE') { setError(`La orden está ${o.estado_nombre}; solo se edita un borrador.`); return; }
          setIdProveedor(String(o.id_proveedor));
          setFechaEntrega(o.fecha_entrega_estimada?.slice(0, 10) ?? '');
          setObservaciones(o.observaciones ?? '');
          setPartidas(o.partidas.map((p) => ({ id_producto: p.id_producto, codigo_interno: p.codigo_interno, descripcion: p.descripcion,
            cantidad: String(p.cantidad_solicitada), costo_unitario: String(p.costo_unitario) })));
        } else if (params.get('proveedor')) {
          const prov = f.proveedores.find((p) => String(p.id_proveedor) === params.get('proveedor'));
          if (prov) {
            setIdProveedor(String(prov.id_proveedor));
            setFechaEntrega(sumarDias(f.hoy, prov.lead_time_dias));
            if (params.get('reorden')) await cargarSugerencia(prov.id_proveedor);
          }
        }
      } catch (e) { setError(e.message); }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Productos: primero los que surte el proveedor, con su precio de compra
  useEffect(() => {
    api.get('/compras/productos' + (idProveedor ? `?proveedor=${idProveedor}` : '')).then(setProductos).catch((e) => setError(e.message));
  }, [idProveedor]);

  function cambiarProveedor(valor) {
    setIdProveedor(valor);
    const prov = proveedores.find((p) => String(p.id_proveedor) === valor);
    if (prov && hoy) setFechaEntrega(sumarDias(hoy, prov.lead_time_dias)); // hoy + lead time
    setNueva({ id_producto: '', cantidad: '', costo_unitario: '' });
  }

  function elegirProducto(valor) {
    const p = productos.find((x) => String(x.id_producto) === valor);
    setNueva({ ...nueva, id_producto: valor, costo_unitario: p ? String(costoMXN(p)) : '' });
  }

  function agregar() {
    setError('');
    const p = productos.find((x) => String(x.id_producto) === nueva.id_producto);
    if (!p) return setError('Elija un producto.');
    if (partidas.some((x) => x.id_producto === p.id_producto)) return setError('Ese producto ya está en la orden; modifique su cantidad en la tabla.');
    if (!(Number(nueva.cantidad) > 0)) return setError('La cantidad debe ser mayor a 0.');
    if (nueva.costo_unitario === '' || Number(nueva.costo_unitario) < 0) return setError('Capture el costo unitario.');
    setPartidas([...partidas, { id_producto: p.id_producto, codigo_interno: p.codigo_interno, descripcion: p.descripcion,
      cantidad: nueva.cantidad, costo_unitario: nueva.costo_unitario }]);
    setNueva({ id_producto: '', cantidad: '', costo_unitario: '' });
  }

  const cambiarPartida = (i, campo, valor) => setPartidas(partidas.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  const quitar = (i) => setPartidas(partidas.filter((_, j) => j !== i));

  // 4a: productos de este proveedor bajo el punto de reorden, cantidad = máximo − existencia
  async function cargarSugerencia(prov = idProveedor) {
    setError(''); setAviso('');
    if (!prov) return setError('Seleccione primero el proveedor.');
    try {
      const sug = await api.get(`/compras/reorden?proveedor=${prov}`);
      if (!sug.length) return setAviso('Este proveedor no surte productos bajo el punto de reorden.');
      setPartidas((actuales) => {
        const resto = actuales.filter((a) => !sug.some((s) => s.id_producto === a.id_producto));
        return [...resto, ...sug.map((s) => ({ id_producto: s.id_producto, codigo_interno: s.codigo_interno, descripcion: s.descripcion,
          cantidad: String(s.cantidad_sugerida), costo_unitario: String(costoMXN(s)) }))];
      });
      setAviso(`Se cargaron ${sug.length} producto(s) bajo el punto de reorden (4a). Revise cantidades y costos.`);
    } catch (e) { setError(e.message); }
  }

  // Paso 5: totales en pantalla (la BD guarda el subtotal y calcula IVA y total)
  const totales = useMemo(() => {
    const subtotal = redondear(partidas.reduce((s, p) => s + redondear((Number(p.cantidad) || 0) * (Number(p.costo_unitario) || 0)), 0));
    const iva = redondear(subtotal * 0.16);
    return { subtotal, iva, total: redondear(subtotal + iva) };
  }, [partidas]);

  async function guardar(emitir) {
    setError(''); setAviso('');
    if (!idProveedor) return setError('Seleccione el proveedor.');
    if (!partidas.length) return setError('Agregue al menos un producto a la orden.');
    if (fechaEntrega && fechaEntrega < hoy) return setError('La fecha de entrega estimada no puede ser anterior a la emisión.');
    const cuerpo = {
      id_proveedor: Number(idProveedor), fecha_entrega_estimada: fechaEntrega || null, observaciones, emitir,
      partidas: partidas.map((p) => ({ id_producto: p.id_producto, cantidad: Number(p.cantidad), costo_unitario: Number(p.costo_unitario) })),
    };
    setOcupado(true);
    try {
      const r = id ? await api.put(`/compras/ordenes/${id}`, cuerpo) : await api.post('/compras/ordenes', cuerpo);
      if (emitir) setEmitida(r);
      else navegar(`/compras/ordenes/${r.id_oc}`, { state: { aviso: 'Borrador guardado (estado Pendiente, sin folio definitivo).' } });
    } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }

  if (emitida) {
    return (
      <Pantalla titulo="Orden emitida" id="IE-006" pie="Captura y emisión de órdenes de compra (CU5).">
        <Alerta tipo="ok">La orden se emitió con el folio <b>{emitida.folio}</b> y quedó en estado <b>Emitida</b>.</Alerta>
        <Botones>
          <Link className="btn btn-sec" to="/compras/ordenes/nueva" reloadDocument>Nueva orden</Link>
          <Link className="btn btn-sec" to={`/compras/ordenes/${emitida.id_oc}`}>Ver la orden</Link>
          <button className="btn btn-prim" onClick={() => abrirDocumento(`/compras/ordenes/${emitida.id_oc}/pdf`)}>Descargar PDF</button>
        </Botones>
      </Pantalla>
    );
  }

  const surtidos = productos.filter((p) => p.lo_surte);
  const otros = productos.filter((p) => !p.lo_surte);

  return (
    <Pantalla intro="Agregue los productos a solicitar; el sistema calcula el subtotal, el IVA y el total."
      id="IE-006" pie={`Captura y emisión de órdenes de compra (CU5).${id ? ' Edición de borrador.' : ''}`}>
      <Alerta tipo="error">{error}</Alerta>
      <Alerta tipo="info">{aviso}</Alerta>

      <Seccion titulo="Encabezado">
        <div className="campos">
          <Campo etiqueta="Proveedor" req full hint={<>El proveedor debe estar dado de alta. ¿No está? <Link to="/catalogos/proveedores">Darlo de alta</Link> (3a).</>}>
            <select value={idProveedor} onChange={(e) => cambiarProveedor(e.target.value)}>
              <option value="">Seleccione…</option>
              {proveedores.map((p) => (
                <option key={p.id_proveedor} value={p.id_proveedor}>
                  {p.razon_social} ({p.clasificacion === 'IMPORTACION' ? 'Importación' : p.clasificacion === 'NACIONAL' ? 'Nacional' : 'Local'}, {p.lead_time_dias} días)
                </option>
              ))}
            </select>
          </Campo>
          {proveedor?.clasificacion === 'IMPORTACION' && (
            <div className="campo full"><Alerta tipo="aviso">Proveedor de importación: la captura de costos de importación (5a) queda para una versión posterior (RF15).</Alerta></div>
          )}
          <Campo etiqueta="Fecha de emisión">
            <input type="date" value={hoy} disabled />
          </Campo>
          <Campo etiqueta="Fecha de entrega estimada" hint="No puede ser anterior a la emisión.">
            <input type="date" value={fechaEntrega} min={hoy} onChange={(e) => setFechaEntrega(e.target.value)} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Productos de la orden"
        accion={<button type="button" className="btn btn-sec btn-chico" onClick={() => cargarSugerencia()} disabled={!idProveedor}>Cargar sugerencia de reorden</button>}>
        <div className="campos">
          <Campo etiqueta="Producto" req full hint="Cantidad mayor a 0; no se repite el producto en la orden.">
            <select value={nueva.id_producto} onChange={(e) => elegirProducto(e.target.value)}>
              <option value="">Seleccione…</option>
              {surtidos.length > 0 && (
                <optgroup label="Surtidos por este proveedor">
                  {surtidos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.codigo_interno} · {p.descripcion} — {fmt.dinero(p.precio_compra)}{p.moneda === 'USD' ? ' USD' : ''}</option>)}
                </optgroup>
              )}
              <optgroup label={surtidos.length ? 'Otros productos' : 'Productos'}>
                {otros.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.codigo_interno} · {p.descripcion}</option>)}
              </optgroup>
            </select>
          </Campo>
          <Campo etiqueta="Cantidad" req>
            <input type="number" min="0" step="any" value={nueva.cantidad} onChange={(e) => setNueva({ ...nueva, cantidad: e.target.value })} />
          </Campo>
          <Campo etiqueta="Costo unitario" req>
            <input type="number" min="0" step="0.01" value={nueva.costo_unitario} onChange={(e) => setNueva({ ...nueva, costo_unitario: e.target.value })} />
          </Campo>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0 12px' }}>
          <button type="button" className="btn btn-sec btn-chico" onClick={agregar}>+ Agregar producto</button>
        </div>
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num" style={{ width: 120 }}>Cantidad</th><th className="num" style={{ width: 130 }}>Costo unitario</th><th className="num">Importe</th><th /></tr></thead>
            <tbody>
              {partidas.length === 0 && <tr><td colSpan="6" className="vacio">Aún no hay productos en la orden.</td></tr>}
              {partidas.map((p, i) => (
                <tr key={p.id_producto}>
                  <td>{p.codigo_interno}</td><td>{p.descripcion}</td>
                  <td><input type="number" min="0" step="any" value={p.cantidad} onChange={(e) => cambiarPartida(i, 'cantidad', e.target.value)} aria-label={`Cantidad de ${p.codigo_interno}`} /></td>
                  <td><input type="number" min="0" step="0.01" value={p.costo_unitario} onChange={(e) => cambiarPartida(i, 'costo_unitario', e.target.value)} aria-label={`Costo de ${p.codigo_interno}`} /></td>
                  <td className="num">{fmt.dinero(redondear((Number(p.cantidad) || 0) * (Number(p.costo_unitario) || 0)))}</td>
                  <td><button type="button" className="btn btn-peligro btn-chico" onClick={() => quitar(i)}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Totales">
        <div className="campos">
          <Campo etiqueta="Subtotal"><div className="static">{fmt.dinero(totales.subtotal)}</div></Campo>
          <Campo etiqueta="IVA (16%)"><div className="static">{fmt.dinero(totales.iva)}</div></Campo>
          <Campo etiqueta="Total"><div className="static">{fmt.dinero(totales.total)}</div></Campo>
        </div>
      </Seccion>

      <Seccion titulo="Condiciones de entrega y pago">
        <Campo etiqueta="Observaciones" full hint="Por ejemplo: crédito 30 días, entregar en almacén Hermosillo. Máximo 250 caracteres.">
          <textarea rows="2" maxLength={250} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Campo>
      </Seccion>

      <Botones>
        <Link className="btn btn-sec" to={id ? `/compras/ordenes/${id}` : '/compras/ordenes'}>Cancelar</Link>
        <button className="btn btn-sec" disabled={ocupado} onClick={() => guardar(false)}>Guardar borrador</button>
        <button className="btn btn-prim" disabled={ocupado} onClick={() => guardar(true)}>Emitir orden</button>
      </Botones>
    </Pantalla>
  );
}
