// Genera Proyecto_BD_Parte_I_SIA-NP.docx (Taller de Base de Datos)
// Uso: node gen_documento.js   (desde cualquier directorio; Windows o Ubuntu)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageOrientation,
  HeadingLevel, PageBreak, VerticalAlign, TableLayoutType,
} = require('docx');
const { catalogos, tablas, columnas, reglas } = require('./descripciones');

const BASE = path.resolve(__dirname, '..');
const RAIZ = path.resolve(BASE, '..');
const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'metadatos_columnas.json'), 'utf8'));
const sql = fs.readFileSync(path.join(BASE, 'sql', '01_creacion_SIA_NP.sql'), 'utf8');

const FECHA = '7 de noviembre de 2026';
const INTEGRANTES = [
  'Hernández Castro José Martín',
  'Moreno Ramos Adolfo',
  'Peñuñuri Fernández Sara Alejandra',
  'Rivera Torres Edgardo',
];
const GRIS = 'E6E6E6';
const FONT = 'Arial';
const MONO = 'Courier New';

// ---------- utilidades ----------
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 22, bold: o.bold, italics: o.italics, color: '000000', break: o.break });
function p(content, o = {}) {
  const children = typeof content === 'string' ? [run(content, o)] : content;
  return new Paragraph({
    children,
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 120, before: o.before ?? 0, line: o.line || 276 },
    indent: o.indent,
    keepNext: o.keepNext,
    pageBreakBefore: o.pageBreakBefore,
  });
}
// texto con **negritas** simples
function rich(text, o = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
  return p(parts.map((t) => (t.startsWith('**') ? run(t.slice(2, -2), { ...o, bold: true }) : run(t, o))), o);
}
function bullet(text, o = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
  return new Paragraph({
    children: parts.map((t) => (t.startsWith('**') ? run(t.slice(2, -2), { bold: true }) : run(t))),
    bullet: { level: o.level || 0 },
    alignment: AlignmentType.LEFT,
    spacing: { after: 60, line: 264 },
  });
}
const h1 = (t, brk = true) => new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: brk, keepNext: true,
  children: [run(t, { bold: true, size: 28 })], spacing: { before: 0, after: 200 },
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, keepNext: true,
  children: [run(t, { bold: true, size: 24 })], spacing: { before: 240, after: 120 },
});
const h3 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_3, keepNext: true,
  children: [run(t, { bold: true, size: 22 })], spacing: { before: 200, after: 80 },
});
const borde = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

function celda(text, o = {}) {
  const lines = String(text ?? '').split('\n');
  return new TableCell({
    children: lines.map((l) => new Paragraph({
      children: [new TextRun({ text: l, font: o.mono ? MONO : FONT, size: o.size || 18, bold: o.bold, color: '000000' })],
      alignment: o.align || AlignmentType.LEFT, spacing: { after: 0, line: 240 },
    })),
    shading: o.header ? { type: ShadingType.CLEAR, color: 'auto', fill: GRIS } : undefined,
    borders: bordes,
    width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    columnSpan: o.span,
  });
}
// tabla genérica: encabezados + filas; anchos en DXA (suma ≤ 9360 en vertical)
function tabla(enc, filas, anchos, o = {}) {
  return new Table({
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: enc.map((e, i) => celda(e, { header: true, bold: true, w: anchos[i], size: o.size })) }),
      ...filas.map((f) => new TableRow({ cantSplit: true, children: f.map((c, i) => celda(c, { w: anchos[i], size: o.size, mono: o.monoCols && o.monoCols.includes(i) })) })),
    ],
  });
}
let nFig = 0;
let nTab = 0;
const pie = (prefijo, t) => p([run(`${prefijo}. ${t}`, { size: 20, italics: true })], { align: AlignmentType.CENTER, after: 200, before: 80 });
const pieTabla = (t) => p([run(`Tabla ${++nTab}. ${t}`, { size: 20, italics: true })], { align: AlignmentType.CENTER, after: 80, before: 160, keepNext: true });
const espacio = () => p('', { after: 60 });

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function imagen(file, maxW, maxH) {
  const { w, h } = pngSize(file);
  const k = Math.min(maxW / w, maxH / h);
  return new Paragraph({
    alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 0 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: Math.round(w * k), height: Math.round(h * k) } })],
  });
}
function codigo(texto) {
  return texto.replace(/\s+$/, '').split('\n').map((l) => new Paragraph({
    children: [new TextRun({ text: l.length ? l : ' ', font: MONO, size: 14, color: '000000' })],
    spacing: { after: 0, line: 220 },
  }));
}

