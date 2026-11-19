// Entidad NotaSalida (RF8): una nota con varias partidas (movimientos de salida).
import { consulta, procedimiento, sql } from '../db.js';

export async function siguienteFolio(tx) {
  const { output } = await procedimiento('sp_siguiente_folio', { prefijo: 'NS' }, { folio: sql.VarChar(20) }, tx);
  return output.folio;
}

export async function crear({ folio, idCliente, idUsuario, observaciones }, tx) {
  const r = await consulta(
    `INSERT INTO NOTA_SALIDA (folio, id_cliente, id_usuario, observaciones)
     OUTPUT inserted.id_nota_salida VALUES (@f, @c, @u, @o)`,
    { f: folio, c: idCliente, u: idUsuario, o: observaciones || null }, tx);
  return r[0].id_nota_salida;
}

export async function recientes(limite = 15) {
  return consulta(
    `SELECT TOP (@lim) n.id_nota_salida, n.folio, n.fecha, c.nombre AS cliente, us.nombre_completo AS usuario,
            COUNT(m.id_movimiento) AS partidas,
            SUM(m.cantidad * p.precio_venta) AS total
       FROM NOTA_SALIDA n
       LEFT JOIN CLIENTE c ON c.id_cliente = n.id_cliente
       JOIN USUARIO us ON us.id_usuario = n.id_usuario
       LEFT JOIN MOVIMIENTO m ON m.id_nota_salida = n.id_nota_salida
       LEFT JOIN PRODUCTO p ON p.id_producto = m.id_producto
      GROUP BY n.id_nota_salida, n.folio, n.fecha, c.nombre, us.nombre_completo
      ORDER BY n.id_nota_salida DESC`, { lim: limite });
}

/** Encabezado y partidas de una nota (para los PDF S1 y S3). */
export async function obtener(id) {
  const enc = await consulta(
    `SELECT n.id_nota_salida, n.folio, n.fecha, n.observaciones, c.nombre AS cliente, c.rfc,
            us.nombre_completo AS usuario
       FROM NOTA_SALIDA n
       LEFT JOIN CLIENTE c ON c.id_cliente = n.id_cliente
       JOIN USUARIO us ON us.id_usuario = n.id_usuario
      WHERE n.id_nota_salida = @id`, { id });
  if (!enc[0]) return null;
  const partidas = await consulta(
    `SELECT m.folio AS folio_mov, p.codigo_interno, p.descripcion, p.unidad_medida, m.cantidad,
            p.precio_venta, CAST(m.cantidad * p.precio_venta AS DECIMAL(14,2)) AS importe,
            u.clave AS ubicacion
       FROM MOVIMIENTO m
       JOIN PRODUCTO p ON p.id_producto = m.id_producto
       JOIN UBICACION u ON u.id_ubicacion = m.id_ubicacion
      WHERE m.id_nota_salida = @id
      ORDER BY m.id_movimiento`, { id });
  return { ...enc[0], partidas };
}
