// RF19 Bitácora de auditoría: consulta de solo lectura con filtros y exportación del resultado (RF18).
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Pantalla, Alerta, fmt } from '../../componentes/ui.jsx';

const VACIO = { desde: '', hasta: '', usuario: '', modulo: '', accion: '' };

export default function Bitacora() {
  const [opciones, setOpciones] = useState({ usuarios: [], modulos: [], acciones: [] });
  const [form, setForm] = useState(VACIO);       // lo que se escribe en los filtros
  const [filtros, setFiltros] = useState(VACIO); // lo que se aplicó con "Buscar"
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/direccion/bitacora/filtros').then(setOpciones).catch((e) => setError(e.message)); }, []);

  const params = (f) => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  useEffect(() => {
    setError('');
    api.get(`/direccion/bitacora?${params({ ...filtros, pagina })}`).then(setDatos).catch((e) => setError(e.message));
  }, [filtros, pagina]);

  const cambiar = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const buscar = (e) => { e.preventDefault(); setPagina(1); setFiltros(form); };
  const limpiar = () => { setForm(VACIO); setPagina(1); setFiltros(VACIO); };
  const exportar = (f) => `/api/direccion/exportar/bitacora?${params({ ...filtros, formato: f })}`;

  return (
    <Pantalla titulo="Bitácora de auditoría" id="RF19" pie="Registro de solo lectura de altas, modificaciones, bajas, movimientos y accesos. No se puede modificar ni borrar.">
      <form className="herramientas" onSubmit={buscar}>
        <label>Desde <input type="date" className="input" style={{ maxWidth: 160 }} value={form.desde} onChange={cambiar('desde')} /></label>
        <label>Hasta <input type="date" className="input" style={{ maxWidth: 160 }} value={form.hasta} onChange={cambiar('hasta')} /></label>
        <select className="input" style={{ maxWidth: 170 }} value={form.usuario} onChange={cambiar('usuario')}>
          <option value="">Todos los usuarios</option>
          {opciones.usuarios.map((u) => <option key={u.id} value={u.id}>{u.usuario}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={form.modulo} onChange={cambiar('modulo')}>
          <option value="">Todos los módulos</option>
          {opciones.modulos.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 170 }} value={form.accion} onChange={cambiar('accion')}>
          <option value="">Todas las acciones</option>
          {opciones.acciones.map((a) => <option key={a}>{a}</option>)}
        </select>
        <button className="btn btn-prim btn-chico" type="submit">Buscar</button>
        <button className="btn btn-sec btn-chico" type="button" onClick={limpiar}>Limpiar</button>
        <span style={{ flex: 1 }} />
        <a className="btn btn-sec btn-chico" href={exportar('xlsx')} download>Exportar Excel</a>
        <a className="btn btn-sec btn-chico" href={exportar('csv')} download>Exportar CSV</a>
      </form>

      <Alerta tipo="error">{error}</Alerta>
      <div className="tabla-env">
        <table className="tabla">
          <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Tabla</th><th>Id afectado</th><th>Detalle</th></tr></thead>
          <tbody>
            {datos?.filas.map((f) => (
              <tr key={f.id_registro}>
                <td style={{ whiteSpace: "nowrap" }}>{fmt.fechaHora(f.fecha_hora)}</td><td>{f.usuario}</td><td><span className="etiqueta indigo">{f.accion}</span></td>
                <td>{f.modulo}</td><td>{f.tabla}</td><td>{f.id_afectado}</td><td>{f.detalle}</td>
              </tr>
            ))}
            {datos && !datos.filas.length && <tr><td colSpan="7" className="vacio">Sin registros con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {datos && (
        <div className="herramientas" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{fmt.num(datos.total, 0)} registros · página {datos.pagina} de {datos.paginas}</span>
          <span style={{ flex: 1 }} />
          <button className="btn btn-sec btn-chico" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>« Anterior</button>
          <button className="btn btn-sec btn-chico" disabled={pagina >= datos.paginas} onClick={() => setPagina(pagina + 1)}>Siguiente »</button>
        </div>
      )}
    </Pantalla>
  );
}
