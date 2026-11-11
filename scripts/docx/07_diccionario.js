// Entregable 07: Diccionario de datos del SIA-NP.
// Uso (desde scripts/docx): node 07_diccionario.js   y luego   python a_pdf.py <docx>
// Los datos salen de la base de datos SQL Server del Taller de Base de Datos (carpeta bd/).
const path = require("path");
const {
  RAIZ, p, titulo, vineta, tabla, portada, documento, guardar, run, docx,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "07-diccionario-datos");
const DOCX = path.join(DIR, "Diccionario_de_Datos_SIA-NP.docx");
const FECHA = "11 de noviembre de 2026";
const J = { justificado: true };

// Fuente: proyecto de Taller de Base de Datos (SQL Server): bd/metadatos_columnas.json (extraído de
// sys.columns) y bd/descripciones.js (descripciones de cada campo).
const meta = require("./bd/metadatos_columnas.json");
const { catalogos, columnas, reglas } = require("./bd/descripciones.js");

// "VARCHAR(15)" -> ["VARCHAR", "15"]; los que no llevan tamaño declarado muestran su espacio en disco.
const BYTES = { INT: "4 bytes", BIGINT: "8 bytes", SMALLINT: "2 bytes", TINYINT: "1 byte", DATE: "3 bytes", BIT: "1 bit" };
function tipoYTamano(t) {
  const m = t.match(/^(\w+)\((.+)\)$/);
  if (m && m[1] === "DATETIME2") return ["DATETIME2", "6 bytes"];
  if (m) return [m[1], m[2]];
  return [t, BYTES[t] || "—"];
}
function llave(r) {
  const k = [];
  if (r.pk) k.push("Llave primaria.");
  if (r.fk) k.push(`Llave foránea a ${r.fk}.`);
  if (r.uq && !r.pk) k.push("Valor único.");
  if (!r.nulo && !r.pk && !r.ident && !r.calc) k.push("Obligatorio.");
  return k.join(" ");
}

// Tabla única con número consecutivo, en el orden de los catálogos del taller.
const tablasOrden = catalogos.flatMap((c) => c.tablas);
const filas = [["Núm. consecutivo", "Nombre del dato", "Descripción del dato", "Tipo de dato", "Tamaño del dato", "Entidad"]];
let n = 0;
for (const t of tablasOrden) {
  for (const r of meta.filter((m) => m.tabla === t).sort((a, b) => a.orden - b.orden)) {
    const desc = columnas[t] && columnas[t][r.columna];
    if (!desc) throw new Error(`Falta descripción de ${t}.${r.columna}`);
    const [tipo, tam] = tipoYTamano(r.tipo);
    n += 1;
    filas.push([String(n), r.columna, `${desc} ${llave(r)}`.trim(), tipo, tam, t]);
  }
}

const consultas = [
  ["Consulta o reporte", "Datos que usa", "Quién lo pide"],
  ["Existencia actual y ubicación de un producto", "PRODUCTO.codigo_barras, existencia, id_ubicacion, imagen_url; UBICACION.clave", "Almacén"],
  ["Kardex (historial de movimientos) de un producto", "MOVIMIENTO.id_producto, fecha, tipo, cantidad, saldo_resultante", "Almacén, Dirección"],
  ["Quién movió qué y cuándo", "MOVIMIENTO.id_usuario, fecha; BITACORA_AUDITORIA.*", "Almacén, Dirección"],
  ["Productos bajo punto de reorden", "PRODUCTO.existencia, punto_reorden, minimo, maximo", "Compras, Almacén"],
  ["Diferencias entre conteo físico y sistema", "DETALLE_CONTEO.existencia_sistema, cantidad_contada, diferencia; INVENTARIO_FISICO.tipo_conteo", "Almacén, Dirección"],
  ["Estado de una orden de compra y saldo pendiente", "ORDEN_COMPRA.estado; DETALLE_ORDEN.cantidad_solicitada, cantidad_recibida; RECEPCION.tipo_recepcion", "Compras"],
  ["Comparativo de proveedores", "PROVEEDOR.clasificacion, lead_time_dias; PRODUCTO_PROVEEDOR.precio_compra, moneda", "Compras"],
  ["Valor del inventario y márgenes", "PRODUCTO.existencia, costo_unitario, precio_venta", "Dirección"],
];

