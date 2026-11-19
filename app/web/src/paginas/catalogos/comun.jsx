// Piezas compartidas por las pantallas de Catálogos.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';

/** Carga una lista de la API con búsqueda y filtro de estado. */
export function useLista(url, conEstado = true) {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('activos');
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => {
    const params = new URLSearchParams({ q });
    if (conEstado) params.set('estado', estado);
    api.get(`${url}?${params}`).then((d) => { setFilas(d); setError(''); }).catch((e) => setError(e.message));
  }, [url, q, estado, conEstado]);
  useEffect(() => { const t = setTimeout(recargar, 200); return () => clearTimeout(t); }, [recargar]);
  return { q, setQ, estado, setEstado, filas, error, recargar };
}

/** Barra sobre la lista: búsqueda, filtro activos/inactivos y botón de alta. */
export function Herramientas({ lista, placeholder, nuevo, conEstado = true }) {
  return (
    <div className="herramientas">
      <input className="input" style={{ maxWidth: 420, flex: 1 }} placeholder={placeholder} value={lista.q} onChange={(e) => lista.setQ(e.target.value)} />
      {conEstado && (
        <select className="input" style={{ maxWidth: 160 }} value={lista.estado} onChange={(e) => lista.setEstado(e.target.value)}>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
      )}
      <span className="espacio" />
      {nuevo}
    </div>
  );
}

export const Estado = ({ activo }) => <span className={`etiqueta ${activo ? 'verde' : 'roja'}`}>{activo ? 'Activo' : 'Inactivo'}</span>;

/** Casilla con el estilo de las maquetas (Disponible / Cuenta activa). */
export function Casilla({ valor, onChange, texto, deshabilitado }) {
  return (
    <label className="op" style={{ fontWeight: 'bold' }}>
      <input type="checkbox" checked={!!valor} disabled={deshabilitado} onChange={(e) => onChange(e.target.checked)} />
      {texto}
    </label>
  );
}

export const esNum = (v) => v !== '' && v != null && Number.isFinite(Number(v));
export const RFC_OK = (v) => v.length === 12 || v.length === 13;
export const CORREO_OK = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