// ---------- portada ----------
function portada() {
  const logo = (f, w) => {
    const s = pngSize(f);
    return new ImageRun({ type: 'png', data: fs.readFileSync(f), transformation: { width: w, height: Math.round((w * s.h) / s.w) } });
  };
  const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const nb = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };
  const logos = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders: { ...nb, insideHorizontal: sinBorde, insideVertical: sinBorde },
    rows: [new TableRow({ children: [
      new TableCell({ borders: nb, children: [new Paragraph({ children: [logo(path.join(RAIZ, 'assets', 'logo_tecnm.png'), 90)] })] }),
      new TableCell({ borders: nb, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [logo(path.join(RAIZ, 'assets', 'logo_ith.png'), 90)] })] }),
    ] })],
  });
  const c = (t, o = {}) => p(t, { align: AlignmentType.CENTER, after: o.after ?? 0, ...o });
  return [
    logos,
    c('', { after: 600 }),
    c('TECNOLÓGICO NACIONAL DE MÉXICO', { bold: true, size: 28 }),
    c('INSTITUTO TECNOLÓGICO DE HERMOSILLO', { bold: true, size: 28, after: 360 }),
    c('Ingeniería en Sistemas Computacionales', { size: 24, after: 360 }),
    c('Materia:', { bold: true, size: 24 }),
    c('Taller de Base de Datos', { size: 24, after: 280 }),
    c('Trabajo:', { bold: true, size: 24 }),
    c('Proyecto — Parte I: Diseño y creación de la base de datos', { size: 24 }),
    c('Sistema de Inventario y Almacén (SIA-NP) — Neumática del Pacífico', { size: 24, after: 280 }),
    c('Profesor(a):', { bold: true, size: 24 }),
    c('______________________________', { size: 24, after: 280 }),
    c('Grupo:', { bold: true, size: 24 }),
    c('__________', { size: 24, after: 280 }),
    c('Integrantes:', { bold: true, size: 24 }),
    ...INTEGRANTES.map((n) => c(n, { size: 24 })),
    c('', { after: 600 }),
    c(`Hermosillo, Sonora, ${FECHA}`, { size: 24 }),
  ];
}

// ---------- contenido ----------
function contenido() {
  return [
    h1('Integrantes del equipo y catálogos asignados', false),
    p('Conforme a la indicación del taller, cada integrante realizó lo correspondiente a un catálogo de la base de datos: su parte del diccionario de datos, sus entidades en el modelo entidad-relación y en UML, y las sentencias de creación de sus tablas con sus restricciones.'),
    pieTabla('Integrantes y catálogo a cargo de cada uno'),
    tabla(['Integrante', 'Catálogo', 'Tablas', 'Requerimientos'],
      catalogos.map((c) => [c.responsable, `${c.num}. ${c.nombre}`, c.tablas.join('\n'), c.rf]),
      [2700, 2100, 2760, 1800], { size: 18 }),
  ];
}

// ---------- 2. Documentos fuente (punto 1 de la consigna) ----------
function documentosFuente() {
  return [
    h1('2. Relación de documentos fuente del sistema'),
    p('Los documentos fuente son los documentos reales con los que hoy opera Neumática del Pacífico y de los que el sistema toma sus datos de entrada. Esta relación, junto con las salidas de la sección 3, es el punto de partida para depurar los datos y construir el diccionario. Los documentos se identificaron en las entrevistas (Apéndice A de la ERS) y en la revisión del Excel actual (Apéndice B).'),
    pieTabla('Documentos fuente del sistema y los datos que contiene cada uno'),
    tabla(['Documento fuente', 'Datos que contiene', 'Tabla(s) donde se guarda'], [
      ['Libro físico de remisiones', 'Fecha, cliente, productos surtidos, cantidad, número de remisión, firma de recibido.', 'MOVIMIENTO (salidas)'],
      ['Excel "INV ALMACÉN" (454 registros)', 'Código interno, descripción, familia, existencia, mínimo, máximo, costo, precio.', 'PRODUCTO, FAMILIA'],
      ['Excel "Hoja3" (ubicaciones)', 'Código de producto, rack/pasillo, anaquel, caja/nivel.', 'UBICACION, PRODUCTO'],
      ['Excel "Hoja4" (precios con IVA)', 'Código, costo sin IVA, IVA, precio con IVA, margen.', 'PRODUCTO, PRODUCTO_PROVEEDOR'],
      ['Factura / remisión del proveedor', 'Proveedor, RFC, número de factura, productos, cantidad recibida, costo unitario, fecha.', 'PROVEEDOR, RECEPCION, DETALLE_ORDEN, MOVIMIENTO (entradas)'],
      ['Orden de compra en Word', 'Folio, proveedor, fecha, productos, cantidad solicitada, costo, condiciones.', 'ORDEN_COMPRA, DETALLE_ORDEN'],
      ['Vale interno de salida', 'Producto, cantidad, área que solicita, motivo, fecha.', 'MOVIMIENTO (salidas)'],
      ['Hoja de conteo de inventario físico', 'Familia, producto, ubicación, cantidad contada, responsable, fecha.', 'INVENTARIO_FISICO, DETALLE_CONTEO'],
      ['Nota de devolución de cliente', 'Documento de venta original, cliente, producto, cantidad, motivo, estado de la mercancía.', 'MOVIMIENTO (devoluciones)'],
      ['Lista de proveedores', 'Razón social, RFC, clasificación, contacto, teléfono, correo, tiempo de entrega.', 'PROVEEDOR'],
    ], [2600, 4360, 2400], { size: 16 }),
    p('De esta relación se observa que varios documentos repiten los mismos datos (el código y la descripción del producto aparecen en los tres Excel, en la factura, en la orden de compra y en el vale). Esa duplicación es justamente la que se depura al pasar a la base de datos: cada dato queda una sola vez en su tabla y los demás documentos lo referencian por su llave.', { before: 120 }),
  ];
}

