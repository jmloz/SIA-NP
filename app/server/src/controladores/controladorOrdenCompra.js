// ControladorOrdenCompra: CU5 Generar orden de compra (RF12), estados de la OC (entregable 6),
// sugerencias de reorden (RF14, S7) y documento corporativo S2.
import PDFDocument from 'pdfkit';
import { enTransaccion, ErrorNegocio } from '../db.js';
import * as OrdenDeCompra from '../entidades/ordenDeCompra.js';
import * as Recepcion from '../entidades/recepcion.js';
import * as Bitacora from '../entidades/bitacora.js';

export const ESTADOS = {
  PENDIENTE: 'Pendiente (borrador)',
  EMITIDA: 'Emitida',
  RECIBIDA_PARCIAL: 'Parcialmente recibida',
  RECIBIDA_TOTAL: 'Recibida',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

/** Un borrador guardado sin emitir lleva un folio provisional BOR-n (7a: sin folio definitivo). */
const esFolioProvisional = (folio) => folio.startsWith('BOR-');

function conFolioVisible(o) {
  return { ...o, borrador: esFolioProvisional(o.folio), estado_nombre: ESTADOS[o.estado] };
}

/* ---------------- Consultas ---------------- */

export async function listar(filtros) {
  const filas = await OrdenDeCompra.listar({ estado: filtros.estado, texto: filtros.q?.trim() });
  return filas.map(conFolioVisible);
}

export async function obtener(idOc) {
  const o = await OrdenDeCompra.obtener(idOc);
  if (!o) throw new ErrorNegocio('La orden de compra no existe.', 404);
  const [partidas, recepciones] = await Promise.all([OrdenDeCompra.partidas(idOc), Recepcion.listarPorOrden(idOc)]);
  return { ...conFolioVisible(o), partidas, recepciones };
}

/** Datos del formulario IE-006: fecha actual (paso 2) y proveedores activos (paso 3). */
export async function formulario() {
  const [hoy, proveedores] = await Promise.all([OrdenDeCompra.hoy(), OrdenDeCompra.proveedoresActivos()]);
  return { hoy, proveedores };
}
export const productos = (idProveedor) => OrdenDeCompra.productosParaProveedor(idProveedor ? Number(idProveedor) : null);
export const sugerenciasReorden = (idProveedor) => OrdenDeCompra.bajoReorden(idProveedor ? Number(idProveedor) : null);

/* ---------------- CU5: guardar borrador / emitir ---------------- */

/** Valida el formulario de la orden (pasos 3 a 6) y devuelve los datos limpios. */
async function validar(datos, tx) {
  const idProveedor = Number(datos.id_proveedor);
  if (!idProveedor) throw new ErrorNegocio('Seleccione el proveedor.');
  const prov = await OrdenDeCompra.proveedor(idProveedor, tx);
  if (!prov || !prov.activo) throw new ErrorNegocio('El proveedor no existe o está inactivo; dé de alta al proveedor (3a).');

  const partidas = (datos.partidas ?? []).map((p) => ({
    id_producto: Number(p.id_producto),
    cantidad: Number(p.cantidad),
    costo_unitario: Number(p.costo_unitario),
  }));
  if (!partidas.length) throw new ErrorNegocio('Agregue al menos un producto a la orden.');
  const vistos = new Set();
  for (const p of partidas) {
    if (!p.id_producto) throw new ErrorNegocio('Hay una partida sin producto.');
    if (vistos.has(p.id_producto)) throw new ErrorNegocio('Un producto no puede repetirse en la orden.');
    vistos.add(p.id_producto);
    if (!(p.cantidad > 0)) throw new ErrorNegocio('La cantidad de cada producto debe ser mayor a 0.');
    if (!(p.costo_unitario >= 0) || Number.isNaN(p.costo_unitario)) throw new ErrorNegocio('El costo unitario no puede ser negativo.');
  }
  const activos = await OrdenDeCompra.productosActivos([...vistos], tx);
  if (activos.length !== vistos.size) throw new ErrorNegocio('Hay productos que no existen o están inactivos.');

  const hoy = await OrdenDeCompra.hoy();
  const fechaEntrega = datos.fecha_entrega_estimada || null;
  if (fechaEntrega && !/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) throw new ErrorNegocio('Fecha de entrega no válida.');
  if (fechaEntrega && fechaEntrega < hoy) throw new ErrorNegocio('La fecha de entrega estimada no puede ser anterior a la emisión.');

  const observaciones = (datos.observaciones ?? '').trim().slice(0, 250) || null;
  // Paso 5: subtotal = suma de importes; el IVA (16 %) y el total los calcula la BD.
  const subtotal = Math.round(partidas.reduce((s, p) => s + Math.round(p.cantidad * p.costo_unitario * 100) / 100, 0) * 100) / 100;
  return { idProveedor, prov, partidas, fechaEntrega, observaciones, subtotal };
}

/** Asigna folio definitivo (paso 8) y deja la orden Emitida. */
async function emitirEnTx(idOc, folioActual, usuario, tx) {
  let folio = folioActual;
  if (esFolioProvisional(folio)) {
    const output = { folio: await OrdenDeCompra.siguienteFolio(tx) };
    folio = output.folio;
  }
  await OrdenDeCompra.cambiarEstado(idOc, 'EMITIDA', { folio, renovarFecha: true }, tx);
  await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'COMPRAS', tabla: 'ORDEN_COMPRA',
    idAfectado: folio, detalle: `Orden ${folio}: PENDIENTE -> EMITIDA` }, tx);
  return folio;
}

