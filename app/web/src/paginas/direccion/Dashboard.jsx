// CU7 Visualizar Dashboard de KPIs (S9): indicadores del periodo, gráficas y detalle por indicador.
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Seccion, Alerta, fmt } from '../../componentes/ui.jsx';

const INDIGO = '#4f46e5', GRIS = '#94a3b8';

/** Barras horizontales: valor por familia. */
function BarrasFamilia({ datos }) {
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div>
      {datos.map((d) => (
        <div key={d.familia} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px', gap: 10, alignItems: 'center', margin: '7px 0', fontSize: 13 }}>
          <span>{d.familia}</span>
          <div style={{ background: '#f1f5f9', borderRadius: 5, height: 18 }}>
            <div style={{ width: `${(d.valor / max) * 100}%`, background: INDIGO, height: '100%', borderRadius: 5 }} />
          </div>
          <span style={{ textAlign: 'right' }}>{fmt.dinero(d.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/** Barras verticales agrupadas: entradas vs salidas por día (SVG). */
function EntradasSalidas({ datos }) {
  const W = 560, H = 190, base = H - 26, alto = base - 10;
  const max = Math.max(...datos.flatMap((d) => [d.entradas, d.salidas]), 1);
  const paso = W / datos.length, ancho = Math.min(14, paso / 2.6);
  const cada = Math.ceil(datos.length / 8);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 640 }} role="img" aria-label="Entradas y salidas por día">
        <line x1="0" y1={base} x2={W} y2={base} stroke="#cbd5e1" />
        {datos.map((d, i) => {
          const x = i * paso + paso / 2, he = (d.entradas / max) * alto, hs = (d.salidas / max) * alto;
          return (
            <g key={d.dia}>
              <title>{`${d.dia}: entradas ${d.entradas}, salidas ${d.salidas}`}</title>
              <rect x={x - ancho - 1} y={base - he} width={ancho} height={he} fill={INDIGO} rx="2" />
              <rect x={x + 1} y={base - hs} width={ancho} height={hs} fill={GRIS} rx="2" />
              {i % cada === 0 && <text x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</text>}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 12.5, color: '#475569' }}>
        <span style={{ color: INDIGO }}>■</span> Entradas &nbsp; <span style={{ color: GRIS }}>■</span> Salidas (unidades por día)
      </div>
    </div>
  );
}

const FORMATO = {
  fecha: fmt.fechaHora, fecha_emision: fmt.fecha, entrega: fmt.fecha,
  valor: fmt.dinero, total: fmt.dinero,
};
const ROTULO = { codigo: 'Código', descripcion: 'Descripción', familia: 'Familia', productos: 'Productos', unidades: 'Unidades', valor: 'Valor', existencia: 'Existencia',
  punto_reorden: 'Punto de reorden', cantidad_sugerida: 'Sugerido', folio: 'Folio', cantidad: 'Cantidad', documento: 'Documento', usuario: 'Usuario', fecha: 'Fecha',
  proveedor: 'Proveedor', estado: 'Estado', fecha_emision: 'Emisión', entrega: 'Entrega est.', total: 'Total', sistema: 'Sistema', contado: 'Contado', diferencia: 'Diferencia' };

function TablaDetalle({ filas }) {
  if (!filas.length) return <div className="tabla-env"><table className="tabla"><tbody><tr><td className="vacio">Sin registros para este indicador.</td></tr></tbody></table></div>;
  const cols = Object.keys(filas[0]);
  return (
    <div className="tabla-env">
      <table className="tabla">
        <thead><tr>{cols.map((c) => <th key={c}>{ROTULO[c] || c}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const v = f[c], esNum = typeof v === 'number';
                const txt = FORMATO[c] ? FORMATO[c](v) : esNum ? fmt.num(v, Number.isInteger(v) ? 0 : 2) : v;
                return <td key={c} className={esNum ? 'num' : ''}>{txt}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('semanal');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);       // indicador elegido (paso 6)
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {                           // pasos 2-5: calcula y recalcula al cambiar de periodo
    setError('');
    api.get(`/direccion/dashboard?periodo=${periodo}`).then(setD).catch((e) => setError(e.message));
  }, [periodo]);

  useEffect(() => {                           // pasos 6-7: desglose del indicador
    if (!sel || !d || d.soloResumen) { setDetalle(null); return; }
    api.get(`/direccion/dashboard/detalle/${sel}?periodo=${periodo}`).then(setDetalle).catch((e) => setError(e.message));
  }, [sel, periodo, d]);

  const kpis = d && [
    { id: 'valor', t: 'Valor del inventario', v: fmt.dinero(d.valorTotal), s: `${d.productosActivos} productos activos` },
    { id: 'reorden', t: 'Bajo punto de reorden', v: d.bajoReorden, s: 'productos por reponer' },
    { id: 'entradas', t: 'Entradas del periodo', v: `${fmt.num(d.entradas.unidades, 0)} u.`, s: `${d.entradas.movimientos} movimientos` },
    { id: 'salidas', t: 'Salidas del periodo', v: `${fmt.num(d.salidas.unidades, 0)} u.`, s: `${d.salidas.movimientos} movimientos` },
    { id: 'oc', t: 'OC abiertas', v: d.ocAbiertas.cantidad, s: `${fmt.dinero(d.ocAbiertas.monto)} por recibir` },
    { id: 'fisico', t: 'Diferencia inventario físico', v: d.fisico ? `${fmt.num(d.fisico.porcentaje, 1)} %` : 'Sin conteo',
      s: d.fisico ? `${d.fisico.conDiferencia} de ${d.fisico.productos} productos · ${d.fisico.folio} · meta < 1 %` : 'meta < 1 %' },
  ];

  const exportar = (que, f) => `/api/direccion/exportar/${que}?formato=${f}`;

  return (
    <Pantalla titulo="Dashboard ejecutivo" id="S9" pie="Dashboard de KPIs: indicadores del periodo, gráficas y detalle por indicador (CU7, RF17).">
      <div className="herramientas">
        <div className="opciones">
          {['semanal', 'mensual'].map((p) => (
            <label key={p} className="op"><input type="radio" name="periodo" checked={periodo === p} onChange={() => { setPeriodo(p); setSel(null); }} />
              {p === 'semanal' ? 'Semanal (7 días)' : 'Mensual (30 días)'}</label>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>Exportar:</span>
        <a className="btn btn-sec btn-chico" href={exportar('inventario', 'xlsx')} download>Inventario (Excel)</a>
        <a className="btn btn-sec btn-chico" href={exportar('inventario', 'csv')} download>Inventario (CSV)</a>
        <a className="btn btn-sec btn-chico" href={exportar('reorden', 'xlsx')} download>Reorden (Excel)</a>
        <a className="btn btn-sec btn-chico" href={exportar('reorden', 'csv')} download>Reorden (CSV)</a>
      </div>

      <Alerta tipo="error">{error}</Alerta>
      {!d && !error && <p>Calculando indicadores…</p>}
      {d && (
        <>
          {d.sinInformacion && <Alerta tipo="aviso">No hay movimientos registrados en el periodo; los indicadores de entradas y salidas se muestran en cero.</Alerta>}
          {d.soloResumen && <Alerta tipo="info">Su rol solo permite ver información resumida (sin gráficas ni desglose).</Alerta>}

          <div className="kpis">
            {kpis.map((k) => (
              <div key={k.id} className="kpi" onClick={d.soloResumen ? undefined : () => setSel(k.id)}
                style={{ cursor: d.soloResumen ? 'default' : 'pointer', outline: sel === k.id ? `2px solid ${INDIGO}` : 'none' }}
                role={d.soloResumen ? undefined : 'button'} tabIndex={d.soloResumen ? undefined : 0}
                onKeyDown={(e) => !d.soloResumen && e.key === 'Enter' && setSel(k.id)}>
                <small>{k.t}</small><b>{k.v}</b>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{k.s}</div>
              </div>
            ))}
          </div>

          {!d.soloResumen && (
            <>
              <div className="campos">
                <Seccion titulo="Valor del inventario por familia"><BarrasFamilia datos={d.porFamilia} /></Seccion>
                <Seccion titulo={`Entradas vs. salidas por día (${periodo})`}><EntradasSalidas datos={d.porDia} /></Seccion>
              </div>
              <Seccion titulo={detalle ? detalle.titulo : 'Detalle del indicador'}>
                {detalle ? <TablaDetalle filas={detalle.filas} /> : <p style={{ color: '#64748b', fontSize: 13 }}>Seleccione un indicador para ver su desglose.</p>}
              </Seccion>
            </>
          )}
        </>
      )}
    </Pantalla>
  );
}