// ---------- 3. Salidas del sistema (punto 2 de la consigna) ----------
function salidas() {
  return [
    h1('3. Relación de salidas del sistema'),
    p('Las salidas son la información que el sistema entrega a sus usuarios (consultas en pantalla, reportes impresos y archivos de exportación). Se tomaron del entregable de diseño de salidas del análisis del SIA-NP. Interesan aquí porque los datos que una salida necesita deben existir en alguna tabla: si una salida pide un dato que ningún documento fuente aporta, falta una columna o una tabla.'),
    pieTabla('Salidas del sistema y los datos que presenta cada una'),
    tabla(['Salida', 'Tipo', 'Datos que presenta', 'Origen en la base de datos'], [
      ['Nota de salida', 'Reporte impreso', 'Folio, fecha, cliente, productos, cantidad, ubicación.', 'MOVIMIENTO, PRODUCTO, UBICACION'],
      ['Orden de compra', 'Reporte / archivo', 'Folio, proveedor, productos, cantidad, costo, subtotal, IVA, total.', 'ORDEN_COMPRA, DETALLE_ORDEN, PROVEEDOR'],
      ['Kardex del producto', 'Consulta en pantalla', 'Fecha, tipo, documento, entrada, salida, saldo, usuario.', 'vw_KARDEX (MOVIMIENTO, PRODUCTO, USUARIO)'],
      ['Reporte de productos bajo reorden', 'Reporte', 'Código, descripción, existencia, punto de reorden, sugerido.', 'vw_PRODUCTOS_BAJO_REORDEN'],
      ['Diferencias físico vs sistema', 'Reporte', 'Producto, existencia del sistema, cantidad contada, diferencia.', 'DETALLE_CONTEO, INVENTARIO_FISICO'],
      ['Valor del inventario por familia', 'Consulta / dashboard', 'Familia, número de productos, unidades, valor del inventario.', 'vw_VALOR_INVENTARIO'],
      ['Dashboard de KPIs', 'Pantalla', 'Exactitud, rotación, OC abiertas, productos agotados.', 'Agregados de MOVIMIENTO, ORDEN_COMPRA, PRODUCTO'],
      ['Exportación a Excel / CSV', 'Archivo', 'Las columnas de cualquier reporte o vista.', 'Cualquier tabla o vista'],
    ], [2300, 1600, 3360, 2100], { size: 16 }),
    p('Tres de estas salidas se resolvieron creando vistas (VIEW) en la propia base de datos, que se incluyen en el script de creación (sección 7): vw_KARDEX arma el historial de cada producto a partir de MOVIMIENTO; vw_PRODUCTOS_BAJO_REORDEN lista los productos cuya existencia cayó bajo el punto de reorden; y vw_VALOR_INVENTARIO suma el valor del inventario por familia. Las demás salidas se obtienen con consultas sobre las tablas.', { before: 120 }),
  ];
}

