// Entidad Reporte (RF18, RF19): consultas para exportaciones y para la bitácora de auditoría (solo lectura).
import { consulta } from '../db.js';

export async function inventarioValorizado() {
  return consulta(
    `SELECT p.codigo_interno AS codigo, p.descripcion, f.nombre AS familia, p.unidad_medida AS unidad,
            p.existencia, p.costo_unitario AS costo, CAST(p.existencia * p.costo_unitario AS DECIMAL(14,2)) AS valor,
            u.clave AS ubicacion
     FROM PRODUCTO p JOIN FAMILIA f ON f.id_familia = p.id_familia LEFT JOIN UBICACION u ON u.id_ubicacion = p.id_ubicacion
     WHERE p.activo = 1 ORDER BY p.codigo_interno`);
}

export async function reorden() {
  return consulta(
    `SELECT v.codigo_interno AS codigo, v.descripcion, v.familia, v.existencia, v.punto_reorden, v.maximo, v.cantidad_sugerida
     FROM vw_PRODUCTOS_BAJO_REORDEN v ORDER BY v.familia, v.codigo_interno`);
}

/** Condición común de la bitácora. filtros: { desde, hasta, usuario, modulo, accion } (todos opcionales). */
function filtrar(f) {
  const donde = [], p = {};
  if (f.desde) { donde.push('b.fecha_hora >= @desde'); p.desde = f.desde; }
  if (f.hasta) { donde.push('b.fecha_hora < DATEADD(DAY, 1, CAST(@hasta AS DATE))'); p.hasta = f.hasta; }
  if (f.usuario) { donde.push('b.id_usuario = @usuario'); p.usuario = Number(f.usuario); }
  if (f.modulo) { donde.push('b.modulo = @modulo'); p.modulo = f.modulo; }
  if (f.accion) { donde.push('b.accion = @accion'); p.accion = f.accion; }
  return { donde: donde.length ? 'WHERE ' + donde.join(' AND ') : '', p };
}

const COLUMNAS = `b.id_registro, b.fecha_hora, u.nombre_usuario AS usuario, b.accion, b.modulo,
                  b.tabla_afectada AS tabla, b.id_afectado, b.detalle`;
const DESDE_TABLAS = 'FROM BITACORA_AUDITORIA b JOIN USUARIO u ON u.id_usuario = b.id_usuario';

export async function bitacora(f, pagina = 1, porPagina = 50) {
  const { donde, p } = filtrar(f);
  const total = (await consulta(`SELECT COUNT(*) AS n ${DESDE_TABLAS} ${donde}`, p))[0].n;
  const filas = await consulta(
    `SELECT ${COLUMNAS} ${DESDE_TABLAS} ${donde} ORDER BY b.fecha_hora DESC, b.id_registro DESC
     OFFSET @salto ROWS FETCH NEXT @tam ROWS ONLY`, { ...p, salto: (pagina - 1) * porPagina, tam: porPagina });
  return { total, filas };
}

export async function bitacoraCompleta(f) {
  const { donde, p } = filtrar(f);
  return consulta(`SELECT TOP 50000 ${COLUMNAS} ${DESDE_TABLAS} ${donde} ORDER BY b.fecha_hora DESC, b.id_registro DESC`, p);
}

export async function usuarios() {
  return consulta('SELECT id_usuario AS id, nombre_usuario AS usuario FROM USUARIO ORDER BY nombre_usuario');
}
