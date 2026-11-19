// Entidad Movimiento (abstracta en el diagrama de clases: Entrada, Salida, Ajuste, Devolución).
// También contiene las consultas de producto, ubicación y cliente que usa el módulo Almacén.
import { consulta, procedimiento, sql } from '../db.js';

const COLUMNAS_PRODUCTO = `
  p.id_producto, p.codigo_interno, p.codigo_barras, p.descripcion, p.unidad_medida,
  p.existencia, p.minimo, p.maximo, p.punto_reorden, p.precio_venta, p.imagen_url,
  p.id_ubicacion, u.clave AS ubicacion, u.descripcion AS ubicacion_desc, f.nombre AS familia`;

const DESDE_PRODUCTO = `
  FROM PRODUCTO p
  JOIN FAMILIA f ON f.id_familia = p.id_familia
  LEFT JOIN UBICACION u ON u.id_ubicacion = p.id_ubicacion`;

/** Busca un producto activo por código interno o código de barras exacto (lector HID). */
export async function productoPorCodigo(codigo) {
  const r = await consulta(
    `SELECT ${COLUMNAS_PRODUCTO} ${DESDE_PRODUCTO}
      WHERE p.activo = 1 AND (p.codigo_interno = @c OR p.codigo_barras = @c)`, { c: codigo });
  return r[0] ?? null;
}

export async function productoPorId(id) {
  const r = await consulta(`SELECT ${COLUMNAS_PRODUCTO} ${DESDE_PRODUCTO} WHERE p.id_producto = @id`, { id });
  return r[0] ?? null;
}

/** Productos activos cuyo código, código de barras, descripción o familia contienen el texto. */
export async function buscarProductos(texto, limite = 30) {
  return consulta(
    `SELECT TOP (@lim) ${COLUMNAS_PRODUCTO} ${DESDE_PRODUCTO}
      WHERE p.activo = 1 AND (p.codigo_interno LIKE @t OR p.codigo_barras LIKE @t
                              OR p.descripcion LIKE @t OR f.nombre LIKE @t)
      ORDER BY p.codigo_interno`, { t: `%${texto}%`, lim: limite });
}

export async function ubicacionesDisponibles() {
  return consulta(`SELECT id_ubicacion, clave, descripcion FROM UBICACION WHERE disponible = 1 ORDER BY clave`);
}

export async function ubicacionPorId(id) {
  const r = await consulta(`SELECT id_ubicacion, clave, disponible FROM UBICACION WHERE id_ubicacion = @id`, { id });
  return r[0] ?? null;
}

export async function clientesActivos() {
  return consulta(`SELECT id_cliente, nombre, rfc FROM CLIENTE WHERE activo = 1 ORDER BY id_cliente`);
}

/** Llama a sp_registrar_movimiento (valida existencia, folio, existencia y bitácora).
 *  Devuelve { folio, saldo }. Si recibe tx, el procedimiento usa esa transacción. */
export async function registrar({ tipo, idProducto, idUbicacion, idUsuario, cantidad,
  documentoRef = null, motivo = null, idNotaSalida = null }, tx = null) {
  const { output } = await procedimiento('sp_registrar_movimiento', {
    tipo, id_producto: idProducto, id_ubicacion: idUbicacion, id_usuario: idUsuario, cantidad,
    documento_ref: documentoRef, motivo, id_nota_salida: idNotaSalida,
  }, { folio: sql.VarChar(20), saldo: sql.Decimal(10, 2) }, tx);
  return { folio: output.folio, saldo: output.saldo };
}
