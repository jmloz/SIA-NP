// CU2 Consultar existencias y kardex (RF2; salidas S5 y S6) y exportación (alterno 8a).
import ExcelJS from 'exceljs';
import { ErrorNegocio } from '../db.js';
import * as Movimiento from '../entidades/movimiento.js';
import * as Kardex from '../entidades/kardex.js';

const TIPOS = { E: 'Entrada', S: 'Salida', A: 'Ajuste', D: 'Devolución' };
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Pasos 3–4: búsqueda por código, descripción o familia. Lista vacía = alterno 4a. */
export async function buscar(texto) {
  const t = String(texto ?? '').trim();
  if (!t) throw new ErrorNegocio('Capture un código, descripción o familia.');
  return Movimiento.buscarProductos(t, 50);
}

function revisarFiltros({ desde, hasta, tipo }) {
  if (desde && !FECHA.test(desde)) throw new ErrorNegocio('Fecha inicial no válida.');
  if (hasta && !FECHA.test(hasta)) throw new ErrorNegocio('Fecha final no válida.');
  if (desde && hasta && desde > hasta) throw new ErrorNegocio('La fecha inicial es posterior a la final.');
  if (tipo && !TIPOS[tipo]) throw new ErrorNegocio('Tipo de movimiento no válido.');
  return { desde: desde || null, hasta: hasta || null, tipo: tipo || null };
}

/** Pasos 6–8: producto con existencia, ubicación, mín/máx e historial filtrado.
 *  sinHistorial = alterno 6a (el producto nunca ha tenido movimientos). */
export async function consultar(idProducto, filtros = {}) {
  const f = revisarFiltros(filtros);
  const id = Number(idProducto);
  const producto = Number.isInteger(id) && id > 0 ? await Movimiento.productoPorId(id) : null;
  if (!producto) throw new ErrorNegocio('El producto no existe.', 404);
  const movimientos = (await Kardex.historial(producto.id_producto, f)).map((m) => ({ ...m, tipo_nombre: TIPOS[m.tipo] }));
  const sinHistorial = movimientos.length === 0 && (await Kardex.cuentaMovimientos(producto.id_producto)) === 0;
  return { producto, movimientos, sinHistorial, filtros: f };
}

const fechaTxt = (d) => new Date(d).toISOString().slice(0, 16).replace('T', ' ');
const COLUMNAS = ['Fecha', 'Folio', 'Tipo', 'Documento', 'Entrada', 'Salida', 'Saldo', 'Ubicación', 'Usuario', 'Motivo'];
const fila = (m) => [fechaTxt(m.fecha), m.folio, m.tipo_nombre, m.documento_ref ?? '', Number(m.entrada), Number(m.salida),
  Number(m.saldo), m.ubicacion, m.usuario, m.motivo ?? ''];

/** 8a: kardex en Excel. Devuelve { nombre, buffer }. */
export async function exportarExcel(idProducto, filtros) {
  const { producto, movimientos } = await consultar(idProducto, filtros);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kardex');
  ws.addRow([`Kardex ${producto.codigo_interno} · ${producto.descripcion}`]).font = { bold: true, size: 13 };
  ws.addRow([`Existencia actual: ${Number(producto.existencia)} ${producto.unidad_medida}   Ubicación: ${producto.ubicacion ?? '—'}`]);
  ws.addRow([]);
  const enc = ws.addRow(COLUMNAS);
  enc.font = { bold: true };
  enc.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } }; });
  movimientos.forEach((m) => ws.addRow(fila(m)));
  [17, 15, 12, 18, 10, 10, 10, 11, 13, 30].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  return { nombre: `kardex_${producto.codigo_interno}.xlsx`, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}

/** 8a: kardex en CSV (UTF-8 con BOM para que Excel respete los acentos). */
export async function exportarCsv(idProducto, filtros) {
  const { producto, movimientos } = await consultar(idProducto, filtros);
  const esc = (v) => { const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lineas = [COLUMNAS, ...movimientos.map(fila)].map((r) => r.map(esc).join(','));
  return { nombre: `kardex_${producto.codigo_interno}.csv`, texto: '﻿' + lineas.join('\r\n') + '\r\n' };
}
