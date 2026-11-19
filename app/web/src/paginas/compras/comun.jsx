// Piezas comunes del módulo Compras.

export const ESTADOS = [
  { clave: 'PENDIENTE', nombre: 'Pendiente (borrador)', color: '' },
  { clave: 'EMITIDA', nombre: 'Emitida', color: 'indigo' },
  { clave: 'RECIBIDA_PARCIAL', nombre: 'Parcialmente recibida', color: 'ambar' },
  { clave: 'RECIBIDA_TOTAL', nombre: 'Recibida', color: 'verde' },
  { clave: 'CERRADA', nombre: 'Cerrada', color: '' },
  { clave: 'CANCELADA', nombre: 'Cancelada', color: 'roja' },
];

export function EtiquetaEstado({ estado }) {
  const e = ESTADOS.find((x) => x.clave === estado) ?? { nombre: estado, color: '' };
  return <span className={`etiqueta ${e.color}`}>{e.nombre}</span>;
}

/** Folio visible: un borrador sin folio definitivo (BOR-n) se muestra como "Borrador". */
export function Folio({ orden }) {
  if (orden.borrador || orden.folio?.startsWith('BOR-')) return <span className="etiqueta">Borrador #{orden.id_oc}</span>;
  return <b>{orden.folio}</b>;
}

/** Suma días a una fecha 'AAAA-MM-DD'. */
export function sumarDias(fecha, dias) {
  const d = new Date(fecha + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

export const redondear = (n) => Math.round(Number(n) * 100) / 100;