// ---------- 1. Introducción ----------
function introduccion() {
  return [
    h1('1. Introducción'),
    p('Neumática del Pacífico es una empresa de Hermosillo, Sonora, que comercializa piezas, refacciones y accesorios neumáticos: mangueras, racores, válvulas, electroválvulas, cilindros, unidades FRL, compresores, manómetros y lubricantes. Maneja alrededor de 1,200 productos diferentes y trabaja con cerca de 35 proveedores activos, locales, nacionales y de importación.'),
    p('En la materia de Fundamentos de Ingeniería de Software el equipo levantó los requerimientos de la empresa (ERS IEEE 830, requerimientos RF1–RF20 y RNF1–RNF9) y modeló el Sistema de Inventario y Almacén SIA-NP con casos de uso, tarjetas CRC, diagramas de secuencia y diagrama de clases. En este taller se toma ese análisis como punto de partida para diseñar y crear la base de datos relacional que usará el sistema.'),
    h2('1.1 Descripción del problema'),
    p('Hoy el control del inventario se lleva en un libro físico de remisiones y en un archivo de Excel que se actualiza al final del día. Este esquema presenta los siguientes problemas, detectados en las entrevistas con el personal y en la revisión del Excel actual:'),
    bullet('**Existencias que no coinciden con lo físico.** Se vende mercancía que el Excel dice tener y que no está en el almacén. La diferencia entre el inventario físico y el registrado es de alrededor del 5 %, y la dirección estima pérdidas del 8 al 10 % del margen anual por este motivo.'),
    bullet('**Ubicaciones incompletas.** La columna de ubicación está vacía para muchos productos, por lo que localizarlos depende de la memoria del personal.'),
    bullet('**Información duplicada.** Los mismos números de parte aparecen en varias hojas, lo que provoca datos contradictorios.'),
    bullet('**Sin historial ni responsables.** No se sabe quién hizo cada movimiento ni cuándo; no existe kardex ni bitácora.'),
    bullet('**Compras fuera del sistema.** Las órdenes de compra se elaboran en Word y la recepción no queda ligada a la orden, por lo que no se sabe qué está pendiente de surtir.'),
    bullet('**Sin reglas de validación.** Una hoja de cálculo acepta cantidades negativas, códigos repetidos o fechas incorrectas.'),
    p('Todos estos problemas tienen su origen en que los datos no están organizados en una base de datos con llaves y reglas de integridad. Por eso la confiabilidad, que el encargado de almacén resumió como su expectativa principal, depende en gran medida del diseño de la base de datos.'),
    h2('1.2 Objetivo general'),
    p('Diseñar y crear la base de datos relacional del SIA-NP en Microsoft SQL Server, partiendo del análisis orientado a objetos del sistema, de modo que almacene de forma única, consistente y verificable los productos, ubicaciones, proveedores, órdenes de compra, recepciones, movimientos de almacén, conteos físicos y usuarios de Neumática del Pacífico. La base de datos tiene 14 tablas organizadas en cuatro catálogos, uno por integrante del equipo (Tabla 1).'),
  ];
}

// ---------- 2. Diccionario ----------
function llaveDe(r) {
  const k = [];
  if (r.pk) k.push('PK');
  if (r.fk) k.push(`FK → ${r.fk}`);
  if (r.uq) k.push('UQ');
  return k.join('\n');
}
function defDe(r) {
  const partes = [];
  if (r.ident) partes.push('IDENTITY(1,1)');
  if (r.def) {
    let d = r.def.replace(/^\(+|\)+$/g, '');
    if (/getdate/i.test(r.def)) d = 'fecha actual';
    else if (/sysdatetime/i.test(r.def)) d = 'fecha y hora actual';
    partes.push(`DEFAULT ${d}`);
  }
  if (r.calc) partes.push('Calculada (PERSISTED)');
  const regla = reglas[`${r.tabla}.${r.columna}`];
  if (regla) partes.push(`CHECK ${regla}`);
  return partes.join('\n');
}
function diccionario() {
  const out = [
    h1('4. Diccionario de datos'),
    p('El diccionario de datos describe cada tabla y cada uno de sus campos. Los tipos, la obligatoriedad, las llaves y los valores por defecto se extrajeron directamente del catálogo de SQL Server (sys.columns) después de ejecutar el script de creación, por lo que coinciden exactamente con la base de datos creada.'),
    p('Abreviaturas usadas en las tablas:'),
    bullet('**PK**: llave primaria. **FK → TABLA**: llave foránea que apunta a esa tabla. **UQ**: valor único (no se repite).'),
    bullet('**Nulo**: «No» significa campo obligatorio (NOT NULL); «Sí» significa que puede quedar vacío.'),
    bullet('**IDENTITY(1,1)**: número autoincremental que asigna el SGBD. **Calculada**: columna que SQL Server calcula a partir de otras.'),
    bullet('Tipos usados: INT, BIGINT, SMALLINT y TINYINT (enteros); DECIMAL(p,s) (numéricos con decimales); VARCHAR(n) y CHAR(n) (texto); DATE y DATETIME2 (fechas); BIT (verdadero/falso).'),
  ];
  for (const c of catalogos) {
    out.push(h2(`4.${c.num} Catálogo ${c.num}: ${c.nombre}`));
    out.push(p([run('Responsable: ', { bold: true }), run(c.responsable)], { after: 60 }));
    for (const t of c.tablas) {
      const filas = meta.filter((m) => m.tabla === t).sort((a, b) => a.orden - b.orden);
      out.push(h3(`Tabla ${t}`));
      out.push(p(tablas[t], { after: 60, keepNext: true }));
      out.push(tabla(['Campo', 'Tipo de dato', 'Nulo', 'Llave', 'Default / regla', 'Descripción'],
        filas.map((r) => {
          const desc = columnas[t] && columnas[t][r.columna];
          if (!desc) throw new Error(`Falta descripción de ${t}.${r.columna}`);
          return [r.columna, r.tipo, r.nulo && !r.calc ? 'Sí' : r.calc ? '—' : 'No', llaveDe(r), defDe(r), desc];
        }),
        [1650, 1250, 560, 1250, 2050, 2600], { size: 15 }));
    }
  }
  // verificación: descripciones sin columna real
  for (const [t, cols] of Object.entries(columnas)) for (const col of Object.keys(cols)) {
    if (!meta.find((m) => m.tabla === t && m.columna === col)) throw new Error(`Descripción sobrante: ${t}.${col}`);
  }
  return out;
}

