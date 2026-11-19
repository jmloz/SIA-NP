// IE-002 Registrar movimiento (CU1, RF3, RF9). Usa ControladorMovimientos vía /api/almacen.
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import BuscadorProducto from './BuscadorProducto.jsx';
import './almacen.css';

const TIPOS = [['E', 'Entrada'], ['S', 'Salida'], ['A', 'Ajuste'], ['D', 'Devolución']];
const NOMBRE = Object.fromEntries(TIPOS);
const hoy = () => new Date().toLocaleDateString('en-CA');
const vacio = { tipo: 'S', sentido: '+', idUbicacion: '', cantidad: '', documentoRef: '', motivo: '' };

/** 8b: campos obligatorios (mismas reglas que la API y los CHECK de MOVIMIENTO). */
function validar(f, producto) {
  const e = {};
  if (!producto) e.producto = 'Busque y seleccione el producto.';
  if (!f.idUbicacion) e.ubicacion = 'Elija la ubicación.';
  const c = Number(f.cantidad);
  if (f.cantidad === '') e.cantidad = 'Capture la cantidad.';
  else if (!(c > 0)) e.cantidad = 'La cantidad debe ser mayor a 0.';
  else if (Math.round(c * 100) !== c * 100) e.cantidad = 'Máximo dos decimales.';
  if ((f.tipo === 'E' || f.tipo === 'S') && !f.documentoRef.trim()) e.documentoRef = 'Obligatorio en entradas y salidas.';
  if ((f.tipo === 'A' || f.tipo === 'D') && !f.motivo.trim()) e.motivo = 'Obligatorio en ajustes y devoluciones.';
  return e;
}

