// Entidad Kardex (RF2): historial de movimientos de un producto con su saldo.
import { consulta } from '../db.js';

/** filtros: { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD', tipo: 'E'|'S'|'A'|'D' } */
export async function historial(idProducto, { desde, hasta, tipo } = {}) {
  let filtro = '';
  const params = { id: idProducto };
  if (desde) { filtro += ' AND m.fecha >= @desde'; params.desde = desde; }
  if (hasta) { filtro += ' AND m.fecha < DATEADD(day, 1, CAST(@hasta AS DATE))'; params.hasta = hasta; }
  if (tipo) { filtro += ' AND m.tipo = @tipo'; params.tipo = tipo; }
  return consulta(
    `SELECT m.id_movimiento, m.folio, m.tipo, m.fecha,
            CASE WHEN m.tipo IN ('E','D') OR (m.tipo = 'A' AND m.cantidad > 0) THEN ABS(m.cantidad) ELSE 0 END AS entrada,
            CASE WHEN m.tipo = 'S' OR (m.tipo = 'A' AND m.cantidad < 0) THEN ABS(m.cantidad) ELSE 0 END AS salida,
            m.saldo_resultante AS saldo, m.documento_ref, m.motivo,
            u.clave AS ubicacion, us.nombre_usuario AS usuario
       FROM MOVIMIENTO m
       JOIN UBICACION u ON u.id_ubicacion = m.id_ubicacion
       JOIN USUARIO us ON us.id_usuario = m.id_usuario
      WHERE m.id_producto = @id ${filtro}
      ORDER BY m.fecha, m.id_movimiento`, params);
}

export async function cuentaMovimientos(idProducto) {
  const r = await consulta(`SELECT COUNT(*) AS n FROM MOVIMIENTO WHERE id_producto = @id`, { id: idProducto });
  return r[0].n;
}