// ---------- 3. MER ----------
function figuraHorizontal(base, titulo) {
  const out = [];
  const dir = path.join(BASE, 'diagramas');
  const partes = fs.readdirSync(dir).filter((f) => f.startsWith(base) && f.endsWith('.png'))
    .filter((f) => base.startsWith('01_') || !f.includes('_general')).sort();
  if (!partes.length) throw new Error(`No existe la figura ${base}`);
  partes.forEach((f, i) => {
    out.push(imagen(path.join(dir, f), 900, 600));
    let suf = '';
    const m = f.match(/_(\d)_(general|catalogo)\.png$/);
    if (m && m[2] === 'general') suf = ': vista general';
    else if (m) {
      const c = catalogos.find((x) => x.num === Number(m[1]));
      suf = `: catálogo ${c.num}, ${c.nombre.toLowerCase()} (${c.responsable})`;
    }
    out.push(pie(`Figura ${++nFig}`, titulo + suf));
    if (i < partes.length - 1) out.push(new Paragraph({ children: [new PageBreak()] }));
  });
  return out;
}

function mer() {
  return [
    h1('5. Modelo Entidad-Relación'),
    p('El modelo entidad-relación (MER) representa los datos que el SIA-NP debe guardar, sin pensar todavía en tablas. Se obtuvo de las clases de entidad del diagrama de clases del sistema y de la descripción lógica de datos de la ERS (sección 4.1). Se usó la notación de Chen extendida:'),
    bullet('**Rectángulo**: entidad. **Doble rectángulo**: entidad débil (DETALLE_CONTEO).'),
    bullet('**Rombo**: relación, nombrada con un verbo. **Doble rombo**: relación identificadora de la entidad débil.'),
    bullet('**Óvalo**: atributo; el atributo clave va subrayado y el atributo derivado en óvalo punteado. Para que el diagrama sea legible solo se muestran la clave y algunos atributos representativos; la lista completa está en el diccionario de datos.'),
    bullet('**1, N, M**: cardinalidad de cada extremo de la relación.'),
    bullet('**Círculo con «d»**: especialización disjunta de MOVIMIENTO en ENTRADA, SALIDA, AJUSTE y DEVOLUCION; la doble línea indica que es total (todo movimiento es de uno de los cuatro tipos). El discriminador es el atributo tipo.'),
    p('Por su tamaño, el modelo se presenta en hojas horizontales en dos niveles: primero una vista general con todas las entidades y relaciones (sin atributos) y después un diagrama por catálogo con los atributos de sus entidades. En los diagramas por catálogo, las entidades de otros catálogos se dibujan con borde punteado y sin atributos, solo para mostrar con quién se relacionan.'),
  ];
}

