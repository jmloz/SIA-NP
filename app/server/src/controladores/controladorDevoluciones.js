// ControladorDevoluciones: CU4 Registrar devolución de cliente (RF7, IE-008).
// La mercancía en buen estado entra al inventario con un movimiento tipo 'D'; la dañada (alterno 7a)
// solo se anota como no disponible y no suma a la existencia. Todo en una transacción (RNF2).
import { ErrorNegocio, enTransaccion } from '../db.js';
import * as Devolucion from '../entidades/devolucion.js';
import * as Bitacora from '../entidades/bitacora.js';

const ESTADOS = ['BUENA', 'DANADA'];
const cant = (n) => Number(Number(n).toFixed(2));

/** Paso 2: lista vacía = alterno 2a (el cliente no existe: darlo de alta o cancelar). */
export function buscarClientes(texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw new ErrorNegocio('Capture el nombre o RFC del cliente.');
  return Devolucion.buscarClientes(t);
}

/** Paso 3: notas de salida del cliente. */
export async function notasDelCliente(idCliente) {
  const c = await Devolucion.clientePorId(Number(idCliente));
  if (!c) throw new ErrorNegocio('El cliente no existe (2a).', 404);
  return Devolucion.notasDelCliente(c.id_cliente);
}

/** Paso 4: productos de la nota con vendida, ya devuelta y disponible para devolver. */
export async function productosDeNota(idNota) {
  const n = await Devolucion.notaPorId(Number(idNota));
  if (!n) throw new ErrorNegocio('No se localizó la nota de salida (3a).', 404);
  return { ...n, productos: await Devolucion.productosDeNota(n.id_nota_salida) };
}

export const recientes = () => Devolucion.recientes();

/** Pasos 5 a 9.
 *  datos: { idCliente, idNotaSalida (null = registro manual, 3a), partidas: [{ idProducto, cantidad, motivo, estado }] } */
export async function registrar(datos, usuario) {
  const cliente = await Devolucion.clientePorId(Number(datos.idCliente));
  if (!cliente || !cliente.activo) throw new ErrorNegocio('Busque y seleccione al cliente (paso 2).');
  if (!Array.isArray(datos.partidas) || datos.partidas.length === 0)
    throw new ErrorNegocio('Seleccione al menos un producto a devolver (paso 4).');

  const idNota = Number(datos.idNotaSalida) || null;
  let nota = null;
  if (idNota) {
    nota = await Devolucion.notaPorId(idNota);
    if (!nota) throw new ErrorNegocio('No se localizó la nota de salida (3a).');
    if (nota.id_cliente !== cliente.id_cliente) throw new ErrorNegocio(`La nota ${nota.folio} no es de ${cliente.nombre}.`);
  } else if (usuario.rol !== 'E') {
    // Alterno 3a: sin documento original solo el Encargado de Almacén puede autorizar el registro manual
    throw new ErrorNegocio('El registro manual sin nota de salida requiere autorización del Encargado de Almacén (3a).', 403);
  }

  // Paso 5: cantidad, motivo y estado por producto (un producto no se repite)
  const partidas = [];
  for (const [i, p] of datos.partidas.entries()) {
    const n = `Producto ${i + 1}`;
    const idProducto = Number(p.idProducto);
    const cantidad = Number(p.cantidad);
    const motivo = String(p.motivo ?? '').trim();
    if (!idProducto) throw new ErrorNegocio(`${n}: falta el producto.`);
    if (partidas.some((x) => x.idProducto === idProducto)) throw new ErrorNegocio(`${n}: el producto está repetido.`);
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new ErrorNegocio(`${n}: la cantidad devuelta debe ser mayor a 0.`);
    if (Math.round(cantidad * 100) !== cantidad * 100) throw new ErrorNegocio(`${n}: la cantidad admite máximo dos decimales.`);
    if (!motivo) throw new ErrorNegocio(`${n}: el motivo de la devolución es obligatorio.`);
    if (motivo.length > 200) throw new ErrorNegocio(`${n}: el motivo admite máximo 200 caracteres.`);
    if (!ESTADOS.includes(p.estado)) throw new ErrorNegocio(`${n}: elija el estado de la mercancía.`);
    const prod = await Devolucion.productoPorId(idProducto);
    if (!prod || !prod.activo) throw new ErrorNegocio(`${n}: el producto no existe o está inactivo.`);
    if (p.estado === 'BUENA' && !prod.id_ubicacion)
      throw new ErrorNegocio(`${prod.codigo_interno}: no tiene ubicación asignada para reingresarlo.`);
    partidas.push({ idProducto, cantidad, motivo, estado: p.estado, prod });
  }

  return enTransaccion(async (tx) => {
    // Paso 6 / alterno 6a: lo devuelto no puede exceder lo vendido menos lo ya devuelto
    if (nota) {
      const enNota = await Devolucion.productosDeNota(nota.id_nota_salida, tx);
      for (const p of partidas) {
        const v = enNota.find((x) => x.id_producto === p.idProducto);
        if (!v) throw new ErrorNegocio(`${p.prod.codigo_interno} no se vendió en la nota ${nota.folio}.`);
        if (p.cantidad > Number(v.disponible))
          throw new ErrorNegocio(`La cantidad devuelta de ${p.prod.codigo_interno} (${cant(p.cantidad)}) excede lo vendido menos lo ya devuelto `
            + `(vendida ${cant(v.vendida)}, devuelta ${cant(v.devuelta)}, disponible ${cant(v.disponible)}) (6a). No se guardó la devolución.`);
      }
    }

    // Paso 8: un folio DEV para toda la devolución
    const folio = await Devolucion.siguienteFolio(tx);
    const documentoRef = nota ? nota.folio : `${folio} manual`;
    const entraron = [], noDisponibles = [];
    for (const p of partidas) {
      let mov = null;
      if (p.estado === 'BUENA') {
        mov = await Devolucion.registrarEntrada({
          idProducto: p.idProducto, idUbicacion: p.prod.id_ubicacion, idUsuario: usuario.id,
          cantidad: p.cantidad, documentoRef, motivo: p.motivo,
        }, tx);
      }
      await Devolucion.crearFila({
        folio, idCliente: cliente.id_cliente, idNotaSalida: nota?.id_nota_salida ?? null, idProducto: p.idProducto,
        cantidad: p.cantidad, estado: p.estado, motivo: p.motivo, autorizadoPor: nota ? null : usuario.id,
        idMovimiento: mov?.idMovimiento ?? null, idUsuario: usuario.id,
      }, tx);
      const fila = { codigo: p.prod.codigo_interno, descripcion: p.prod.descripcion, unidad: p.prod.unidad_medida, cantidad: p.cantidad };
      if (mov) entraron.push({ ...fila, folioMovimiento: mov.folio, saldo: mov.saldo, ubicacion: p.prod.ubicacion });
      else noDisponibles.push(fila);   // 7a: no suma a la existencia
    }

    await Bitacora.registrar({
      idUsuario: usuario.id, accion: 'ALTA', modulo: 'ALMACEN', tabla: 'DEVOLUCION_CLIENTE', idAfectado: folio,
      detalle: `Devolución ${folio} de ${cliente.nombre}, ${nota ? `nota ${nota.folio}` : 'registro manual autorizado'}: `
        + `${entraron.length} producto(s) reingresan, ${noDisponibles.length} dañado(s) no disponible(s)`,
    }, tx);

    return { folio, cliente: cliente.nombre, nota: nota?.folio ?? null, manual: !nota, entraron, noDisponibles };
  });
}
