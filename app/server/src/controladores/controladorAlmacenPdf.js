// Documentos impresos del almacén: S1 Nota de salida y S3 Orden de surtido (RF8).
// pdfkit, Helvetica, todo en negro.
import PDFDocument from 'pdfkit';
import { ErrorNegocio } from '../db.js';
import * as NotaSalida from '../entidades/notaSalida.js';

const num = (n, d = 2) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
const dinero = (n) => '$' + num(n);
const fechaHora = (f) => {
  const s = new Date(f).toISOString();
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}   Hora: ${s.slice(11, 16)}`;
};
const cant = (n) => (Number(n) % 1 === 0 ? String(Number(n)) : num(n));

function nuevoDoc() {
  return new PDFDocument({ size: 'LETTER', margin: 50 });
}

function aBuffer(doc) {
  return new Promise((resolve) => {
    const partes = [];
    doc.on('data', (b) => partes.push(b));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.end();
  });
}

function encabezado(doc, titulo, folio) {
  doc.fillColor('black').font('Helvetica-Bold').fontSize(14).text('SIA-NP · Neumática del Pacífico', 50, 50);
  doc.font('Helvetica').fontSize(9).text('Sistema de Inventario y Almacén', 50, 68);
  doc.font('Helvetica-Bold').fontSize(16).text(titulo, 300, 48, { width: 262, align: 'right' });
  doc.font('Helvetica').fontSize(11).text(`Folio: ${folio}`, 300, 68, { width: 262, align: 'right' });
  doc.moveTo(50, 88).lineTo(562, 88).lineWidth(1).stroke('black');
  doc.y = 100;
}

/** Dibuja una tabla con bordes negros y encabezado gris claro. cols: [{ t, w, a }] */
function tabla(doc, cols, filas) {
  const x0 = 50;
  let y = doc.y;
  const dibujarFila = (celdas, negrita, fondo) => {
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
    const alto = Math.max(20, ...celdas.map((c, i) => doc.heightOfString(String(c), { width: cols[i].w - 8 }) + 10));
    if (y + alto > 720) { doc.addPage(); y = 50; }
    let x = x0;
    celdas.forEach((c, i) => {
      if (fondo) doc.rect(x, y, cols[i].w, alto).fill('#E6E6E6');
      doc.rect(x, y, cols[i].w, alto).lineWidth(0.7).stroke('black');
      doc.fillColor('black').text(String(c), x + 4, y + 5, { width: cols[i].w - 8, align: cols[i].a || 'left' });
      x += cols[i].w;
    });
    y += alto;
  };
  dibujarFila(cols.map((c) => c.t), true, true);
  filas.forEach((f) => dibujarFila(f, false, false));
  doc.y = y + 10;
}

function firmas(doc, izq, der) {
  let y = Math.max(doc.y + 40, 600);
  if (y > 700) { doc.addPage(); y = 120; }
  doc.font('Helvetica').fontSize(9.5).fillColor('black');
  doc.moveTo(60, y).lineTo(280, y).stroke('black');
  doc.moveTo(330, y).lineTo(550, y).stroke('black');
  doc.text(izq, 60, y + 4, { width: 220, align: 'center' });
  doc.text(der, 330, y + 4, { width: 220, align: 'center' });
}

async function cargar(id) {
  const n = Number.isInteger(Number(id)) && Number(id) > 0 ? await NotaSalida.obtener(Number(id)) : null;
  if (!n) throw new ErrorNegocio('La nota de salida no existe.', 404);
  return n;
}

/** S1 Nota de salida: folio, fecha, cliente, partidas con precio de venta e importe, total. */
export async function pdfNotaSalida(id) {
  const n = await cargar(id);
  const doc = nuevoDoc();
  encabezado(doc, 'NOTA DE SALIDA', n.folio);
  doc.font('Helvetica').fontSize(10).fillColor('black');
  doc.text(`Fecha: ${fechaHora(n.fecha)}`, 50, doc.y);
  doc.text(`Cliente: ${n.cliente ?? 'Público en general'}${n.rfc ? `    RFC: ${n.rfc}` : ''}`);
  doc.text(`Atendió (almacén): ${n.usuario}`);
  doc.moveDown(0.8);
  const total = n.partidas.reduce((s, p) => s + Number(p.importe), 0);
  tabla(doc, [
    { t: 'Código', w: 80 }, { t: 'Descripción', w: 180 }, { t: 'Cantidad', w: 55, a: 'right' },
    { t: 'Unidad', w: 45 }, { t: 'Precio venta', w: 75, a: 'right' }, { t: 'Importe', w: 77, a: 'right' },
  ], [
    ...n.partidas.map((p) => [p.codigo_interno, p.descripcion, cant(p.cantidad), p.unidad_medida.toLowerCase(), dinero(p.precio_venta), dinero(p.importe)]),
  ]);
  doc.font('Helvetica-Bold').fontSize(11).text(`Total: ${dinero(total)}`, 50, doc.y, { width: 512, align: 'right' });
  if (n.observaciones) doc.moveDown(0.8).font('Helvetica').fontSize(10).text(`Observaciones: ${n.observaciones}`, 50);
  firmas(doc, 'Entregó (almacén) · Nombre y firma', 'Recibió (cliente) · Nombre, firma y sello');
  return { nombre: `${n.folio}.pdf`, buffer: await aBuffer(doc) };
}

/** S3 Orden de surtido: partidas ordenadas por ubicación para el recorrido del surtidor. */
export async function pdfOrdenSurtido(id) {
  const n = await cargar(id);
  const doc = nuevoDoc();
  encabezado(doc, 'ORDEN DE SURTIDO', n.folio);
  doc.font('Helvetica').fontSize(10).fillColor('black');
  doc.text(`Nota de salida: ${n.folio}    Cliente: ${n.cliente ?? 'Público en general'}`, 50, doc.y);
  doc.text(`Fecha: ${fechaHora(n.fecha)}`);
  doc.moveDown(0.8);
  const partidas = [...n.partidas].sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));
  tabla(doc, [
    { t: 'Ubicación', w: 75 }, { t: 'Código', w: 85 }, { t: 'Descripción', w: 192 },
    { t: 'Cantidad', w: 60, a: 'right' }, { t: 'Unidad', w: 45 }, { t: 'Surtido', w: 55, a: 'center' },
  ], partidas.map((p) => [p.ubicacion, p.codigo_interno, p.descripcion, cant(p.cantidad), p.unidad_medida.toLowerCase(), '[   ]']));
  if (n.observaciones) doc.font('Helvetica').fontSize(10).text(`Observaciones: ${n.observaciones}`, 50);
  firmas(doc, 'Surtió (auxiliar) · Nombre y firma', 'Revisó · Nombre y firma');
  return { nombre: `surtido_${n.folio}.pdf`, buffer: await aBuffer(doc) };
}
