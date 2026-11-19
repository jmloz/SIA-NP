// Entregable 08: Diseño de salidas del sistema SIA-NP.
// Basado en Kendall y Kendall (2011), cap. 11 "Diseño de una salida eficaz" (pp. 329-357).
// Uso (desde scripts/docx): node 08_salidas.js   (luego: python a_pdf.py <docx>)
const path = require("path");
const {
  RAIZ, p, titulo, vineta, tabla, celda, pieFigura, portada, documento, guardar, saltoPagina,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "08-salidas");
const DOCX = path.join(DIR, "Diseno_de_Salidas_SIA-NP.docx");

const J = { justificado: true };
const AU = 9360; // ancho útil en twips

// Las 10 preguntas del libro (cap. 11, "Factores a considerar al elegir la tecnología de salida", pp. 336-339).
const PREGUNTAS = [
  "1. ¿Quién usará (verá) la salida? (requisito de calidad)",
  "2. ¿Cuántas personas necesitan la salida?",
  "3. ¿Dónde se necesita la salida? (distribución, logística)",
  "4. ¿Cuál es el propósito de la salida?",
  "5. ¿Cuál es la velocidad con que se necesita la salida?",
  "6. ¿Con qué frecuencia se accederá a la salida?",
  "7. ¿Cuánto tiempo debe (o debería) almacenarse la salida?",
  "8. ¿Bajo qué regulaciones especiales se produce, almacena y distribuye?",
  "9. ¿Costos iniciales y recurrentes (mantenimiento y suministros)?",
  "10. ¿Requerimientos ambientales (ruido, espacio, cableado, red)?",
];

// --- Helpers de maqueta ---------------------------------------------------
// Encabezado de un documento impreso (nombre empresa + título a la derecha).
function cabeceraDoc(tituloDoc, folioRot) {
  return tabla([5600, 3760], [
    [
      celda(["NEUMÁTICA DEL PACÍFICO, S.A. DE C.V.", "Hermosillo, Sonora · Tel. (662) 000 0000", "RFC: NPA-010101-XXX"], { negrita: true, tam: 10 }),
      celda([tituloDoc, folioRot], { negrita: true, tam: 11, centro: true }),
    ],
  ], { encabezado: false, noPartirFilas: true });
}

// Tabla de preguntas/respuestas para elegir la tecnología de salida.
function tablaPreguntas(respuestas) {
  const filas = [["Pregunta para elegir la tecnología de salida", "Respuesta para esta salida"]];
  PREGUNTAS.forEach((q, i) => filas.push([q, respuestas[i]]));
  return tabla([3760, 5600], filas, { noPartirFilas: true, tam: 10 });
}

// Ficha de clasificación de la salida.
function ficha(datos) {
  return tabla([2600, 6760], datos.map(([k, v]) => [celda(k, { negrita: true, tam: 10 }), celda(v, { tam: 10 })]), { encabezado: false, noPartirFilas: true });
}

// Bloque completo de una salida.
function salida(num, nombre, op) {
  const bloque = [
    titulo(`${num}. ${nombre}`, 2, { nuevaPagina: true }),
    p(op.resumen, J),
    p("Clasificación de la salida", { negrita: true, antes: 60 }),
    ficha(op.ficha),
    p("Documentos fuente (de dónde salen los datos)", { negrita: true, antes: 120 }),
    ...op.fuentes.map((f) => vineta(f)),
    p("Diseño de la salida (maqueta)", { negrita: true, antes: 120, conSiguiente: true }),
    ...op.maqueta,
    pieFigura(op.pieMaqueta),
    p("Preguntas para elegir la tecnología de salida", { negrita: true, antes: 60 }),
    tablaPreguntas(op.respuestas),
    pieFigura(`Tabla. Elección de la tecnología de salida para ${nombre}.`),
  ];
  return bloque;
}

// =========================================================================
// Definición de las 10 salidas del SIA-NP.
// =========================================================================
const SALIDAS = [];