// ---------- 4. ER -> UML ----------
function uml() {
  const reglasPase = [
    ['Entidad', 'Clase', 'PRODUCTO → Producto'],
    ['Atributo', 'Atributo privado (–) con tipo y valor inicial', 'existencia → -existencia: Decimal=0.0'],
    ['Atributo con dominio finito (CHECK IN)', 'Valores entre llaves', 'tipo → -tipo: char{E,S,A,D}'],
    ['Atributo clave', 'Atributo identificador de la clase', 'id_producto → -idProducto: Integer'],
    ['Atributo derivado', 'Atributo derivado con «/»', 'diferencia → -/diferencia: Decimal'],
    ['Relación 1 : N', 'Asociación con multiplicidad 1 — 0..*', 'Producto 1 — 0..* Movimiento (afecta)'],
    ['Relación 1 : N con participación opcional', 'Multiplicidad 0..1 en el lado «uno»', 'Ubicacion 0..1 — 0..* Producto'],
    ['Relación M : N con atributos', 'Clase de asociación (línea punteada)', 'solicita → DetalleOrden'],
    ['Entidad débil', 'Clase de asociación entre sus dueños', 'DETALLE_CONTEO → DetalleConteo'],
    ['Especialización (círculo «d»)', 'Generalización (triángulo vacío); superclase abstracta en cursiva', 'Movimiento → Entrada, Salida, Ajuste, Devolucion'],
    ['Relación «contiene»', 'Agregación (diamante vacío)', 'Ubicacion ◇— Producto'],
    ['Llave foránea', 'No se escribe como atributo; la reemplaza la asociación', 'id_familia → asociación «clasifica»'],
  ];
  return [
    h1('6. Pase del Modelo Entidad-Relación a UML', false),
    p('El modelo entidad-relación se transformó a un diagrama de clases UML de persistencia, usando la misma notación del libro de Kendall & Kendall que el equipo utilizó en el diagrama de clases del SIA-NP: rectángulo con el nombre de la clase, sus atributos y un compartimento de métodos vacío, ya que aquí solo interesa la estructura de los datos. Las reglas aplicadas fueron las siguientes:'),
    pieTabla('Reglas de transformación del MER a UML'),
    tabla(['Elemento del MER', 'Elemento en UML', 'Ejemplo en el SIA-NP'], reglasPase, [2700, 3260, 3400], { size: 17 }),
    p('El diagrama UML resultante se presenta en las páginas siguientes, en hoja horizontal, un diagrama por catálogo con los atributos de sus clases. Las clases de otros catálogos aparecen con borde punteado y solo con su nombre.', { before: 160 }),
  ];
}

// ---------- 5. Modelo lógico ----------
function logico() {
  return [
    h1('7. Base de datos lógica del sistema', false),
    p('El modelo lógico es el paso del modelo conceptual al modelo relacional: cada entidad y cada relación muchos a muchos se convierte en una tabla, cada atributo en una columna con su tipo de dato de SQL Server, y cada relación uno a muchos en una llave foránea del lado «muchos». Las figuras de las páginas siguientes muestran el diagrama de la base de datos en notación de pata de gallo, uno por catálogo, con las columnas, tipos y llaves de cada tabla (las tablas de otros catálogos aparecen con borde punteado y solo con su llave primaria; la etiqueta de cada línea es la columna que funciona como llave foránea).'),
    h2('Reglas de transformación aplicadas'),
    bullet('**Entidad fuerte → tabla** con llave primaria sustituta autoincremental (IDENTITY). Los datos que el usuario ve, como el código interno, el folio o el RFC, se protegen con UNIQUE.'),
    bullet('**Relación 1 : N → llave foránea** en la tabla del lado N. Ejemplo: id_familia en PRODUCTO.'),
    bullet('**Relación M : N → tabla intermedia** con llave primaria compuesta por las dos llaves foráneas y los atributos propios de la relación: PRODUCTO_PROVEEDOR y DETALLE_ORDEN.'),
    bullet('**Entidad débil → tabla** cuya llave primaria incluye la llave de su entidad dueña: DETALLE_CONTEO (id_conteo, id_producto).'),
    bullet('**Especialización → una sola tabla** (MOVIMIENTO) con la columna discriminadora tipo. Se eligió esta opción porque las cuatro subclases tienen los mismos atributos y el kardex necesita consultarlas juntas.'),
    bullet('**Atributo derivado → columna calculada** (iva, total, importe, diferencia).'),
  ];
}