export default function RegistrarMovimiento() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [f, setF] = useState(vacio);
  const [texto, setTexto] = useState('');
  const [producto, setProducto] = useState(null);
  const [errores, setErrores] = useState({});
  const [fase, setFase] = useState('captura');        // captura | confirmar
  const [aviso, setAviso] = useState(null);            // { tipo, texto }
  const [guardando, setGuardando] = useState(false);
  const refProducto = useRef(null);

  useEffect(() => { api.get('/almacen/catalogos').then((d) => setUbicaciones(d.ubicaciones)).catch((e) => setAviso({ tipo: 'error', texto: e.message })); }, []);

  const cambiar = (campo) => (e) => {
    setF({ ...f, [campo]: e.target.value });
    if (campo === 'tipo') { setErrores({}); setAviso(null); }
    else setErrores({ ...errores, [campo === 'idUbicacion' ? 'ubicacion' : campo]: undefined });
  };

  // Paso 5: existencia, unidad y ubicación del producto (la ubicación se precarga)
  function elegirProducto(p) {
    setProducto(p);
    setTexto(`${p.codigo_interno} · ${p.descripcion}`);
    setF((x) => ({ ...x, idUbicacion: p.id_ubicacion ? String(p.id_ubicacion) : x.idUbicacion }));
    setErrores((x) => ({ ...x, producto: undefined }));
  }

  function cambiarTexto(t) { setTexto(t); if (producto) setProducto(null); }

  const cantidadFirmada = () => (f.tipo === 'A' && f.sentido === '-' ? -Number(f.cantidad) : Number(f.cantidad));
  const delta = () => (f.tipo === 'S' ? -Number(f.cantidad) : cantidadFirmada());
  const unidad = producto?.unidad_medida.toLowerCase() ?? '';
  const ubicSel = ubicaciones.find((u) => String(u.id_ubicacion) === f.idUbicacion);

  // Paso 7: confirmación con resumen
  function revisar(e) {
    e.preventDefault();
    setAviso(null);
    const errs = validar(f, producto);
    setErrores(errs);
    if (Object.keys(errs).length) return setAviso({ tipo: 'error', texto: 'Complete los campos señalados (8b).' });
    setFase('confirmar');
  }

  // 7a: cancelar descarta la captura; el inventario no cambia
  function cancelar() {
    setF(vacio); setProducto(null); setTexto(''); setErrores({}); setFase('captura');
    setAviso({ tipo: 'info', texto: 'Captura descartada (7a). El inventario no cambió.' });
    setTimeout(() => refProducto.current?.focus(), 0);
  }

  // Pasos 8–10
  async function guardar() {
    setGuardando(true);
    try {
      const r = await api.post('/almacen/movimientos', {
        tipo: f.tipo, idProducto: producto.id_producto, idUbicacion: Number(f.idUbicacion),
        cantidad: cantidadFirmada(), documentoRef: f.documentoRef, motivo: f.motivo,
      });
      setF({ ...vacio, tipo: f.tipo }); setProducto(null); setTexto(''); setErrores({}); setFase('captura');
      setAviso({ tipo: 'ok', texto: `${r.tipo} registrada con folio ${r.folio}. Saldo resultante de ${r.producto}: ${fmt.num(r.saldo)} ${r.unidad.toLowerCase()}.` });
      setTimeout(() => refProducto.current?.focus(), 0);
    } catch (err) {
      // 8a (salida mayor a la existencia) u 8b detectado por la API: se regresa a la captura
      setFase('captura');
      setAviso({ tipo: 'error', texto: err.message });
      if (/excede|cantidad/i.test(err.message)) setErrores({ cantidad: err.message });
      else if (/documento/i.test(err.message)) setErrores({ documentoRef: err.message });
      else if (/motivo/i.test(err.message)) setErrores({ motivo: err.message });
    } finally { setGuardando(false); }
  }

  const esAjuste = f.tipo === 'A';

  return (
    <Pantalla intro="Registre la entrada o salida indicando el producto, la ubicación y el documento que la respalda."
      id="IE-002" pie="Captura de entradas y salidas de mercancía (CU1).">
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      <form onSubmit={revisar} noValidate>
        <fieldset disabled={fase === 'confirmar'} style={{ border: 'none' }}>
          <Seccion titulo="Datos del movimiento">
            <div className="campos">
              <Campo etiqueta="Tipo de movimiento" req>
                <div className="opciones" role="radiogroup" aria-label="Tipo de movimiento">
                  {TIPOS.map(([k, t]) => (
                    <label key={k} className="op">
                      <input type="radio" name="tipo" value={k} checked={f.tipo === k} onChange={cambiar('tipo')} />{t}
                    </label>
                  ))}
                </div>
              </Campo>
              <Campo etiqueta="Fecha" hint="La asigna el sistema al guardar.">
                <input type="date" value={hoy()} disabled />
              </Campo>
              <Campo etiqueta="Producto (código o escáner)" req full error={errores.producto} hint="El producto debe existir en el catálogo.">
                <BuscadorProducto ref={refProducto} texto={texto} setTexto={cambiarTexto} onElegir={elegirProducto} />
              </Campo>
              <Campo etiqueta="Ubicación" req error={errores.ubicacion} hint="Se toma la ubicación asignada al producto.">
                <select value={f.idUbicacion} onChange={cambiar('idUbicacion')}>
                  <option value="">— Seleccione —</option>
                  {ubicaciones.map((u) => <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.clave}{u.descripcion ? ` (${u.descripcion[0].toLowerCase()}${u.descripcion.slice(1)})` : ''}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Existencia actual">
                <div className="static">{producto ? `${fmt.num(producto.existencia, producto.existencia % 1 ? 2 : 0)} ${unidad}` : '—'}</div>
              </Campo>
              <Campo etiqueta="Cantidad" req error={errores.cantidad}
                hint={esAjuste ? 'Mayor a 0; elija si el ajuste aumenta o disminuye la existencia.' : 'Mayor a 0; en salidas no puede exceder la existencia.'}>
                <input type="number" inputMode="decimal" min="0" step="any" value={f.cantidad} onChange={cambiar('cantidad')} />
                {esAjuste && (
                  <div className="opciones alm-sentido" role="radiogroup" aria-label="Sentido del ajuste">
                    <label className="op"><input type="radio" name="sentido" value="+" checked={f.sentido === '+'} onChange={cambiar('sentido')} />Aumentar existencia</label>
                    <label className="op"><input type="radio" name="sentido" value="-" checked={f.sentido === '-'} onChange={cambiar('sentido')} />Disminuir existencia</label>
                  </div>
                )}
              </Campo>
              <Campo etiqueta="Documento de referencia" req={f.tipo === 'E' || f.tipo === 'S'} error={errores.documentoRef} hint="Obligatorio en entradas y salidas.">
                <input value={f.documentoRef} maxLength={50} onChange={cambiar('documentoRef')} placeholder="Factura, nota, vale…" />
              </Campo>
            </div>
          </Seccion>
          <Seccion titulo="Observaciones">
            <Campo etiqueta="Motivo / nota" req={f.tipo === 'A' || f.tipo === 'D'} error={errores.motivo}>
              <textarea rows={3} maxLength={200} value={f.motivo} onChange={cambiar('motivo')} placeholder="Obligatorio en ajustes y devoluciones." />
            </Campo>
          </Seccion>
        </fieldset>

        {fase === 'captura' ? (
          <Botones>
            <button type="button" className="btn btn-sec" onClick={cancelar}>Cancelar</button>
            <button className="btn btn-prim">Guardar movimiento</button>
          </Botones>
        ) : (
          <Seccion titulo="Confirme el movimiento">
            <div className="alm-resumen">
              <div><span>Tipo</span><b>{NOMBRE[f.tipo]}{esAjuste ? (f.sentido === '+' ? ' (aumenta)' : ' (disminuye)') : ''}</b></div>
              <div><span>Producto</span><b>{producto.codigo_interno} · {producto.descripcion}</b></div>
              <div><span>Ubicación</span><b>{ubicSel?.clave}</b></div>
              <div><span>Cantidad</span><b>{fmt.num(f.cantidad)} {unidad}</b></div>
              {f.documentoRef.trim() && <div><span>Documento</span><b>{f.documentoRef}</b></div>}
              {f.motivo.trim() && <div><span>Motivo</span><b>{f.motivo}</b></div>}
              <div><span>Existencia actual → saldo esperado</span><b>{fmt.num(producto.existencia)} → {fmt.num(Number(producto.existencia) + delta())} {unidad}</b></div>
            </div>
            <Botones>
              <button type="button" className="btn btn-sec" onClick={() => setFase('captura')} disabled={guardando}>Corregir</button>
              <button type="button" className="btn btn-peligro" onClick={cancelar} disabled={guardando}>Cancelar</button>
              <button type="button" className="btn btn-prim" onClick={guardar} disabled={guardando} autoFocus>{guardando ? 'Guardando…' : 'Confirmar y guardar'}</button>
            </Botones>
          </Seccion>
        )}
      </form>
    </Pantalla>
  );
}
