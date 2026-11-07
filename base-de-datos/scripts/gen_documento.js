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
    children: [new TextRun({ text: l.length ? l : ' ', font: MONO, size: 15, color: '000000' })],
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
  const items = [
    'Integrantes del equipo y catálogos asignados',
    '1. Introducción',
    '    1.1 Descripción del problema',
    '    1.2 Objetivo general',
    '    1.3 Objetivos específicos',
    '    1.4 Alcance de la base de datos',
    '2. Diccionario de datos',
    '3. Modelo Entidad-Relación',
    '4. Pase del Modelo Entidad-Relación a UML',
    '5. Base de datos lógica del sistema',
    '6. Creación de la base de datos',
    '7. Conclusiones',
    'Referencias',
  ];
  return [
    h1('Contenido', false),
    ...items.map((t) => p(t, { align: AlignmentType.LEFT, after: 80 })),
    espacio(),
    h2('Integrantes del equipo y catálogos asignados'),
    p('Conforme a la indicación del taller, cada integrante realizó lo correspondiente a un catálogo de la base de datos: su parte del diccionario de datos, sus entidades en el modelo entidad-relación y en UML, y las sentencias de creación de sus tablas con sus restricciones.'),
    pieTabla('Integrantes y catálogo a cargo de cada uno'),
    tabla(['Integrante', 'Catálogo', 'Tablas', 'Requerimientos'],
      catalogos.map((c) => [c.responsable, `${c.num}. ${c.nombre}`, c.tablas.join('\n'), c.rf]),
      [2700, 2100, 2760, 1800], { size: 18 }),
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
    p('Diseñar y crear la base de datos relacional del SIA-NP en Microsoft SQL Server, partiendo del análisis orientado a objetos del sistema, de modo que almacene de forma única, consistente y verificable los productos, ubicaciones, proveedores, órdenes de compra, recepciones, movimientos de almacén, conteos físicos y usuarios de Neumática del Pacífico.'),
    h2('1.3 Objetivos específicos'),
    bullet('Elaborar el diccionario de datos con el tipo, la obligatoriedad, las llaves y las reglas de cada campo.'),
    bullet('Construir el modelo entidad-relación con sus entidades, atributos, relaciones y cardinalidades.'),
    bullet('Pasar el modelo entidad-relación a un diagrama de clases UML y relacionarlo con el diagrama de clases del sistema.'),
    bullet('Obtener el modelo lógico (tablas, llaves primarias y foráneas) en tercera forma normal.'),
    bullet('Crear la base de datos y sus tablas con restricciones PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK y DEFAULT, y comprobar que las reglas de integridad funcionan.'),
    h2('1.4 Alcance de la base de datos'),
    p('La base de datos cubre los módulos de Seguridad, Catálogos, Almacén y Compras del SIA-NP. Los indicadores del módulo de Dirección (dashboard y reportes) no se guardan en tablas propias: se calculan a partir de los datos mediante vistas. La base de datos se organizó en los cuatro catálogos siguientes:'),
    ...catalogos.map((c) => bullet(`**Catálogo ${c.num}. ${c.nombre}** (${c.responsable}): ${c.tablas.join(', ')}.`)),
    p('En total son 14 tablas, 3 vistas y 2 índices adicionales. Quedan fuera de esta primera parte los procedimientos almacenados, los disparadores (triggers) y las integraciones con CONTPAQi y con el PAC para CFDI 4.0, que la ERS también deja para una fase posterior.', { before: 120 }),
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
    h1('2. Diccionario de datos'),
    p('El diccionario de datos describe cada tabla y cada uno de sus campos. Los tipos, la obligatoriedad, las llaves y los valores por defecto se extrajeron directamente del catálogo de SQL Server (sys.columns) después de ejecutar el script de creación, por lo que coinciden exactamente con la base de datos creada.'),
    p('Abreviaturas usadas en las tablas:'),
    bullet('**PK**: llave primaria. **FK → TABLA**: llave foránea que apunta a esa tabla. **UQ**: valor único (no se repite).'),
    bullet('**Nulo**: «No» significa campo obligatorio (NOT NULL); «Sí» significa que puede quedar vacío.'),
    bullet('**IDENTITY(1,1)**: número autoincremental que asigna el SGBD. **Calculada**: columna que SQL Server calcula a partir de otras.'),
    bullet('Tipos usados: INT, BIGINT, SMALLINT y TINYINT (enteros); DECIMAL(p,s) (numéricos con decimales); VARCHAR(n) y CHAR(n) (texto); DATE y DATETIME2 (fechas); BIT (verdadero/falso).'),
    pieTabla('Resumen de tablas de la base de datos'),
    tabla(['Catálogo', 'Tabla', 'Campos', 'Descripción'],
      catalogos.flatMap((c) => c.tablas.map((t) => [`${c.num}. ${c.nombre}`, t, String(meta.filter((m) => m.tabla === t).length), tablas[t]])),
      [1900, 2100, 860, 4500], { size: 17 }),
  ];
  for (const c of catalogos) {
    out.push(h2(`2.${c.num} Catálogo ${c.num}: ${c.nombre}`));
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
const relacionesER = [
  ['ROL', 'asigna', 'USUARIO', '1 : N', 'Un rol se asigna a muchos usuarios; cada usuario tiene un solo rol.'],
  ['USUARIO', 'genera', 'BITACORA_AUDITORIA', '1 : N', 'Cada operación de la bitácora la hizo un usuario.'],
  ['USUARIO', 'registra', 'MOVIMIENTO', '1 : N', 'Cada movimiento tiene un usuario responsable.'],
  ['USUARIO', 'elabora', 'ORDEN_COMPRA', '1 : N', 'La encargada de compras elabora las órdenes.'],
  ['USUARIO', 'captura', 'RECEPCION', '1 : N', 'Cada recepción la captura un usuario.'],
  ['USUARIO', 'realiza', 'INVENTARIO_FISICO', '1 : N', 'Cada conteo lo realiza un usuario.'],
  ['FAMILIA', 'clasifica', 'PRODUCTO', '1 : N', 'Cada producto pertenece a una familia.'],
  ['FAMILIA', 'abarca', 'INVENTARIO_FISICO', '1 : N', 'Un conteo cíclico abarca una familia (el total, ninguna).'],
  ['UBICACION', 'contiene', 'PRODUCTO', '1 : N', 'Una ubicación guarda varios productos; un producto tiene una ubicación asignada.'],
  ['UBICACION', 'ocurre en', 'MOVIMIENTO', '1 : N', 'Cada movimiento se hace en una ubicación.'],
  ['PRODUCTO', 'afecta', 'MOVIMIENTO', '1 : N', 'Cada movimiento afecta a un solo producto.'],
  ['PROVEEDOR', 'surte', 'PRODUCTO', 'M : N', 'Un proveedor surte muchos productos y un producto lo surten varios proveedores. Atributos: codigo_proveedor, precio_compra, moneda.'],
  ['PROVEEDOR', 'recibe', 'ORDEN_COMPRA', '1 : N', 'Cada orden se envía a un proveedor.'],
  ['ORDEN_COMPRA', 'solicita', 'PRODUCTO', 'M : N', 'Una orden pide varios productos y un producto aparece en varias órdenes. Atributos: cantidad_solicitada, cantidad_recibida, costo_unitario.'],
  ['ORDEN_COMPRA', 'se surte con', 'RECEPCION', '1 : N', 'Una orden puede recibirse en una o varias entregas (parciales).'],
  ['RECEPCION', 'genera', 'MOVIMIENTO', '1 : N', 'Cada partida recibida genera una entrada al almacén.'],
  ['INVENTARIO_FISICO', 'origina', 'MOVIMIENTO', '1 : N', 'Las diferencias autorizadas de un conteo originan ajustes.'],
  ['INVENTARIO_FISICO', 'incluye', 'DETALLE_CONTEO', '1 : N', 'Relación identificadora: el detalle no existe sin su conteo.'],
  ['PRODUCTO', 'se cuenta en', 'DETALLE_CONTEO', '1 : N', 'Relación identificadora: cada línea del conteo es de un producto.'],
  ['UBICACION', 'se verifica en', 'DETALLE_CONTEO', '1 : N', 'Ubicación donde se hizo el conteo del producto.'],
];
function figuraHorizontal(base, titulo) {
  const out = [];
  const dir = path.join(BASE, 'diagramas');
  const partes = fs.readdirSync(dir).filter((f) => f.startsWith(base) && f.endsWith('.png')).sort();
  if (!partes.length) throw new Error(`No existe la figura ${base}`);
  partes.forEach((f, i) => {
    out.push(imagen(path.join(dir, f), 900, 600));
    const suf = partes.length > 1 ? ` (parte ${i + 1} de ${partes.length})` : '';
    out.push(pie(`Figura ${++nFig}`, titulo + suf));
    if (i < partes.length - 1) out.push(new Paragraph({ children: [new PageBreak()] }));
  });
  return out;
}

function mer() {
  return [
    h1('3. Modelo Entidad-Relación'),
    p('El modelo entidad-relación (MER) representa los datos que el SIA-NP debe guardar, sin pensar todavía en tablas. Se obtuvo de las clases de entidad del diagrama de clases del sistema y de la descripción lógica de datos de la ERS (sección 4.1). Se usó la notación de Chen extendida:'),
    bullet('**Rectángulo**: entidad. **Doble rectángulo**: entidad débil (DETALLE_CONTEO).'),
    bullet('**Rombo**: relación, nombrada con un verbo. **Doble rombo**: relación identificadora de la entidad débil.'),
    bullet('**Óvalo**: atributo; el atributo clave va subrayado y el atributo derivado en óvalo punteado. Para que el diagrama sea legible solo se muestran la clave y algunos atributos representativos; la lista completa está en el diccionario de datos.'),
    bullet('**1, N, M**: cardinalidad de cada extremo de la relación.'),
    bullet('**Círculo con «d»**: especialización disjunta de MOVIMIENTO en ENTRADA, SALIDA, AJUSTE y DEVOLUCION; la doble línea indica que es total (todo movimiento es de uno de los cuatro tipos). El discriminador es el atributo tipo.'),
    p('La figura del modelo se presenta en la página siguiente, en hoja horizontal.'),
    pieTabla('Relaciones del modelo entidad-relación'),
    tabla(['Entidad', 'Relación', 'Entidad', 'Card.', 'Significado'],
      relacionesER, [1700, 1150, 1850, 700, 3960], { size: 16 }),
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
  const correspondencia = [
    ['Usuario', 'USUARIO + ROL', 'El atributo rol: char{E,A,C,D,X} se separó en la tabla ROL para no repetir el nombre del rol.'],
    ['Producto', 'PRODUCTO + FAMILIA', 'El atributo familia: String se convirtió en catálogo para evitar familias escritas de formas distintas.'],
    ['Ubicacion', 'UBICACION', 'Igual. claveUbicacion → clave.'],
    ['Movimiento, Entrada, Salida, Ajuste, Devolucion', 'MOVIMIENTO', 'Las cinco clases se guardan en una sola tabla; tipo indica la subclase y las restricciones CHECK aplican las reglas de cada subclase.'],
    ['Kardex', 'vw_KARDEX (vista)', 'El kardex es el historial de movimientos de un producto con su saldo: se obtiene de MOVIMIENTO sin duplicar datos.'],
    ['InventarioFisico', 'INVENTARIO_FISICO + DETALLE_CONTEO', 'cantidadContada y diferencia son por producto, así que se pasaron al detalle del conteo.'],
    ['Proveedor', 'PROVEEDOR + PRODUCTO_PROVEEDOR', 'La asociación «surte» 1..* — 1..* se resolvió con la tabla intermedia, que además guarda el precio.'],
    ['OrdenDeCompra', 'ORDEN_COMPRA', 'iva y total se calculan; estado toma los valores del diagrama de estados.'],
    ['DetalleOrden', 'DETALLE_ORDEN', 'Clase de asociación → tabla con llave compuesta (id_oc, id_producto).'],
    ['Recepcion', 'RECEPCION', 'cantidadRecibida y saldoPendiente son por partida y ya están en DETALLE_ORDEN.'],
    ['BitacoraDeAuditoria', 'BITACORA_AUDITORIA', 'Igual.'],
    ['Reporte, DashboardEjecutivo', 'vw_PRODUCTOS_BAJO_REORDEN, vw_VALOR_INVENTARIO', 'Son resultados de cálculos, no datos que se capturen: se implementan como vistas.'],
    ['Interfaz, InterfazRegistroMovimientos, InterfazRecepcion, ControladorMovimientos, ControladorRecepcion', '— (no persisten)', 'Las clases de interfaz y de control no guardan datos; solo existen en la aplicación.'],
  ];
  return [
    h1('4. Pase del Modelo Entidad-Relación a UML', false),
    p('El modelo entidad-relación se transformó a un diagrama de clases UML de persistencia, usando la misma notación del libro de Kendall & Kendall que el equipo utilizó en el diagrama de clases del SIA-NP: rectángulo con el nombre de la clase, sus atributos y un compartimento de métodos vacío, ya que aquí solo interesa la estructura de los datos. Las reglas aplicadas fueron las siguientes:'),
    pieTabla('Reglas de transformación del MER a UML'),
    tabla(['Elemento del MER', 'Elemento en UML', 'Ejemplo en el SIA-NP'], reglasPase, [2700, 3260, 3400], { size: 17 }),
    p('El diagrama UML resultante se presenta en la página siguiente, en hoja horizontal.', { before: 160 }),
    h2('4.1 Correspondencia con el diagrama de clases del sistema'),
    p('El diagrama de clases del SIA-NP (Fundamentos de Ingeniería de Software) tiene 22 clases. La siguiente tabla indica en qué se convirtió cada una al diseñar la base de datos:'),
    pieTabla('Clases del sistema y su representación en la base de datos'),
    tabla(['Clase del sistema', 'Tabla o vista', 'Observación'], correspondencia, [2700, 2500, 4160], { size: 17 }),
  ];
}

// ---------- 5. Modelo lógico ----------
function esquemaRelacional(t) {
  const filas = meta.filter((m) => m.tabla === t).sort((a, b) => a.orden - b.orden);
  return filas.map((r) => {
    let n = r.columna;
    if (r.pk) n = `PK:${n}`;
    if (r.fk) n += ` (FK)`;
    return n;
  }).join(', ');
}
function logico() {
  const fks = [];
  const vistas = new Set();
  for (const m of meta) if (m.fk) {
    const k = `${m.tabla}.${m.columna}`;
    if (vistas.has(k)) continue;
    vistas.add(k);
    let accion = 'NO ACTION';
    if (['PRODUCTO.id_ubicacion'].includes(k)) accion = 'SET NULL';
    if (['PRODUCTO_PROVEEDOR.id_producto', 'PRODUCTO_PROVEEDOR.id_proveedor', 'DETALLE_ORDEN.id_oc', 'DETALLE_CONTEO.id_conteo'].includes(k)) accion = 'CASCADE';
    fks.push([m.tabla, m.columna, m.fk, m.nulo ? '0..1' : '1', accion]);
  }
  return [
    h1('5. Base de datos lógica del sistema', false),
    p('El modelo lógico es el paso del modelo conceptual al modelo relacional: cada entidad y cada relación muchos a muchos se convierte en una tabla, cada atributo en una columna con su tipo de dato de SQL Server, y cada relación uno a muchos en una llave foránea del lado «muchos». La figura de la página siguiente muestra el diagrama de la base de datos en notación de pata de gallo; después se presenta el esquema relacional en texto y la lista de llaves foráneas.'),
    h2('5.1 Reglas de transformación aplicadas'),
    bullet('**Entidad fuerte → tabla** con llave primaria sustituta autoincremental (IDENTITY). Los datos que el usuario ve, como el código interno, el folio o el RFC, se protegen con UNIQUE.'),
    bullet('**Relación 1 : N → llave foránea** en la tabla del lado N. Ejemplo: id_familia en PRODUCTO.'),
    bullet('**Relación M : N → tabla intermedia** con llave primaria compuesta por las dos llaves foráneas y los atributos propios de la relación: PRODUCTO_PROVEEDOR y DETALLE_ORDEN.'),
    bullet('**Entidad débil → tabla** cuya llave primaria incluye la llave de su entidad dueña: DETALLE_CONTEO (id_conteo, id_producto).'),
    bullet('**Especialización → una sola tabla** (MOVIMIENTO) con la columna discriminadora tipo. Se eligió esta opción porque las cuatro subclases tienen los mismos atributos y el kardex necesita consultarlas juntas en orden cronológico.'),
    bullet('**Atributo derivado → columna calculada** (iva, total, importe, diferencia) o vista (kardex, reportes).'),
    h2('5.2 Normalización'),
    p('Las tablas se revisaron hasta la tercera forma normal (3FN):'),
    bullet('**1FN**: todos los campos son atómicos y no hay grupos repetidos. Las partidas de una orden de compra y las líneas de un conteo, que en una hoja de cálculo estarían en columnas repetidas, se separaron en DETALLE_ORDEN y DETALLE_CONTEO.'),
    bullet('**2FN**: en las tablas con llave compuesta (PRODUCTO_PROVEEDOR, DETALLE_ORDEN, DETALLE_CONTEO) cada campo depende de la llave completa. Por ejemplo, la descripción del producto no se guarda en DETALLE_ORDEN porque depende solo de id_producto.'),
    bullet('**3FN**: no hay dependencias transitivas. El nombre de la familia, del rol y de la ubicación se guardan una sola vez en su catálogo y las demás tablas solo guardan la llave. Esto corrige la duplicación de números de parte detectada en el Excel actual.'),
    p('Como excepciones controladas, PRODUCTO.existencia y MOVIMIENTO.saldo_resultante guardan un valor que podría calcularse sumando los movimientos. Se conservan porque la consulta de existencias debe responder en pocos segundos (RNF1) y porque el kardex debe mostrar el saldo de cada movimiento; la aplicación los actualiza dentro de la misma transacción que registra el movimiento (RNF2).'),
    h2('5.3 Esquema relacional'),
    p('Notación: PK = llave primaria; (FK) = llave foránea.', { after: 80 }),
    ...catalogos.flatMap((c) => c.tablas.map((t) => p([run(`${t} `, { bold: true, size: 20 }), run(`(${esquemaRelacional(t)})`, { size: 20 })], { align: AlignmentType.LEFT, after: 80 }))),
    h2('5.4 Llaves foráneas'),
    p('La siguiente tabla lista las 22 llaves foráneas de la base de datos. La columna «Mult.» indica si la relación es obligatoria (1) u opcional (0..1, la llave foránea admite nulos). La acción ON DELETE indica qué pasa con los registros hijos al borrar el registro padre: NO ACTION impide el borrado, CASCADE borra los hijos y SET NULL deja la llave foránea vacía.'),
    pieTabla('Llaves foráneas y regla de borrado'),
    tabla(['Tabla hija', 'Columna', 'Tabla padre', 'Mult.', 'ON DELETE'], fks, [2400, 1900, 2300, 900, 1860], { size: 17 }),
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
  const pruebas = [
    ['UNIQUE', 'Clave de rol repetida (E)', 'UQ_ROL_clave'],
    ['CHECK', 'Rol con clave Z', 'CK_ROL_clave'],
    ['FOREIGN KEY', 'Usuario con un rol que no existe', 'FK_USUARIO_ROL'],
    ['CHECK', 'Cuatro intentos fallidos de inicio de sesión', 'CK_USUARIO_intentos'],
    ['CHECK', 'Correo sin arroba', 'CK_USUARIO_correo'],
    ['UNIQUE', 'Código interno de producto repetido', 'UQ_PRODUCTO_codigo_interno'],
    ['UNIQUE (índice)', 'Código de barras repetido', 'UX_PRODUCTO_codigo_barras'],
    ['CHECK', 'Existencia negativa', 'CK_PRODUCTO_existencia'],
    ['CHECK', 'Máximo menor que el mínimo', 'CK_PRODUCTO_maximo'],
    ['CHECK', 'Unidad de medida CAJA', 'CK_PRODUCTO_unidad'],
    ['CHECK', 'Anaquel 9', 'CK_UBICACION_anaquel'],
    ['CHECK', 'Ubicación de pasillo sin nivel', 'CK_UBICACION_estructura'],
    ['CHECK', 'Proveedor con clasificación EXTRANJERO', 'CK_PROVEEDOR_clasificacion'],
    ['CHECK', 'RFC de 6 caracteres', 'CK_PROVEEDOR_rfc'],
    ['CHECK', 'Precio de compra en cero', 'CK_PRODPROV_precio'],
    ['CHECK', 'Orden de compra en estado PERDIDA', 'CK_OC_estado'],
    ['CHECK', 'Fecha de entrega anterior a la emisión', 'CK_OC_fecha_entrega'],
    ['PRIMARY KEY', 'Mismo producto dos veces en una orden', 'PK_DETALLE_ORDEN'],
    ['CHECK', 'Partida con cantidad cero', 'CK_DETORD_solicitada'],
    ['FOREIGN KEY', 'Recepción de una orden inexistente', 'FK_RECEPCION_OC'],
    ['CHECK', 'Movimiento de tipo T', 'CK_MOV_tipo'],
    ['CHECK', 'Salida con cantidad negativa', 'CK_MOV_cantidad'],
    ['CHECK', 'Salida ligada a una recepción', 'CK_MOV_recepcion'],
    ['CHECK', 'Ajuste sin motivo', 'CK_MOV_motivo'],
    ['CHECK', 'Entrada sin documento de referencia', 'CK_MOV_documento'],
    ['CHECK', 'Conteo cíclico sin familia', 'CK_INVFIS_familia'],
    ['CHECK', 'Acción de bitácora BORRAR', 'CK_BITACORA_accion'],
    ['FOREIGN KEY', 'Borrar un producto con historial', 'FK_DETORD_PRODUCTO'],
  ];
  const secciones = [
    ['Catálogo 3: Usuarios y seguridad', 'CREATE TABLE ROL', 'CATÁLOGO 1'],
    ['Catálogo 1: Productos y ubicaciones', 'CREATE TABLE FAMILIA', 'CATÁLOGO 2'],
    ['Catálogo 2: Proveedores y compras', 'CREATE TABLE PROVEEDOR', 'CATÁLOGO 4'],
    ['Catálogo 4: Movimientos de almacén', 'CREATE TABLE RECEPCION', '-- Índices para'],
  ];
  const resp = { 'Catálogo 1': catalogos[0].responsable, 'Catálogo 2': catalogos[1].responsable, 'Catálogo 3': catalogos[2].responsable, 'Catálogo 4': catalogos[3].responsable };
  const out = [
    h1('6. Creación de la base de datos', false),
    p('La base de datos se creó en Microsoft SQL Server con el lenguaje T-SQL. El script se probó en SQL Server 2022 y es compatible con SQL Server 2019 y con SQL Server Express; puede ejecutarse desde SQL Server Management Studio en Windows o con la herramienta sqlcmd en Ubuntu. Los scripts se entregan junto con este documento:'),
    bullet('**01_creacion_SIA_NP.sql**: crea la base de datos, las 14 tablas, los índices y las 3 vistas.'),
    bullet('**02_datos_prueba.sql**: inserta algunos registros de ejemplo en cada catálogo.'),
    bullet('**03_pruebas_integridad.sql**: intenta 28 operaciones inválidas para comprobar que las restricciones las rechazan.'),
    p('Las tablas se crean en el orden de sus dependencias (primero las tablas padre y después las que tienen llaves foráneas hacia ellas), por eso el catálogo de usuarios va primero: casi todas las tablas de operación registran qué usuario hizo cada cosa.'),
    h2('6.1 Creación de la base de datos'),
    p('Se usa la intercalación Modern_Spanish_CI_AS para que las comparaciones y los ordenamientos respeten el español (ñ y acentos) y no distingan mayúsculas de minúsculas. Si la base de datos ya existe, el script la elimina para poder ejecutarse de nuevo desde cero.'),
    ...codigo(bloque('SET ANSI_NULLS ON;', '/* ====')),
    h2('6.2 Restricciones utilizadas'),
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
    h2('6.3 Creación de las tablas por catálogo'),
    p('A continuación se muestra el script de cada catálogo, con el integrante que lo realizó. El script completo se entrega en el archivo 01_creacion_SIA_NP.sql.'),
  ];
  for (const [titulo, desde, hasta] of secciones) {
    out.push(h3(`${titulo} — ${resp[titulo.slice(0, 10)]}`));
    out.push(...codigo(bloque(desde, hasta).replace(/\/\* =+\s*$/, '')));
  }
  out.push(
    h2('6.4 Vistas'),
    p('Las clases Kardex, Reporte y DashboardEjecutivo del diagrama de clases se implementaron como vistas, porque su información se calcula a partir de otras tablas:'),
    bullet('**vw_KARDEX**: historial cronológico de cada producto con entradas, salidas, saldo, documento y usuario (RF4).'),
    bullet('**vw_PRODUCTOS_BAJO_REORDEN**: productos cuya existencia llegó al punto de reorden, con la cantidad sugerida para llegar al máximo (RF14).'),
    bullet('**vw_VALOR_INVENTARIO**: valor del inventario por familia para el dashboard ejecutivo (RF17).'),
    ...codigo(bloque('CREATE VIEW vw_KARDEX')),
    h2('6.5 Comprobación'),
    p('Se ejecutaron los tres scripts en SQL Server 2022. El primero terminó sin errores y creó las 14 tablas; el segundo cargó los datos de prueba (5 roles, 5 usuarios, 5 familias, 5 ubicaciones, 5 productos, 3 proveedores, 2 órdenes de compra, 1 recepción parcial, 1 conteo cíclico y 4 movimientos); el tercero intentó 28 operaciones que violan las reglas de integridad. Las 28 fueron rechazadas por la restricción esperada:'),
    pieTabla('Pruebas de las reglas de integridad (todas rechazadas correctamente)'),
    tabla(['#', 'Tipo', 'Operación intentada', 'Restricción que la rechazó'],
      pruebas.map((r, i) => [String(i + 1), r[0], r[1], r[2]]), [500, 1600, 4060, 3200], { size: 16, monoCols: [] }),
    p('Además, las vistas devolvieron los resultados esperados con los datos de prueba. Por ejemplo, el kardex de la manguera MAN-PU-08 muestra la entrada de 100 m por la recepción REC-2026-0001 (saldo 420) y la salida de 30 m con el vale V-2231 (saldo 390); la orden OC-2026-0001 con subtotal de $2,512.50 calcula automáticamente un IVA de $402.00 y un total de $2,914.50.', { before: 160 }),
  );
  return out;
}

function conclusiones() {
  return [
    h1('7. Conclusiones'),
    p('Partir del análisis orientado a objetos hecho en Fundamentos de Ingeniería de Software facilitó el diseño de la base de datos: las clases de entidad del diagrama de clases y las propiedades de las tarjetas CRC se convirtieron casi directamente en entidades y atributos. Las diferencias aparecieron al normalizar: atributos como la familia del producto o el rol del usuario se separaron en catálogos, la jerarquía de movimientos se guardó en una sola tabla, y clases como el Kardex y los reportes resultaron ser vistas y no tablas.'),
    p('Las restricciones CHECK, UNIQUE y FOREIGN KEY trasladan a la base de datos reglas que hoy dependen de la atención del personal, como no tener existencias negativas, no repetir códigos o no registrar una entrada sin factura. Así la propia base de datos ayuda a cumplir el requisito de confiabilidad que pidió el encargado de almacén y la meta de la dirección de bajar la diferencia entre el inventario físico y el del sistema a menos del 1 %.'),
    h1('Referencias', false),
    p('Kendall, K. E. y Kendall, J. E. (2011). Análisis y diseño de sistemas (8.ª ed.). Pearson Educación. Cap. 10: Análisis y diseño de sistemas orientados a objetos mediante el uso de UML.', { align: AlignmentType.LEFT }),
    p('Microsoft. (2024). Documentación de Transact-SQL: CREATE TABLE, restricciones y columnas calculadas. Microsoft Learn.', { align: AlignmentType.LEFT }),
    p('Equipo SIA-NP. (2026). Especificación de Requisitos de Software — Sistema de Inventario y Almacén, Neumática del Pacífico. Instituto Tecnológico de Hermosillo.', { align: AlignmentType.LEFT }),
    p('Equipo SIA-NP. (2026). Diagrama de clases del SIA-NP. Fundamentos de Ingeniería de Software, Instituto Tecnológico de Hermosillo.', { align: AlignmentType.LEFT }),
  ];
}

// ---------- documento ----------
const vertical = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const horizontal = { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } };

// numeración de tablas/figuras en orden de aparición
const secPortada = portada();
const secIntro = [...contenido(), ...introduccion(), ...diccionario(), ...mer()];
const figMER = figuraHorizontal('01_modelo_entidad_relacion', 'Modelo entidad-relación del SIA-NP (notación de Chen extendida)');
const secUML = uml();
const figUML = figuraHorizontal('02_modelo_uml', 'Diagrama de clases UML obtenido del modelo entidad-relación');
const secLog = logico();
const figLog = figuraHorizontal('03_diagrama_logico', 'Diagrama de la base de datos lógica del SIA-NP (notación pata de gallo; en negritas los campos NOT NULL)');
const secFin = [...creacion(), ...conclusiones()];

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