/** Crea o actualiza (si idOc) una orden en borrador; si emitir = true, además la emite. */
export async function guardar(idOc, datos, usuario, emitir) {
  return enTransaccion(async (tx) => {
    const v = await validar(datos, tx);
    let folio;
    if (idOc) {
      const o = await OrdenDeCompra.obtener(idOc, tx);
      if (!o) throw new ErrorNegocio('La orden de compra no existe.', 404);
      if (o.estado !== 'PENDIENTE') throw new ErrorNegocio(`Solo se edita una orden en borrador; esta está ${ESTADOS[o.estado]}.`);
      await OrdenDeCompra.actualizar(idOc, v, tx);
      await OrdenDeCompra.borrarPartidas(idOc, tx);
      folio = o.folio;
      await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'COMPRAS', tabla: 'ORDEN_COMPRA',
        idAfectado: folio, detalle: `Edición del borrador (${v.partidas.length} partidas, subtotal ${v.subtotal})` }, tx);
    } else {
      // Folio provisional único mientras se conoce el id; luego queda BOR-<id>
      idOc = await OrdenDeCompra.crear({ ...v, folio: 'BOR-T' + Date.now().toString(36), idUsuario: usuario.id }, tx);
      folio = `BOR-${idOc}`;
      await OrdenDeCompra.cambiarFolio(idOc, folio, tx);
      await Bitacora.registrar({ idUsuario: usuario.id, accion: 'ALTA', modulo: 'COMPRAS', tabla: 'ORDEN_COMPRA',
        idAfectado: folio, detalle: `Borrador para ${v.prov.razon_social} (${v.partidas.length} partidas, subtotal ${v.subtotal})` }, tx);
    }
    for (const p of v.partidas) await OrdenDeCompra.agregarPartida(idOc, p, tx);
    if (emitir) folio = await emitirEnTx(idOc, folio, usuario, tx);
    return { id_oc: idOc, folio, estado: emitir ? 'EMITIDA' : 'PENDIENTE' };
  });
}

/* ---------------- Cambios de estado (diagrama de estados) ---------------- */

