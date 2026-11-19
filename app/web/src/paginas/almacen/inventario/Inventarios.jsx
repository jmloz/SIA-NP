// CU3 pasos 1–3: lista de conteos y apertura de un conteo cíclico (por familia) o total (IE-009, S4).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, abrirDocumento } from '../../../api.js';
import { Pantalla, Seccion, Campo, Alerta, Botones, fmt } from '../../../componentes/ui.jsx';
import './inventario.css';

export const ESTADOS = {
  ABIERTO: { texto: 'Abierto', clase: 'ambar' },
  CAPTURADO: { texto: 'Capturado', clase: 'indigo' },
  AJUSTADO: { texto: 'Ajustado', clase: 'verde' },
  CANCELADO: { texto: 'Cancelado', clase: '' },
};
export const Estado = ({ estado }) => <span className={`etiqueta ${ESTADOS[estado]?.clase ?? ''}`}>{ESTADOS[estado]?.texto ?? estado}</span>;

export default function Inventarios() {
  const navegar = useNavigate();
  const [conteos, setConteos] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [nuevo, setNuevo] = useState(false);
  const [tipo, setTipo] = useState('C');
  const [idFamilia, setIdFamilia] = useState('');
  const [aviso, setAviso] = useState(null);
  const [abierto, setAbierto] = useState(null);   // conteo recién abierto
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api.get('/inventario').then(setConteos).catch((e) => setAviso({ tipo: 'error', texto: e.message }));
  useEffect(() => {
    cargar();
    api.get('/inventario/nuevo').then((d) => setFamilias(d.familias)).catch(() => {});
  }, []);

  async function abrir() {
    setAviso(null);
    if (tipo === 'C' && !idFamilia) return setAviso({ tipo: 'error', texto: 'Elija la familia que va a contar.' });
    setGuardando(true);
    try {
      const r = await api.post('/inventario', { tipo, idFamilia: tipo === 'C' ? Number(idFamilia) : null });
      setAbierto(r); setNuevo(false);
      setAviso({ tipo: 'ok', texto: `Conteo ${r.folio} abierto con ${r.productos} producto(s). Imprima la hoja de conteo o capture directamente.`
        + (r.sinUbicacion ? ` ${r.sinUbicacion} producto(s) sin ubicación asignada se anotaron en ${r.ubicacionDefecto}.` : '') });
      cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally { setGuardando(false); }
  }

  return (
    <Pantalla intro="Conteo cíclico de una familia o completo del almacén. Al abrirlo, el sistema toma la existencia de cada producto para compararla después con lo contado."
      id="IE-009 · S4" pie="Inventario físico (CU3, RF6): conteos y hoja de conteo.">
      {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
      {!nuevo ? (
        <div className="herramientas">
          {abierto && <>
            <button className="btn btn-prim" onClick={() => navegar(`/almacen/inventario/${abierto.id}`)}>Capturar conteo {abierto.folio}</button>
            <button className="btn btn-sec" onClick={() => abrirDocumento(`/inventario/${abierto.id}/hoja`)}>Imprimir hoja de conteo</button>
          </>}
          <span className="espacio" />
          <button className={`btn ${abierto ? 'btn-sec' : 'btn-prim'}`} onClick={() => { setNuevo(true); setAbierto(null); setAviso(null); }}>Nuevo conteo</button>
        </div>
      ) : (
        <Seccion titulo="Conteo">
          <div className="campos">
            <Campo etiqueta="Tipo de conteo" req>
              <div className="opciones">
                <label className="op"><input type="radio" name="tipo" checked={tipo === 'C'} onChange={() => setTipo('C')} />Cíclico (por familia)</label>
                <label className="op"><input type="radio" name="tipo" checked={tipo === 'T'} onChange={() => setTipo('T')} />Total (todo el almacén)</label>
              </div>
            </Campo>
            <Campo etiqueta="Familia" req={tipo === 'C'} hint={tipo === 'C' ? 'Obligatoria en el conteo cíclico.' : 'El conteo total incluye todas las familias.'}>
              <select value={tipo === 'C' ? idFamilia : ''} disabled={tipo !== 'C'} onChange={(e) => setIdFamilia(e.target.value)}>
                <option value="">{tipo === 'C' ? 'Elija la familia…' : 'Todas'}</option>
                {familias.map((f) => <option key={f.id_familia} value={f.id_familia}>{f.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <Botones>
            <button className="btn btn-sec" onClick={() => setNuevo(false)} disabled={guardando}>Cancelar</button>
            <button className="btn btn-prim" onClick={abrir} disabled={guardando}>{guardando ? 'Abriendo…' : 'Abrir conteo'}</button>
          </Botones>
        </Seccion>
      )}

      <Seccion titulo="Conteos">
        <div className="tabla-env">
          <table className="tabla">
            <thead><tr>
              <th>Folio</th><th>Tipo</th><th>Familia</th><th className="inv-ocultar-movil">Fecha</th><th>Estado</th><th className="num">Avance</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {conteos.length === 0 && <tr><td colSpan={7} className="vacio">Aún no hay conteos. Use “Nuevo conteo”.</td></tr>}
              {conteos.map((c) => {
                const enCurso = c.estado === 'ABIERTO' || c.estado === 'CAPTURADO';
                return (
                  <tr key={c.id_conteo}>
                    <td><b>{c.folio}</b></td>
                    <td>{c.tipo_conteo === 'C' ? 'Cíclico' : 'Total'}</td>
                    <td>{c.familia ?? 'Todas'}</td>
                    <td className="inv-ocultar-movil">{fmt.fecha(c.fecha)}</td>
                    <td><Estado estado={c.estado} /></td>
                    <td className="num">{c.contados} / {c.total}</td>
                    <td><div className="alm-acciones">
                      <button className="btn btn-sec btn-chico" onClick={() => abrirDocumento(`/inventario/${c.id_conteo}/hoja`)}>Hoja</button>
                      {enCurso && <Link className="btn btn-prim btn-chico" to={`/almacen/inventario/${c.id_conteo}`}>Capturar</Link>}
                      <Link className="btn btn-sec btn-chico" to={`/almacen/inventario/${c.id_conteo}/diferencias`}>Diferencias</Link>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Seccion>
    </Pantalla>
  );
}
