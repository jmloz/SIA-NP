// Entidad Producto (RF20). La existencia solo cambia con movimientos, nunca desde el catálogo.
import { consulta } from '../db.js';

const BASE = `SELECT p.id_producto, p.codigo_interno, p.codigo_barras, p.descripcion, p.id_familia, f.nombre AS familia,
       p.unidad_medida, p.minimo, p.maximo, p.punto_reorden, p.existencia, p.costo_unitario, p.precio_venta,
       p.imagen_url, p.id_ubicacion, u.clave AS ubicacion, p.activo, p.fecha_alta
  FROM PRODUCTO p JOIN FAMILIA f ON f.id_familia = p.id_familia
  LEFT JOIN UBICACION u ON u.id_ubicacion = p.id_ubicacion`;

/** estado: 'activos' | 'inactivos' | 'todos'. */
export function listar({ q = '', estado = 'activos' } = {}) {
  return consulta(
    `${BASE}
      WHERE (@q = '' OR p.codigo_interno LIKE @like OR p.codigo_barras LIKE @like
             OR p.descripcion LIKE @like OR f.nombre LIKE @like)
        AND (@estado = 'todos' OR (@estado = 'activos' AND p.activo = 1) OR (@estado = 'inactivos' AND p.activo = 0))
      ORDER BY p.codigo_interno`, { q, like: `%${q}%`, estado });
}

export async function obtener(id) {
  return (await consulta(`${BASE} WHERE p.id_producto = @id`, { id }))[0] ?? null;
}

export async function codigoBarrasUsado(codigo, exceptoId = 0) {
  const r = await consulta('SELECT 1 AS x FROM PRODUCTO WHERE codigo_barras = @c AND id_producto <> @id', { c: codigo, id: exceptoId });
  return r.length > 0;
}

export async function codigoInternoUsado(codigo, exceptoId = 0) {
  const r = await consulta('SELECT 1 AS x FROM PRODUCTO WHERE codigo_interno = @c AND id_producto <> @id', { c: codigo, id: exceptoId });
  return r.length > 0;
}

export async function crear(p) {
  const r = await consulta(
    `INSERT INTO PRODUCTO (codigo_interno, codigo_barras, descripcion, id_familia, unidad_medida, minimo, maximo,
                           punto_reorden, costo_unitario, precio_venta, imagen_url, id_ubicacion)
     OUTPUT inserted.id_producto
     VALUES (@codigo_interno, @codigo_barras, @descripcion, @id_familia, @unidad_medida, @minimo, @maximo,
             @punto_reorden, @costo_unitario, @precio_venta, @imagen_url, @id_ubicacion)`, p);
  return r[0].id_producto;
}

export async function actualizar(id, p) {
  await consulta(
    `UPDATE PRODUCTO SET codigo_interno=@codigo_interno, codigo_barras=@codigo_barras, descripcion=@descripcion,
            id_familia=@id_familia, unidad_medida=@unidad_medida, minimo=@minimo, maximo=@maximo,
            punto_reorden=@punto_reorden, costo_unitario=@costo_unitario, precio_venta=@precio_venta,
            imagen_url=@imagen_url, id_ubicacion=@id_ubicacion WHERE id_producto=@id`, { ...p, id });
}

export async function cambiarActivo(id, activo) {
  await consulta('UPDATE PRODUCTO SET activo=@activo WHERE id_producto=@id', { id, activo: activo ? 1 : 0 });
}