export async function emitir(idOc, usuario) {
  return enTransaccion(async (tx) => {
    const o = await OrdenDeCompra.obtener(idOc, tx);
    if (!o) throw new ErrorNegocio('La orden de compra no existe.', 404);
    if (o.estado !== 'PENDIENTE') throw new ErrorNegocio(`Solo se emite una orden en borrador; esta está ${ESTADOS[o.estado]}.`);
    const partidas = await OrdenDeCompra.partidas(idOc, tx);
    if (!partidas.length) throw new ErrorNegocio('La orden no tiene productos.');
    const hoy = await OrdenDeCompra.hoy();
    const entrega = o.fecha_entrega_estimada?.toISOString().slice(0, 10);
    if (entrega && entrega < hoy) throw new ErrorNegocio('La fecha de entrega estimada ya pasó; edite el borrador antes de emitirlo.');
    const folio = await emitirEnTx(idOc, o.folio, usuario, tx);
    return { id_oc: idOc, folio, estado: 'EMITIDA' };
  });
}

/** Transiciones permitidas: Cancelar desde PENDIENTE/EMITIDA; Cerrar desde RECIBIDA_TOTAL. */
const TRANSICIONES = {
  cancelar: { desde: ['PENDIENTE', 'EMITIDA'], hacia: 'CANCELADA', texto: 'cancelar' },
  cerrar: { desde: ['RECIBIDA_TOTAL'], hacia: 'CERRADA', texto: 'cerrar' },
};

export async function cambiarEstado(idOc, accion, usuario, motivo) {
  const t = TRANSICIONES[accion];
  return enTransaccion(async (tx) => {
    const o = await OrdenDeCompra.obtener(idOc, tx);
    if (!o) throw new ErrorNegocio('La orden de compra no existe.', 404);
    if (!t.desde.includes(o.estado))
      throw new ErrorNegocio(`No se puede ${t.texto} una orden en estado ${ESTADOS[o.estado]}; solo desde ${t.desde.map((e) => ESTADOS[e]).join(' o ')}.`);
    await OrdenDeCompra.cambiarEstado(idOc, t.hacia, {}, tx);
    const extra = motivo?.trim() ? ` (${motivo.trim()})` : '';
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'COMPRAS', tabla: 'ORDEN_COMPRA',
      idAfectado: o.folio, detalle: `Orden ${o.folio}: ${o.estado} -> ${t.hacia}${extra}` }, tx);
    return { id_oc: idOc, folio: o.folio, estado: t.hacia };
  });
}

/* ---------------- S2: documento corporativo en PDF ---------------- */

const dinero = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const cantidad = (n) => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });
const fecha = (f) => (f ? new Date(f).toLocaleDateString('es-MX', { timeZone: 'UTC' }) : '—');

