// Entidad InventarioFisico (diagrama de clases) con su detalle DETALLE_CONTEO (CU3, RF6).
// Contiene también las consultas de familia y producto que usa el inventario físico.
import { consulta, procedimiento, sql } from '../db.js';

export const familias = () => consulta('SELECT id_familia, nombre FROM FAMILIA ORDER BY nombre');

export async function familiaPorId(id) {
  const r = await consulta('SELECT id_familia, nombre FROM FAMILIA WHERE id_familia = @id', { id });
  return r[0] ?? null;
}

/** Lista de conteos con su avance (filas contadas / total). */
export function listar() {
  return consulta(`
    SELECT i.id_conteo, i.folio, i.tipo_conteo, i.id_familia, f.nombre AS familia, i.fecha, i.estado,
           u.nombre_completo AS usuario,
           (SELECT COUNT(*) FROM DETALLE_CONTEO d WHERE d.id_conteo = i.id_conteo) AS total,
           (SELECT COUNT(*) FROM DETALLE_CONTEO d WHERE d.id_conteo = i.id_conteo AND d.contado = 1) AS contados
      FROM INVENTARIO_FISICO i
      LEFT JOIN FAMILIA f ON f.id_familia = i.id_familia
      JOIN USUARIO u ON u.id_usuario = i.id_usuario
     ORDER BY i.id_conteo DESC`);
}

export async function obtener(id, tx = null) {
  const r = await consulta(`
    SELECT i.id_conteo, i.folio, i.tipo_conteo, i.id_familia, f.nombre AS familia, i.fecha, i.estado,
           u.nombre_completo AS usuario
      FROM INVENTARIO_FISICO i
      LEFT JOIN FAMILIA f ON f.id_familia = i.id_familia
      JOIN USUARIO u ON u.id_usuario = i.id_usuario
     WHERE i.id_conteo = @id`, { id }, tx);
  return r[0] ?? null;
}

/** Partidas del conteo ordenadas por ubicación (recorrido del almacén).
 *  existencia_sistema = foto al abrir; existencia_actual = la de hoy (puede cambiar si hubo movimientos). */
export function detalle(id, tx = null) {
  return consulta(`
    SELECT d.id_producto, p.codigo_interno, p.codigo_barras, p.descripcion, p.unidad_medida, p.costo_unitario,
           d.id_ubicacion, u.clave AS ubicacion, d.existencia_sistema, d.cantidad_contada, d.diferencia,
           d.contado, p.existencia AS existencia_actual
      FROM DETALLE_CONTEO d
      JOIN PRODUCTO p ON p.id_producto = d.id_producto
      JOIN UBICACION u ON u.id_ubicacion = d.id_ubicacion
     WHERE d.id_conteo = @id
     ORDER BY u.clave, p.codigo_interno`, { id }, tx);
}

/** Conteos sin terminar (ABIERTO o CAPTURADO): sirven para no abrir dos sobre los mismos productos. */
export function conteosSinTerminar(tx = null) {
  return consulta(`
    SELECT i.folio, i.tipo_conteo, i.id_familia, f.nombre AS familia
      FROM INVENTARIO_FISICO i LEFT JOIN FAMILIA f ON f.id_familia = i.id_familia
     WHERE i.estado IN ('ABIERTO', 'CAPTURADO')`, {}, tx);
}

export async function siguienteFolio(tx) {
  const { output } = await procedimiento('sp_siguiente_folio', { prefijo: 'INV' }, { folio: sql.VarChar(20) }, tx);
  return output.folio;
}

export async function crear({ folio, tipo, idFamilia, idUsuario }, tx) {
  const r = await consulta(
    `INSERT INTO INVENTARIO_FISICO (folio, tipo_conteo, id_familia, id_usuario, estado)
     OUTPUT INSERTED.id_conteo VALUES (@folio, @tipo, @fam, @u, 'ABIERTO')`,
    { folio, tipo, fam: idFamilia, u: idUsuario }, tx);
  return r[0].id_conteo;
}

