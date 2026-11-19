// Entidad OrdenDeCompra (con su clase de asociación DetalleOrden) y las consultas de
// proveedores y productos que necesita el módulo Compras (CU5, RF12, RF14).
import { consulta, procedimiento, sql } from '../db.js';

/** Folio consecutivo definitivo de la OC (OC-2026-0003). */
export async function siguienteFolio(tx = null) {
  const { output } = await procedimiento('sp_siguiente_folio', { prefijo: 'OC' }, { folio: sql.VarChar(20) }, tx);
  return output.folio;
}

/* ---------------- Órdenes ---------------- */

const SELECT_OC = `
  SELECT o.id_oc, o.folio, o.id_proveedor, o.id_usuario, o.fecha_emision, o.fecha_entrega_estimada,
         o.estado, o.subtotal, o.iva, o.total, o.observaciones,
         p.razon_social AS proveedor, p.rfc, p.clasificacion, p.nombre_contacto, p.telefono, p.correo,
         p.lead_time_dias, u.nombre_completo AS elaboro
    FROM ORDEN_COMPRA o
    JOIN PROVEEDOR p ON p.id_proveedor = o.id_proveedor
    JOIN USUARIO u   ON u.id_usuario   = o.id_usuario`;

/** Lista de órdenes; estado opcional y búsqueda por folio o proveedor. */
export async function listar({ estado = null, texto = null } = {}) {
  return consulta(
    `${SELECT_OC}
      WHERE (@estado IS NULL OR o.estado = @estado)
        AND (@texto IS NULL OR o.folio LIKE @like OR p.razon_social LIKE @like)
      ORDER BY o.id_oc DESC`,
    { estado: estado || null, texto: texto || null, like: `%${texto ?? ''}%` });
}

export async function obtener(idOc, tx = null) {
  const r = await consulta(`${SELECT_OC} WHERE o.id_oc = @id`, { id: idOc }, tx);
  return r[0] ?? null;
}

/** Partidas (DetalleOrden) con el pendiente calculado y la ubicación por defecto del producto. */
export async function partidas(idOc, tx = null) {
  return consulta(
    `SELECT d.id_producto, pr.codigo_interno, pr.descripcion, pr.unidad_medida,
            d.cantidad_solicitada, d.cantidad_recibida, d.cantidad_no_conforme, d.costo_unitario, d.importe,
            CASE WHEN d.cantidad_solicitada > d.cantidad_recibida
                 THEN d.cantidad_solicitada - d.cantidad_recibida ELSE 0 END AS pendiente,
            pr.id_ubicacion, ub.clave AS ubicacion
       FROM DETALLE_ORDEN d
       JOIN PRODUCTO pr       ON pr.id_producto  = d.id_producto
       LEFT JOIN UBICACION ub ON ub.id_ubicacion = pr.id_ubicacion
      WHERE d.id_oc = @id
      ORDER BY pr.codigo_interno`, { id: idOc }, tx);
}

export async function crear({ folio, idProveedor, idUsuario, fechaEntrega, observaciones, subtotal }, tx) {
  const r = await consulta(
    `INSERT INTO ORDEN_COMPRA (folio, id_proveedor, id_usuario, fecha_entrega_estimada, estado, subtotal, observaciones)
     OUTPUT inserted.id_oc
     VALUES (@folio, @prov, @u, @entrega, 'PENDIENTE', @subtotal, @obs)`,
    { folio, prov: idProveedor, u: idUsuario, entrega: fechaEntrega, subtotal, obs: observaciones }, tx);
  return r[0].id_oc;
}

export async function cambiarFolio(idOc, folio, tx) {
  await consulta(`UPDATE ORDEN_COMPRA SET folio = @folio WHERE id_oc = @id`, { id: idOc, folio }, tx);
}

/** Actualiza el encabezado de un borrador (la fecha de emisión se renueva a hoy). */
export async function actualizar(idOc, { idProveedor, fechaEntrega, observaciones, subtotal }, tx) {
  await consulta(
    `UPDATE ORDEN_COMPRA
        SET id_proveedor = @prov, fecha_emision = CAST(GETDATE() AS DATE),
            fecha_entrega_estimada = @entrega, observaciones = @obs, subtotal = @subtotal
      WHERE id_oc = @id`,
    { id: idOc, prov: idProveedor, entrega: fechaEntrega, obs: observaciones, subtotal }, tx);
}

export async function borrarPartidas(idOc, tx) {
  await consulta(`DELETE FROM DETALLE_ORDEN WHERE id_oc = @id`, { id: idOc }, tx);
}

