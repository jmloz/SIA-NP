// Entidad Recepcion (CU6, RF13) y las consultas de órdenes abiertas y ubicaciones que usa.
import { consulta, procedimiento, sql } from '../db.js';

/** Órdenes que pueden recibir mercancía (EMITIDA o RECIBIDA_PARCIAL), por folio o proveedor. */
export async function buscarOrdenesAbiertas(texto = null) {
  return consulta(
    `SELECT o.id_oc, o.folio, o.estado, o.fecha_emision, o.fecha_entrega_estimada, o.total,
            p.razon_social AS proveedor
       FROM ORDEN_COMPRA o JOIN PROVEEDOR p ON p.id_proveedor = o.id_proveedor
      WHERE o.estado IN ('EMITIDA','RECIBIDA_PARCIAL')
        AND (@texto IS NULL OR o.folio LIKE @like OR p.razon_social LIKE @like)
      ORDER BY o.folio`,
    { texto: texto || null, like: `%${texto ?? ''}%` });
}

/** Recepciones hechas a una orden. */
export async function listarPorOrden(idOc) {
  return consulta(
    `SELECT r.id_recepcion, r.folio, r.fecha_recepcion, r.numero_factura, r.tipo_recepcion, r.observaciones,
            u.nombre_completo AS recibio
       FROM RECEPCION r JOIN USUARIO u ON u.id_usuario = r.id_usuario
      WHERE r.id_oc = @id
      ORDER BY r.id_recepcion`, { id: idOc });
}

export async function ubicacionesDisponibles() {
  return consulta(`SELECT id_ubicacion, clave, descripcion FROM UBICACION WHERE disponible = 1 ORDER BY clave`);
}

/** Llama a sp_registrar_recepcion: valida, registra las entradas y cambia el estado de la OC. Devuelve el folio REC. */
export async function registrar({ idOc, idUsuario, numeroFactura, observaciones, partidas, autorizarExcedente }) {
  const { output } = await procedimiento('sp_registrar_recepcion', {
    id_oc: idOc,
    id_usuario: idUsuario,
    numero_factura: numeroFactura,
    observaciones: observaciones || null,
    partidas: JSON.stringify(partidas),
    autorizar_excedente: autorizarExcedente ? 1 : 0,
  }, { folio: sql.VarChar(20) });
  return output.folio;
}
