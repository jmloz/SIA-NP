// Genera entregables/03-crc/Tarjetas_CRC_SIA-NP.docx reproduciendo el PDF entregado (no cambia el contenido).
// La portada de las CRC es distinta de la unificada: logo TecNM horizontal, fecha del 2 de octubre de 2026.
const fs = require("fs");
const path = require("path");
const C = require("./comun");
const {
  Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType, WidthType,
  BorderStyle, ShadingType, TableLayoutType, VerticalAlign,
} = C.docx;

const NEGRO = "000000";
const ANCHOS = [2700, 1908, 2682, 2070];
const borde = { style: BorderStyle.SINGLE, size: 4, color: NEGRO };
const BORDES = { top: borde, bottom: borde, left: borde, right: borde };
const sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NB = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };

const tr = (t, o = {}) => new TextRun({ text: t, font: "Arial", color: NEGRO, size: (o.tam || 11) * 2, bold: !!o.negrita });
const par = (runs, o = {}) => new Paragraph({
  children: runs,
  alignment: o.centro ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { before: o.antes ?? 0, after: o.despues ?? 0, line: o.linea ?? 276 },
  pageBreakBefore: !!o.nuevaPagina,
});

// ---- Portada ----
function imagen(archivo, ancho, alto) {
  return new ImageRun({ type: "png", data: fs.readFileSync(archivo), transformation: { width: ancho, height: alto } });
}
function portada() {
  const logos = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    layout: TableLayoutType.FIXED,
    borders: { ...NB, insideHorizontal: sinBorde, insideVertical: sinBorde },
    rows: [new TableRow({ children: [
      new TableCell({ borders: NB, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [imagen(path.join(__dirname, "assets_crc", "logo_tecnm_horizontal.png"), 220, 100)] })] }),
      new TableCell({ borders: NB, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [imagen(path.join(C.ASSETS, "logo_ith.png"), 104, 106)] })] }),
    ] })],
  });
  return [
    logos,
    par([tr("TECNOLÓGICO NACIONAL DE MÉXICO", { negrita: true, tam: 12 })], { centro: true, antes: 600 }),
    par([tr("Instituto Tecnológico de Hermosillo", { tam: 12 })], { centro: true }),
    par([tr("Ingeniería en Sistemas Computacionales")], { centro: true, antes: 600, despues: 120 }),
    par([tr("Materia: Fundamentos de Ingeniería de Software")], { centro: true, despues: 120 }),
    par([tr("Tarjetas CRC y pensamiento en objetos", { negrita: true, tam: 14 })], { centro: true, antes: 480, despues: 240 }),
    par([tr("Sistema de Inventario y Almacén — Neumática del Pacífico (SIA-NP)")], { centro: true, despues: 360 }),
    par([tr("Profesora:", { negrita: true })], { centro: true, antes: 240, despues: 60 }),
    par([tr("Bettina Elisa Santa Cruz Welsh")], { centro: true, despues: 240 }),
    par([tr("Grupo: S5A")], { centro: true, despues: 240 }),
    par([tr("Integrantes:", { negrita: true })], { centro: true, despues: 60 }),
    ...C.INTEGRANTES.map((n) => par([tr(n)], { centro: true })),
    par([tr("Hermosillo, Sonora, a 2 de octubre de 2026")], { centro: true, antes: 600 }),
  ];
}

// ---- Tarjetas ----
const TAM = 8.5;
function cel(contenido, ancho, o = {}) {
  const runs = Array.isArray(contenido) ? contenido : [tr(contenido, { tam: TAM, negrita: o.negrita })];
  return new TableCell({
    children: [par(runs, { linea: 300 })],
    width: { size: ancho, type: WidthType.DXA },
    columnSpan: o.span,
    verticalAlign: VerticalAlign.CENTER,
    borders: BORDES,
    shading: o.gris ? { type: ShadingType.CLEAR, color: "auto", fill: C.GRIS } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}
const filaCompleta = (etq, valor, tamEtq) => new TableRow({ cantSplit: true, children: [
  cel([tr(etq, { tam: tamEtq, negrita: true }), tr(valor ? " " + valor : "", { tam: TAM })], 9360, { span: 4, gris: true }),
] });

function tarjeta(nombre, subclases, r, c, pe, pr) {
  const n = Math.max(r.length, c.length, pe.length, pr.length);
  const filas = [
    filaCompleta("Nombre de la clase:", nombre, 9),
    filaCompleta("Superclases:", "", 8.5),
    filaCompleta("Subclases:", subclases, 8.5),
    new TableRow({ cantSplit: true, children: ["Responsabilidades", "Colaboradores", "Pensamiento en objetos", "Propiedad"].map((t, j) => cel(t, ANCHOS[j], { negrita: true, gris: true })) }),
  ];
  for (let i = 0; i <= n; i++) {
    filas.push(new TableRow({ cantSplit: true, children: [r, c, pe, pr].map((col, j) => cel(col[i] || "", ANCHOS[j])) }));
  }
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: ANCHOS, layout: TableLayoutType.FIXED, borders: { ...BORDES, insideHorizontal: borde, insideVertical: borde }, rows: filas,
  });
}

