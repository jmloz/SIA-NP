// Entidad Devolucion (CU4 Registrar devolución de cliente, RF7).
// Una fila de DEVOLUCION_CLIENTE por producto devuelto; todas las filas de una devolución comparten el folio DEV.
// Aquí están también las consultas de cliente, nota de salida y producto que necesita el CU4.
import { consulta, procedimiento, sql } from '../db.js';

/** Paso 2: clientes activos cuyo nombre o RFC contienen el texto. */
export function buscarClientes(texto) {
  return consulta(
    `SELECT TOP 20 id_cliente, nombre, rfc, telefono FROM CLIENTE
      WHERE activo = 1 AND (nombre LIKE @t OR rfc LIKE @t)
      ORDER BY nombre`, { t: `%${texto}%` });
}

export async function clientePorId(id) {
  const r = await consulta('SELECT id_cliente, nombre, rfc, activo FROM CLIENTE WHERE id_cliente = @id', { id });
  return r[0] ?? null;
}

/** Paso 3: notas de salida del cliente con su total y número de partidas. */
export function notasDelCliente(idCliente) {
  return consulta(
    `SELECT n.id_nota_salida, n.folio, n.fecha,
            COUNT(m.id_movimiento) AS partidas,
            SUM(m.cantidad * p.precio_venta) AS total
       FROM NOTA_SALIDA n
       LEFT JOIN MOVIMIENTO m ON m.id_nota_salida = n.id_nota_salida AND m.tipo = 'S'
       LEFT JOIN PRODUCTO p ON p.id_producto = m.id_producto
      WHERE n.id_cliente = @c
      GROUP BY n.id_nota_salida, n.folio, n.fecha
      ORDER BY n.id_nota_salida DESC`, { c: idCliente });
}

export async function notaPorId(id) {
  const r = await consulta(
    `SELECT n.id_nota_salida, n.folio, n.fecha, n.id_cliente, c.nombre AS cliente
       FROM NOTA_SALIDA n LEFT JOIN CLIENTE c ON c.id_cliente = n.id_cliente
      WHERE n.id_nota_salida = @id`, { id });
  return r[0] ?? null;
}

/** Paso 4: productos de la nota con cantidad vendida, ya devuelta (de cualquier estado) y disponible.
 *  Con tx se bloquean las filas leídas para que dos devoluciones simultáneas no excedan lo vendido. */
export function productosDeNota(idNota, tx = null) {
  const bloqueo = tx ? 'WITH (UPDLOCK, HOLDLOCK)' : '';
  return consulta(
    `SELECT v.id_producto, p.codigo_interno, p.descripcion, p.unidad_medida, p.id_ubicacion, u.clave AS ubicacion,
            v.vendida, ISNULL(d.devuelta, 0) AS devuelta, v.vendida - ISNULL(d.devuelta, 0) AS disponible
       FROM (SELECT id_producto, SUM(cantidad) AS vendida FROM MOVIMIENTO
              WHERE id_nota_salida = @n AND tipo = 'S' GROUP BY id_producto) v
       JOIN PRODUCTO p ON p.id_producto = v.id_producto
       LEFT JOIN UBICACION u ON u.id_ubicacion = p.id_ubicacion
       LEFT JOIN (SELECT id_producto, SUM(cantidad) AS devuelta FROM DEVOLUCION_CLIENTE ${bloqueo}
                   WHERE id_nota_salida = @n GROUP BY id_producto) d ON d.id_producto = v.id_producto
      ORDER BY p.codigo_interno`, { n: idNota }, tx);
}

export async function productoPorId(id) {
  const r = await consulta(
    `SELECT p.id_producto, p.codigo_interno, p.descripcion, p.unidad_medida, p.id_ubicacion, u.clave AS ubicacion, p.activo
       FROM PRODUCTO p LEFT JOIN UBICACION u ON u.id_ubicacion = p.id_ubicacion
      WHERE p.id_producto = @id`, { id });
  return r[0] ?? null;
}

export async function siguienteFolio(tx) {
  const { output } = await procedimiento('sp_siguiente_folio', { prefijo: 'DEV' }, { folio: sql.VarChar(20) }, tx);
  return output.folio;
}

/** Paso 8: entrada tipo 'D' (suma a la existencia). Devuelve { idMovimiento, folio, saldo }. */
export async function registrarEntrada({ idProducto, idUbicacion, idUsuario, cantidad, documentoRef, motivo }, tx) {
  const { output } = await procedimiento('sp_registrar_movimiento', {
    tipo: 'D', id_producto: idProducto, id_ubicacion: idUbicacion, id_usuario: idUsuario, cantidad,
    documento_ref: documentoRef, motivo,
  }, { folio: sql.VarChar(20), saldo: sql.Decimal(10, 2) }, tx);
  const r = await consulta('SELECT id_movimiento FROM MOVIMIENTO WHERE folio = @f', { f: output.folio }, tx);
  return { idMovimiento: r[0].id_movimiento, folio: output.folio, saldo: output.saldo };
}

/** Una fila de DEVOLUCION_CLIENTE (idMovimiento NULL si la mercancía está dañada). */
export async function crearFila(d, tx) {
  const r = await consulta(
    `INSERT INTO DEVOLUCION_CLIENTE (folio, id_cliente, id_nota_salida, id_producto, cantidad, estado_mercancia,
                                     motivo, autorizado_por, id_movimiento, id_usuario)
     OUTPUT inserted.id_devolucion
     VALUES (@folio, @cliente, @nota, @producto, @cantidad, @estado, @motivo, @autoriza, @mov, @usuario)`,
    { folio: d.folio, cliente: d.idCliente, nota: d.idNotaSalida, producto: d.idProducto, cantidad: d.cantidad,
      estado: d.estado, motivo: d.motivo, autoriza: d.autorizadoPor, mov: d.idMovimiento, usuario: d.idUsuario }, tx);
  return r[0].id_devolucion;
}

/** Lista de devoluciones recientes, una fila por folio. */
export function recientes(limite = 15) {
  return consulta(
    `SELECT TOP (@lim) d.folio, MIN(d.fecha) AS fecha, c.nombre AS cliente, n.folio AS nota,
            MAX(ua.nombre_completo) AS autorizado_por, MAX(us.nombre_completo) AS usuario,
            COUNT(*) AS productos,
            STRING_AGG(CONCAT(p.codigo_interno, ' × ', FORMAT(d.cantidad, '0.##'),
                              CASE d.estado_mercancia WHEN 'DANADA' THEN ' (dañada)' ELSE '' END), ', ') AS detalle,
            SUM(CASE d.estado_mercancia WHEN 'BUENA' THEN 1 ELSE 0 END) AS buenas,
            SUM(CASE d.estado_mercancia WHEN 'DANADA' THEN 1 ELSE 0 END) AS danadas
       FROM DEVOLUCION_CLIENTE d
       JOIN CLIENTE c ON c.id_cliente = d.id_cliente
       JOIN PRODUCTO p ON p.id_producto = d.id_producto
       JOIN USUARIO us ON us.id_usuario = d.id_usuario
       LEFT JOIN USUARIO ua ON ua.id_usuario = d.autorizado_por
       LEFT JOIN NOTA_SALIDA n ON n.id_nota_salida = d.id_nota_salida
      GROUP BY d.folio, c.nombre, n.folio
      ORDER BY MAX(d.id_devolucion) DESC`, { lim: limite });
}
