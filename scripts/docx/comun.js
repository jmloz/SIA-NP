// Piezas comunes para todos los .docx de SIA-NP (excepto Tarjetas CRC, que conservan su formato).
// Reglas: Arial, carta, todo en negro, gris #E6E6E6 solo en encabezados de tabla/clase, sin números de página.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak, HeadingLevel,
  TableLayoutType, VerticalAlign,
} = require("docx");

const RAIZ = path.resolve(__dirname, "..", "..");
const ASSETS = path.join(RAIZ, "assets");
const FECHA = "9 de noviembre de 2026";
const INTEGRANTES = [
  "Hernández Castro José Martín",
  "Moreno Ramos Adolfo",
  "Olivas Villareal Andrea",
  "Rivera Torres Edgardo",
];
const NEGRO = "000000";
const GRIS = "E6E6E6";
// Carta: 8.5 x 11 in; márgenes de 1 in -> ancho útil 6.5 in = 9360 twips = 468 pt
const ANCHO_UTIL_TWIPS = 9360;
const ANCHO_UTIL_PX = 624; // 6.5 in a 96 dpi (unidades de ImageRun)

const borde = { style: BorderStyle.SINGLE, size: 6, color: NEGRO };
const BORDES = { top: borde, bottom: borde, left: borde, right: borde, insideHorizontal: borde, insideVertical: borde };

function run(texto, op = {}) {
  return new TextRun({ text: texto, font: "Arial", color: NEGRO, size: (op.tam || 11) * 2, bold: !!op.negrita, italics: !!op.cursiva });
}

// p("texto") o p([run(...), run(...)])
function p(contenido, op = {}) {
  const hijos = typeof contenido === "string" ? [run(contenido, op)] : contenido;
  return new Paragraph({
    children: hijos,
    alignment: op.centro ? AlignmentType.CENTER : (op.justificado ? AlignmentType.JUSTIFIED : AlignmentType.LEFT),
    spacing: { before: op.antes ?? 0, after: op.despues ?? 120, line: op.interlineado ?? 264 },
    indent: op.sangria ? { left: op.sangria } : undefined,
    keepNext: !!op.conSiguiente,
    pageBreakBefore: !!op.nuevaPagina,
  });
}

function titulo(texto, nivel = 1, op = {}) {
  const tam = nivel === 1 ? 14 : nivel === 2 ? 12 : 11;
  return new Paragraph({
    children: [run(texto, { tam, negrita: true })],
    heading: nivel === 1 ? HeadingLevel.HEADING_1 : nivel === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: nivel === 1 ? 240 : 180, after: 120 },
    keepNext: true,
    pageBreakBefore: !!op.nuevaPagina,
  });
}

function vineta(contenido, op = {}) {
  const hijos = typeof contenido === "string" ? [run(contenido, op)] : contenido;
  return new Paragraph({ children: hijos, bullet: { level: op.nivel || 0 }, spacing: { after: 60 } });
}

function saltoPagina() {
  return new Paragraph({ children: [new PageBreak()] });
}

// Celda de tabla. contenido: string, array de strings (un párrafo cada uno) o array de Paragraph.
function celda(contenido, op = {}) {
  let parrafos;
  const mk = (t) => p(t, { negrita: op.negrita || op.encabezado, tam: op.tam || 10, despues: 40, centro: op.centro });
  if (typeof contenido === "string") parrafos = [mk(contenido)];
  else parrafos = contenido.map((c) => (typeof c === "string" ? mk(c) : c));
  return new TableCell({
    children: parrafos,
    width: op.ancho ? { size: op.ancho, type: WidthType.DXA } : undefined,
    columnSpan: op.columnas,
    verticalAlign: VerticalAlign.TOP,
    shading: op.encabezado ? { type: ShadingType.CLEAR, color: "auto", fill: GRIS } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

// tabla(anchosTwips, filas) ; filas = [[celda|string,...],...]; la primera fila es encabezado si op.encabezado !== false
function tabla(anchos, filas, op = {}) {
  const conEnc = op.encabezado !== false;
  return new Table({
    width: { size: anchos.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: BORDES,
    rows: filas.map((f, i) => new TableRow({
      tableHeader: conEnc && i === 0,
      cantSplit: !!op.noPartirFilas,
      children: f.map((c, j) => (c instanceof TableCell ? c : celda(c, { encabezado: conEnc && i === 0, ancho: anchos[j], tam: op.tam }))),
    })),
  });
}

// Imagen ajustada al ancho útil (o anchoPx) conservando proporción. ruta: PNG.
function imagen(ruta, op = {}) {
  const buf = fs.readFileSync(ruta);
  // dimensiones PNG desde el encabezado IHDR
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  let anchoPx = op.anchoPx || ANCHO_UTIL_PX;
  let altoPx = Math.round(anchoPx * h / w);
  const altoMax = op.altoMaxPx || 830; // ~8.65 in
  if (altoPx > altoMax) { altoPx = altoMax; anchoPx = Math.round(altoMax * w / h); }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    keepNext: !!op.conSiguiente,
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: anchoPx, height: altoPx } })],
  });
}

