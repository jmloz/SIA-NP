// Entidad BitacoraDeAuditoria (RF19): toda alta, modificación, baja, movimiento y acceso deja huella.
import { consulta } from '../db.js';

/** accion: ALTA | MODIFICACION | BAJA | MOVIMIENTO | ACCESO | CIERRE_SESION
 *  modulo: SEGURIDAD | CATALOGOS | ALMACEN | COMPRAS | DIRECCION */
export async function registrar({ idUsuario, accion, modulo, tabla = null, idAfectado = null, detalle = null }, tx = null) {
  await consulta(
    `INSERT INTO BITACORA_AUDITORIA (id_usuario, accion, modulo, tabla_afectada, id_afectado, detalle)
     VALUES (@u, @a, @m, @t, @i, @d)`,
    { u: idUsuario, a: accion, m: modulo, t: tabla, i: idAfectado == null ? null : String(idAfectado), d: detalle?.slice(0, 300) ?? null },
    tx,
  );
}