// ---------- 6. Creación ----------
function bloque(desde, hasta) {
  const i = sql.indexOf(desde);
  const j = hasta ? sql.indexOf(hasta, i + 1) : sql.length;
  if (i < 0 || j < 0) throw new Error(`No se encontró el bloque ${desde}`);
  return sql.slice(i, j);
}
function creacion() {
  const conteo = { 'PRIMARY KEY': 14, 'FOREIGN KEY': 22, UNIQUE: 11, CHECK: 42, DEFAULT: 29 };
  const secciones = [
    ['Catálogo 3: Usuarios y seguridad', 'CREATE TABLE ROL', 'CATÁLOGO 1'],
    ['Catálogo 1: Productos y ubicaciones', 'CREATE TABLE FAMILIA', 'CATÁLOGO 2'],
    ['Catálogo 2: Proveedores y compras', 'CREATE TABLE PROVEEDOR', 'CATÁLOGO 4'],
    ['Catálogo 4: Movimientos de almacén', 'CREATE TABLE RECEPCION', '-- Índices para'],
  ];
  const resp = { 'Catálogo 1': catalogos[0].responsable, 'Catálogo 2': catalogos[1].responsable, 'Catálogo 3': catalogos[2].responsable, 'Catálogo 4': catalogos[3].responsable };
  const out = [
    h1('8. Creación de la base de datos', false),
    p('La base de datos se creó en Microsoft SQL Server con el lenguaje T-SQL. El script se probó en SQL Server 2022 y es compatible con SQL Server 2019 y con SQL Server Express; puede ejecutarse desde SQL Server Management Studio en Windows o con la herramienta sqlcmd en Ubuntu. El script completo se entrega junto con este documento en el archivo 01_creacion_SIA_NP.sql.'),
    p('Las tablas se crean en el orden de sus dependencias (primero las tablas padre y después las que tienen llaves foráneas hacia ellas), por eso el catálogo de usuarios va primero: casi todas las tablas de operación registran qué usuario hizo cada cosa.'),
    h2('8.1 Creación de la base de datos'),
    p('Se usa la intercalación Modern_Spanish_CI_AS para que las comparaciones y los ordenamientos respeten el español (ñ y acentos) y no distingan mayúsculas de minúsculas. Si la base de datos ya existe, el script la elimina para poder ejecutarse de nuevo desde cero.'),
    ...codigo(bloque('SET ANSI_NULLS ON;', '/* ====')),
    h2('8.2 Restricciones utilizadas'),
    p('Las reglas de integridad se agregaron como restricciones con nombre (CONSTRAINT), para que el mensaje de error indique exactamente qué regla se violó. Se siguió la convención PK_Tabla, FK_Hija_Padre, UQ_Tabla_campo, CK_Tabla_campo y DF_Tabla_campo.'),
    pieTabla('Restricciones creadas en la base de datos'),
    tabla(['Tipo de restricción', 'Cantidad', 'Para qué se usa en el SIA-NP'], [
      ['PRIMARY KEY', String(conteo['PRIMARY KEY']), 'Identifica cada registro. Simple con IDENTITY o compuesta en las tablas intermedias.'],
      ['FOREIGN KEY', String(conteo['FOREIGN KEY']), 'Integridad referencial: no hay movimientos de productos inexistentes ni órdenes sin proveedor.'],
      ['UNIQUE', `${conteo.UNIQUE} + 1 índice`, 'Evita códigos, folios, RFC y nombres de usuario repetidos. El código de barras usa un índice único filtrado porque es opcional.'],
      ['CHECK', String(conteo.CHECK), 'Dominios (tipos, estados, unidades), rangos (anaquel 1–8, nivel 1–3, intentos 0–3), existencias no negativas y reglas entre columnas (máximo ≥ mínimo, reglas de cada tipo de movimiento).'],
      ['DEFAULT', String(conteo.DEFAULT), 'Valores iniciales: fecha actual, existencia 0.0, activo 1, estado PENDIENTE, moneda MXN, etc.'],
      ['Columnas calculadas', '4', 'iva y total de la orden, importe de la partida y diferencia del conteo (PERSISTED).'],
    ], [2100, 1300, 5960], { size: 17 }),
    h2('8.3 Creación de las tablas por catálogo'),
    p('A continuación se muestra el script de cada catálogo, con el integrante que lo realizó.'),
  ];
  for (const [titulo, desde, hasta] of secciones) {
    out.push(h3(`${titulo} — ${resp[titulo.slice(0, 10)]}`));
    out.push(...codigo(bloque(desde, hasta).replace(/\/\* =+\s*$/, '')));
  }
  return out;
}