const T = [
  ["Interfaz", "Interfaz de registro de movimientos, Interfaz de recepción de mercancía",
    ["Mostrar las pantallas del sistema al usuario", "Recibir los datos capturados o escaneados", "Validar que los campos obligatorios estén completos", "Enviar las solicitudes a su clase de control", "Mostrar confirmaciones, comprobantes y mensajes de error", "Habilitar solo las opciones permitidas para el rol"],
    ["Controlador de movimientos", "Controlador de recepción"],
    ["Conozco el nombre de mi pantalla", "Sé qué usuario está conectado", "Conozco los datos capturados", "Conozco el mensaje que debo mostrar", "Sé qué opciones están habilitadas"],
    ["Nombre de pantalla", "Usuario en sesión", "Datos capturados", "Mensaje", "Opciones habilitadas"]],
  ["Controlador de movimientos", "",
    ["Recibir las solicitudes de la interfaz de registro de movimientos", "Buscar el producto escaneado", "Validar la ubicación y la existencia", "Coordinar el registro del movimiento", "Registrar el evento en la bitácora", "Revisar el punto de reorden y avisar si se alcanzó"],
    ["Interfaz", "Producto", "Ubicación", "Movimiento", "Bitácora de auditoría"],
    ["Sé qué movimiento estoy procesando", "Sé qué producto estoy procesando", "Sé qué usuario hizo la solicitud", "Conozco el resultado de la validación"],
    ["Movimiento actual", "Producto actual", "Usuario solicitante", "Resultado de validación"]],
  ["Controlador de recepción", "",
    ["Recibir las solicitudes de la interfaz de recepción", "Buscar la orden de compra pendiente", "Coordinar la creación de la recepción", "Comparar lo recibido contra lo pedido", "Generar una entrada por cada partida recibida", "Actualizar el estado de la orden y registrar en la bitácora"],
    ["Interfaz", "Orden de compra", "Recepción", "Movimiento", "Bitácora de auditoría"],
    ["Sé qué orden estoy procesando", "Sé qué recepción estoy procesando", "Conozco las diferencias encontradas", "Sé qué usuario hizo la solicitud"],
    ["Orden actual", "Recepción actual", "Diferencias", "Usuario solicitante"]],
  ["Usuario", "Encargado de Almacén, Auxiliar de Almacén, Encargada de Compras, Dirección General, Administrador",
    ["Agregar un nuevo usuario", "Modificar información del usuario", "Iniciar sesión", "Validar credenciales", "Bloquear la cuenta tras tres intentos fallidos", "Cerrar sesión"],
    ["Bitácora de auditoría"],
    ["Conozco mi nombre de usuario", "Conozco mi contraseña", "Conozco mi nombre completo", "Conozco mi rol", "Sé si mi cuenta está activa", "Sé cuántos intentos fallidos llevo"],
    ["Nombre de usuario", "Contraseña", "Nombre completo", "Rol", "Activo", "Intentos fallidos"]],
  ["Producto", "",
    ["Agregar un nuevo producto", "Modificar información del producto", "Buscar producto por código, descripción o familia", "Mostrar existencia y ubicación", "Indicar si está debajo del punto de reorden", "Dar de baja un producto"],
    ["Controlador de movimientos", "Ubicación", "Movimiento", "Kardex", "Proveedor"],
    ["Conozco mi código", "Conozco mi descripción", "Conozco mi familia", "Conozco mi unidad de medida", "Conozco mi existencia", "Conozco mi punto de reorden", "Conozco mi costo unitario"],
    ["Código", "Descripción", "Familia", "Unidad de medida", "Existencia", "Punto de reorden", "Costo unitario"]],
  ["Ubicación", "",
    ["Agregar una nueva ubicación", "Modificar una ubicación", "Mostrar los productos de la ubicación"],
    ["Controlador de movimientos", "Producto", "Movimiento"],
    ["Conozco mi clave", "Conozco mi pasillo", "Conozco mi anaquel", "Conozco mi nivel", "Sé si estoy disponible"],
    ["Clave de ubicación", "Pasillo", "Anaquel", "Nivel", "Disponible"]],
  ["Movimiento", "Entrada, Salida, Ajuste, Devolución",
    ["Registrar un nuevo movimiento", "Validar la cantidad contra la existencia", "Actualizar la existencia del producto", "Generar el folio del movimiento", "Mostrar información del movimiento"],
    ["Controlador de movimientos", "Controlador de recepción", "Producto", "Ubicación", "Usuario", "Kardex", "Bitácora de auditoría"],
    ["Conozco mi folio", "Conozco mi tipo", "Conozco mi fecha", "Conozco mi cantidad", "Conozco mi documento de referencia", "Sé quién me registró"],
    ["Folio", "Tipo de movimiento", "Fecha", "Cantidad", "Documento de referencia", "Usuario responsable"]],
  ["Kardex", "",
    ["Agregar el movimiento al historial", "Mostrar el historial de un producto", "Filtrar por fechas o tipo de movimiento", "Exportar la consulta a Excel o CSV"],
    ["Producto", "Movimiento", "Reporte"],
    ["Sé a qué producto pertenezco", "Conozco la fecha de cada registro", "Conozco el tipo de movimiento", "Conozco la cantidad que entró o salió", "Conozco el saldo después del movimiento"],
    ["Producto", "Fecha", "Tipo de movimiento", "Cantidad", "Saldo"]],
  ["Inventario físico", "Conteo cíclico (parcial por familia), Conteo completo",
    ["Generar la hoja de conteo", "Registrar las cantidades contadas", "Comparar lo contado contra la existencia", "Generar el reporte de diferencias", "Aplicar los ajustes autorizados"],
    ["Producto", "Ubicación", "Movimiento", "Usuario"],
    ["Conozco mi folio", "Conozco mi tipo de conteo", "Conozco mi fecha", "Conozco la cantidad contada", "Conozco la diferencia encontrada", "Sé en qué estado estoy"],
    ["Folio de conteo", "Tipo de conteo", "Fecha", "Cantidad contada", "Diferencia", "Estado"]],
  ["Proveedor", "",
    ["Agregar un nuevo proveedor", "Modificar información del proveedor", "Buscar un proveedor", "Mostrar los productos que surte", "Desactivar un proveedor"],
    ["Orden de compra", "Producto"],
    ["Conozco mi RFC", "Conozco mi razón social", "Conozco mi contacto", "Conozco mi teléfono", "Conozco mi correo", "Sé si estoy activo"],
    ["RFC", "Razón social", "Nombre de contacto", "Teléfono", "Correo electrónico", "Activo"]],
  ["Orden de compra", "",
    ["Crear una nueva orden de compra", "Agregar productos y cantidades", "Guardar como borrador (Pendiente)", "Emitir la orden", "Generar el documento en formato corporativo", "Cambiar el estado de la orden"],
    ["Controlador de recepción", "Proveedor", "Producto", "Recepción", "Usuario", "Bitácora de auditoría"],
    ["Conozco mi folio", "Conozco mi fecha de emisión", "Conozco mi proveedor", "Conozco los productos solicitados", "Conozco mi total", "Sé en qué estado estoy"],
    ["Folio", "Fecha de emisión", "Proveedor", "Detalle de productos", "Total", "Estado"]],
  ["Recepción", "",
    ["Registrar la recepción de mercancía", "Validar cantidades contra la orden", "Solicitar autorización de excedentes", "Generar la entrada al inventario", "Actualizar el estado de la orden"],
    ["Controlador de recepción", "Orden de compra", "Movimiento", "Producto", "Ubicación", "Bitácora de auditoría"],
    ["Conozco mi folio", "Conozco mi fecha", "Sé a qué orden pertenezco", "Conozco mi factura o remisión", "Conozco las cantidades recibidas", "Sé si quedó saldo pendiente"],
    ["Folio de recepción", "Fecha de recepción", "Orden de compra", "Número de factura o remisión", "Cantidad recibida", "Saldo pendiente"]],
  ["Reporte", "Dashboard ejecutivo",
    ["Calcular los indicadores del periodo", "Mostrar valor del inventario y rotación", "Mostrar productos bajo el punto de reorden", "Mostrar el desglose de un indicador", "Exportar a Excel o CSV"],
    ["Producto", "Movimiento", "Kardex", "Orden de compra"],
    ["Conozco mi tipo de reporte", "Conozco mi periodo", "Conozco mi fecha de generación", "Conozco el valor del inventario", "Conozco la rotación", "Conozco mi formato de exportación"],
    ["Tipo de reporte", "Periodo", "Fecha de generación", "Valor del inventario", "Rotación", "Formato"]],
  ["Bitácora de auditoría", "",
    ["Registrar cada operación realizada", "Registrar los accesos al sistema", "Mostrar registros por usuario o fecha"],
    ["Controlador de movimientos", "Controlador de recepción", "Usuario", "Movimiento", "Orden de compra", "Recepción"],
    ["Conozco mi número de registro", "Conozco la fecha y hora", "Sé qué usuario hizo la operación", "Conozco la acción realizada", "Conozco el módulo"],
    ["Id de registro", "Fecha y hora", "Usuario", "Acción", "Módulo"]],
];

const sep = () => par([], { despues: 0, linea: 520 });
const hijos = [...portada()];
hijos.push(par([tr("Tarjetas CRC del sistema SIA-NP", { negrita: true, tam: 13 })], { nuevaPagina: true, despues: 200 }));
// Distribución del PDF: 1 tarjeta, luego pares, y la última sola
const paginas = [[0], [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13]];
paginas.forEach((pg, k) => {
  pg.forEach((i, m) => {
    if (m === 0 && k > 0) hijos.push(par([], { nuevaPagina: true, linea: 20 }));
    if (m > 0) hijos.push(sep());
    hijos.push(tarjeta(...T[i]));
  });
});

const doc = C.documento(hijos, { titulo: "Tarjetas CRC SIA-NP" });
C.guardar(doc, path.join(C.RAIZ, "entregables", "03-crc", "Tarjetas_CRC_SIA-NP.docx"));
