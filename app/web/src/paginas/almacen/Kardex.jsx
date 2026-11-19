// CU2 Consultar existencias y kardex (RF4): S5 consulta de existencias con imagen y S6 kardex del producto.
import { useState } from 'react';
import { api, abrirDocumento } from '../../api.js';
import { Pantalla, Seccion, Alerta, fmt } from '../../componentes/ui.jsx';
import './almacen.css';

const cant = (n) => fmt.num(n, Number(n) % 1 ? 2 : 0);
const TIPOS = [['', 'Todos'], ['E', 'Entrada'], ['S', 'Salida'], ['A', 'Ajuste'], ['D', 'Devolución']];
const ETIQUETA = { E: 'verde', S: 'roja', A: 'ambar', D: 'indigo' };

function Foto({ p, grande }) {
  return (
    <div className={`alm-foto${grande ? ' grande' : ''}`}>
      {p.imagen_url ? <img src={p.imagen_url} alt={p.descripcion} /> : <span>Sin<br />imagen</span>}
    </div>
  );
}

export default function Kardex() {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState(null);   // null = aún no se busca
  const [sel, setSel] = useState(null);                 // respuesta de /kardex/:id
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function buscar(e) {
    e?.preventDefault();
    setError(''); setSel(null);
    if (!texto.trim()) return setError('Capture un código, descripción o familia.');
    try {
      const r = await api.get('/almacen/existencias?q=' + encodeURIComponent(texto.trim()));
      setResultados(r);
      if (r.length === 1) abrir(r[0].id_producto, { desde: '', hasta: '', tipo: '' });
    } catch (err) { setError(err.message); }
  }

  const consulta = (f) => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  async function abrir(id, f = filtros) {
    setError(''); setCargando(true);
    try {
      setSel(await api.get(`/almacen/kardex/${id}?${consulta(f)}`));
      setFiltros(f);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }

  const p = sel?.producto;
  const hayFiltro = filtros.desde || filtros.hasta || filtros.tipo;

  return (
    <>
      <Pantalla intro="Busque el producto por código, descripción o familia para ver su existencia, ubicación y kardex."
        id="S5" pie="Consulta de existencias con imagen y ubicación (CU2).">
        <form className="herramientas" onSubmit={buscar}>
          <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
            placeholder="Código, descripción o familia" aria-label="Buscar producto" />
          <button className="btn btn-prim">Buscar</button>
        </form>
        <Alerta tipo="error">{error}</Alerta>
        {resultados?.length === 0 && <Alerta tipo="aviso">Sin coincidencias para «{texto}» (4a). Intente con otro código, descripción o familia.</Alerta>}
        {resultados?.length > 0 && (
          <div className="alm-tarjetas">
            {resultados.map((r) => (
              <button key={r.id_producto} type="button" className={`alm-tarjeta${p?.id_producto === r.id_producto ? ' activa' : ''}`}
                onClick={() => abrir(r.id_producto, { desde: '', hasta: '', tipo: '' })}>
                <Foto p={r} />
                <span className="txt">
                  <b>{r.codigo_interno}</b>
                  <span>{r.descripcion}</span>
                  <small>Existencia: <b>{cant(r.existencia)} {r.unidad_medida.toLowerCase()}</b> · {r.ubicacion ?? 'sin ubicación'}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </Pantalla>

      {p && (
        <Pantalla titulo={`${p.codigo_interno} · ${p.descripcion}`} id="S6" pie="Kardex del producto: historial cronológico con saldo (CU2, RF4).">
          <div className="alm-ficha">
            <Foto p={p} grande />
            <div className="alm-datos">
              <div><small>Existencia actual</small><b>{cant(p.existencia)} {p.unidad_medida.toLowerCase()}</b>{' '}
                {Number(p.existencia) <= Number(p.punto_reorden) && <span className="etiqueta ambar">Bajo reorden</span>}</div>
              <div><small>Ubicación</small><b>{p.ubicacion ?? '—'}</b>{p.ubicacion_desc && <div className="hint">{p.ubicacion_desc}</div>}</div>
              <div><small>Mínimo / máximo</small><b>{cant(p.minimo)} / {cant(p.maximo)}</b></div>
              <div><small>Punto de reorden</small><b>{cant(p.punto_reorden)}</b></div>
              <div><small>Familia</small><b>{p.familia}</b></div>
              <div><small>Código de barras</small><b>{p.codigo_barras ?? '—'}</b></div>
            </div>
          </div>

          <Seccion titulo="Kardex">
            <form className="alm-filtros" onSubmit={(e) => { e.preventDefault(); abrir(p.id_producto, filtros); }}>
              <label>Desde<input className="input" type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} /></label>
              <label>Hasta<input className="input" type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} /></label>
              <label>Tipo
                <select className="input" value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
                  {TIPOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select>
              </label>
              <button className="btn btn-prim" disabled={cargando}>Filtrar</button>
              <button type="button" className="btn btn-sec" onClick={() => abrir(p.id_producto, { desde: '', hasta: '', tipo: '' })}>Limpiar</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn btn-sec" disabled={!sel.movimientos.length}
                onClick={() => abrirDocumento(`/almacen/kardex/${p.id_producto}/excel?${consulta(sel.filtros)}`)}>Exportar Excel</button>
              <button type="button" className="btn btn-sec" disabled={!sel.movimientos.length}
                onClick={() => abrirDocumento(`/almacen/kardex/${p.id_producto}/csv?${consulta(sel.filtros)}`)}>Exportar CSV</button>
            </form>

            {sel.sinHistorial && <Alerta tipo="info">El producto no tiene movimientos registrados (6a). Existencia actual: {cant(p.existencia)} {p.unidad_medida.toLowerCase()}.</Alerta>}
            {!sel.sinHistorial && sel.movimientos.length === 0 && hayFiltro && <Alerta tipo="aviso">No hay movimientos con esos filtros.</Alerta>}
            {sel.movimientos.length > 0 && (
              <div className="tabla-env">
                <table className="tabla alm-kardex">
                  <thead><tr>
                    <th>Fecha</th><th>Tipo</th><th className="alm-ocultar-movil">Documento</th><th className="num">Entra</th><th className="num">Sale</th>
                    <th className="num">Saldo</th><th className="alm-ocultar-movil">Folio</th><th className="alm-ocultar-movil">Usuario</th>
                  </tr></thead>
                  <tbody>
                    {sel.movimientos.map((m) => (
                      <tr key={m.id_movimiento} title={m.motivo ?? ''}>
                        <td style={{ whiteSpace: 'nowrap' }}><span className="alm-ocultar-movil">{fmt.fechaHora(m.fecha)}</span><span className="alm-solo-movil">{fmt.fecha(m.fecha).slice(0, -5)}</span></td>
                        <td><span className={`etiqueta ${ETIQUETA[m.tipo]}`}>{m.tipo_nombre}</span></td>
                        <td className="alm-ocultar-movil">{m.documento_ref ?? <span className="hint">{m.motivo}</span>}</td>
                        <td className="num">{Number(m.entrada) ? cant(m.entrada) : ''}</td>
                        <td className="num">{Number(m.salida) ? cant(m.salida) : ''}</td>
                        <td className="num"><b>{cant(m.saldo)}</b></td>
                        <td className="alm-ocultar-movil">{m.folio}</td>
                        <td className="alm-ocultar-movil">{m.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </Pantalla>
      )}
    </>
  );
}