function pieFigura(texto) {
  return p(texto, { centro: true, tam: 10, despues: 200 });
}

// Portada unificada (todos los entregables salvo CRC).
// trabajo: p.ej. "Diagrama de estados"; fecha opcional (por defecto FECHA)
function portada(trabajo, fecha = FECHA) {
  const logo = (archivo, ancho) => {
    const buf = fs.readFileSync(path.join(ASSETS, archivo));
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    return new ImageRun({ type: "png", data: buf, transformation: { width: ancho, height: Math.round(ancho * h / w) } });
  };
  const sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const nb = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde };
  const logos = new Table({
    width: { size: ANCHO_UTIL_TWIPS, type: WidthType.DXA },
    columnWidths: [ANCHO_UTIL_TWIPS / 2, ANCHO_UTIL_TWIPS / 2],
    layout: TableLayoutType.FIXED,
    borders: nb,
    rows: [new TableRow({ children: [
      new TableCell({ borders: nb, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [logo("logo_tecnm.png", 150)] })] }),
      new TableCell({ borders: nb, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [logo("logo_ith.png", 90)] })] }),
    ] })],
  });
  const c = (t, op = {}) => p(t, { centro: true, tam: op.tam || 12, negrita: op.negrita, despues: op.despues ?? 0, antes: op.antes ?? 0 });
  const etiqueta = (t) => c(t, { negrita: true, antes: 240 });
  return [
    logos,
    c("TECNOLÓGICO NACIONAL DE MÉXICO", { negrita: true, tam: 13, antes: 600 }),
    c("INSTITUTO TECNOLÓGICO DE HERMOSILLO", { negrita: true, tam: 13 }),
    c("Ingeniería en Sistemas Computacionales", { antes: 240 }),
    etiqueta("Materia:"),
    c("Fundamentos de Ingeniería de Software"),
    etiqueta("Trabajo:"),
    c(trabajo),
    c("Sistema de Inventario y Almacén (SIA-NP) — Neumática del Pacífico"),
    etiqueta("Profesora:"),
    c("Bettina Elisa Santa Cruz Welsh"),
    etiqueta("Grupo:"),
    c("S5A"),
    etiqueta("Integrantes:"),
    ...INTEGRANTES.map((n) => c(n)),
    c(`Hermosillo, Sonora, ${fecha}`, { antes: 720 }),
    saltoPagina(),
  ];
}

// Documento carta, Arial, márgenes 1 in, sin encabezados/pies ni numeración.
function documento(hijos, op = {}) {
  const horizontal = !!op.horizontal;
  return new Document({
    creator: "Equipo Grupo S5A",
    title: op.titulo || "SIA-NP",
    styles: {
      default: { document: { run: { font: "Arial", size: 22, color: NEGRO } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 28, bold: true, color: NEGRO } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 24, bold: true, color: NEGRO } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 22, bold: true, color: NEGRO } },
      ],
    },
    // Cada sección es un arreglo de hijos o { hijos, horizontal: true, margen: twips } para una sección
    // horizontal y/o con márgenes propios (por defecto 1440 = 1 in).
    sections: (op.secciones || [hijos]).map((s) => ({
      properties: { page: {
        size: { width: 12240, height: 15840, orientation: (s.horizontal ? "landscape" : "portrait") },
        margin: { top: s.margen ?? 1440, bottom: s.margen ?? 1440, left: s.margen ?? 1440, right: s.margen ?? 1440 },
      } },
      children: Array.isArray(s) ? s : s.hijos,
    })),
  });
}

async function guardar(doc, rutaDocx) {
  fs.writeFileSync(rutaDocx, await Packer.toBuffer(doc));
  console.log("Escrito", rutaDocx);
}

module.exports = {
  RAIZ, ASSETS, FECHA, INTEGRANTES, GRIS, ANCHO_UTIL_TWIPS, ANCHO_UTIL_PX,
  run, p, titulo, vineta, saltoPagina, celda, tabla, imagen, pieFigura, portada, documento, guardar,
  docx: require("docx"),
};
