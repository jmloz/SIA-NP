// Entregable 05: Diagrama de clases. Uso: node 05_clases.js   (desde scripts/docx)
// Las figuras (figuras_clases/fig1..5.png) son recortes del PDF vectorial del diagrama.
// El PDF final toma las páginas de figuras del PDF vectorial, no del exportado por Word.
const path = require("path");
const fs = require("fs");
const C = require("./comun");
const { p, titulo, vineta, run, tabla, imagen, pieFigura, portada } = C;
const { Document } = C.docx;

const FIG = path.join(__dirname, "figuras_clases");
const SALIDA = path.join(C.RAIZ, "entregables", "05-clases", "Diagrama_de_Clases_SIA-NP.docx");

const bulleta = (etq, txt) => vineta([run(etq, { negrita: true }), run(txt)]);

// ---- Portada e introducción ----
const inicio = [
  ...portada("Diagrama de clases"),
  titulo("Introducción", 1),
  p("El diagrama de clases muestra las características estáticas del SIA-NP: las clases del sistema, sus atributos, sus métodos y las relaciones entre ellas. Se elaboró a partir de las tarjetas CRC y de los diagramas de secuencia CU1 y CU6. La columna de propiedades de cada tarjeta dio origen a los atributos, cada responsabilidad dio origen a un método y cada colaborador dio origen a una relación entre clases.", { justificado: true }),
  titulo("Tipos de clases", 2),
  bulleta("Clases de entidad: ", "Usuario, Producto, Ubicacion, Movimiento, Kardex, InventarioFisico, Proveedor, OrdenDeCompra, DetalleOrden, Recepcion, Reporte, DashboardEjecutivo (subclase de Reporte) y BitacoraDeAuditoria."),
  bulleta("Clases de interfaz («interfaz»): ", "Interfaz y sus subclases InterfazRegistroMovimientos e InterfazRecepcion. Sus atributos son los campos de la pantalla."),
  bulleta("Clases de control («control»): ", "ControladorMovimientos para CU1 y ControladorRecepcion para CU6. Las clases de interfaz solo se conectan con su clase de control, y las de control son las que se comunican con las de entidad."),
  bulleta("Clase abstracta: ", "Movimiento, con su nombre en cursiva. Se instancia a través de sus subclases Entrada, Salida, Ajuste y Devolucion."),
  titulo("Notación utilizada", 2),
  vineta("Rectángulo de clase: nombre arriba, atributos en medio y métodos abajo."),
  vineta("– (signo negativo): atributo privado. + (signo positivo): método público."),
  vineta("Tipo y valor inicial, por ejemplo existencia: Decimal=0.0; valores finitos entre llaves, por ejemplo tipoMovimiento: char{E,S,A,D}."),
  vineta("Asociación: línea simple con nombre y multiplicidad en sus extremos (1, 0..*, 1..*)."),
  vineta("Clase de asociación: DetalleOrden, unida con línea punteada a la relación de muchos a muchos entre OrdenDeCompra y Producto."),
  vineta("Diamante vacío: agregación (Ubicacion contiene Producto). Diamante relleno: todo y sus partes (Kardex consiste de Movimiento)."),
  vineta("Triángulo vacío: generalización; la flecha apunta a la superclase."),
  vineta("Línea punteada con flecha: dependencia; una clase usa a otra sin guardar una referencia permanente a ella."),
  vineta("Nota (rectángulo con esquina doblada): aclaración unida con línea punteada al elemento que describe."),
];

// ---- Figuras: una sección (una página) por figura; misma orientación que en el PDF vectorial ----
const figuras = [
  ["fig1.png", "Figura 1. Diagrama de clases del SIA-NP", false],
  ["fig2.png", "Figura 2. Vista de interfaz y control del diagrama de clases.", false],
  ["fig3.png", "Figura 3. Vista de inventario del diagrama de clases.", true],
  ["fig4.png", "Figura 4. Vista de compras del diagrama de clases.", true],
  ["fig5.png", "Figura 5. Vista de reportes y auditoría del diagrama de clases.", true],
];
const MARGEN_FIG = 720; // 0.5 in, para que la Figura 1 conserve un tamaño legible
const seccionesFig = figuras.map(([f, pie, horiz]) => ({
  horiz,
  hijos: [
    imagen(path.join(FIG, f), horiz ? { anchoPx: 960, altoMaxPx: 630 } : { anchoPx: 720, altoMaxPx: 920 }),
    pieFigura(pie),
  ],
}));

