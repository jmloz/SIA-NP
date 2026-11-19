// Lista de órdenes de compra (CU5, RF12): filtro por estado y búsqueda por folio o proveedor.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Pantalla, Alerta, fmt } from '../../componentes/ui.jsx';
import { ESTADOS, EtiquetaEstado, Folio } from './comun.jsx';

export default function Ordenes() {
  const navegar = useNavigate();
  const [estado, setEstado] = useState('');
  const [texto, setTexto] = useState('');
  const [ordenes, setOrdenes] = useState(null);
  const [error, setError] = useState('');

  async function cargar(e) {
    e?.preventDefault();
    setError('');
    try {
      const qs = new URLSearchParams();
      if (estado) qs.set('estado', estado);
      if (texto.trim()) qs.set('q', texto.trim());
      setOrdenes(await api.get('/compras/ordenes?' + qs));
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { cargar(); }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Pantalla titulo="Órdenes de compra" id="CU5" pie="Órdenes de compra y su estado (diagrama de estados de la OC).">
      <form className="herramientas" onSubmit={cargar}>
        <input className="input" placeholder="Buscar por folio o proveedor" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select className="input" style={{ maxWidth: 220 }} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
        </select>
        <button className="btn btn-sec">Buscar</button>
        <span className="espacio" />
        <Link className="btn btn-prim" to="/compras/ordenes/nueva">Nueva orden de compra</Link>
      </form>
      <Alerta tipo="error">{error}</Alerta>
      <div className="tabla-env">
        <table className="tabla">
          <thead>
            <tr><th>Folio</th><th>Emisión</th><th>Proveedor</th><th>Entrega estimada</th><th className="num">Total</th><th>Estado</th><th /></tr>
          </thead>
          <tbody>
            {ordenes === null && <tr><td colSpan="7" className="vacio">Cargando…</td></tr>}
            {ordenes?.length === 0 && <tr><td colSpan="7" className="vacio">No hay órdenes con esos criterios.</td></tr>}
            {ordenes?.map((o) => (
              <tr key={o.id_oc} style={{ cursor: 'pointer' }} onClick={() => navegar(`/compras/ordenes/${o.id_oc}`)}>
                <td><Folio orden={o} /></td>
                <td>{fmt.fecha(o.fecha_emision)}</td>
                <td>{o.proveedor}</td>
                <td>{fmt.fecha(o.fecha_entrega_estimada)}</td>
                <td className="num">{fmt.dinero(o.total)}</td>
                <td><EtiquetaEstado estado={o.estado} /></td>
                <td><Link className="btn btn-sec btn-chico" to={`/compras/ordenes/${o.id_oc}`} onClick={(e) => e.stopPropagation()}>Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Pantalla>
  );
}
