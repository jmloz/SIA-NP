// ControladorRecepcion: CU6 Recibir mercancía contra orden de compra (RF13).
// Las validaciones de cantidades, las entradas al inventario y el cambio de estado de la OC
// los hace sp_registrar_recepcion en una sola transacción (RNF2).
import { ErrorNegocio } from '../db.js';
import * as Recepcion from '../entidades/recepcion.js';
import * as OrdenDeCompra from '../entidades/ordenDeCompra.js';
import { ESTADOS } from './controladorOrdenCompra.js';

/** Paso 2: busca órdenes abiertas por folio o proveedor (2a: lista vacía → el usuario busca de nuevo). */
export async function buscarOrdenes(texto) {
  const filas = await Recepcion.buscarOrdenesAbiertas(texto?.trim());
  return filas.map((o) => ({ ...o, estado_nombre: ESTADOS[o.estado] }));
}

/** Paso 3: productos con solicitado, recibido y pendiente. */
export async function obtenerOrden(idOc) {
  const o = await OrdenDeCompra.obtener(idOc);
  if (!o) throw new ErrorNegocio('No se localizó la orden de compra (2a).', 404);
  if (!['EMITIDA', 'RECIBIDA_PARCIAL'].includes(o.estado))
    throw new ErrorNegocio(`La orden ${o.folio} está ${ESTADOS[o.estado]}; solo se recibe mercancía de órdenes emitidas o parcialmente recibidas.`);
  const [partidas, recepciones] = await Promise.all([OrdenDeCompra.partidas(idOc), Recepcion.listarPorOrden(idOc)]);
  return { ...o, estado_nombre: ESTADOS[o.estado], partidas, recepciones };
}

export const ubicaciones = () => Recepcion.ubicacionesDisponibles();

/** Pasos 4 a 9. Si lo recibido excede lo solicitado (7a) responde 409 para pedir autorización. */
export async function registrar(idOc, datos, usuario) {
  const numeroFactura = (datos.numero_factura ?? '').trim();
  if (!numeroFactura) throw new ErrorNegocio('Capture el número de factura o remisión del proveedor (paso 5).');
  if (numeroFactura.length > 40) throw new ErrorNegocio('La factura o remisión admite hasta 40 caracteres.');

  const partidas = (datos.partidas ?? [])
    .map((p) => ({
      id_producto: Number(p.id_producto),
      cantidad: Number(p.cantidad) || 0,
      no_conforme: Number(p.no_conforme) || 0,
      id_ubicacion: p.id_ubicacion ? Number(p.id_ubicacion) : null,
    }))
    .filter((p) => p.cantidad !== 0 || p.no_conforme !== 0);
  if (!partidas.length) throw new ErrorNegocio('Capture al menos una cantidad recibida.');

  let folio;
  try {
    folio = await Recepcion.registrar({
      idOc, idUsuario: usuario.id, numeroFactura,
      observaciones: (datos.observaciones ?? '').trim().slice(0, 250),
      partidas, autorizarExcedente: Boolean(datos.autorizar_excedente),
    });
  } catch (e) {
    const num = e.number ?? e.originalError?.info?.number;
    if (num === 50016) throw new ErrorNegocio(e.message, 409); // 7a: requiere autorización
    throw e;
  }
  const o = await OrdenDeCompra.obtener(idOc);
  return { folio, folio_oc: o.folio, estado: o.estado, estado_nombre: ESTADOS[o.estado] };
}