// ---- Tablas ----
const relaciones = [
  ["Usuario", "registra", "1 — 0..*", "Movimiento", "Asociación"],
  ["Usuario", "elabora", "1 — 0..*", "OrdenDeCompra", "Asociación"],
  ["Usuario", "genera", "1 — 0..*", "BitacoraDeAuditoria", "Asociación"],
  ["Usuario", "realiza", "1 — 0..*", "InventarioFisico", "Asociación"],
  ["Producto", "afecta", "1 — 0..*", "Movimiento", "Asociación"],
  ["Producto", "tiene", "1 — 1", "Kardex", "Asociación"],
  ["Ubicacion", "contiene", "1 — 0..*", "Producto", "Agregación"],
  ["Ubicacion", "ubica", "1 — 0..*", "Movimiento", "Asociación"],
  ["Kardex", "consiste de", "1 — 0..*", "Movimiento", "Todo y sus partes"],
  ["Proveedor", "recibe", "1 — 0..*", "OrdenDeCompra", "Asociación"],
  ["Proveedor", "surte", "1..* — 1..*", "Producto", "Asociación"],
  ["OrdenDeCompra", "solicita", "0..* — 1..*", "Producto", "Asociación con clase DetalleOrden"],
  ["OrdenDeCompra", "se surte con", "1 — 0..*", "Recepcion", "Asociación"],
  ["Recepcion", "genera", "0..1 — 1..*", "Entrada", "Asociación"],
  ["Recepcion", "actualiza / asigna / registra en", "—", "Producto, Ubicacion, BitacoraDeAuditoria", "Dependencia"],
  ["InventarioFisico", "cuenta", "0..* — 1..*", "Producto", "Asociación"],
  ["InventarioFisico", "se realiza en", "0..* — 1..*", "Ubicacion", "Asociación"],
  ["InventarioFisico", "genera", "1 — 0..*", "Ajuste", "Asociación"],
  ["Reporte", "consulta", "0..* — 1..*", "Kardex", "Asociación"],
  ["Reporte", "consulta", "—", "Producto, Movimiento, OrdenDeCompra", "Dependencia"],
  ["BitacoraDeAuditoria", "registra", "—", "Movimiento, OrdenDeCompra", "Dependencia"],
  ["Entrada, Salida, Ajuste, Devolucion", "es un", "—", "Movimiento", "Generalización"],
  ["DashboardEjecutivo", "es un", "—", "Reporte", "Generalización"],
  ["InterfazRegistroMovimientos, InterfazRecepcion", "es un", "—", "Interfaz", "Generalización"],
  ["InterfazRegistroMovimientos", "envía solicitudes a", "1 — 1", "ControladorMovimientos", "Asociación"],
  ["InterfazRecepcion", "envía solicitudes a", "1 — 1", "ControladorRecepcion", "Asociación"],
  ["ControladorMovimientos", "coordina / valida / crea / registra en", "—", "Producto, Ubicacion, Movimiento, BitacoraDeAuditoria", "Dependencia"],
  ["ControladorRecepcion", "coordina / crea / genera / registra en", "—", "OrdenDeCompra, Recepcion, Entrada, BitacoraDeAuditoria", "Dependencia"],
];
const tablaRel = tabla([2000, 1700, 1300, 2300, 2060],
  [["Clase", "Relación", "Multiplicidad", "Clase", "Tipo"], ...relaciones], { tam: 9, noPartirFilas: true });

const corr = JSON.parse(fs.readFileSync(path.join(__dirname, "corr_clases.json"), "utf8"));
const tablaCorr = tabla([2300, 4200, 2860],
  [["Clase", "Responsabilidad (tarjeta CRC)", "Método"], ...corr], { tam: 9, noPartirFilas: true });

const sinResp = [
  ["ControladorRecepcion", ["notificarDiferencias()"], "No es una responsabilidad de la tarjeta Controlador de recepción. Sale de su propiedad «Conozco las diferencias encontradas» (Diferencias): avisa de las diferencias que el controlador ya conoce al comparar lo recibido contra lo pedido."],
  ["DetalleOrden", ["agregarDetalle()", "cambiarCantidad()"], "DetalleOrden no tiene tarjeta. Salen de la responsabilidad «Agregar productos y cantidades» de la tarjeta Orden de compra, cuya propiedad «Detalle de productos» se separó como clase de asociación."],
  ["DetalleOrden", ["calcularSaldoPendiente()"], "Sale de la propiedad «Sé si quedó saldo pendiente» (Saldo pendiente) de la tarjeta Recepción; en DetalleOrden se calcula por producto como cantidadSolicitada menos cantidadRecibida."],
  ["DashboardEjecutivo", ["actualizarGraficas()"], "La tarjeta Reporte solo lo menciona como subclase («Dashboard ejecutivo») y no hay tarjeta propia. El método sale de CU7, Visualizar Dashboard de KPIs, de la ERS."],
];
const tablaSin = tabla([2000, 2400, 4960],
  [["Clase", "Método", "Origen en las tarjetas CRC"], ...sinResp], { tam: 9, noPartirFilas: true });

