// Detalle de una orden de compra con las acciones que permite su estado (diagrama de estados):
// Pendiente → Emitida → Parcialmente recibida → Recibida → Cerrada; Cancelada desde Pendiente o Emitida.
import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { api, abrirDocumento } from '../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../componentes/ui.jsx';
import { EtiquetaEstado, Folio } from './comun.jsx';

export default function OrdenDetalle() {
  const { id } = useParams();
  const { state } = useLocation();
  const [orden, setOrden] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(state?.aviso ?? '');
  const [confirmar, setConfirmar] = useState(null); // 'cancelar' | 'cerrar'
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cargar = () => api.get(`/compras/ordenes/${id}`).then(setOrden).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function accion(nombre, cuerpo) {
    setError(''); setAviso(''); setOcupado(true);
    try {
      const r = await api.post(`/compras/ordenes/${id}/${nombre}`, cuerpo);
      const textos = { emitir: `Orden emitida con folio ${r.folio}.`, cancelar: `Orden ${r.folio} cancelada.`, cerrar: `Orden ${r.folio} cerrada.` };
      setAviso(textos[nombre]);
      setConfirmar(null); setMotivo('');
      await cargar();
    } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }

  if (!orden) return <Pantalla titulo="Orden de compra"><Alerta tipo="error">{error}</Alerta>{!error && 'Cargando…'}</Pantalla>;

  const e = orden.estado;
  return (
    <Pantalla titulo={<>Orden de compra <Folio orden={orden} /> <EtiquetaEstado estado={e} /></>} id="S2"
      pie="Orden de compra: datos, partidas, recepciones y acciones según su estado.">
      <Alerta tipo="ok">{aviso}</Alerta>
      <Alerta tipo="error">{error}</Alerta>

      <Seccion titulo="Encabezado">
        <div className="campos tres">
          <Campo etiqueta="Proveedor"><div className="static">{orden.proveedor}</div></Campo>
          <Campo etiqueta="RFC"><div className="static">{orden.rfc}</div></Campo>
          <Campo etiqueta="Contacto"><div className="static">{[orden.nombre_contacto, orden.telefono].filter(Boolean).join(' · ') || '—'}</div></Campo>
          <Campo etiqueta="Fecha de emisión"><div className="static">{fmt.fecha(orden.fecha_emision)}</div></Campo>
          <Campo etiqueta="Fecha de entrega estimada"><div className="static">{fmt.fecha(orden.fecha_entrega_estimada) || '—'}</div></Campo>
          <Campo etiqueta="Elaboró"><div className="static">{orden.elaboro}</div></Campo>
          <Campo etiqueta="Condiciones de entrega y pago" full><div className="static" style={{ fontWeight: 'normal' }}>{orden.observaciones || 'Sin observaciones.'}</div></Campo>
        </div>
      </Seccion>

      <Seccion titulo="Productos de la orden">
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr><th>Código</th><th>Descripción</th><th className="num">Solicitado</th><th className="num">Recibido</th>
                <th className="num">No conforme</th><th className="num">Pendiente</th><th className="num">Costo unitario</th><th className="num">Importe</th></tr>
            </thead>
            <tbody>
              {orden.partidas.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.codigo_interno}</td><td>{p.descripcion}</td>
                  <td className="num">{fmt.num(p.cantidad_solicitada)}</td>
                  <td className="num">{fmt.num(p.cantidad_recibida)}</td>
                  <td className="num">{fmt.num(p.cantidad_no_conforme)}</td>
                  <td className="num">{p.pendiente > 0 ? <b>{fmt.num(p.pendiente)}</b> : fmt.num(0)}</td>
                  <td className="num">{fmt.dinero(p.costo_unitario)}</td>
                  <td className="num">{fmt.dinero(p.importe)}</td>
                </tr>
              ))}
              <tr><td colSpan="7" className="num">Subtotal</td><td className="num">{fmt.dinero(orden.subtotal)}</td></tr>
              <tr><td colSpan="7" className="num">IVA (16%)</td><td className="num">{fmt.dinero(orden.iva)}</td></tr>
              <tr><td colSpan="7" className="num"><b>Total</b></td><td className="num"><b>{fmt.dinero(orden.total)}</b></td></tr>
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="Recepciones">
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr><th>Folio</th><th>Fecha</th><th>Factura / remisión</th><th>Tipo</th><th>Recibió</th></tr></thead>
            <tbody>
              {orden.recepciones.length === 0 && <tr><td colSpan="5" className="vacio">Sin recepciones.</td></tr>}
              {orden.recepciones.map((r) => (
                <tr key={r.id_recepcion}>
                  <td>{r.folio}</td><td>{fmt.fechaHora(r.fecha_recepcion)}</td><td>{r.numero_factura}</td>
                  <td>{r.tipo_recepcion === 'T' ? 'Total' : 'Parcial'}</td><td>{r.recibio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {confirmar === 'cancelar' && (
        <Alerta tipo="aviso">
          <p style={{ marginBottom: 8 }}><b>¿Cancelar la orden?</b> Una orden cancelada ya no puede emitirse ni recibir mercancía.</p>
          <input className="input" placeholder="Motivo (opcional)" value={motivo} maxLength={150} onChange={(ev) => setMotivo(ev.target.value)} style={{ marginBottom: 8 }} />
          <button className="btn btn-peligro btn-chico" disabled={ocupado} onClick={() => accion('cancelar', { motivo })}>Sí, cancelar la orden</button>{' '}
          <button className="btn btn-sec btn-chico" onClick={() => setConfirmar(null)}>No</button>
        </Alerta>
      )}
      {confirmar === 'cerrar' && (
        <Alerta tipo="aviso">
          <p style={{ marginBottom: 8 }}><b>¿Cerrar la orden?</b> Ya se recibió todo lo solicitado; al cerrarla queda solo para consulta.</p>
          <button className="btn btn-prim btn-chico" disabled={ocupado} onClick={() => accion('cerrar')}>Sí, cerrar</button>{' '}
          <button className="btn btn-sec btn-chico" onClick={() => setConfirmar(null)}>No</button>
        </Alerta>
      )}

      <Botones>
        <Link className="btn btn-sec" to="/compras/ordenes">Regresar</Link>
        <button className="btn btn-sec" onClick={() => abrirDocumento(`/compras/ordenes/${id}/pdf`)}>Descargar PDF</button>
        {(e === 'PENDIENTE' || e === 'EMITIDA') && <button className="btn btn-peligro" onClick={() => setConfirmar('cancelar')}>Cancelar orden</button>}
        {e === 'PENDIENTE' && <Link className="btn btn-sec" to={`/compras/ordenes/${id}/editar`}>Editar borrador</Link>}
        {e === 'PENDIENTE' && <button className="btn btn-prim" disabled={ocupado} onClick={() => accion('emitir')}>Emitir orden</button>}
        {(e === 'EMITIDA' || e === 'RECIBIDA_PARCIAL') && <Link className="btn btn-prim" to={`/compras/recepcion?oc=${id}`}>Recibir mercancía</Link>}
        {e === 'RECIBIDA_TOTAL' && <button className="btn btn-prim" onClick={() => setConfirmar('cerrar')}>Cerrar orden</button>}
      </Botones>
    </Pantalla>
  );
}