export async function documentoPDF(idOc) {
  const o = await obtener(idOc);
  const doc = new PDFDocument({ size: 'LETTER', margin: 50, info: { Title: `Orden de compra ${o.folio}` } });
  const partes = [];
  doc.on('data', (c) => partes.push(c));
  const fin = new Promise((ok) => doc.on('end', ok));

  const izq = 50, ancho = doc.page.width - 100;
  doc.fillColor('black').strokeColor('black');

  // Encabezado corporativo
  doc.font('Helvetica-Bold').fontSize(14).text('SIA-NP · Neumática del Pacífico', izq, 50);
  doc.font('Helvetica').fontSize(9).text('Sistema de Inventario y Almacén · Hermosillo, Sonora', izq, 68);
  doc.font('Helvetica-Bold').fontSize(16).text('ORDEN DE COMPRA', izq, 50, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(10)
    .text(`Folio: ${o.borrador ? 'BORRADOR (sin folio)' : o.folio}`, izq, 70, { width: ancho, align: 'right' })
    .text(`Estado: ${o.estado_nombre}`, izq, 83, { width: ancho, align: 'right' });
  doc.moveTo(izq, 100).lineTo(izq + ancho, 100).lineWidth(1).stroke();

  // Datos generales en dos columnas
  const col = ancho / 2;
  let y = 110;
  const renglon = (x, etiqueta, valor) => {
    doc.font('Helvetica-Bold').fontSize(9.5).text(etiqueta, x, y, { continued: true }).font('Helvetica').text(' ' + (valor ?? '—'));
  };
  const filasIzq = [
    ['Fecha de emisión:', fecha(o.fecha_emision)],
    ['Proveedor:', o.proveedor],
    ['RFC:', o.rfc],
    ['Contacto:', [o.nombre_contacto, o.telefono, o.correo].filter(Boolean).join(' · ') || '—'],
  ];
  const filasDer = [
    ['Entrega estimada:', fecha(o.fecha_entrega_estimada)],
    ['Clasificación:', `${o.clasificacion} · lead time ${o.lead_time_dias} días`],
    ['Moneda:', 'MXN'],
    ['Entregar en:', 'Almacén Hermosillo'],
  ];
  for (let i = 0; i < 4; i++) {
    renglon(izq, ...filasIzq[i]);
    renglon(izq + col + 10, ...filasDer[i]);
    y += 16;
  }

  // Tabla de partidas
  y += 8;
  const cols = [
    { t: 'Código', w: 85, a: 'left' }, { t: 'Descripción', w: 205, a: 'left' }, { t: 'Cantidad', w: 60, a: 'right' },
    { t: 'U.M.', w: 35, a: 'left' }, { t: 'Costo unitario', w: 64, a: 'right' }, { t: 'Importe', w: ancho - 449, a: 'right' },
  ];
  const fila = (valores, negrita, gris) => {
    const alto = Math.max(18, ...valores.map((v, i) => doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .heightOfString(String(v), { width: cols[i].w - 8 }) + 8));
    if (y + alto > doc.page.height - 90) { doc.addPage(); y = 50; }
    if (gris) doc.rect(izq, y, ancho, alto).fillColor('#E6E6E6').fill().fillColor('black');
    let x = izq;
    valores.forEach((v, i) => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(String(v), x + 4, y + 4, { width: cols[i].w - 8, align: cols[i].a });
      x += cols[i].w;
    });
    doc.rect(izq, y, ancho, alto).lineWidth(0.5).stroke();
    y += alto;
  };
  fila(cols.map((c) => c.t), true, true);
  for (const p of o.partidas)
    fila([p.codigo_interno, p.descripcion, cantidad(p.cantidad_solicitada), p.unidad_medida, dinero(p.costo_unitario), dinero(p.importe)]);

  // Totales
  const totales = [['Subtotal', o.subtotal], ['IVA 16%', o.iva], ['Total', o.total]];
  for (const [t, v] of totales) {
    const x = izq + ancho - 200;
    doc.rect(x, y, 200, 18).lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(9.5).text(t, x + 4, y + 5, { width: 90 });
    doc.font(t === 'Total' ? 'Helvetica-Bold' : 'Helvetica').text(dinero(v), x + 96, y + 5, { width: 100, align: 'right' });
    y += 18;
  }

  // Condiciones y firma
  y += 16;
  doc.font('Helvetica-Bold').fontSize(9.5).text('Condiciones de entrega y pago / observaciones:', izq, y);
  doc.font('Helvetica').fontSize(9.5).text(o.observaciones || 'Sin observaciones.', izq, doc.y + 2, { width: ancho });
  y = Math.max(doc.y + 50, y + 70);
  if (y > doc.page.height - 80) { doc.addPage(); y = 100; }
  doc.moveTo(izq, y).lineTo(izq + 220, y).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(9).text(`Autoriza (Compras): ${o.elaboro}`, izq, y + 4, { width: 260 });
  doc.text('Nombre y firma', izq, y + 16);

  doc.end();
  await fin;
  return { nombre: `${o.borrador ? 'Borrador-' + o.id_oc : o.folio}.pdf`, buffer: Buffer.concat(partes) };
}
