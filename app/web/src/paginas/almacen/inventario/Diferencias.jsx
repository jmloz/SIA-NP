// CU3 pasos 5–9: reporte de diferencias físico vs sistema (S8), recuento 7a, cierre con ajustes (6a)
// y cancelación 7b. Cerrar y cancelar: solo el Encargado de Almacén.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, abrirDocumento } from '../../../api.js';
import { useSesion } from '../../../sesion.jsx';
import { Pantalla, Seccion, Alerta, Botones, fmt } from '../../../componentes/ui.jsx';
import { Estado } from './Inventarios.jsx';
import './inventario.css';

const cant = (n) => fmt.num(n, Number(n) % 1 ? 2 : 0);
const signo = (n) => (n > 0 ? '+' : '') + cant(n);
const claseDif = (n) => (n < 0 ? 'num inv-neg' : n > 0 ? 'num inv-pos' : 'num');

export default function Diferencias() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const esEncargado = usuario?.rol === 'E';
  const [c, setC] = useState(null);
  const [soloDif, setSoloDif] = useState(false);
  const [recuento, setRecuento] = useState(null);   // { id, valor }
  const [confirmar, setConfirmar] = useState(null); // 'cerrar' | 'cancelar'
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = () => api.get(`/inventario/${id}`).then(setC).catch((e) => setAviso({ tipo: 'error', texto: e.message }));
  useEffect(() => { cargar(); }, [id]);

  if (!c) return <Pantalla>{aviso ? <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta> : 'Cargando…'}</Pantalla>;

  const r = c.resumen;
  const enCurso = c.estado === 'ABIERTO' || c.estado === 'CAPTURADO';
  const ajustes = c.partidas.filter((p) => p.ajuste);
  const filas = soloDif ? c.partidas.filter((p) => p.diferencia || !p.contado) : c.partidas;

  async function guardarRecuento() {
    const v = recuento.valor;
    if (v === '' || !(Number(v) >= 0)) return setAviso({ tipo: 'error', texto: 'Capture la cantidad recontada (0 o mayor).' });
    setOcupado(true);
    try {
      await api.put(`/inventario/${id}/productos/${recuento.id}`, { cantidad: Number(v) });
      setRecuento(null); setAviso({ tipo: 'ok', texto: 'Recuento guardado (7a). Las diferencias se recalcularon.' });
      await cargar();
    } catch (e) { setAviso({ tipo: 'error', texto: e.message }); } finally { setOcupado(false); }
  }

  async function ejecutar() {
    setOcupado(true); setAviso(null);
    try {
      if (confirmar === 'cerrar') {
        const res = await api.post(`/inventario/${id}/cerrar`);
        setAviso({ tipo: 'ok', texto: res.sinDiferencias
          ? `Conteo ${res.folio} cerrado sin diferencias (6a): no se generaron ajustes.`
          : `Conteo ${res.folio} cerrado. Se generaron ${res.ajustes.length} ajuste(s): ${res.ajustes.map((a) => `${a.folio} (${a.codigo} ${signo(a.cantidad)})`).join(', ')}. Las existencias quedaron iguales a lo contado.` });
      } else {
        const res = await api.post(`/inventario/${id}/cancelar`);
        setAviso({ tipo: 'info', texto: `Conteo ${res.folio} cancelado (7b). Las existencias no cambiaron.` });
      }
      setConfirmar(null);
      await cargar();
    } catch (e) { setConfirmar(null); setAviso({ tipo: 'error', texto: e.message }); } finally { setOcupado(false); }
  }

  return (
    <Pantalla intro="Compara lo contado contra la existencia que tenía el sistema al abrir el conteo. Revise las diferencias, recuente si hace falta y confirme el cierre para generar los ajustes."
      id="S8" pie="Reporte de diferencias físico vs sistema (CU3 pasos 5–7, RF6).">
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      <Seccion titulo="Conteo" accion={<div className="alm-acciones">
        <button className="btn btn-sec btn-chico" onClick={() => abrirDocumento(`/inventario/${id}/diferencias/excel`)}>Exportar a Excel</button>
      </div>}>
        <div className="inv-cabecera">
          <div><small>Folio</small><b>{c.folio}</b></div>
          <div><small>Tipo</small><b>{c.tipo_conteo === 'C' ? 'Cíclico' : 'Total'}</b></div>
          <div><small>Familia</small><b>{c.familia ?? 'Todas'}</b></div>
          <div><small>Fecha</small><b>{fmt.fecha(c.fecha)}</b></div>
          <div><small>Estado</small><b><Estado estado={c.estado} /></b></div>
        </div>
      </Seccion>

      {r.pendientes > 0 && enCurso && (
        <Alerta tipo="aviso">Faltan {r.pendientes} de {r.total} producto(s) por contar; no se puede cerrar todavía. <Link to={`/almacen/inventario/${id}`}>Ir a la captura</Link></Alerta>
      )}

      <div className="kpis inv-kpis">
        <div className="kpi"><small>Productos contados</small><b>{r.contados} / {r.total}</b></div>
        <div className="kpi"><small>Con diferencia</small><b>{r.conDiferencia}</b></div>
        <div className={`kpi ${r.cumpleMeta ? 'inv-ok' : 'inv-mal'}`}><small>% con diferencia (meta &lt; {r.metaPct} %)</small><b>{fmt.num(r.pctConDiferencia)} %</b></div>
        <div className="kpi"><small>Exactitud</small><b>{fmt.num(r.exactitud)} %</b></div>
        <div className="kpi"><small>Diferencia en dinero</small><b>{fmt.dinero(r.difDinero)}</b></div>
      </div>

      <Seccion titulo="Diferencias por producto" accion={
        <label className="inv-filtro"><input type="checkbox" checked={soloDif} onChange={(e) => setSoloDif(e.target.checked)} />Solo con diferencia</label>}>
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr>
              <th className="inv-ocultar-movil">Ubicación</th><th>Código</th><th className="inv-ocultar-movil">Descripción</th>
              <th className="num">Sistema</th><th className="num">Contado</th><th className="num">Diferencia</th>
              <th className="num inv-ocultar-movil">Costo unit.</th><th className="num">Diferencia $</th>{enCurso && <th />}
            </tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={9} className="vacio">Ningún producto tiene diferencia.</td></tr>}
              {filas.map((p) => (
                <tr key={p.id_producto} className={p.diferencia ? 'inv-dif' : ''}>
                  <td className="inv-ocultar-movil">{p.ubicacion}</td>
                  <td className="inv-cod"><b>{p.codigo_interno}</b></td>
                  <td className="inv-ocultar-movil">{p.descripcion}
                    {enCurso && p.movido && <div className="inv-nota">Existencia actual: {cant(p.existencia_actual)} (hubo movimientos durante el conteo; el ajuste dejará {p.contado ? cant(p.cantidad_contada) : 'lo contado'}).</div>}
                  </td>
                  <td className="num">{cant(p.existencia_sistema)}</td>
                  <td className="num">
                    {recuento?.id === p.id_producto ? (
                      <div className="inv-recontar">
                        <input type="number" inputMode="decimal" min="0" step="any" value={recuento.valor} autoFocus
                          aria-label={`Cantidad recontada de ${p.codigo_interno}`}
                          onChange={(e) => setRecuento({ ...recuento, valor: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarRecuento(); if (e.key === 'Escape') setRecuento(null); }} />
                      </div>
                    ) : p.contado ? cant(p.cantidad_contada) : <span className="etiqueta">Pendiente</span>}
                  </td>
                  <td className={claseDif(p.diferencia)}>{p.diferencia == null ? '—' : signo(p.diferencia)}</td>
                  <td className="num inv-ocultar-movil">{fmt.dinero(p.costo_unitario)}</td>
                  <td className={claseDif(p.diferencia_dinero)}>{p.diferencia_dinero == null ? '—' : fmt.dinero(p.diferencia_dinero)}</td>
                  {enCurso && <td>{recuento?.id === p.id_producto ? (
                    <div className="alm-acciones">
                      <button className="btn btn-prim btn-chico" onClick={guardarRecuento} disabled={ocupado}>Guardar</button>
                      <button className="btn btn-sec btn-chico" onClick={() => setRecuento(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="btn btn-sec btn-chico" disabled={!!confirmar}
                      onClick={() => setRecuento({ id: p.id_producto, valor: p.contado ? String(p.cantidad_contada) : '' })}>Recontar</button>
                  )}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="inv-ocultar-movil" /><td><b>Totales</b></td><td className="inv-ocultar-movil">{r.conDiferencia} de {r.total} con diferencia</td>
                <td className="num" /><td className="num" />
                <td className={claseDif(r.difUnidades)}>{signo(r.difUnidades)}</td>
                <td className="inv-ocultar-movil" />
                <td className={claseDif(r.difDinero)}>{fmt.dinero(r.difDinero)}</td>{enCurso && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </Seccion>

      {enCurso && !esEncargado && (
        <Alerta tipo="info">Solo el Encargado de Almacén puede confirmar el cierre (y generar los ajustes) o cancelar el conteo.</Alerta>
      )}

      {confirmar === 'cerrar' && (
        <Seccion titulo="Confirme el cierre del conteo">
          {ajustes.length === 0 ? (
            <Alerta tipo="ok">No hay diferencias (6a): el conteo se cerrará sin generar ajustes.</Alerta>
          ) : (
            <div className="alm-resumen">
              <div><span>Ajustes que se generarán (tipo A, documento {c.folio})</span><b>{ajustes.length}</b></div>
              {ajustes.map((p) => (
                <div key={p.id_producto}><span>{p.codigo_interno} · existencia actual {cant(p.existencia_actual)} → contado {cant(p.cantidad_contada)}</span><b>{signo(p.ajuste)} {p.unidad_medida.toLowerCase()}</b></div>
              ))}
              <div><span>Diferencia en dinero (contra la foto del sistema)</span><b>{fmt.dinero(r.difDinero)}</b></div>
            </div>
          )}
          <Botones>
            <button className="btn btn-sec" onClick={() => setConfirmar(null)} disabled={ocupado}>Volver</button>
            <button className="btn btn-prim" onClick={ejecutar} disabled={ocupado} autoFocus>{ocupado ? 'Cerrando…' : 'Confirmar cierre'}</button>
          </Botones>
        </Seccion>
      )}

      {confirmar === 'cancelar' && (
        <Seccion titulo="¿Cancelar el conteo?">
          <Alerta tipo="aviso">El conteo {c.folio} quedará CANCELADO y se descartará lo capturado. Las existencias no cambian (7b).</Alerta>
          <Botones>
            <button className="btn btn-sec" onClick={() => setConfirmar(null)} disabled={ocupado}>No, volver</button>
            <button className="btn btn-peligro" onClick={ejecutar} disabled={ocupado} autoFocus>{ocupado ? 'Cancelando…' : 'Sí, cancelar conteo'}</button>
          </Botones>
        </Seccion>
      )}

      {!confirmar && (
        <Botones>
          <Link className="btn btn-sec" to="/almacen/inventario">Volver a conteos</Link>
          {enCurso && <Link className="btn btn-sec" to={`/almacen/inventario/${id}`}>Ir a la captura</Link>}
          {enCurso && esEncargado && <>
            <button className="btn btn-peligro" onClick={() => setConfirmar('cancelar')}>Cancelar conteo</button>
            <button className="btn btn-prim" onClick={() => setConfirmar('cerrar')} disabled={r.pendientes > 0 || !!recuento}>Confirmar cierre</button>
          </>}
        </Botones>
      )}
    </Pantalla>
  );
}
