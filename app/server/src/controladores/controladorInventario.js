// ControladorInventario: CU3 Realizar inventario físico (RF6), hoja de conteo (S4) y
// reporte de diferencias físico vs sistema (S8). Habla con las entidades, nunca con la interfaz.
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ErrorNegocio, enTransaccion } from '../db.js';
import * as Inventario from '../entidades/inventarioFisico.js';
import * as Bitacora from '../entidades/bitacora.js';

const TIPOS = { C: 'cíclico', T: 'total' };
const META_PCT = 1;   // meta de la CEO: menos de 1 % de productos con diferencia

const idValido = (id) => (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null);
const cantidadValida = (v) => {
  const c = Number(v);
  if (v === '' || v == null || !Number.isFinite(c) || c < 0) return null;
  if (Math.round(c * 100) !== c * 100 || c >= 1e8) return null;
  return c;
};
const descripcionConteo = (c) => (c.tipo_conteo === 'C' ? `cíclico ${c.familia}` : 'total');

async function cargar(id, tx = null) {
  const n = idValido(id);
  const c = n ? await Inventario.obtener(n, tx) : null;
  if (!c) throw new ErrorNegocio('El conteo no existe.', 404);
  return c;
}

/** Calcula diferencias (paso 5) y los totales del reporte S8. */
function resumir(partidas) {
  let contados = 0, conDiferencia = 0, difUnidades = 0, difDinero = 0, valorSistema = 0;
  const filas = partidas.map((p) => {
    const sistema = Number(p.existencia_sistema), contada = Number(p.cantidad_contada), costo = Number(p.costo_unitario);
    const diferencia = p.contado ? contada - sistema : null;
    const actual = Number(p.existencia_actual);
    if (p.contado) {
      contados++;
      if (diferencia !== 0) { conDiferencia++; difUnidades += diferencia; difDinero += diferencia * costo; }
    }
    valorSistema += sistema * costo;
    return {
      ...p, existencia_sistema: sistema, cantidad_contada: contada, costo_unitario: costo, existencia_actual: actual,
      contado: Boolean(p.contado), diferencia, diferencia_dinero: diferencia == null ? null : diferencia * costo,
      // Ajuste que se generaría al cerrar: deja la existencia igual a lo contado
      ajuste: p.contado ? Math.round((contada - actual) * 100) / 100 : null,
      movido: actual !== sistema,
    };
  });
  const total = filas.length;
  const pct = total ? (conDiferencia * 100) / total : 0;
  return {
    partidas: filas,
    resumen: {
      total, contados, pendientes: total - contados, conDiferencia,
      difUnidades: Math.round(difUnidades * 100) / 100, difDinero: Math.round(difDinero * 100) / 100, valorSistema,
      pctConDiferencia: Math.round(pct * 100) / 100, exactitud: Math.round((100 - pct) * 100) / 100,
      metaPct: META_PCT, cumpleMeta: pct < META_PCT,
      ajustes: filas.filter((f) => f.ajuste).length,
    },
  };
}

// ---------------------------------------------------------------- consultas

export async function datosNuevo() {
  const [familias, abiertos] = await Promise.all([Inventario.familias(), Inventario.conteosSinTerminar()]);
  return { familias, abiertos };
}

export const listar = () => Inventario.listar();

export async function consultar(id) {
  const c = await cargar(id);
  return { ...c, tipo: TIPOS[c.tipo_conteo], ...resumir(await Inventario.detalle(c.id_conteo)) };
}

// ---------------------------------------------------------------- pasos del CU3