const hijos = [
  ...portada("Diccionario de datos", FECHA),

  titulo("1. Introducción"),
  p("En este documento se presenta el diccionario de datos del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico. Es la lista de los datos que el sistema guarda para gestionar el inventario y para obtener las consultas y los reportes que pidieron los usuarios: el Encargado de Almacén (confiabilidad de la existencia y del kardex), el Auxiliar de Almacén (ubicaciones e imagen del producto), la Encargada de Compras (proveedores, tiempos de entrega y órdenes) y la Dirección General (valor del inventario, diferencias y bitácora).", J),
  p("Los datos son los de la base de datos en SQL Server que se diseñó en el Taller de Base de Datos (Parte I): " + tablasOrden.length + " tablas y " + n + " campos. Los tipos, los tamaños y las llaves se extrajeron del catálogo de SQL Server (sys.columns) después de crear la base, así que coinciden con ella. Cada tabla corresponde a una clase entidad del diagrama de clases; Entrada, Salida, Ajuste y Devolucion no tienen tabla propia porque son tipos de Movimiento y se distinguen con el campo tipo de MOVIMIENTO. Las clases de interfaz y de control no aparecen porque sus atributos son datos temporales de pantalla y no se guardan.", J),

  titulo("2. Cómo leer la tabla"),
  vineta("Núm. consecutivo: número de renglón, del 1 al " + n + "."),
  vineta("Nombre del dato: nombre de la columna en la base de datos."),
  vineta("Descripción del dato: qué significa; al final indica si es llave primaria, llave foránea (y a qué tabla apunta), valor único u obligatorio."),
  vineta("Tipo de dato: VARCHAR y CHAR (texto de longitud variable y fija), INT, BIGINT, SMALLINT y TINYINT (enteros), DECIMAL (número con decimales), DATE y DATETIME2 (fecha, y fecha con hora) y BIT (verdadero o falso)."),
  vineta("Tamaño del dato: en VARCHAR y CHAR, el número de caracteres; en DECIMAL, dígitos totales y decimales (10,2 = hasta 10 dígitos, 2 de ellos decimales); en los demás, el espacio que ocupan."),
  vineta("Entidad: la tabla de la base de datos a la que pertenece el dato. Aparecen agrupadas por catálogo."),

  "@@CORTE1@@",
  titulo("3. Diccionario de datos"),
  tabla([1400, 2100, 5400, 1300, 1200, 2280], filas, { noPartirFilas: true, tam: 9 }),
  "@@CORTE2@@",
  titulo("4. Consultas y reportes que cubre"),
  p("Cada consulta o reporte de los casos de uso se puede obtener con los datos de la tabla anterior:", J),
  tabla([3000, 4660, 1700], consultas, { noPartirFilas: true, tam: 9 }),

  titulo("5. Observaciones"),
  vineta("Las llaves son numéricas (id_producto, id_usuario, etc.) y se generan automáticamente; el código que se escanea (codigo_interno, codigo_barras) y el folio son datos aparte. Por eso los nombres de los campos no son idénticos a los atributos del diagrama de clases."),
  vineta("Las cantidades (existencia, cantidad, saldo) son DECIMAL porque algunos productos, como la manguera, se venden por metro."),
  vineta("Los catálogos de roles y familias de producto son tablas aparte (ROL, FAMILIA), y la relación entre productos y proveedores se resuelve con PRODUCTO_PROVEEDOR, que guarda el precio de compra de cada proveedor."),
];

(async () => {
  const i1 = hijos.indexOf("@@CORTE1@@"), i2 = hijos.indexOf("@@CORTE2@@");
  const doc = documento(null, { titulo: "Diccionario de datos SIA-NP", secciones: [
    hijos.slice(0, i1),
    { hijos: hijos.slice(i1 + 1, i2), horizontal: true, margen: 1080 },
    hijos.slice(i2 + 1),
  ] });
  await guardar(doc, DOCX);
})();
