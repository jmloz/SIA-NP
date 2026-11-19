// CU3 paso 4 y alterno 4a: captura de lo contado (conteo a ciegas), pensada para tablet y escáner (IE-009).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, abrirDocumento } from '../../../api.js';
import { Pantalla, Seccion, Alerta, Botones, fmt } from '../../../componentes/ui.jsx';
import { Estado } from './Inventarios.jsx';
import './inventario.css';

const cant = (n) => fmt.num(n, Number(n) % 1 ? 2 : 0);
const valida = (v) => v === '' || (Number(v) >= 0 && Math.round(Number(v) * 100) === Number(v) * 100);

export default function CapturaConteo() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [conteo, setConteo] = useState(null);
  const [valores, setValores] = useState({});     // id_producto → texto capturado
  const [buscar, setBuscar] = useState('');
  const [actual, setActual] = useState(null);     // fila resaltada
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const refBuscar = useRef(null);
  const refs = useRef({});

  async function cargar() {
    try {
      const c = await api.get(`/inventario/${id}`);
      setConteo(c);
      setValores(Object.fromEntries(c.partidas.map((p) => [p.id_producto, p.contado ? String(p.cantidad_contada) : ''])));
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); }
  }
  useEffect(() => { cargar(); }, [id]);

  if (!conteo) return <Pantalla>{aviso ? <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta> : 'Cargando…'}</Pantalla>;

  const editable = conteo.estado === 'ABIERTO' || conteo.estado === 'CAPTURADO';
  const capturados = conteo.partidas.filter((p) => valores[p.id_producto] !== '').length;
  const total = conteo.partidas.length;
  const hayErrores = conteo.partidas.some((p) => !valida(valores[p.id_producto]));
  const visibles = soloPendientes ? conteo.partidas.filter((p) => valores[p.id_producto] === '' || p.id_producto === actual) : conteo.partidas;

  // Escáner o código escrito + Enter: salta a la fila del producto y pone el cursor en su cantidad
  function irAProducto(e) {
    e.preventDefault();
    const t = buscar.trim().toLowerCase();
    if (!t) return;
    const ps = conteo.partidas;
    const p = ps.find((x) => x.codigo_interno.toLowerCase() === t || x.codigo_barras?.toLowerCase() === t)
      ?? ps.find((x) => x.codigo_interno.toLowerCase().includes(t) || x.descripcion.toLowerCase().includes(t));
    if (!p) return setAviso({ tipo: 'aviso', texto: `“${buscar}” no está en este conteo.` });
    setAviso(null); setActual(p.id_producto); setBuscar('');
    setTimeout(() => {
      const inp = refs.current[p.id_producto];
      inp?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      inp?.focus(); inp?.select();
    }, 0);
  }

  async function guardar(terminar) {
    setAviso(null);
    if (hayErrores) return setAviso({ tipo: 'error', texto: 'Hay cantidades no válidas: deben ser 0 o mayores, con máximo dos decimales.' });
    if (terminar && capturados < total)
      return setAviso({ tipo: 'error', texto: `Faltan ${total - capturados} producto(s) por contar. Use “Guardar avance” para retomarlo después (4a).` });
    setGuardando(true);
    try {
      const partidas = conteo.partidas.map((p) => ({ idProducto: p.id_producto, cantidad: valores[p.id_producto] }));
      const r = await api.put(`/inventario/${id}/conteo`, { partidas, terminar });
      if (terminar) return navegar(`/almacen/inventario/${id}/diferencias`);
      await cargar();
      setAviso({ tipo: 'ok', texto: `Avance guardado: ${r.contados} de ${r.total} productos contados. El conteo ${r.folio} queda abierto para retomarlo.` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setGuardando(false); }
  }

  return (
    <Pantalla intro="Conteo a ciegas: no se muestra la existencia del sistema durante la captura. Escanee el código o escríbalo y presione Enter para ir al producto."
      id="IE-009" pie="Captura de conteos de inventario físico (CU3).">
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      <Seccion titulo="Conteo" accion={<button className="btn btn-sec btn-chico" onClick={() => abrirDocumento(`/inventario/${id}/hoja`)}>Hoja de conteo</button>}>
        <div className="inv-cabecera">
          <div><small>Folio</small><b>{conteo.folio}</b></div>
          <div><small>Tipo</small><b>{conteo.tipo_conteo === 'C' ? 'Cíclico' : 'Total'}</b></div>
          <div><small>Familia</small><b>{conteo.familia ?? 'Todas'}</b></div>
          <div><small>Fecha</small><b>{fmt.fecha(conteo.fecha)}</b></div>
          <div><small>Estado</small><b><Estado estado={conteo.estado} /></b></div>
        </div>
        <div className="inv-avance">
          <b>{capturados} de {total} contados</b>
          <div className="inv-barra" aria-hidden="true"><span style={{ width: `${total ? (capturados * 100) / total : 0}%` }} /></div>
        </div>
      </Seccion>

      {!editable && <Alerta tipo="info">Este conteo está {conteo.estado === 'AJUSTADO' ? 'cerrado' : 'cancelado'}; ya no se puede capturar. <Link to={`/almacen/inventario/${id}/diferencias`}>Ver diferencias</Link></Alerta>}

      <Seccion titulo="Productos a contar" accion={
        <label className="inv-filtro"><input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />Solo pendientes</label>}>
        {editable && (
          <form className="inv-buscar" onSubmit={irAProducto}>
            <input ref={refBuscar} className="input" value={buscar} onChange={(e) => setBuscar(e.target.value)} autoFocus
              placeholder="Escanee o escriba el código del producto" aria-label="Buscar producto por código" />
            <button className="btn btn-sec" type="submit">Ir</button>
          </form>
        )}
        <div className="tabla-env">
          <table className="tabla inv-captura">
            <thead><tr><th>Ubicación</th><th>Código</th><th className="inv-ocultar-movil">Descripción</th><th className="inv-ocultar-movil">Unidad</th><th className="num">Cantidad contada</th><th /></tr></thead>
            <tbody>
              {visibles.length === 0 && <tr><td colSpan={6} className="vacio">No quedan productos pendientes.</td></tr>}
              {visibles.map((p) => {
                const v = valores[p.id_producto] ?? '';
                return (
                  <tr key={p.id_producto} className={actual === p.id_producto ? 'inv-actual' : ''}>
                    <td className="ubic">{p.ubicacion}</td>
                    <td><b>{p.codigo_interno}</b><small className="alm-solo-movil"> · {p.descripcion}</small></td>
                    <td className="inv-ocultar-movil">{p.descripcion}</td>
                    <td className="inv-ocultar-movil">{p.unidad_medida.toLowerCase()}</td>
                    <td className="num">
                      <input ref={(el) => { refs.current[p.id_producto] = el; }} type="number" inputMode="decimal" min="0" step="any"
                        value={v} disabled={!editable} aria-label={`Cantidad contada de ${p.codigo_interno}`}
                        onFocus={() => setActual(p.id_producto)}
                        onChange={(e) => setValores((vs) => ({ ...vs, [p.id_producto]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); refBuscar.current?.focus(); } }} />
                      {!valida(v) && <div className="hint err">✗ Mayor o igual a 0.</div>}
                    </td>
                    <td>{v !== '' ? <span className="etiqueta verde">Contado</span> : <span className="etiqueta">Pendiente</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {conteo.partidas.some((p) => p.contado) && editable && (
          <div className="hint">Para corregir un producto ya contado, cambie su cantidad y guarde (recuento, 7a).</div>
        )}
      </Seccion>

      <Botones>
        <Link className="btn btn-sec" to="/almacen/inventario">Volver</Link>
        {editable && <>
          <button className="btn btn-sec" onClick={() => guardar(false)} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar avance'}</button>
          <button className="btn btn-prim" onClick={() => guardar(true)} disabled={guardando}>Terminar captura y ver diferencias</button>
        </>}
      </Botones>
    </Pantalla>
  );
}