/** Paso 3: una partida por producto activo (de la familia o todos) con la foto de su existencia.
 *  Los productos sin ubicación asignada se anotan en la primera ubicación disponible (por clave).
 *  Devuelve { productos, sinUbicacion, ubicacionDefecto }. */
export async function generarDetalle(idConteo, idFamilia, tx) {
  const def = (await consulta(
    'SELECT TOP 1 id_ubicacion, clave FROM UBICACION WHERE disponible = 1 ORDER BY clave', {}, tx))[0];
  const params = { id: idConteo, fam: idFamilia, def: def?.id_ubicacion ?? null };
  const filtro = `p.activo = 1 AND (@fam IS NULL OR p.id_familia = @fam)`;
  const cuenta = (await consulta(
    `SELECT COUNT(*) AS productos, SUM(CASE WHEN p.id_ubicacion IS NULL THEN 1 ELSE 0 END) AS sin_ubicacion
       FROM PRODUCTO p WHERE ${filtro}`, params, tx))[0];
  if (cuenta.sin_ubicacion > 0 && !def) return { productos: 0, sinUbicacion: cuenta.sin_ubicacion, ubicacionDefecto: null };
  await consulta(
    `INSERT INTO DETALLE_CONTEO (id_conteo, id_producto, id_ubicacion, existencia_sistema, cantidad_contada, contado)
     SELECT @id, p.id_producto, ISNULL(p.id_ubicacion, @def), p.existencia, 0, 0
       FROM PRODUCTO p WITH (UPDLOCK) WHERE ${filtro}`, params, tx);
  return { productos: cuenta.productos, sinUbicacion: cuenta.sin_ubicacion ?? 0, ubicacionDefecto: def?.clave ?? null };
}

/** Paso 4 / 7a: anota lo contado de un producto y lo marca como contado. Devuelve las filas afectadas. */
export async function anotarConteo(idConteo, idProducto, cantidad, tx = null) {
  const r = await consulta(
    `UPDATE DETALLE_CONTEO SET cantidad_contada = @c, contado = 1
      OUTPUT INSERTED.id_producto
      WHERE id_conteo = @id AND id_producto = @p`, { id: idConteo, p: idProducto, c: cantidad }, tx);
  return r.length;
}

export async function cambiarEstado(idConteo, estado, tx = null) {
  await consulta('UPDATE INVENTARIO_FISICO SET estado = @e WHERE id_conteo = @id', { id: idConteo, e: estado }, tx);
}

/** Bloquea el conteo dentro de una transacción (dos cierres a la vez no generan ajustes dobles). */
export async function bloquear(idConteo, tx) {
  const r = await consulta(
    'SELECT estado FROM INVENTARIO_FISICO WITH (UPDLOCK, ROWLOCK) WHERE id_conteo = @id', { id: idConteo }, tx);
  return r[0]?.estado ?? null;
}

/** Paso 8: ajuste (tipo A, cantidad con signo) ligado al conteo con sp_registrar_movimiento,
 *  que actualiza la existencia, el kardex y la bitácora del movimiento. Devuelve { folio, saldo }. */
export async function registrarAjuste({ idConteo, idProducto, idUbicacion, idUsuario, cantidad, folioConteo, motivo }, tx) {
  const { output } = await procedimiento('sp_registrar_movimiento', {
    tipo: 'A', id_producto: idProducto, id_ubicacion: idUbicacion, id_usuario: idUsuario, cantidad,
    documento_ref: folioConteo, motivo, id_conteo: idConteo,
  }, { folio: sql.VarChar(20), saldo: sql.Decimal(10, 2) }, tx);
  return { folio: output.folio, saldo: output.saldo };
}

/** Existencia actual del producto, bloqueada hasta terminar la transacción del cierre. */
export async function existenciaActual(idProducto, tx) {
  const r = await consulta(
    'SELECT existencia FROM PRODUCTO WITH (UPDLOCK, ROWLOCK) WHERE id_producto = @id', { id: idProducto }, tx);
  return r[0] ? Number(r[0].existencia) : null;
}