const final = [
  titulo("Relaciones entre las clases", 1),
  p("En la siguiente tabla se describen las relaciones del diagrama, con su nombre, su multiplicidad y su tipo.", { justificado: true }),
  tablaRel,
  p("", { despues: 60 }),
  p("La relación entre OrdenDeCompra y Producto es de muchos a muchos: una orden incluye varios productos y un producto puede pedirse en varias órdenes. Para resolverla se agregó la clase de asociación DetalleOrden, que guarda la cantidad solicitada, la cantidad recibida y el costo de cada producto en la orden. DetalleOrden no tiene tarjeta CRC propia porque corresponde a la propiedad «Detalle de productos» de la tarjeta Orden de compra; en el diagrama esa propiedad se separó como clase para resolver la relación de muchos a muchos, como se indica en la nota de la figura.", { justificado: true }),
  titulo("Correspondencia con las tarjetas CRC", 1, { nuevaPagina: true }),
  p("Casi cada responsabilidad de las tarjetas CRC tiene su método en el diagrama. La tabla muestra la correspondencia. Cinco métodos no corresponden a una responsabilidad de las tarjetas y se explican en la segunda tabla. De los demás métodos que no aparecen en ninguna de las dos, la mayoría sale de los mensajes de los diagramas de secuencia (por ejemplo actualizarExistencia() y validarUbicacion()).", { justificado: true }),
  tablaCorr,
  p("", { despues: 60 }),
  p("Métodos que no salen de una responsabilidad de las tarjetas CRC:", { negrita: true, conSiguiente: true }),
  tablaSin,
  p("", { despues: 60 }),
  p("Cada colaborador de una tarjeta CRC aparece en el diagrama como una relación con esa clase. Cuando la colaboración es de uso (la clase consulta o registra información de otra sin guardar una referencia a ella) se dibuja como dependencia; por ejemplo, Reporte consulta Producto, Movimiento y OrdenDeCompra, y BitacoraDeAuditoria registra las operaciones de Movimiento y OrdenDeCompra. Basta con que la colaboración aparezca en una de las dos tarjetas para que exista la relación.", { justificado: true }),
  titulo("Decisiones de modelado", 2),
  vineta("Los métodos cancelarOrden() y cerrarOrden() de OrdenDeCompra no vienen de una tarjeta CRC ni de una secuencia: cubren el paso a los estados Cancelada y Cerrada."),
  vineta("Los estados de la orden son Pendiente, Emitida, Parcialmente recibida, Recibida, Cerrada y Cancelada. Los cuatro primeros son los nombres de CU5 y CU6, en lugar de Abierta y Parcial del diccionario de datos de la ERS; Cerrada y Cancelada coinciden."),
  vineta("Las subclases de las tarjetas CRC Usuario e Inventario físico se modelan con los atributos rol y tipoConteo."),
  vineta("El rol Vendedor de la ERS no se incluye porque no participa en CU1–CU8, y el catálogo de clientes de CU4 no se modela porque ninguna tarjeta CRC lo incluye."),
];

const sec = (hijos, horiz = false, margen = 1440) => ({
  properties: { page: {
    size: { width: 12240, height: 15840, orientation: horiz ? "landscape" : "portrait" },
    margin: { top: margen, bottom: margen, left: margen, right: margen },
  } },
  children: hijos,
});
const doc = new Document({
  creator: "Equipo Grupo S5A", title: "Diagrama de clases SIA-NP",
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: "000000" } } },
    paragraphStyles: [1, 2, 3].map((n) => ({ id: "Heading" + n, name: "Heading " + n, basedOn: "Normal", next: "Normal",
      run: { font: "Arial", size: [28, 24, 22][n - 1], bold: true, color: "000000" } })),
  },
  sections: [sec(inicio), ...seccionesFig.map((s) => sec(s.hijos, s.horiz, MARGEN_FIG)), sec(final)],
});
C.guardar(doc, SALIDA);
