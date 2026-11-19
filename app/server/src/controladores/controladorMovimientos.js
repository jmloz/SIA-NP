// ControladorMovimientos (diagrama de clases): CU1 Registrar movimientos (RF3, RF9)
// y la nota de salida con varias partidas (RF8). Habla con las entidades, nunca con la interfaz.
import { ErrorNegocio, enTransaccion } from '../db.js';
import * as Movimiento from '../entidades/movimiento.js';
import * as NotaSalida from '../entidades/notaSalida.js';
import * as Bitacora from '../entidades/bitacora.js';

const TIPOS = { E: 'Entrada', S: 'Salida', A: 'Ajuste', D: 'Devolución' };

/** Paso 4: busca por código interno o de barras exacto (escáner); si no, por descripción o familia.
 *  Devuelve una lista; vacía = alterno 4a (producto no existe). */
export async function buscarProducto(texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw new ErrorNegocio('Capture el código, código de barras o descripción del producto.');
  const exacto = await Movimiento.productoPorCodigo(t);
  if (exacto) return [exacto];
  return Movimiento.buscarProductos(t);
}

export async function datosCaptura() {
  const [ubicaciones, clientes] = await Promise.all([Movimiento.ubicacionesDisponibles(), Movimiento.clientesActivos()]);
  return { ubicaciones, clientes };
}

/** Paso 8 (alterno 8b): revisa los campos obligatorios. Devuelve { campo: mensaje } (vacío si todo bien). */
export function validarMovimiento(d) {
  const e = {};
  const tipo = d.tipo;
  const cantidad = Number(d.cantidad);
  if (!TIPOS[tipo]) e.tipo = 'Elija el tipo de movimiento.';
  if (!Number(d.idProducto)) e.producto = 'Busque y seleccione el producto.';
  if (!Number(d.idUbicacion)) e.ubicacion = 'Elija la ubicación.';
  if (d.cantidad === '' || d.cantidad == null || !Number.isFinite(cantidad)) e.cantidad = 'Capture la cantidad.';
  else if (tipo === 'A' ? cantidad === 0 : cantidad <= 0) e.cantidad = tipo === 'A' ? 'La cantidad del ajuste no puede ser 0.' : 'La cantidad debe ser mayor a 0.';
  else if (Math.round(cantidad * 100) !== cantidad * 100 || Math.abs(cantidad) >= 1e8) e.cantidad = 'La cantidad admite máximo dos decimales.';
  const doc = String(d.documentoRef ?? '').trim();
  const motivo = String(d.motivo ?? '').trim();
  if ((tipo === 'E' || tipo === 'S') && !doc) e.documentoRef = 'El documento de referencia es obligatorio en entradas y salidas.';
  if (doc.length > 50) e.documentoRef = 'El documento admite máximo 50 caracteres.';
  if ((tipo === 'A' || tipo === 'D') && !motivo) e.motivo = 'El motivo es obligatorio en ajustes y devoluciones.';
  if (motivo.length > 200) e.motivo = 'El motivo admite máximo 200 caracteres.';
  return e;
}

/** Pasos 8–10: valida, registra (sp_registrar_movimiento actualiza existencia, kardex y bitácora)
 *  y devuelve el folio y el saldo resultante. */
export async function registrarMovimiento(d, usuario) {
  const errores = validarMovimiento(d);
  if (Object.keys(errores).length) throw new ErrorNegocio(Object.values(errores)[0]);
  const producto = await Movimiento.productoPorId(Number(d.idProducto));
  if (!producto) throw new ErrorNegocio('El producto no existe en el catálogo.');
  const ubic = await Movimiento.ubicacionPorId(Number(d.idUbicacion));
  if (!ubic || !ubic.disponible) throw new ErrorNegocio('La ubicación no existe o no está disponible.');

  const res = await Movimiento.registrar({
    tipo: d.tipo, idProducto: producto.id_producto, idUbicacion: ubic.id_ubicacion, idUsuario: usuario.id,
    cantidad: Number(d.cantidad),
    documentoRef: String(d.documentoRef ?? '').trim() || null,
    motivo: String(d.motivo ?? '').trim() || null,
  });
  return { ...res, tipo: TIPOS[d.tipo], producto: producto.codigo_interno, unidad: producto.unidad_medida };
}

/** RF8: nota de salida con varias partidas, todo o nada (RNF2).
 *  datos: { idCliente, observaciones, partidas: [{ idProducto, cantidad }] } */
export async function registrarNotaSalida(datos, usuario) {
  const obs = String(datos.observaciones ?? '').trim();
  if (obs.length > 250) throw new ErrorNegocio('Las observaciones admiten máximo 250 caracteres.');
  if (!Array.isArray(datos.partidas) || datos.partidas.length === 0) throw new ErrorNegocio('Agregue al menos una partida.');

  // Junta partidas repetidas del mismo producto
  const porProducto = new Map();
  for (const p of datos.partidas) {
    const id = Number(p.idProducto), cant = Number(p.cantidad);
    if (!id) throw new ErrorNegocio('Hay una partida sin producto.');
    if (!Number.isFinite(cant) || cant <= 0) throw new ErrorNegocio('Todas las cantidades deben ser mayores a 0.');
    porProducto.set(id, (porProducto.get(id) ?? 0) + cant);
  }
  const partidas = [];
  for (const [id, cantidad] of porProducto) {
    const prod = await Movimiento.productoPorId(id);
    if (!prod) throw new ErrorNegocio('Uno de los productos no existe en el catálogo.');
    if (!prod.id_ubicacion) throw new ErrorNegocio(`El producto ${prod.codigo_interno} no tiene ubicación asignada.`);
    partidas.push({ prod, cantidad });
  }
  const clientes = await Movimiento.clientesActivos();
  const idCliente = Number(datos.idCliente) || clientes[0]?.id_cliente || null;
  if (idCliente && !clientes.some((c) => c.id_cliente === idCliente)) throw new ErrorNegocio('El cliente no existe o está inactivo.');

  return enTransaccion(async (tx) => {
    const folio = await NotaSalida.siguienteFolio(tx);
    const idNota = await NotaSalida.crear({ folio, idCliente, idUsuario: usuario.id, observaciones: obs }, tx);
    const movimientos = [];
    for (const [i, { prod, cantidad }] of partidas.entries()) {
      try {
        movimientos.push(await Movimiento.registrar({
          tipo: 'S', idProducto: prod.id_producto, idUbicacion: prod.id_ubicacion, idUsuario: usuario.id,
          cantidad, documentoRef: folio, idNotaSalida: idNota,
        }, tx));
      } catch (e) {
        // Al fallar una partida se revierte toda la nota (enTransaccion hace rollback)
        throw new ErrorNegocio(`Partida ${i + 1} (${prod.codigo_interno}): ${e.message.replace(' No se guardó el movimiento.', '')} No se guardó la nota.`);
      }
    }
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'ALTA', modulo: 'ALMACEN', tabla: 'NOTA_SALIDA',
      idAfectado: folio, detalle: `Nota de salida ${folio} con ${partidas.length} partida(s)` }, tx);
    return { id: idNota, folio, movimientos };
  });
}

export function notasRecientes() {
  return NotaSalida.recientes();
}