// S1. Nota de salida -------------------------------------------------------
SALIDAS.push(salida("S1", "Nota de salida", {
  resumen: "Comprobante impreso que ampara la mercancía que sale del almacén hacia el cliente. Sustituye el libro físico de remisiones. Lleva folio consecutivo, datos del cliente, productos surtidos y espacios para firma y sello (RF8, Apéndice C).",
  ficha: [
    ["Tipo (Kendall)", "Salida externa (sale de la organización hacia el cliente)."],
    ["Tecnología", "Impresora (blanco y negro) en el mostrador."],
    ["Formato", "Documento impreso en papel tamaño carta; estática."],
    ["Destino / actor", "Cliente (copia) y almacén (copia de control). La emite el Encargado de Almacén."],
    ["Requerimiento", "RF8 Orden de surtido y nota de salida; se relaciona con RF3 Registro de movimientos."],
  ],
  fuentes: [
    "Orden de surtido confirmada por el vendedor (pedido del cliente).",
    "Catálogo de productos — clase Producto (RF2): código, descripción, unidad.",
    "Movimiento de salida que descuenta la existencia — clase Movimiento/Salida (RF3).",
    "Datos del cliente registrados en el sistema.",
  ],
  maqueta: [
    cabeceraDoc("NOTA DE SALIDA", "Folio: NS-2026-0318"),
    tabla([4680, 4680], [[
      celda(["Fecha: 12/11/2026   Hora: 11:42", "Cliente: Taller Mecánico del Norte", "RFC: TMN-990909-AB1"], { tam: 10 }),
      celda(["Vendedor: (mostrador)", "Documento de referencia: pedido PV-2026-0912", "Forma de entrega: mostrador"], { tam: 10 }),
    ]], { encabezado: false, noPartirFilas: true }),
    tabla([1500, 3700, 1360, 1300, 1500],
      [
        ["Código", "Descripción", "Ubicación", "Cantidad", "Unidad"],
        ["RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "B-04-2", "12", "pza"],
        ["", "— fin de la nota —", "", "", ""],
      ], { noPartirFilas: true, tam: 10 }),
    tabla([4680, 4680], [[
      celda(["Entregó (almacén): ______________________", "Nombre y firma"], { tam: 10 }),
      celda(["Recibió (cliente): ______________________", "Nombre, firma y sello"], { tam: 10 }),
    ]], { encabezado: false, noPartirFilas: true }),
  ],
  pieMaqueta: "Figura. Maqueta de la nota de salida (salida externa impresa).",
  respuestas: [
    "El cliente (externo) y el Encargado de Almacén. Requiere calidad de documento formal, legible y con folio.",
    "Pocas por venta: una copia para el cliente y una de control; 1–2 personas.",
    "En el mostrador del almacén, al momento de entregar la mercancía; una copia se la lleva el cliente.",
    "Amparar legalmente la salida de mercancía y respaldar el descuento de existencia.",
    "Inmediata: se imprime al confirmar la venta, mientras el cliente espera (RNF1: pocos segundos).",
    "Una vez por cada venta; varias veces al día.",
    "El documento físico lo conserva el cliente; el registro queda permanente en el sistema (bitácora, RF19).",
    "Comprobante comercial interno; si se factura, el CFDI 4.0 lo timbra un PAC externo (fuera de la 1.ª fase).",
    "Bajos: impresora y papel ya existentes en el mostrador; consumible = tóner y hoja carta.",
    "Mínimos: impresora de escritorio con conexión USB o de red; sin requisitos especiales.",
  ],
}));

// S2. Orden de compra ------------------------------------------------------
SALIDAS.push(salida("S2", "Orden de compra", {
  resumen: "Documento con formato corporativo y folio consecutivo que se envía al proveedor para solicitar mercancía. Puede imprimirse o enviarse por correo electrónico en PDF; sustituye la plantilla de Word que hoy se llena a mano (RF12, Apéndice C).",
  ficha: [
    ["Tipo (Kendall)", "Salida externa (sale hacia el proveedor)."],
    ["Tecnología", "Salida electrónica (PDF por correo) y/o impresora."],
    ["Formato", "Documento de una página; estática."],
    ["Destino / actor", "Proveedor. La genera la Encargada de Compras."],
    ["Requerimiento", "RF12 Generación de órdenes de compra; se relaciona con RF11 y RF13."],
  ],
  fuentes: [
    "Sugerencia automática de reorden — punto de reorden, mínimos y consumo (RF14).",
    "Catálogo de productos — clase Producto (RF2).",
    "Proveedores y listas de precios por volumen — clase Proveedor (RF11).",
    "Clase OrdenDeCompra y DetalleOrden del diagrama de clases.",
  ],
  maqueta: [
    cabeceraDoc("ORDEN DE COMPRA", "Folio: OC-2026-0147"),
    tabla([4680, 4680], [[
      celda(["Fecha de emisión: 12/11/2026", "Proveedor: Proveedor nacional de neumática", "Clasificación: Nacional   Lead time: 7 días"], { tam: 10 }),
      celda(["Condiciones: crédito 30 días", "Moneda: MXN", "Entregar en: Almacén Hermosillo"], { tam: 10 }),
    ]], { encabezado: false, noPartirFilas: true }),
    tabla([1400, 3160, 1200, 1800, 1800],
      [
        ["Código", "Descripción", "Cantidad", "Costo unitario", "Importe"],
        ["RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "100", "$18.00", "$1,800.00"],
        ["CIL-32100", "Cilindro neumático Ø32 × 100 mm", "10", "$420.00", "$4,200.00"],
        [celda("Subtotal", { negrita: true, tam: 10, columnas: 4, ancho: 7560 }), celda("$6,000.00", { tam: 10 })],
        [celda("IVA 16%", { negrita: true, tam: 10, columnas: 4, ancho: 7560 }), celda("$960.00", { tam: 10 })],
        [celda("Total", { negrita: true, tam: 10, columnas: 4, ancho: 7560 }), celda("$6,960.00", { negrita: true, tam: 10 })],
      ], { noPartirFilas: true, tam: 10 }),
    p("Autoriza (Compras): ______________________    Nombre y firma", { tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta de la orden de compra (salida externa, PDF/impresa).",
  respuestas: [
    "El proveedor (externo) y la Encargada de Compras. Requiere imagen corporativa y datos completos.",
    "Una por orden, dirigida a un proveedor; copia de control en compras.",
    "Se envía al proveedor por correo o se imprime; logística remota, no presencial.",
    "Solicitar formalmente mercancía con cantidades, precios pactados y condiciones.",
    "Al confirmar el pedido; no es urgente al segundo, pero sí el mismo día.",
    "Según necesidad de reabasto: varias por semana en el área de compras.",
    "El PDF queda archivado de forma permanente; la OC vive en el sistema hasta cerrarse (RF13).",
    "Documento comercial; debe conservar folio consecutivo y datos fiscales del proveedor.",
    "Bajos: se reutiliza el correo y la impresora; el ahorro frente a la plantilla de Word es el consumible manual.",
    "Mínimos: equipo de oficina con internet para el envío por correo.",
  ],
}));

// S3. Orden de surtido -----------------------------------------------------
SALIDAS.push(salida("S3", "Orden de surtido", {
  resumen: "Hoja impresa y legible que indica al Auxiliar de Almacén qué productos tomar, en qué cantidad y en qué ubicación, ordenada por recorrido del almacén. Sustituye las hojas manuscritas ilegibles que hoy recibe Ricardo (RF8).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna (se queda dentro de la empresa)."],
    ["Tecnología", "Impresora; alternativa en pantalla de tablet para operación móvil."],
    ["Formato", "Hoja carta ordenada por ubicación; estática."],
    ["Destino / actor", "Auxiliar de Almacén (Ricardo Mendoza)."],
    ["Requerimiento", "RF8; apoyada por RF9 código de barras y RF10 imagen de producto."],
  ],
  fuentes: [
    "Pedido del vendedor pendiente de surtir.",
    "Ubicaciones físicas del almacén — clase Ubicacion (RF5): pasillo, anaquel, nivel.",
    "Catálogo con imagen del producto — clase Producto (RF10, RF2).",
  ],
  maqueta: [
    cabeceraDoc("ORDEN DE SURTIDO", "Folio: OS-2026-0455"),
    p("Pedido: PV-2026-0912   Cliente: Taller Mecánico del Norte   Fecha: 12/11/2026", { tam: 10 }),
    tabla([1600, 1500, 3360, 1100, 1800],
      [
        ["Ubicación", "Código", "Descripción", "Cantidad", "Surtido (✓)"],
        ["B-04-2", "RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "12", "☐"],
        ["C-02-1", "CIL-32100", "Cilindro neumático Ø32 × 100 mm", "2", "☐"],
      ], { noPartirFilas: true, tam: 10 }),
    p("Surtió (auxiliar): ______________________    Nombre y firma", { tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta de la orden de surtido (interna, ordenada por ubicación).",
  respuestas: [
    "El Auxiliar de Almacén. La prioridad es la legibilidad y el orden por recorrido, no la estética.",
    "Normalmente una persona (quien surte); a veces se reparte entre dos auxiliares.",
    "En el piso del almacén, recorriendo pasillos; por eso se ordena por ubicación.",
    "Guiar el surtido rápido y sin confusiones entre piezas similares.",
    "Inmediata al generarse el pedido; el surtido ocurre enseguida.",
    "Varias veces al día, una por pedido.",
    "Es un documento de trabajo temporal; se descarta tras surtir. El registro queda en el sistema.",
    "Sin regulación especial; es un documento operativo interno.",
    "Muy bajos: impresora y papel existentes; puede evitarse con la tablet.",
    "Mínimos; en versión móvil requiere tablet/teléfono con conexión, ya contemplados (RNF8).",
  ],
}));

// S4. Hoja de conteo de inventario físico ---------------------------------
SALIDAS.push(salida("S4", "Hoja de conteo de inventario físico", {
  resumen: "Hoja impresa para capturar en piso el conteo de una familia (cíclico) o del almacén completo (semestral). El sistema calcula después la diferencia contra la existencia registrada (RF6).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna."],
    ["Tecnología", "Impresora; captura posterior en pantalla."],
    ["Formato", "Hoja carta por familia; estática. Conteo a ciegas (sin mostrar la existencia del sistema)."],
    ["Destino / actor", "Encargado de Almacén y auxiliares que cuentan."],
    ["Requerimiento", "RF6 Inventario físico cíclico y completo."],
  ],
  fuentes: [
    "Catálogo de productos filtrado por familia — clase Producto (RF2).",
    "Ubicaciones físicas — clase Ubicacion (RF5).",
    "Existencia del sistema — se usa al calcular diferencias, no se imprime (conteo ciego).",
  ],
  maqueta: [
    cabeceraDoc("HOJA DE CONTEO", "Folio: IC-2026-0033"),
    p("Familia: Racores   Tipo: conteo cíclico   Responsable: L. Pablovich   Fecha: 12/11/2026", { tam: 10 }),
    tabla([1600, 1500, 3760, 2500],
      [
        ["Ubicación", "Código", "Descripción", "Cantidad contada"],
        ["B-04-2", "RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "__________"],
        ["B-04-3", "RAC-0612", "Racor recto 3/8\" NPT × 12 mm", "__________"],
      ], { noPartirFilas: true, tam: 10 }),
    p("Contó: ______________________   Validó: ______________________", { tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta de la hoja de conteo (interna, conteo a ciegas).",
  respuestas: [
    "El Encargado y los auxiliares que cuentan. Debe ser clara y dejar espacio amplio para anotar.",
    "El equipo que realiza el conteo: 1 a 3 personas por familia.",
    "En el piso del almacén, anaquel por anaquel.",
    "Capturar la cantidad física real para compararla con el sistema y ajustar (RNF2 confiabilidad).",
    "Se imprime al iniciar el conteo; la comparación se calcula al capturar.",
    "Periódica: conteos cíclicos mensuales por familia y conteos completos semestrales.",
    "La hoja física se archiva un ciclo; el resultado del conteo queda permanente en el sistema.",
    "Control interno; soporta los ajustes de inventario que deben quedar con huella (RF19).",
    "Muy bajos: impresión por familia; evita el 5% de diferencia física-sistema que hoy cuesta margen.",
    "Mínimos; opcionalmente lectura con pistola de código de barras para agilizar (RF9).",
  ],
}));

// S5. Consulta de existencias con imagen (pantalla móvil) -----------------
SALIDAS.push(salida("S5", "Consulta de existencias con imagen y ubicación", {
  resumen: "Pantalla interactiva, pensada para tablet o teléfono en el piso del almacén, que muestra la fotografía del producto, su existencia, ubicación física y movimientos recientes. Evita confundir piezas visualmente similares (RF4, RF5, RF10).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna, en pantalla, interactiva (dinámica)."],
    ["Tecnología", "Pantalla de tablet/teléfono (navegador web responsivo)."],
    ["Formato", "Vista de consulta; se actualiza en tiempo real, no se imprime."],
    ["Destino / actor", "Encargado y Auxiliar de Almacén; también mostrador."],
    ["Requerimiento", "RF4 existencias/kardex, RF5 ubicaciones, RF10 acceso móvil con imagen."],
  ],
  fuentes: [
    "Clase Producto: código, descripción, imagen, mínimo, máximo, existencia (RF2).",
    "Clase Ubicacion: pasillo, anaquel, nivel (RF5).",
    "Clase Movimiento: últimos movimientos del producto (RF4).",
  ],
  maqueta: [
    tabla([3200, 6160], [
      [celda(["[ FOTOGRAFÍA ]", "del producto"], { tam: 10, centro: true }),
       celda(["RAC-0408 · Racor recto 1/4\" NPT × 8 mm", "Familia: Racores   Unidad: pza", "Existencia: 40    Mín: 30   Máx: 150", "Ubicación: B-04-2 (pasillo B, anaquel 4, nivel 2)"], { tam: 10, negrita: false })],
    ], { encabezado: false, noPartirFilas: true }),
    tabla([2000, 1400, 2560, 1700, 1700],
      [
        ["Fecha", "Tipo", "Documento", "Cantidad", "Saldo"],
        ["12/11 11:42", "Salida", "NS-2026-0318", "-12", "28"],
        ["10/11 09:15", "Entrada", "F-A-88010", "+20", "40"],
      ], { noPartirFilas: true, tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta de la consulta de existencias en móvil (pantalla interactiva).",
  respuestas: [
    "El personal de almacén y mostrador. Prioriza la imagen y la claridad en pantalla pequeña.",
    "Muchos usuarios de forma concurrente (RNF1: 8 a 12 concurrentes).",
    "En el piso del almacén y en el mostrador; de ahí el diseño responsivo (RNF8).",
    "Localizar el producto correcto y confirmar su existencia y ubicación al instante.",
    "Muy rápida: la consulta no debe exceder 10 segundos (RNF1).",
    "Constante: es la pantalla más usada del día a día.",
    "No se almacena como documento; es una vista viva de la base de datos. Funciona en modo degradado (RNF5).",
    "Control de acceso por rol (RNF3): cada usuario ve lo permitido por su perfil.",
    "Bajos: aprovecha los dispositivos móviles; sin papel ni consumibles.",
    "Requiere tablet/teléfono con navegador y red (Wi-Fi) en el almacén; sin software del fabricante.",
  ],
}));

// S6. Kardex del producto (pantalla) --------------------------------------
SALIDAS.push(salida("S6", "Kardex del producto", {
  resumen: "Vista en pantalla con el historial cronológico de movimientos de un producto (entradas, salidas, ajustes y devoluciones) con fecha, documento, usuario y saldo resultante. Es el registro confiable que pidió el Encargado de Almacén (RF4).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna, en pantalla, interactiva."],
    ["Tecnología", "Pantalla (PC, tablet); exportable a Excel/CSV (ver S10)."],
    ["Formato", "Tabla cronológica; dinámica."],
    ["Destino / actor", "Encargado y Auxiliar de Almacén; Dirección para auditoría."],
    ["Requerimiento", "RF4 Consulta de existencias y kardex."],
  ],
  fuentes: [
    "Clase Movimiento y sus subclases Entrada, Salida, Ajuste, Devolución (RF3).",
    "Clase Kardex del diagrama de clases (saldo acumulado).",
    "Clase Usuario: quién registró cada movimiento (RF19).",
  ],
  maqueta: [
    p("Producto: RAC-0408 · Racor recto 1/4\" NPT × 8 mm   Existencia actual: 28", { negrita: true, tam: 10 }),
    tabla([1700, 1300, 2360, 1150, 1150, 1700],
      [
        ["Fecha", "Tipo", "Documento", "Entra", "Sale", "Saldo"],
        ["10/11/2026", "Entrada", "F-A-88010", "20", "", "40"],
        ["12/11/2026", "Salida", "NS-2026-0318", "", "12", "28"],
        ["12/11/2026", "Ajuste", "IC-2026-0033", "", "2", "26"],
      ], { noPartirFilas: true, tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta del kardex en pantalla (dinámica, exportable).",
  respuestas: [
    "El personal de almacén y, para auditoría, la Dirección. Debe ser exacto y trazable.",
    "Varios usuarios según el producto consultado.",
    "En oficina y en piso; principalmente en pantalla.",
    "Dar trazabilidad: saber qué pasó con cada producto y cuándo (confiabilidad, RNF2).",
    "Inmediata al abrir el producto.",
    "Frecuente: cada vez que se investiga una diferencia o se revisa un producto.",
    "Permanente en la base de datos; ningún movimiento se borra sin huella (RF19, RNF4).",
    "Sujeto a la bitácora de auditoría; respaldos diarios con retención de 30 días (RNF4).",
    "Sin costo extra: se genera de la base; la exportación reutiliza el módulo de Excel/CSV.",
    "Mínimos: equipo con navegador; sin requisitos ambientales.",
  ],
}));

// S7. Reporte de productos bajo punto de reorden --------------------------
SALIDAS.push(salida("S7", "Reporte de productos bajo punto de reorden", {
  resumen: "Reporte que lista los productos cuya existencia cayó por debajo del punto de reorden, con la cantidad sugerida a comprar y el proveedor con su lead time. Alimenta la generación de órdenes de compra (RF14 reorden, RF20 reportes operativos).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna; en pantalla y exportable."],
    ["Tecnología", "Pantalla + exportación a Excel/CSV + impresión opcional."],
    ["Formato", "Tabla filtrable; dinámica."],
    ["Destino / actor", "Encargada de Compras (y Encargado de Almacén)."],
    ["Requerimiento", "RF14, RF20; enlaza con RF12 órdenes de compra."],
  ],
  fuentes: [
    "Clase Producto: existencia, mínimo, punto de reorden (RF2).",
    "Clase Proveedor: lead time y clasificación (RF11).",
    "Consumo histórico de los movimientos (RF14).",
  ],
  maqueta: [
    tabla([1300, 2700, 1200, 1300, 1260, 1600],
      [
        ["Código", "Descripción", "Exist.", "P. reorden", "Sugerido", "Proveedor (lead)"],
        ["RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "28", "30", "120", "Nacional (7 d)"],
        ["CIL-32100", "Cilindro neumático Ø32 × 100 mm", "3", "5", "10", "Nacional (7 d)"],
      ], { noPartirFilas: true, tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta del reporte de reorden (pantalla + exportable).",
  respuestas: [
    "La Encargada de Compras. Debe ser claro y accionable (ordenable por urgencia).",
    "Principalmente una persona en compras; puede compartirse con almacén y dirección.",
    "En la oficina de compras; se consulta en pantalla o se exporta.",
    "Decidir qué y cuánto comprar antes de que falte mercancía (evitar sobrestock y faltantes).",
    "Al momento; se recalcula con los movimientos del día.",
    "Diaria o semanal, según el ritmo de compras.",
    "La vista no se guarda; los datos sí. La exportación puede archivarse.",
    "Control interno; no tiene regulación externa.",
    "Sin costo adicional: se calcula de la base; la exportación reutiliza S10.",
    "Mínimos: equipo de oficina con navegador.",
  ],
}));

// S8. Reporte de diferencias físico vs sistema ----------------------------
SALIDAS.push(salida("S8", "Reporte de diferencias físico vs sistema", {
  resumen: "Reporte que compara lo contado en el inventario físico contra la existencia del sistema y muestra la diferencia por producto y el porcentaje de exactitud. Es la evidencia para bajar la diferencia del 5% actual a menos del 1% (RF6, RNF2).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna; en pantalla y exportable."],
    ["Tecnología", "Pantalla + exportación a Excel/CSV; impresión opcional."],
    ["Formato", "Tabla con totales y porcentaje; dinámica."],
    ["Destino / actor", "Encargado de Almacén y Dirección General."],
    ["Requerimiento", "RF6 inventario físico y RF20 reportes operativos; soporta RNF2 confiabilidad."],
  ],
  fuentes: [
    "Clase InventarioFisico: cantidades contadas (RF6).",
    "Clase Producto: existencia del sistema (RF2).",
    "Ajustes generados — clase Movimiento/Ajuste (RF3).",
  ],
  maqueta: [
    tabla([1400, 3160, 1500, 1300, 2000],
      [
        ["Código", "Descripción", "Sistema", "Contado", "Diferencia"],
        ["RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "28", "26", "-2"],
        ["CIL-32100", "Cilindro neumático Ø32 × 100 mm", "3", "3", "0"],
        [celda("Exactitud de la familia", { negrita: true, tam: 10, columnas: 4, ancho: 7360 }), celda("96.8%", { negrita: true, tam: 10 })],
      ], { noPartirFilas: true, tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta del reporte de diferencias (pantalla + exportable).",
  respuestas: [
    "El Encargado de Almacén (operativo) y la Dirección (indicador). Debe destacar las diferencias grandes.",
    "Pocas personas: almacén y dirección.",
    "En oficina; se revisa en pantalla y se exporta para la junta.",
    "Medir la exactitud del inventario y justificar los ajustes (confiabilidad, RNF2).",
    "Al cerrar cada conteo; no es urgente al segundo.",
    "Mensual (cíclicos) y semestral (completo).",
    "La exportación se archiva como histórico de exactitud; los ajustes quedan permanentes (RF19).",
    "Control interno; respalda los ajustes que no pueden borrarse sin huella (RNF4).",
    "Sin costo adicional: se calcula de la base.",
    "Mínimos: equipo de oficina con navegador.",
  ],
}));

// S9. Dashboard ejecutivo de KPIs -----------------------------------------
SALIDAS.push(salida("S9", "Dashboard ejecutivo de KPIs", {
  resumen: "Tablero directivo en pantalla con los indicadores semanales (ventas por línea, rotación, agotados, OC abiertas) y mensuales (margen por familia, top 20, sin movimiento, exactitud físico vs sistema). Es salida dinámica tipo tablero de control (Kendall, pp. 346) para la Dirección (RF17).",
  ficha: [
    ["Tipo (Kendall)", "Salida interna, en pantalla, dinámica (tablero de control web)."],
    ["Tecnología", "Pantalla (web); tecnología pull/push, se actualiza sola."],
    ["Formato", "Tarjetas de KPI + gráficas; interactiva, con filtros."],
    ["Destino / actor", "Dirección General (Paulina Pérez)."],
    ["Requerimiento", "RF17 Dashboard ejecutivo con KPIs; exportable por RF18."],
  ],
  fuentes: [
    "Agregados de movimientos, ventas y existencias (RF3, RF4).",
    "Clase OrdenDeCompra: órdenes abiertas y vencidas (RF12, RF16).",
    "Clase DashboardEjecutivo y Reporte del diagrama de clases.",
  ],
  maqueta: [
    tabla([2340, 2340, 2340, 2340],
      [
        ["Exactitud inventario", "Rotación", "OC abiertas", "Productos agotados"],
        ["96.8%  (meta ≥ 99%)", "5.2 veces", "3", "7"],
      ], { noPartirFilas: true, tam: 10 }),
    tabla([4680, 4680], [[
      celda(["[ Gráfica de barras ]", "Ventas por línea (semana)"], { tam: 10, centro: true }),
      celda(["[ Gráfica de pastel ]", "Margen por familia (mes)"], { tam: 10, centro: true }),
    ]], { encabezado: false, noPartirFilas: true }),
  ],
  pieMaqueta: "Figura. Maqueta del dashboard ejecutivo (pantalla dinámica tipo tablero).",
  respuestas: [
    "La Dirección General. Requiere alta calidad visual: gráficas claras sin sesgo (Kendall, pp. 340).",
    "Pocos usuarios directivos; es un tablero personal de dirección.",
    "En la oficina de dirección y en dispositivos móviles del CEO.",
    "Apoyar decisiones estratégicas con indicadores de un vistazo.",
    "En tiempo casi real; se actualiza al entrar y con cada periodo.",
    "Frecuente para la dirección: semanal y mensual, con consultas diarias.",
    "No se almacena como documento; cada periodo queda en los históricos; se puede exportar (RF18).",
    "Interno; debe evitar el sesgo de presentación (escalas, colores) según el libro.",
    "El costo está en el desarrollo de las gráficas; operación sin consumibles.",
    "Mínimos: equipo con navegador; se beneficia de pantalla amplia.",
  ],
}));

// S10. Exportación a Excel y CSV ------------------------------------------
SALIDAS.push(salida("S10", "Exportación a Excel y CSV", {
  resumen: "Salida electrónica en archivo: cualquier reporte o vista tabular puede descargarse en Excel (XLSX) o CSV para procesarlo en CONTPAQi (contabilidad) y para que el contador timbre los CFDI 4.0 desde un PAC externo (RF18).",
  ficha: [
    ["Tipo (Kendall)", "Salida electrónica (archivo), interna→externa (al contador/PAC)."],
    ["Tecnología", "Archivo descargable XLSX/CSV; formatos abiertos."],
    ["Formato", "Archivo de datos; las columnas replican la vista de origen."],
    ["Destino / actor", "Dirección, Compras y el contador externo."],
    ["Requerimiento", "RF18 Exportación a Excel y CSV."],
  ],
  fuentes: [
    "Cualquier reporte o vista tabular del sistema (S6, S7, S8 y catálogos).",
    "Clase Reporte del diagrama de clases.",
  ],
  maqueta: [
    p("Archivo: reporte_reorden_2026-11-12.xlsx  (también .csv)", { negrita: true, tam: 10 }),
    tabla([1400, 2960, 1200, 1400, 1200, 1200],
      [
        ["codigo", "descripcion", "existencia", "punto_reorden", "sugerido", "proveedor"],
        ["RAC-0408", "Racor recto 1/4\" NPT × 8 mm", "28", "30", "120", "Nacional"],
        ["CIL-32100", "Cilindro neumático Ø32 × 100 mm", "3", "5", "10", "Nacional"],
      ], { noPartirFilas: true, tam: 10 }),
  ],
  pieMaqueta: "Figura. Maqueta del archivo exportado (salida electrónica XLSX/CSV).",
  respuestas: [
    "La Dirección, Compras y el contador externo. La calidad es la integridad de los datos, no el formato visual.",
    "Las que necesiten reprocesar datos; se comparte por correo o carpeta.",
    "Se descarga y se envía a contabilidad / al PAC; distribución electrónica.",
    "Permitir el procesamiento posterior (contabilidad, CFDI) sin recapturar.",
    "Inmediata al pulsar \"Exportar\".",
    "Según el cierre contable: típicamente mensual, con descargas puntuales.",
    "El archivo lo conserva quien lo descarga; el origen queda en la base.",
    "Al salir hacia CFDI entra la normativa SAT (CFDI 4.0), que atiende el PAC externo en 2.ª fase.",
    "Sin costo de hardware; es software ya contemplado (RNF8).",
    "Ninguno especial: es un archivo; no requiere impresora ni dispositivo.",
  ],
}));

// =========================================================================
// Documento
// =========================================================================
const objetivos = [
  ["#", "Objetivo (Kendall y Kendall, pp. 329–330)", "Cómo se cumple en el SIA-NP"],
  ["1", "Diseñar la salida para servir al propósito previsto", "Cada salida nace de un requerimiento (RF) y de una necesidad expresada en las entrevistas."],
  ["2", "Diseñar la salida para ajustarla al usuario", "Impresa para el cliente/proveedor; pantalla móvil con imagen para el piso; tablero para la dirección."],
  ["3", "Entregar la cantidad apropiada de salida", "Reportes filtrables por familia, proveedor o periodo; no se satura al usuario."],
  ["4", "Asegurar que la salida esté donde se necesita", "Móvil en el almacén, impresa en el mostrador, PDF por correo al proveedor."],
  ["5", "Proveer la salida en forma oportuna", "Consultas en pocos segundos (RNF1); notas e impresiones al confirmar la operación."],
  ["6", "Elegir el método de salida correcto", "Se decide con las 10 preguntas del libro, respondidas para cada salida en este documento."],
];

const inventario = [
  ["Salida", "Tipo", "Tecnología", "Destino / actor", "RF"],
  ["S1 Nota de salida", "Externa", "Impresa", "Cliente / Almacén", "RF8"],
  ["S2 Orden de compra", "Externa", "PDF correo / impresa", "Proveedor / Compras", "RF12"],
  ["S3 Orden de surtido", "Interna", "Impresa / tablet", "Auxiliar de Almacén", "RF8"],
  ["S4 Hoja de conteo", "Interna", "Impresa", "Encargado de Almacén", "RF6"],
  ["S5 Consulta de existencias", "Interna", "Pantalla móvil (interactiva)", "Almacén / mostrador", "RF4, RF5, RF10"],
  ["S6 Kardex del producto", "Interna", "Pantalla (dinámica)", "Almacén / auditoría", "RF4"],
  ["S7 Reporte de reorden", "Interna", "Pantalla + exportación", "Compras", "RF14, RF20"],
  ["S8 Diferencias físico vs sistema", "Interna", "Pantalla + exportación", "Almacén / Dirección", "RF6"],
  ["S9 Dashboard de KPIs", "Interna", "Pantalla web (dinámica)", "Dirección General", "RF17"],
  ["S10 Exportación Excel/CSV", "Electrónica", "Archivo XLSX/CSV", "Dirección / contador", "RF18"],
];

const hijos = [
  ...portada("Diseño de salidas del sistema"),

  titulo("1. Introducción"),
  p("Este documento presenta el diseño de las salidas del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico. Una salida es la información que el sistema entrega a sus usuarios o a terceros; su diseño correcto es clave porque, como advierten Kendall y Kendall, la salida es a menudo lo único que muchos usuarios llegan a conocer del sistema y, con frecuencia, la base para juzgar su utilidad.", J),
  p("Para cada salida se indica de qué documentos fuente proviene, se muestra una maqueta de su diseño, se clasifica su tipo y tecnología, y se responden las diez preguntas que el libro propone para elegir la tecnología de salida adecuada. Los requerimientos se citan con la numeración del Apéndice C de la ERS.", J),

  titulo("2. Objetivos del diseño de la salida"),
  p("Kendall y Kendall (2011, cap. 11, pp. 329–330) plantean seis objetivos que debe cumplir toda salida bien diseñada. La Tabla 1 los enuncia y muestra cómo se atienden en el SIA-NP.", J),
  tabla([500, 4260, 4600], objetivos, { noPartirFilas: true }),
  pieFigura("Tabla 1. Objetivos del diseño de la salida y su aplicación al SIA-NP."),

  titulo("3. Tipos y tecnologías de salida"),
  p("El libro distingue, entre otras, la salida externa (sale de la organización, como una factura a un cliente) de la interna (permanece dentro, como un reporte para un gerente), y la salida estática (impresa) de la dinámica (en pantalla, que el usuario puede cambiar en tiempo real). Entre las tecnologías de salida describe las impresoras, las pantallas, la salida de audio y voz, la salida electrónica (correo, fax) y la Web con sus tecnologías push y pull (pp. 331–335).", J),
  p("El SIA-NP usa cuatro tecnologías: documentos impresos (notas, órdenes, hojas de conteo), pantallas interactivas (consultas, kardex, tablero) en PC y dispositivos móviles, salida electrónica en PDF (orden de compra por correo) y archivos de datos (exportación a Excel/CSV). No se emplea salida de audio ni microformas por no corresponder a las necesidades del almacén.", J),

  titulo("4. Preguntas para elegir la tecnología de salida"),
  p("Aunque la tecnología cambia con rapidez, Kendall y Kendall (pp. 336–339) señalan que al elegir la tecnología de salida conviene responder diez preguntas que se mantienen constantes. Son las que se aplican a cada salida en la sección 6:", J),
  ...PREGUNTAS.map((q) => vineta(q)),

  titulo("5. Inventario de salidas del SIA-NP"),
  p("La Tabla 2 resume las diez salidas del sistema con su tipo, tecnología, destino y el requerimiento que las origina. En la sección 6 se detalla cada una.", J),
  tabla([2500, 1200, 2360, 2000, 1300], inventario, { noPartirFilas: true, tam: 10 }),
  pieFigura("Tabla 2. Inventario de salidas del sistema."),

  titulo("6. Diseño de cada salida", 1, { nuevaPagina: true }),
  p("Para cada salida se presenta su resumen, su clasificación, los documentos fuente, la maqueta del diseño y la tabla con las diez preguntas respondidas.", J),
  ...SALIDAS.flat(),

  titulo("7. Conclusión", 1, { nuevaPagina: true }),
  p("El SIA-NP entrega diez salidas que cubren las necesidades expresadas por los usuarios: documentos externos para clientes y proveedores (nota de salida y orden de compra), documentos internos de operación (orden de surtido y hoja de conteo), consultas en pantalla para el piso del almacén (existencias y kardex), reportes operativos y de compras, el tablero ejecutivo para la dirección y la exportación electrónica para contabilidad. En cada caso la tecnología se eligió respondiendo las diez preguntas del libro, de modo que la salida llegue al usuario correcto, en el lugar y el momento adecuados y con la calidad que su propósito exige.", J),

  titulo("Referencias"),
  p("Kendall, K. E. y Kendall, J. E. (2011). Análisis y diseño de sistemas (8a ed.), cap. 11 “Diseño de una salida eficaz”, pp. 329–357. México: Pearson Educación.", J),
  p("Equipo Grupo S5A (2026). Especificación de requerimientos de software SIA-NP (IEEE 830), Apéndice C, y Escenarios de los casos de uso CU1–CU8.", J),
];

guardar(documento(hijos, { titulo: "Diseño de salidas SIA-NP" }), DOCX);
