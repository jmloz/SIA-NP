// Entidad Proveedor (RF11) y sus precios por producto (PRODUCTO_PROVEEDOR).
import { consulta } from '../db.js';

export function listar({ q = '', estado = 'activos' } = {}) {
  return consulta(
    `SELECT id_proveedor, rfc, razon_social, clasificacion, nombre_contacto, telefono, correo, lead_time_dias, activo
       FROM PROVEEDOR
      WHERE (@q = '' OR rfc LIKE @like OR razon_social LIKE @like OR nombre_contacto LIKE @like)
        AND (@estado = 'todos' OR (@estado = 'activos' AND activo = 1) OR (@estado = 'inactivos' AND activo = 0))
      ORDER BY razon_social`, { q, like: `%${q}%`, estado });
}

export async function obtener(id) {
  return (await consulta('SELECT * FROM PROVEEDOR WHERE id_proveedor = @id', { id }))[0] ?? null;
}

export async function rfcUsado(rfc, exceptoId = 0) {
  return (await consulta('SELECT 1 AS x FROM PROVEEDOR WHERE rfc = @rfc AND id_proveedor <> @id', { rfc, id: exceptoId })).length > 0;
}

export async function crear(p) {
  const r = await consulta(
    `INSERT INTO PROVEEDOR (rfc, razon_social, clasificacion, nombre_contacto, telefono, correo, lead_time_dias, activo)
     OUTPUT inserted.id_proveedor
     VALUES (@rfc, @razon_social, @clasificacion, @nombre_contacto, @telefono, @correo, @lead_time_dias, @activo)`, p);
  return r[0].id_proveedor;
}

export async function actualizar(id, p) {
  await consulta(
    `UPDATE PROVEEDOR SET rfc=@rfc, razon_social=@razon_social, clasificacion=@clasificacion,
            nombre_contacto=@nombre_contacto, telefono=@telefono, correo=@correo,
            lead_time_dias=@lead_time_dias, activo=@activo WHERE id_proveedor=@id`, { ...p, id });
}

export function listarPrecios(idProveedor) {
  return consulta(
    `SELECT pp.id_producto, p.codigo_interno, p.descripcion, pp.codigo_proveedor, pp.precio_compra, pp.moneda, pp.fecha_actualizacion
       FROM PRODUCTO_PROVEEDOR pp JOIN PRODUCTO p ON p.id_producto = pp.id_producto
      WHERE pp.id_proveedor = @id ORDER BY p.codigo_interno`, { id: idProveedor });
}

/** Agrega o actualiza el precio de un producto para el proveedor. */
export async function guardarPrecio(idProveedor, x) {
  await consulta(
    `MERGE PRODUCTO_PROVEEDOR AS t
      USING (SELECT @idp AS id_producto, @idv AS id_proveedor) AS s
         ON t.id_producto = s.id_producto AND t.id_proveedor = s.id_proveedor
      WHEN MATCHED THEN UPDATE SET codigo_proveedor=@cod, precio_compra=@precio, moneda=@moneda,
                                   fecha_actualizacion = CAST(GETDATE() AS DATE)
      WHEN NOT MATCHED THEN INSERT (id_producto, id_proveedor, codigo_proveedor, precio_compra, moneda)
                            VALUES (@idp, @idv, @cod, @precio, @moneda);`,
    { idp: x.id_producto, idv: idProveedor, cod: x.codigo_proveedor, precio: x.precio_compra, moneda: x.moneda });
}

export async function quitarPrecio(idProveedor, idProducto) {
  await consulta('DELETE FROM PRODUCTO_PROVEEDOR WHERE id_proveedor=@v AND id_producto=@p', { v: idProveedor, p: idProducto });
}
