// ControladorDireccion: CU7 Dashboard (S9), bitácora de auditoría (RF19) y exportaciones (RF18, S10).
import ExcelJS from 'exceljs';
import { ErrorNegocio } from '../db.js';
import * as Dashboard from '../entidades/dashboard.js';
import * as Reporte from '../entidades/reporte.js';
import * as Bitacora from '../entidades/bitacora.js';

const DIAS = { semanal: 7, mensual: 30 };

function diasDe(periodo) {
  const dias = DIAS[periodo];
  if (!dias) throw new ErrorNegocio('Periodo no válido: use "semanal" o "mensual".');
  return dias;
}

/** Solo Dirección (D) ve el desglose; Almacén (E) y Compras (C) ven el resumen (alterno 7a). */
const veDesglose = (usuario) => usuario.rol === 'D';

// ---------- CU7: pasos 2-5 ----------
export async function resumen(usuario, periodo = 'semanal') {
  const dias = diasDe(periodo);
  const [porFamilia, bajo, mov, oc, fisico] = await Promise.all([
    Dashboard.valorPorFamilia(), Dashboard.productosBajoReorden(), Dashboard.movimientosDelPeriodo(dias),
    Dashboard.ordenesAbiertasResumen(), Dashboard.ultimoInventarioFisico(),
  ]);
  const res = {
    periodo, dias,
    valorTotal: porFamilia.reduce((s, f) => s + Number(f.valor), 0),
    productosActivos: porFamilia.reduce((s, f) => s + f.productos, 0),
    bajoReorden: bajo.length,
    entradas: { unidades: mov.unidadesEntrada, movimientos: mov.movEntrada },
    salidas: { unidades: mov.unidadesSalida, movimientos: mov.movSalida },
    ocAbiertas: oc,
    fisico,
    // 2a: sin movimientos en el periodo, los indicadores de movimiento salen en cero y se avisa.
    sinInformacion: mov.movEntrada + mov.movSalida === 0,
    soloResumen: !veDesglose(usuario),
  };
  if (!res.soloResumen) {
    res.porFamilia = porFamilia.map((f) => ({ familia: f.familia, valor: Number(f.valor) }));
    const porDia = new Map((await Dashboard.movimientosPorDia(dias)).map((d) => [d.dia, d]));
    const hoy = await Dashboard.hoy();
    res.porDia = [];
    for (let i = dias - 1; i >= 0; i--) {   // días del periodo, con ceros donde no hubo movimientos
      const d = new Date(`${hoy}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - i);
      const clave = d.toISOString().slice(0, 10);
      const x = porDia.get(clave);
      res.porDia.push({ dia: clave, entradas: Number(x?.entradas ?? 0), salidas: Number(x?.salidas ?? 0) });
    }
  }
  return res;
}

// ---------- CU7: pasos 6-7 ----------
export async function detalleIndicador(usuario, indicador, periodo = 'semanal') {
  if (!veDesglose(usuario)) throw new ErrorNegocio('Su rol solo permite ver información resumida.', 403);
  const dias = diasDe(periodo);
  switch (indicador) {
    case 'valor': return { titulo: 'Valor del inventario por familia', filas: await Dashboard.valorPorFamilia() };
    case 'reorden': return { titulo: 'Productos bajo el punto de reorden', filas: await Dashboard.productosBajoReorden() };
    case 'entradas': return { titulo: 'Entradas del periodo', filas: await Dashboard.detalleMovimientos(dias, 'entradas') };
    case 'salidas': return { titulo: 'Salidas del periodo', filas: await Dashboard.detalleMovimientos(dias, 'salidas') };
    case 'oc': return { titulo: 'Órdenes de compra abiertas', filas: await Dashboard.ordenesAbiertas() };
    case 'fisico': {
      const f = await Dashboard.ultimoInventarioFisico();
      return { titulo: f ? `Diferencias del inventario físico ${f.folio}` : 'Diferencias del inventario físico', filas: f ? await Dashboard.detalleConteo(f.id) : [] };
    }
    default: throw new ErrorNegocio('Indicador no válido.');
  }
}

// ---------- RF19: bitácora ----------
export async function consultarBitacora(filtros, pagina) {
  const p = Math.max(1, Number(pagina) || 1);
  const porPagina = 50;
  const { total, filas } = await Reporte.bitacora(filtros, p, porPagina);
  return { total, pagina: p, porPagina, paginas: Math.max(1, Math.ceil(total / porPagina)), filas };
}

export async function filtrosBitacora() {
  return {
    usuarios: await Reporte.usuarios(),
    modulos: ['SEGURIDAD', 'CATALOGOS', 'ALMACEN', 'COMPRAS', 'DIRECCION'],
    acciones: ['ALTA', 'MODIFICACION', 'BAJA', 'MOVIMIENTO', 'ACCESO', 'CIERRE_SESION'],
  };
}

// ---------- RF18 / S10: exportación ----------
const fechaHora = (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 19) : '');
const fechaCorta = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

// Cada reporte: nombre del archivo, hoja, columnas [encabezado, campo, ancho, formato] y de dónde salen las filas.
const REPORTES = {
  inventario: {
    archivo: 'existencias_valor_inventario', hoja: 'Inventario', detalle: 'existencias y valor del inventario',
    columnas: [['Código', 'codigo', 14], ['Descripción', 'descripcion', 44], ['Familia', 'familia', 22], ['Unidad', 'unidad', 8],
      ['Existencia', 'existencia', 12, 'num'], ['Costo', 'costo', 12, 'dinero'], ['Valor', 'valor', 14, 'dinero'], ['Ubicación', 'ubicacion', 12]],
    filas: () => Reporte.inventarioValorizado(), tabla: 'PRODUCTO',
  },
  reorden: {
    archivo: 'productos_bajo_reorden', hoja: 'Reorden', detalle: 'productos bajo punto de reorden',
    columnas: [['Código', 'codigo', 14], ['Descripción', 'descripcion', 44], ['Familia', 'familia', 22], ['Existencia', 'existencia', 12, 'num'],
      ['Punto de reorden', 'punto_reorden', 16, 'num'], ['Máximo', 'maximo', 12, 'num'], ['Cantidad sugerida', 'cantidad_sugerida', 18, 'num']],
    filas: () => Reporte.reorden(), tabla: 'PRODUCTO',
  },
  bitacora: {
    archivo: 'bitacora_auditoria', hoja: 'Bitácora', detalle: 'bitácora de auditoría (filtrada)',
    columnas: [['Fecha y hora', 'fecha_hora', 20, 'fechaHora'], ['Usuario', 'usuario', 16], ['Acción', 'accion', 15], ['Módulo', 'modulo', 12],
      ['Tabla', 'tabla', 20], ['Id afectado', 'id_afectado', 14], ['Detalle', 'detalle', 60]],
    filas: (filtros) => Reporte.bitacoraCompleta(filtros), tabla: 'BITACORA_AUDITORIA',
  },
};

function valorCelda(valor, formato) {
  if (valor == null) return '';
  if (formato === 'fechaHora') return fechaHora(valor);
  if (formato === 'fecha') return fechaCorta(valor);
  return valor;
}

function aCsv(rep, filas) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [rep.columnas.map((c) => esc(c[0])).join(',')];
  for (const f of filas) lineas.push(rep.columnas.map((c) => esc(valorCelda(f[c[1]], c[3]))).join(','));
  return '﻿' + lineas.join('\r\n') + '\r\n';   // BOM para que Excel abra los acentos bien
}

async function aExcel(rep, filas) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIA-NP';
  const hoja = libro.addWorksheet(rep.hoja);
  hoja.columns = rep.columnas.map((c) => ({ header: c[0], key: c[1], width: c[2] }));
  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  for (const f of filas) {
    const fila = {};
    for (const c of rep.columnas) fila[c[1]] = valorCelda(f[c[1]], c[3]);
    hoja.addRow(fila);
  }
  rep.columnas.forEach((c, i) => {
    if (c[3] === 'dinero') hoja.getColumn(i + 1).numFmt = '"$"#,##0.00';
    if (c[3] === 'num') hoja.getColumn(i + 1).numFmt = '#,##0.00';
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Genera el archivo y registra la exportación en la bitácora. Devuelve { nombre, tipo, contenido }. */
export async function exportar(usuario, que, formato, filtros = {}) {
  const rep = REPORTES[que];
  if (!rep) throw new ErrorNegocio('Reporte no válido.');
  if (!['xlsx', 'csv'].includes(formato)) throw new ErrorNegocio('Formato no válido: use "xlsx" o "csv".');
  if (que === 'bitacora' && !['D', 'X'].includes(usuario.rol)) throw new ErrorNegocio('Su rol no tiene permiso para esta operación.', 403);
  const filas = await rep.filas(filtros);
  const contenido = formato === 'csv' ? aCsv(rep, filas) : await aExcel(rep, filas);
  await Bitacora.registrar({
    idUsuario: usuario.id, accion: 'ACCESO', modulo: 'DIRECCION', tabla: rep.tabla,
    detalle: `Exportación de ${rep.detalle} a ${formato === 'csv' ? 'CSV' : 'Excel'} (${filas.length} filas)`,
  });
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    nombre: `${rep.archivo}_${hoy}.${formato}`,
    tipo: formato === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    contenido,
  };
}