/** Pasos 2–3: abre un conteo cíclico (por familia) o total y genera la hoja con la foto de existencias. */
export async function abrirConteo({ tipo, idFamilia }, usuario) {
  if (!TIPOS[tipo]) throw new ErrorNegocio('Elija conteo parcial por familia o completo.');
  let familia = null;
  if (tipo === 'C') {
    familia = idValido(idFamilia) ? await Inventario.familiaPorId(Number(idFamilia)) : null;
    if (!familia) throw new ErrorNegocio('Elija la familia que va a contar.');
  }
  return enTransaccion(async (tx) => {
    // No se abren dos conteos sobre los mismos productos
    const abiertos = await Inventario.conteosSinTerminar(tx);
    const choca = abiertos.find((a) => tipo === 'T' || a.tipo_conteo === 'T' || a.id_familia === familia.id_familia);
    if (choca) {
      throw new ErrorNegocio(`Ya hay un conteo sin terminar (${choca.folio}, ${choca.tipo_conteo === 'C' ? 'familia ' + choca.familia : 'total'}). `
        + 'Termínelo o cancélelo antes de abrir otro sobre los mismos productos.');
    }
    const folio = await Inventario.siguienteFolio(tx);
    const id = await Inventario.crear({ folio, tipo, idFamilia: familia?.id_familia ?? null, idUsuario: usuario.id }, tx);
    const gen = await Inventario.generarDetalle(id, familia?.id_familia ?? null, tx);
    if (gen.productos === 0) {
      throw new ErrorNegocio(gen.sinUbicacion
        ? 'Hay productos sin ubicación y no existe ninguna ubicación disponible. Dé de alta una ubicación.'
        : 'No hay productos activos que contar' + (familia ? ` en la familia ${familia.nombre}.` : '.'));
    }
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'ALTA', modulo: 'ALMACEN', tabla: 'INVENTARIO_FISICO',
      idAfectado: folio, detalle: `Conteo ${TIPOS[tipo]}${familia ? ' de ' + familia.nombre : ''} ${folio} con ${gen.productos} producto(s)` }, tx);
    return { id, folio, productos: gen.productos, sinUbicacion: gen.sinUbicacion, ubicacionDefecto: gen.ubicacionDefecto };
  });
}

function exigirEditable(c) {
  if (c.estado === 'AJUSTADO') throw new ErrorNegocio(`El conteo ${c.folio} ya está cerrado (AJUSTADO); no se puede modificar.`);
  if (c.estado === 'CANCELADO') throw new ErrorNegocio(`El conteo ${c.folio} está cancelado; no se puede modificar.`);
}

/** Paso 4 y alterno 4a: guarda lo contado. Las filas sin cantidad quedan pendientes y el conteo
 *  sigue ABIERTO para retomarlo. Con terminar = true pasa a CAPTURADO si ya no hay pendientes. */
export async function guardarConteo(id, { partidas, terminar }, usuario) {
  if (!Array.isArray(partidas)) throw new ErrorNegocio('No se recibieron cantidades.');
  const lista = [];
  for (const p of partidas) {
    if (p.cantidad === '' || p.cantidad == null) continue;   // sin capturar: sigue pendiente
    const cant = cantidadValida(p.cantidad);
    if (cant == null) throw new ErrorNegocio('Las cantidades deben ser 0 o mayores, con máximo dos decimales.');
    lista.push({ idProducto: Number(p.idProducto), cantidad: cant });
  }
  return enTransaccion(async (tx) => {
    const c = await cargar(id, tx);
    exigirEditable(c);
    for (const p of lista) {
      if (!(await Inventario.anotarConteo(c.id_conteo, p.idProducto, p.cantidad, tx)))
        throw new ErrorNegocio('Uno de los productos no pertenece a este conteo.');
    }
    const det = resumir(await Inventario.detalle(c.id_conteo, tx)).resumen;
    let estado = c.estado;
    if (terminar) {
      if (det.pendientes) throw new ErrorNegocio(`Faltan ${det.pendientes} producto(s) por contar. Guarde el avance y retome después (4a).`);
      estado = 'CAPTURADO';
      await Inventario.cambiarEstado(c.id_conteo, estado, tx);
    }
    if (lista.length || terminar) {
      await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'ALMACEN', tabla: 'DETALLE_CONTEO',
        idAfectado: c.folio, detalle: terminar ? `Captura terminada del conteo ${c.folio} (${det.total} producto(s))`
          : `Avance del conteo ${c.folio}: ${det.contados} de ${det.total} contados` }, tx);
    }
    return { folio: c.folio, estado, contados: det.contados, total: det.total };
  });
}

/** Alterno 7a: recontar un producto antes del cierre (corrige su cantidad). */
export async function recontar(id, idProducto, cantidad, usuario) {
  const cant = cantidadValida(cantidad);
  if (cant == null) throw new ErrorNegocio('Capture la cantidad recontada (0 o mayor, máximo dos decimales).');
  return enTransaccion(async (tx) => {
    const c = await cargar(id, tx);
    exigirEditable(c);
    if (!(await Inventario.anotarConteo(c.id_conteo, Number(idProducto), cant, tx)))
      throw new ErrorNegocio('El producto no pertenece a este conteo.');
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'ALMACEN', tabla: 'DETALLE_CONTEO',
      idAfectado: c.folio, detalle: `Reconteo (7a) en ${c.folio}: producto ${idProducto} = ${cant}` }, tx);
    return { folio: c.folio, cantidad: cant };
  });
}

