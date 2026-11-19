// S7 Reporte de productos bajo punto de reorden (RF14). "Generar OC" abre la nueva orden (CU5, 4a)
// con ese proveedor y sus productos bajo reorden precargados.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Pantalla, Alerta, fmt } from '../../componentes/ui.jsx';

export default function Reorden() {
  const navegar = useNavigate();
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/compras/reorden').then(setFilas).catch((e) => setError(e.message)); }, []);

  return (
    <Pantalla titulo="Productos bajo punto de reorden" id="S7"
      intro="Productos cuya existencia llegó al punto de reorden, con la cantidad sugerida (máximo − existencia) y el proveedor con mejor precio."
      pie="Reporte de reorden (RF14): alimenta la generación de órdenes de compra.">
      <Alerta tipo="error">{error}</Alerta>
      <div className="tabla-env">
        <table className="tabla">
          <thead>
            <tr><th>Código</th><th>Descripción</th><th className="num">Exist.</th><th className="num">P. reorden</th><th className="num">Máximo</th>
              <th className="num">Sugerido</th><th>Proveedor (lead)</th><th className="num">Precio</th><th /></tr>
          </thead>
          <tbody>
            {filas === null && !error && <tr><td colSpan="9" className="vacio">Cargando…</td></tr>}
            {filas?.length === 0 && <tr><td colSpan="9" className="vacio">Ningún producto está bajo el punto de reorden.</td></tr>}
            {filas?.map((f) => (
              <tr key={f.id_producto}>
                <td>{f.codigo_interno}</td>
                <td>{f.descripcion}</td>
                <td className="num"><span className={`etiqueta ${f.existencia <= 0 ? 'roja' : 'ambar'}`}>{fmt.num(f.existencia)}</span></td>
                <td className="num">{fmt.num(f.punto_reorden)}</td>
                <td className="num">{fmt.num(f.maximo)}</td>
                <td className="num"><b>{fmt.num(f.cantidad_sugerida)}</b> {f.unidad_medida}</td>
                <td>{f.proveedor ? `${f.proveedor} (${f.lead_time_dias} d)` : <span style={{ color: '#94a3b8' }}>Sin proveedor asignado</span>}</td>
                <td className="num">{f.precio_compra != null ? `${fmt.dinero(f.precio_compra)}${f.moneda === 'USD' ? ' USD' : ''}` : '—'}</td>
                <td>
                  {f.id_proveedor && (
                    <button className="btn btn-prim btn-chico" onClick={() => navegar(`/compras/ordenes/nueva?proveedor=${f.id_proveedor}&reorden=1`)}>Generar OC</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