export async function agregarPartida(idOc, { id_producto, cantidad, costo_unitario }, tx) {
  await consulta(
    `INSERT INTO DETALLE_ORDEN (id_oc, id_producto, cantidad_solicitada, costo_unitario)
     VALUES (@id, @prod, @cant, @costo)`,
    { id: idOc, prod: id_producto, cant: cantidad, costo: costo_unitario }, tx);
}

/** Cambia el estado (y opcionalmente el folio y la fecha de emisión al emitir). */
export async function cambiarEstado(idOc, estado, { folio = null, renovarFecha = false } = {}, tx = null) {
  await consulta(
    `UPDATE ORDEN_COMPRA
        SET estado = @estado,
            folio = COALESCE(@folio, folio),
            fecha_emision = CASE WHEN @renovar = 1 THEN CAST(GETDATE() AS DATE) ELSE fecha_emision END
      WHERE id_oc = @id`,
    { id: idOc, estado, folio, renovar: renovarFecha ? 1 : 0 }, tx);
}

/** Fecha de hoy según el servidor de BD (para validar la fecha de entrega). */
export async function hoy() {
  const r = await consulta(`SELECT CONVERT(VARCHAR(10), CAST(GETDATE() AS DATE), 23) AS hoy`);
  return r[0].hoy;
}

/* ---------------- Proveedores ---------------- */

export async function proveedoresActivos() {
  return consulta(
    `SELECT id_proveedor, razon_social, rfc, clasificacion, lead_time_dias, nombre_contacto, telefono, correo
       FROM PROVEEDOR WHERE activo = 1 ORDER BY razon_social`);
}

export async function proveedor(idProveedor, tx = null) {
  const r = await consulta(`SELECT * FROM PROVEEDOR WHERE id_proveedor = @id`, { id: idProveedor }, tx);
  return r[0] ?? null;
}

/* ---------------- Productos ---------------- */

/** Productos activos; los que surte el proveedor van primero con su precio de compra (PRODUCTO_PROVEEDOR). */
export async function productosParaProveedor(idProveedor) {
  return consulta(
    `SELECT p.id_producto, p.codigo_interno, p.descripcion, p.unidad_medida, p.costo_unitario,
            p.existencia, p.punto_reorden, p.maximo,
            pp.precio_compra, pp.moneda, pp.codigo_proveedor,
            CAST(CASE WHEN pp.id_producto IS NULL THEN 0 ELSE 1 END AS BIT) AS lo_surte
       FROM PRODUCTO p
       LEFT JOIN PRODUCTO_PROVEEDOR pp ON pp.id_producto = p.id_producto AND pp.id_proveedor = @prov
      WHERE p.activo = 1
      ORDER BY CASE WHEN pp.id_producto IS NULL THEN 1 ELSE 0 END, p.codigo_interno`,
    { prov: idProveedor ?? null });
}

export async function productosActivos(ids, tx = null) {
  if (!ids.length) return [];
  return consulta(
    `SELECT id_producto FROM PRODUCTO
      WHERE activo = 1 AND id_producto IN (SELECT value FROM OPENJSON(@ids))`,
    { ids: JSON.stringify(ids) }, tx);
}

/* ---------------- Reorden (RF14, S7) ---------------- */

/** Productos bajo el punto de reorden con el mejor precio de proveedor.
 *  Si se da idProveedor, solo los que surte ese proveedor (con el precio de ese proveedor). */
export async function bajoReorden(idProveedor = null) {
  return consulta(
    `SELECT p.id_producto, v.codigo_interno, v.descripcion, v.familia, v.existencia, v.punto_reorden,
            v.maximo, v.cantidad_sugerida, p.unidad_medida, p.costo_unitario,
            mp.id_proveedor, pv.razon_social AS proveedor, pv.lead_time_dias, pv.clasificacion,
            mp.precio_compra, mp.moneda
       FROM vw_PRODUCTOS_BAJO_REORDEN v
       JOIN PRODUCTO p ON p.codigo_interno = v.codigo_interno
       OUTER APPLY (SELECT TOP 1 pp.id_proveedor, pp.precio_compra, pp.moneda
                      FROM PRODUCTO_PROVEEDOR pp
                      JOIN PROVEEDOR x ON x.id_proveedor = pp.id_proveedor AND x.activo = 1
                     WHERE pp.id_producto = p.id_producto
                       AND (@prov IS NULL OR pp.id_proveedor = @prov)
                     ORDER BY CASE pp.moneda WHEN 'MXN' THEN 0 ELSE 1 END, pp.precio_compra) mp
       LEFT JOIN PROVEEDOR pv ON pv.id_proveedor = mp.id_proveedor
      WHERE @prov IS NULL OR mp.id_proveedor IS NOT NULL
      ORDER BY v.existencia / NULLIF(v.punto_reorden, 0), v.codigo_interno`,
    { prov: idProveedor ?? null });
}