/** Pasos 7–9: cierre del conteo. Un ajuste (tipo A) por cada producto cuya existencia actual no es
 *  igual a lo contado: cantidad = contado − existencia actual, así la existencia queda igual a lo
 *  contado aunque haya habido movimientos durante el conteo. Alterno 6a: sin diferencias, se cierra
 *  sin generar ajustes. Todo en una transacción (RNF2). */
export async function cerrar(id, usuario) {
  return enTransaccion(async (tx) => {
    const c = await cargar(id, tx);
    const estado = await Inventario.bloquear(c.id_conteo, tx);
    exigirEditable({ ...c, estado });
    const { partidas, resumen } = resumir(await Inventario.detalle(c.id_conteo, tx));
    if (resumen.pendientes) throw new ErrorNegocio(`No se puede cerrar: faltan ${resumen.pendientes} producto(s) por contar.`);

    const motivo = `Diferencia en conteo ${TIPOS[c.tipo_conteo]} ${c.folio}`;
    const ajustes = [];
    for (const p of partidas) {
      const actual = await Inventario.existenciaActual(p.id_producto, tx);
      const cantidad = Math.round((p.cantidad_contada - actual) * 100) / 100;
      if (cantidad === 0) continue;
      try {
        const r = await Inventario.registrarAjuste({ idConteo: c.id_conteo, idProducto: p.id_producto, idUbicacion: p.id_ubicacion,
          idUsuario: usuario.id, cantidad, folioConteo: c.folio, motivo }, tx);
        ajustes.push({ ...r, codigo: p.codigo_interno, cantidad });
      } catch (e) {
        throw new ErrorNegocio(`${p.codigo_interno}: ${e.message.replace(' No se guardó el movimiento.', '')} No se cerró el conteo.`);
      }
    }
    await Inventario.cambiarEstado(c.id_conteo, 'AJUSTADO', tx);
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'MODIFICACION', modulo: 'ALMACEN', tabla: 'INVENTARIO_FISICO',
      idAfectado: c.folio, detalle: ajustes.length
        ? `Cierre del conteo ${c.folio}: ${ajustes.length} ajuste(s) (${ajustes.map((a) => a.folio).join(', ')}); exactitud ${resumen.exactitud}%`
        : `Cierre del conteo ${c.folio} sin diferencias (6a); exactitud ${resumen.exactitud}%` }, tx);
    return { folio: c.folio, estado: 'AJUSTADO', ajustes, sinDiferencias: ajustes.length === 0 };
  });
}

/** Alterno 7b: cancela el conteo; las existencias no cambian. */
export async function cancelar(id, usuario) {
  return enTransaccion(async (tx) => {
    const c = await cargar(id, tx);
    exigirEditable({ ...c, estado: await Inventario.bloquear(c.id_conteo, tx) });
    await Inventario.cambiarEstado(c.id_conteo, 'CANCELADO', tx);
    await Bitacora.registrar({ idUsuario: usuario.id, accion: 'BAJA', modulo: 'ALMACEN', tabla: 'INVENTARIO_FISICO',
      idAfectado: c.folio, detalle: `Conteo ${c.folio} cancelado (7b); las existencias no cambiaron` }, tx);
    return { folio: c.folio, estado: 'CANCELADO' };
  });
}

// ---------------------------------------------------------------- impresos y exportación

