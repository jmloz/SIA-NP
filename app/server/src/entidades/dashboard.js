// Entidad DashboardEjecutivo (CU7 / S9): consultas agregadas para los KPIs.
// "dias" = tamaño del periodo (7 semanal, 30 mensual). El periodo termina hoy.
import { consulta } from '../db.js';

const DESDE = 'CAST(DATEADD(DAY, -(@dias - 1), SYSDATETIME()) AS DATE)';
// Entrada = E, D o ajuste positivo; salida = S o ajuste negativo (igual que vw_KARDEX).
const ES_ENTRADA = "(m.tipo IN ('E','D') OR (m.tipo = 'A' AND m.cantidad > 0))";
const ES_SALIDA = "(m.tipo = 'S' OR (m.tipo = 'A' AND m.cantidad < 0))";

/** Fecha de hoy según el servidor de BD (YYYY-MM-DD), para que coincida con los movimientos. */
export async function hoy() {
  return (await consulta("SELECT CONVERT(VARCHAR(10), CAST(SYSDATETIME() AS DATE), 23) AS hoy"))[0].hoy;
}

export async function valorPorFamilia() {
  return consulta('SELECT familia, productos, unidades, valor_inventario AS valor FROM vw_VALOR_INVENTARIO ORDER BY valor_inventario DESC');
}

export async function productosBajoReorden() {
  return consulta('SELECT codigo_interno AS codigo, descripcion, familia, existencia, punto_reorden, cantidad_sugerida FROM vw_PRODUCTOS_BAJO_REORDEN ORDER BY familia, codigo_interno');
}

export async function movimientosDelPeriodo(dias) {
  const r = await consulta(
    `SELECT
       ISNULL(SUM(CASE WHEN ${ES_ENTRADA} THEN ABS(m.cantidad) END), 0) AS unidades_entrada,
       SUM(CASE WHEN ${ES_ENTRADA} THEN 1 ELSE 0 END)                   AS mov_entrada,
       ISNULL(SUM(CASE WHEN ${ES_SALIDA}  THEN ABS(m.cantidad) END), 0) AS unidades_salida,
       SUM(CASE WHEN ${ES_SALIDA}  THEN 1 ELSE 0 END)                   AS mov_salida
     FROM MOVIMIENTO m WHERE m.fecha >= ${DESDE}`, { dias });
  const x = r[0];
  return {
    unidadesEntrada: Number(x.unidades_entrada), movEntrada: x.mov_entrada ?? 0,
    unidadesSalida: Number(x.unidades_salida), movSalida: x.mov_salida ?? 0,
  };
}

/** Entradas y salidas (unidades) por día del periodo. */
export async function movimientosPorDia(dias) {
  return consulta(
    `SELECT CONVERT(VARCHAR(10), CAST(m.fecha AS DATE), 23) AS dia,
            ISNULL(SUM(CASE WHEN ${ES_ENTRADA} THEN ABS(m.cantidad) END), 0) AS entradas,
            ISNULL(SUM(CASE WHEN ${ES_SALIDA}  THEN ABS(m.cantidad) END), 0) AS salidas
     FROM MOVIMIENTO m WHERE m.fecha >= ${DESDE}
     GROUP BY CAST(m.fecha AS DATE) ORDER BY 1`, { dias });
}

/** Detalle de movimientos del periodo: tipoMov = 'entradas' | 'salidas'. */
export async function detalleMovimientos(dias, tipoMov) {
  const cond = tipoMov === 'entradas' ? ES_ENTRADA : ES_SALIDA;
  return consulta(
    `SELECT TOP 200 m.fecha, m.folio, p.codigo_interno AS codigo, p.descripcion, ABS(m.cantidad) AS cantidad,
            m.documento_ref AS documento, u.nombre_usuario AS usuario
     FROM MOVIMIENTO m JOIN PRODUCTO p ON p.id_producto = m.id_producto JOIN USUARIO u ON u.id_usuario = m.id_usuario
     WHERE m.fecha >= ${DESDE} AND ${cond} ORDER BY m.fecha DESC, m.id_movimiento DESC`, { dias });
}

const ABIERTAS = "('PENDIENTE','EMITIDA','RECIBIDA_PARCIAL')";

export async function ordenesAbiertasResumen() {
  const r = await consulta(`SELECT COUNT(*) AS cantidad, ISNULL(SUM(total), 0) AS monto FROM ORDEN_COMPRA WHERE estado IN ${ABIERTAS}`);
  return { cantidad: r[0].cantidad, monto: Number(r[0].monto) };
}

export async function ordenesAbiertas() {
  return consulta(
    `SELECT oc.folio, pr.razon_social AS proveedor, oc.estado, oc.fecha_emision, oc.fecha_entrega_estimada AS entrega, oc.total
     FROM ORDEN_COMPRA oc JOIN PROVEEDOR pr ON pr.id_proveedor = oc.id_proveedor
     WHERE oc.estado IN ${ABIERTAS} ORDER BY oc.fecha_emision DESC, oc.id_oc DESC`);
}

/** Último inventario físico capturado o ajustado, con su % de productos con diferencia. */
export async function ultimoInventarioFisico() {
  const c = await consulta(
    `SELECT TOP 1 id_conteo, folio, fecha FROM INVENTARIO_FISICO
     WHERE estado IN ('CAPTURADO','AJUSTADO') ORDER BY fecha DESC, id_conteo DESC`);
  if (!c.length) return null;
  const r = await consulta(
    `SELECT COUNT(*) AS productos, SUM(CASE WHEN diferencia <> 0 THEN 1 ELSE 0 END) AS con_diferencia,
            ISNULL(SUM(ABS(diferencia)), 0) AS unidades_diferencia
     FROM DETALLE_CONTEO WHERE id_conteo = @id`, { id: c[0].id_conteo });
  const x = r[0];
  const productos = x.productos, con = x.con_diferencia ?? 0;
  return {
    id: c[0].id_conteo, folio: c[0].folio, fecha: c[0].fecha, productos, conDiferencia: con,
    unidadesDiferencia: Number(x.unidades_diferencia),
    porcentaje: productos ? Math.round((con / productos) * 1000) / 10 : 0,
  };
}

export async function detalleConteo(idConteo) {
  return consulta(
    `SELECT p.codigo_interno AS codigo, p.descripcion, d.existencia_sistema AS sistema, d.cantidad_contada AS contado, d.diferencia
     FROM DETALLE_CONTEO d JOIN PRODUCTO p ON p.id_producto = d.id_producto
     WHERE d.id_conteo = @id AND d.diferencia <> 0 ORDER BY ABS(d.diferencia) DESC`, { id: idConteo });
}
