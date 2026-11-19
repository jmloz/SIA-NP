// Búsqueda de producto por código interno, código de barras o descripción (CU1 paso 4, RF9).
// Un lector de código de barras (HID) escribe el código y manda Enter: Enter dispara la búsqueda.
import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { fmt, Alerta } from '../../componentes/ui.jsx';
import { useSesion } from '../../sesion.jsx';

const BuscadorProducto = forwardRef(function BuscadorProducto(
  { texto, setTexto, onElegir, placeholder = 'Código, código de barras o descripción y Enter', autoFocus = true }, ref) {
  const { usuario } = useSesion();
  const [resultados, setResultados] = useState([]);
  const [noExiste, setNoExiste] = useState('');
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);

  async function buscar() {
    const t = texto.trim();
    setResultados([]); setNoExiste(''); setError('');
    if (!t) return setError('Capture el código o la descripción del producto.');
    setBuscando(true);
    try {
      const lista = await api.get('/almacen/productos/buscar?q=' + encodeURIComponent(t));
      if (lista.length === 0) setNoExiste(t);            // 4a
      else if (lista.length === 1) onElegir(lista[0]);
      else setResultados(lista);
    } catch (e) { setError(e.message); }
    finally { setBuscando(false); }
  }

  function elegir(p) { setResultados([]); onElegir(p); }
  function cancelar() { setNoExiste(''); setTexto(''); ref?.current?.focus(); }

  return (
    <>
      <div className="alm-buscar">
        <input ref={ref} value={texto} autoFocus={autoFocus} placeholder={placeholder}
          onChange={(e) => { setTexto(e.target.value); setNoExiste(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }} />
        <button type="button" className="btn btn-sec" onClick={buscar} disabled={buscando}>{buscando ? 'Buscando…' : 'Buscar'}</button>
      </div>
      {error && <div className="hint err">✗ {error}</div>}
      {resultados.length > 0 && (
        <div className="alm-lista" role="listbox" aria-label="Productos encontrados">
          {resultados.map((p) => (
            <button type="button" key={p.id_producto} onClick={() => elegir(p)}>
              <span className="cod">{p.codigo_interno}</span><span>{p.descripcion}</span>
              <span className="ex">{fmt.num(p.existencia, 0)} {p.unidad_medida.toLowerCase()} · {p.ubicacion ?? 'sin ubicación'}</span>
            </button>
          ))}
        </div>
      )}
      {noExiste && (
        <div style={{ marginTop: 8 }}>
          <Alerta tipo="aviso">
            No existe un producto con «{noExiste}» en el catálogo (4a).{' '}
            {usuario?.rol === 'E'
              ? <><Link to="/catalogos/productos">Darlo de alta en el catálogo</Link> o </>
              : 'Solicite al Encargado de Almacén que lo dé de alta, o '}
            <button type="button" className="btn btn-sec btn-chico" onClick={cancelar}>Cancelar</button>
          </Alerta>
        </div>
      )}
    </>
  );
});

export default BuscadorProducto;