const num = (n, d = 2) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
const cant = (n) => (Number(n) % 1 === 0 ? String(Number(n)) : num(n));
const fecha = (f) => { const s = new Date(f).toISOString(); return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`; };

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

/** Tabla con bordes negros y encabezado gris claro; repite el encabezado al cambiar de página. */
function tabla(doc, cols, filas, altoMin = 20) {
  let y = doc.y;
  const dibujar = (celdas, negrita, fondo) => {
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
    const alto = Math.max(fondo ? 20 : altoMin, ...celdas.map((c, i) => doc.heightOfString(String(c), { width: cols[i].w - 8 }) + 10));
    let x = 50;
    celdas.forEach((c, i) => {
      if (fondo) doc.rect(x, y, cols[i].w, alto).fill('#E6E6E6');
      doc.rect(x, y, cols[i].w, alto).lineWidth(0.7).stroke('black');
      doc.fillColor('black').text(String(c), x + 4, y + 5, { width: cols[i].w - 8, align: cols[i].a || 'left' });
      x += cols[i].w;
    });
    y += alto;
  };
  dibujar(cols.map((c) => c.t), true, true);
  for (const f of filas) {
    if (y + altoMin > 720) { doc.addPage(); y = 50; dibujar(cols.map((c) => c.t), true, true); }
    dibujar(f, false, false);
  }
  doc.y = y + 10;
}

function firmas(doc, izq, der) {
  let y = Math.max(doc.y + 45, 620);
  if (y > 700) { doc.addPage(); y = 120; }
  doc.font('Helvetica').fontSize(9.5).fillColor('black');
  doc.moveTo(60, y).lineTo(280, y).stroke('black');
  doc.moveTo(330, y).lineTo(550, y).stroke('black');
  doc.text(izq, 60, y + 4, { width: 220, align: 'center' });
  doc.text(der, 330, y + 4, { width: 220, align: 'center' });
}

/** S4 Hoja de conteo: conteo a ciegas (no muestra la existencia del sistema), ordenada por ubicación. */
export async function pdfHojaConteo(id) {
  const c = await consultar(id);
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  encabezado(doc, 'HOJA DE CONTEO', c.folio);
  doc.font('Helvetica').fontSize(10).fillColor('black');
  doc.text(`Tipo: conteo ${c.tipo}${c.familia ? `    Familia: ${c.familia}` : '    Almacén completo'}`, 50, doc.y);
  doc.text(`Fecha: ${fecha(c.fecha)}    Responsable: ${c.usuario}    Productos: ${c.partidas.length}`);
  doc.font('Helvetica-Oblique').fontSize(9)
    .text('Anote la cantidad física que encuentre en cada ubicación. Si un producto no está, anote 0.', 50, doc.y + 4);
  doc.moveDown(0.8);
  tabla(doc, [
    { t: 'Ubicación', w: 72 }, { t: 'Código', w: 88 }, { t: 'Descripción', w: 200 },
    { t: 'Unidad', w: 50 }, { t: 'Cantidad contada', w: 102 },
  ], c.partidas.map((p) => [p.ubicacion, p.codigo_interno, p.descripcion, p.unidad_medida.toLowerCase(), '']), 26);
  firmas(doc, 'Contó · Nombre y firma', 'Validó (Encargado de Almacén) · Nombre y firma');
  return { nombre: `hoja_conteo_${c.folio}.pdf`, buffer: await aBuffer(doc) };
}

/** S8 Diferencias físico vs sistema exportado a Excel. */
export async function excelDiferencias(id) {
  const c = await consultar(id);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Diferencias');
  ws.addRow([`Diferencias físico vs sistema · ${c.folio} · conteo ${descripcionConteo(c)}`]).font = { bold: true, size: 13 };
  ws.addRow([`Fecha: ${fecha(c.fecha)}   Estado: ${c.estado}   Responsable: ${c.usuario}`]);
  ws.addRow([]);
  const enc = ws.addRow(['Ubicación', 'Código', 'Descripción', 'Unidad', 'Sistema', 'Contado', 'Diferencia', 'Costo unitario', 'Diferencia $']);
  enc.font = { bold: true };
  enc.eachCell((x) => { x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } }; });
  for (const p of c.partidas) {
    const r = ws.addRow([p.ubicacion, p.codigo_interno, p.descripcion, p.unidad_medida, p.existencia_sistema,
      p.contado ? p.cantidad_contada : 'Pendiente', p.diferencia ?? '', p.costo_unitario, p.diferencia_dinero ?? '']);
    if (p.diferencia) r.font = { bold: true };
  }
  ws.addRow([]);
  const s = c.resumen;
  ws.addRow(['', '', 'Productos con diferencia', '', `${s.conDiferencia} de ${s.total}`]);
  ws.addRow(['', '', 'Diferencia total', '', '', '', s.difUnidades, '', s.difDinero]).font = { bold: true };
  ws.addRow(['', '', '% de productos con diferencia (meta < 1 %)', '', `${s.pctConDiferencia} %`]);
  ws.addRow(['', '', 'Exactitud del conteo', '', `${s.exactitud} %`]).font = { bold: true };
  [11, 16, 40, 8, 10, 10, 11, 14, 13].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  [8, 9].forEach((i) => { ws.getColumn(i).numFmt = '$#,##0.00'; });
  return { nombre: `diferencias_${c.folio}.xlsx`, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}