// ---------- Normalización a 3FN (punto 7 de la consigna) ----------
function normalizacion() {
  return [
    h1('9. Normalización a la tercera forma normal'),
    p('El diseño de la base de datos se verificó contra las tres primeras formas normales (1FN, 2FN y 3FN). La normalización evita las anomalías de inserción, actualización y borrado que tenía el Excel actual, donde el mismo dato (por ejemplo, la descripción de un producto) se repetía en varias hojas y podía quedar contradictorio.'),
    h2('9.1 Primera forma normal (1FN)'),
    p('Una tabla está en 1FN si todos sus campos son atómicos (un solo valor por celda) y no hay grupos repetidos. En el SIA-NP ninguna tabla guarda listas dentro de una celda: una orden de compra no lleva sus productos en un campo, sino que cada producto es una fila de DETALLE_ORDEN; un conteo no lleva sus renglones en un campo, sino en DETALLE_CONTEO. Toda tabla tiene además una llave primaria que identifica cada fila. Por lo tanto, todas las tablas cumplen la 1FN.'),
    h2('9.2 Segunda forma normal (2FN)'),
    p('Una tabla está en 2FN si está en 1FN y ningún atributo no clave depende solo de una parte de una llave primaria compuesta (no hay dependencias parciales). Esto solo puede fallar en las tablas con llave compuesta. En el SIA-NP son tres:'),
    bullet('**PRODUCTO_PROVEEDOR** (id_producto, id_proveedor): el precio de compra, la moneda y el código del proveedor dependen de la pareja producto-proveedor completa, no de uno solo de los dos.'),
    bullet('**DETALLE_ORDEN** (id_oc, id_producto): la cantidad solicitada, la recibida y el costo dependen de la pareja orden-producto completa.'),
    bullet('**DETALLE_CONTEO** (id_conteo, id_producto): la existencia del sistema, la cantidad contada y la diferencia dependen de la pareja conteo-producto completa.'),
    p('Los datos que dependían solo de una parte de la llave se sacaron a su propia tabla: la descripción del producto no está en DETALLE_ORDEN, sino en PRODUCTO, y se referencia por id_producto. Por lo tanto, todas las tablas cumplen la 2FN.', { before: 80 }),
    h2('9.3 Tercera forma normal (3FN)'),
    p('Una tabla está en 3FN si está en 2FN y ningún atributo no clave depende de otro atributo no clave (no hay dependencias transitivas). Se revisó cada tabla y se eliminaron las dependencias transitivas sacando a tablas de catálogo los datos que dependían de otro campo y no de la llave:'),
    pieTabla('Dependencias transitivas eliminadas para alcanzar la 3FN'),
    tabla(['Dato que dependía de otro no clave', 'Se movió a', 'Se referencia con'], [
      ['Nombre de la familia del producto', 'Tabla FAMILIA', 'PRODUCTO.id_familia (FK)'],
      ['Nombre y datos del rol del usuario', 'Tabla ROL', 'USUARIO.id_rol (FK)'],
      ['Razón social y lead time del proveedor', 'Tabla PROVEEDOR', 'ORDEN_COMPRA.id_proveedor (FK)'],
      ['Datos de la ubicación (pasillo, anaquel, nivel)', 'Tabla UBICACION', 'PRODUCTO.id_ubicacion (FK)'],
    ], [3900, 2760, 2700], { size: 16 }),
    p('Un caso que podría parecer una violación es el campo saldo_resultante de MOVIMIENTO: no es una dependencia transitiva, sino un dato histórico que registra la existencia en el momento exacto del movimiento (el kardex), por lo que se conserva a propósito. Los únicos datos calculados a partir de otras columnas (iva, total, importe, diferencia) no se guardan como datos independientes, sino como columnas calculadas (PERSISTED), que SQL Server recalcula solo y no pueden quedar inconsistentes. Con esto, todas las tablas del SIA-NP están en tercera forma normal.', { before: 80 }),
  ];
}

// ---------- BD creada: captura del Explorador de objetos (punto 8) ----------
function bdCreada() {
  return [
    h1('10. Base de datos creada en el gestor'),
    p('El script de la sección 8 se ejecutó en Microsoft SQL Server. La siguiente figura muestra el Explorador de objetos de SQL Server Management Studio con la base de datos SIA_NP ya creada: sus 14 tablas organizadas en los cuatro catálogos, la tabla PRODUCTO con sus columnas, llave primaria y llaves foráneas, y las tres vistas (vw_KARDEX, vw_PRODUCTOS_BAJO_REORDEN y vw_VALOR_INVENTARIO) que resuelven las salidas de la sección 3.'),
    imagen(path.join(BASE, 'diagramas', '04_bd_creada_object_explorer.png'), 620, 760),
    pie(`Figura ${++nFig}`, 'Base de datos SIA_NP creada en SQL Server: Explorador de objetos con las 14 tablas y las 3 vistas'),
  ];
}

// ---------- documento ----------
const vertical = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const horizontal = { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } };

// numeración de tablas/figuras en orden de aparición
const secPortada = portada();
const secIntro = [...contenido(), ...introduccion(), ...documentosFuente(), ...salidas(), ...diccionario(), ...mer()];
const figMER = figuraHorizontal('01_modelo_entidad_relacion', 'Modelo entidad-relación del SIA-NP (notación de Chen extendida)');
const secUML = uml();
const figUML = figuraHorizontal('02_modelo_uml', 'Diagrama de clases UML obtenido del modelo entidad-relación');
const secLog = logico();
const figLog = figuraHorizontal('03_diagrama_logico', 'Diagrama de la base de datos lógica del SIA-NP (notación pata de gallo; en negritas los campos NOT NULL)');
const secFin = [...creacion(), ...normalizacion(), ...bdCreada()];

const doc = new Document({
  creator: 'Equipo SIA-NP',
  title: 'Proyecto Parte I — Base de datos SIA-NP',
  styles: { default: { document: { run: { font: FONT, size: 22, color: '000000' } } } },
  features: { updateFields: false },
  sections: [
    { properties: vertical, children: secPortada },
    { properties: vertical, children: secIntro },
    { properties: horizontal, children: figMER },
    { properties: vertical, children: secUML },
    { properties: horizontal, children: figUML },
    { properties: vertical, children: secLog },
    { properties: horizontal, children: figLog },
    { properties: vertical, children: secFin },
  ],
});

const salida = path.join(BASE, 'Proyecto_BD_Parte_I_SIA-NP.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(salida, b); console.log('Generado:', salida); });
