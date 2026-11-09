// Genera entregables/04-secuencia/SIA-NP_Diagramas_de_Secuencia.docx
// Uso: node 04_secuencia.js   (desde scripts/docx)
// Las figuras SD1 y SD2 son recortes PNG (300 dpi) del PDF vectorial original, ya corregido
// (mensaje 6 con parámetros), guardados en entregables/04-secuencia/figuras/.
const path = require("path");
const { RAIZ, run, p, titulo, vineta, tabla, imagen, pieFigura, portada, documento, guardar } = require("./comun");

const DIR = path.join(RAIZ, "entregables", "04-secuencia");
const FIG = path.join(DIR, "figuras");

// Párrafo con etiqueta en negrita: "Quién inicia: texto"
const etiquetado = (etiqueta, texto) => p([run(etiqueta, { negrita: true }), run(" " + texto)]);

// Figura en página horizontal: título de sección, imagen y pie.
// Márgenes de 0.5 in para que la figura conserve el tamaño de letra del original (unos 6.3 pt).
function paginaFigura(tituloSeccion, archivo, pie, anchoPx) {
  return {
    horizontal: true,
    margen: 720,
    hijos: [
      titulo(tituloSeccion, 1),
      imagen(path.join(FIG, archivo), { anchoPx, altoMaxPx: 2000, conSiguiente: true }),
      pieFigura(pie),
    ],
  };
}

const ANCHOS_PART = [500, 3350, 1100, 4410];
const ANCHOS_MET = [520, 2580, 2450, 1550, 2260];
const ENC_PART = ["#", "Participante", "Tipo", "Papel en la secuencia"];
const ENC_MET = ["#", "Origen → Destino", "Método / respuesta", "Parámetros", "Qué hace"];

// ---------------------------------------------------------------- Sección 1
const seccion1 = [
  ...portada("Diagramas de secuencia"),
  titulo("1. Selección de las secuencias", 1),
  p("Se eligieron CU6 Recibir Mercancía contra Orden de Compra (RF13) y CU1 Registrar Movimientos (RF3, RF8, RF9); " +
    "los números de RF son los de la relación numerada del Apéndice C de la ERS. Ambos casos de uso modifican la " +
    "existencia del inventario, objetivo central del sistema: que lo que diga el sistema sea lo que hay en el almacén. " +
    "CU1 es la operación diaria del almacén y debe evitar vender lo que no hay, el problema más grave que señaló el " +
    "Encargado de Almacén; CU6 liga la mercancía que llega con su orden de compra y su factura, y controla lo pendiente " +
    "por recibir. CU3 y CU4 también modifican la existencia, pero por ajustes de conteo y devoluciones, no por la " +
    "operación diaria. Ambas secuencias comparten las clases Producto, Ubicacion, Kardex y BitacoraDeAuditoria."),
  tabla([2200, 3400, 3760], [
    ["Secuencia", "Caso de uso y tarjetas CRC de origen", "Por qué es relevante"],
    ["SD1 Recibir mercancía contra orden de compra",
      "CU6 Recibir Mercancía contra Orden de Compra; tarjetas OrdenDeCompra, Recepcion, Entrada, Producto, Ubicacion, Kardex y BitacoraDeAuditoria.",
      "Liga la mercancía que llega con su orden de compra y su factura; suma existencia y controla lo pendiente por recibir."],
    ["SD2 Registrar movimientos",
      "CU1 Registrar Movimientos; tarjetas Movimiento, Salida, Producto, Ubicacion, Kardex y BitacoraDeAuditoria.",
      "Es la operación diaria del almacén; actualiza la existencia y, en las salidas, evita vender lo que no hay en el piso."],
  ], { noPartirFilas: true }),
  titulo("Notación utilizada", 2),
  vineta("Los actores (figura de persona) inician cada secuencia; los objetos aparecen como «objeto::Clase»."),
  vineta("La línea punteada vertical es la línea de vida; el rectángulo angosto es la activación del objeto."),
  vineta("La flecha continua con punta llena es un mensaje (llamada a un método con sus parámetros entre paréntesis)."),
  vineta("La flecha punteada es la respuesta con el valor que se devuelve."),
  vineta("La flecha que regresa al mismo objeto es un mensaje a sí mismo (por ejemplo, generarFolio)."),
  vineta("Los mensajes están numerados en el orden en que ocurren."),
];

// ---------------------------------------------------------------- SD1 (CU6)
const sd1Participantes = [
  ["1", "Encargada de Compras", "Actor", "Busca la orden, captura lo recibido y confirma la recepción."],
  ["2", "ir::InterfazRecepcion", "Interfaz", "Pantalla de recepción: recibe los datos, valida los campos y muestra el comprobante."],
  ["3", "cr::ControladorRecepcion", "Control", "Coordina la recepción: busca la orden, compara cantidades, crea la recepción y registra en la bitácora."],
  ["4", "oc::OrdenDeCompra", "Entidad", "Entrega las partidas pendientes, compara lo recibido contra lo pedido y cambia su estado."],
  ["5", "rec::Recepcion", "Entidad", "Registra la recepción con su factura o remisión y genera la entrada al inventario."],
  ["6", "ent::Entrada", "Entidad", "Movimiento de entrada (subclase de Movimiento): genera su folio, suma la existencia y se agrega al kardex."],
  ["7", "ub::Ubicacion", "Entidad", "Confirma que la ubicación asignada exista y esté disponible."],
  ["8", "prod::Producto", "Entidad", "Aumenta su existencia con la cantidad recibida."],
  ["9", "kdx::Kardex", "Entidad", "Agrega el movimiento al historial del producto."],
  ["10", "bit::BitacoraDeAuditoria", "Entidad", "Registra quién hizo la recepción y cuándo."],
];

const sd1Metodos = [
  ["1", "Encargada de Compras → InterfazRecepcion", "seleccionarOrden()", "folioOC", "Selecciona la orden de compra que se va a recibir."],
  ["2", "InterfazRecepcion → ControladorRecepcion", "buscarOrden()", "folioOC", "Envía la solicitud de búsqueda a su controlador."],
  ["3", "ControladorRecepcion → OrdenDeCompra", "buscarOrdenPendiente()", "folioOC", "Busca la orden emitida y pendiente de recibir."],
  ["4", "OrdenDeCompra → ControladorRecepcion", "respuesta: partidas pendientes", "—", "Devuelve los productos y las cantidades pendientes."],
  ["5", "ControladorRecepcion → InterfazRecepcion", "respuesta: detalle de la orden", "—", "La interfaz muestra las partidas pendientes."],
  ["6", "Encargada de Compras → InterfazRecepcion", "capturarDatos()", "cantidades, ubicacion, factura", "Captura las cantidades recibidas, la ubicación asignada y la factura o remisión."],
  ["7", "InterfazRecepcion → sí misma", "validarCampos(): Boolean", "—", "Revisa que los campos obligatorios estén completos."],
  ["8", "InterfazRecepcion → ControladorRecepcion", "registrarRecepcion()", "folioOC, cantidades, ubicacion, factura", "Envía la recepción confirmada al controlador."],
  ["9", "ControladorRecepcion → OrdenDeCompra", "compararCantidades()", "cantidades", "Compara lo recibido contra lo pedido."],
  ["10", "OrdenDeCompra → ControladorRecepcion", "respuesta: diferencias", "—", "Devuelve el saldo pendiente o los excedentes."],
  ["11", "ControladorRecepcion → Recepcion", "crearRecepcion()", "folioOC, factura", "Crea la recepción ligada a la orden y a la factura."],
  ["12", "Recepcion → ControladorRecepcion", "respuesta: folioRecepcion", "—", "Devuelve el folio de la recepción."],
  ["13", "ControladorRecepcion → Recepcion", "generarEntrada()", "cantidades, ubicacion", "Pide generar la entrada al inventario de cada partida recibida."],
  ["14", "Recepcion → Entrada", "crearMovimiento()", "\"E\", cantidad, ubicacion, factura", "Crea el movimiento de entrada."],
  ["15", "Entrada → Ubicacion", "validarUbicacion()", "clave", "Verifica que la ubicación exista y esté disponible."],
  ["16", "Ubicacion → Entrada", "respuesta: true", "—", "La ubicación es válida."],
  ["17", "Entrada → sí misma", "generarFolio(): String", "—", "Genera el folio del movimiento."],
  ["18", "Entrada → Producto", "actualizarExistencia()", "\"E\", cantidad", "Suma la cantidad recibida a la existencia."],
  ["19", "Entrada → Kardex", "agregarRegistro()", "movimiento", "Agrega la entrada al historial del producto."],
  ["20", "Entrada → Recepcion", "respuesta: folioEntrada", "—", "Devuelve el folio de la entrada."],
  ["21", "Recepcion → ControladorRecepcion", "respuesta: folioEntrada", "—", "Confirma que la entrada quedó registrada."],
  ["22", "ControladorRecepcion → OrdenDeCompra", "actualizarEstado()", "diferencias", "Cambia la orden a \"Recibida\" o \"Parcialmente recibida\"."],
  ["23", "ControladorRecepcion → BitacoraDeAuditoria", "registrarEvento()", "usuario, \"Recepción\"", "Registra quién hizo la recepción y cuándo."],
  ["24", "ControladorRecepcion → InterfazRecepcion", "respuesta: folioRecepcion", "—", "Devuelve el folio de la recepción."],
  ["25", "InterfazRecepcion → sí misma", "mostrarComprobante()", "—", "Muestra el comprobante de la recepción."],
  ["26", "InterfazRecepcion → Encargada de Compras", "respuesta: comprobante", "—", "El actor ve el comprobante con los folios."],
];

const sd1Texto = [
  titulo("2.1 Descripción de la secuencia SD1", 2),
  etiquetado("Quién inicia:", "El actor Encargada de Compras, al seleccionar la opción \"Recibir mercancía\" y buscar la orden de compra por su folio."),
  etiquetado("Objetivo:", "Registrar la mercancía que llega del proveedor contra una orden de compra emitida, generar la entrada al inventario, " +
    "actualizar la existencia y el kardex, y dejar la orden como \"Recibida\" o \"Parcialmente recibida\"."),
  titulo("Participantes en orden", 3),
  tabla(ANCHOS_PART, [ENC_PART, ...sd1Participantes], { noPartirFilas: true }),
  titulo("Métodos y parámetros", 3),
  tabla(ANCHOS_MET, [ENC_MET, ...sd1Metodos], { noPartirFilas: true, tam: 9 }),
  titulo("Descripción del flujo", 3),
  p("La Encargada de Compras selecciona en la interfaz la orden de compra por su folio (1). La interfaz envía la solicitud a su " +
    "controlador (2), que busca la orden pendiente (3) y devuelve las partidas por recibir para mostrarlas en pantalla (4-5). " +
    "La Encargada captura las cantidades recibidas, la ubicación y la factura o remisión (6); la interfaz valida los campos (7) " +
    "y envía la recepción al controlador (8)."),
  p("El controlador compara lo recibido contra lo pedido (9-10) y crea la recepción (11-12). Después pide a la recepción generar " +
    "la entrada (13): la entrada valida la ubicación (15-16), genera su folio (17), suma la existencia del producto (18) y se " +
    "agrega al kardex (19). Los mensajes 14 a 20 se repiten por cada partida recibida. Al final el controlador actualiza el " +
    "estado de la orden (22), registra la operación en la bitácora (23) y la interfaz muestra el comprobante (24-26). La " +
    "interfaz nunca habla directamente con las entidades: todo pasa por ControladorRecepcion."),
  p("Flujos alternos: si no se localiza la orden (2a), el mensaje 4 regresa vacío y la interfaz permite buscar de nuevo o " +
    "cancelar. Si la recepción es parcial (4a), en el mensaje 22 la orden queda como \"Parcialmente recibida\" y conserva su " +
    "saldo pendiente. Si la cantidad recibida excede la solicitada (7a), el mensaje 10 reporta el excedente y el controlador " +
    "pide a la recepción solicitarAutorizacion() antes de continuar."),
];

// ---------------------------------------------------------------- SD2 (CU1)
const sd2Participantes = [
  ["1", "Encargado de Almacén", "Actor", "Escanea el producto, captura los datos del movimiento y lo confirma."],
  ["2", "irm::InterfazRegistroMovimientos", "Interfaz", "Pantalla de registro: recibe el código y los datos, valida los campos y muestra la nota de salida."],
  ["3", "cm::ControladorMovimientos", "Control", "Coordina el registro: busca el producto, valida ubicación y existencia, crea el movimiento, registra en la bitácora y revisa el reorden."],
  ["4", "prod::Producto", "Entidad", "Da su existencia y ubicación, confirma si alcanza, resta la cantidad e indica si quedó bajo el punto de reorden."],
  ["5", "ub::Ubicacion", "Entidad", "Confirma que la ubicación capturada exista y esté disponible."],
  ["6", "sal::Salida", "Entidad", "Movimiento de salida (subclase de Movimiento): genera su folio, actualiza la existencia y se agrega al kardex."],
  ["7", "kdx::Kardex", "Entidad", "Agrega el movimiento al historial del producto."],
  ["8", "bit::BitacoraDeAuditoria", "Entidad", "Registra quién hizo el movimiento y cuándo."],
];

const sd2Metodos = [
  ["1", "Encargado de Almacén → InterfazRegistroMovimientos", "escanearCodigo()", "codigo", "Escanea o captura el código del producto."],
  ["2", "InterfazRegistroMovimientos → ControladorMovimientos", "buscarProducto()", "codigo", "Envía la búsqueda del producto a su controlador."],
  ["3", "ControladorMovimientos → Producto", "obtenerProducto()", "codigo", "Busca el producto en el catálogo."],
  ["4", "Producto → ControladorMovimientos", "respuesta: existencia, ubicacion", "—", "Devuelve la existencia actual y la ubicación."],
  ["5", "ControladorMovimientos → InterfazRegistroMovimientos", "respuesta: datos del producto", "—", "La interfaz muestra la existencia y la ubicación."],
  ["6", "Encargado de Almacén → InterfazRegistroMovimientos", "capturarDatos()", "tipo, cantidad, ubicacion, documento", "Captura el tipo de movimiento, la cantidad, la ubicación y el documento de referencia."],
  ["7", "InterfazRegistroMovimientos → sí misma", "validarCampos(): Boolean", "—", "Revisa que los campos obligatorios estén completos."],
  ["8", "InterfazRegistroMovimientos → ControladorMovimientos", "registrarMovimiento()", "tipo, cantidad, ubicacion, documento", "Envía el movimiento confirmado al controlador."],
  ["9", "ControladorMovimientos → sí mismo", "validarDatos(): Boolean", "—", "Inicia la validación de los datos recibidos."],
  ["10", "ControladorMovimientos → Ubicacion", "validarUbicacion()", "clave", "Verifica que la ubicación exista y esté disponible."],
  ["11", "Ubicacion → ControladorMovimientos", "respuesta: true", "—", "La ubicación es válida."],
  ["12", "ControladorMovimientos → Producto", "verificarExistencia()", "cantidad", "Verifica que haya existencia suficiente para la salida."],
  ["13", "Producto → ControladorMovimientos", "respuesta: true", "—", "Sí hay existencia suficiente."],
  ["14", "ControladorMovimientos → Salida", "crearMovimiento()", "\"S\", cantidad, ubicacion, documento", "Crea el movimiento de salida."],
  ["15", "Salida → sí misma", "generarFolio(): String", "—", "Genera el folio del movimiento."],
  ["16", "Salida → Producto", "actualizarExistencia()", "\"S\", cantidad", "Resta la cantidad a la existencia."],
  ["17", "Salida → Kardex", "agregarRegistro()", "movimiento", "Agrega la salida al historial del producto."],
  ["18", "Salida → ControladorMovimientos", "respuesta: folio", "—", "Devuelve el folio del movimiento."],
  ["19", "ControladorMovimientos → BitacoraDeAuditoria", "registrarEvento()", "usuario, \"Salida\"", "Registra quién hizo el movimiento y cuándo."],
  ["20", "ControladorMovimientos → Producto", "verificarPuntoDeReorden()", "—", "Revisa si el producto quedó debajo del punto de reorden (regresa Boolean)."],
  ["21", "Producto → ControladorMovimientos", "respuesta: false", "—", "No se alcanzó el punto de reorden."],
  ["22", "ControladorMovimientos → InterfazRegistroMovimientos", "respuesta: folio", "—", "Devuelve el folio del movimiento."],
  ["23", "InterfazRegistroMovimientos → sí misma", "mostrarNotaDeSalida()", "—", "Muestra la nota de salida con el folio."],
  ["24", "InterfazRegistroMovimientos → Encargado de Almacén", "respuesta: confirmación y folio", "—", "El actor ve la confirmación del movimiento."],
];

const sd2Texto = [
  titulo("3.1 Descripción de la secuencia SD2", 2),
  etiquetado("Quién inicia:", "El actor Encargado de Almacén (o el Auxiliar de Almacén), al escanear el código del producto en la pantalla de registro de movimientos."),
  etiquetado("Objetivo:", "Registrar un movimiento de inventario (en la figura, una salida) validando la ubicación y que haya existencia " +
    "suficiente, actualizar la existencia y el kardex, asentarlo en la bitácora y revisar si el producto llegó a su punto de reorden."),
  titulo("Participantes en orden", 3),
  tabla(ANCHOS_PART, [ENC_PART, ...sd2Participantes], { noPartirFilas: true }),
  titulo("Métodos y parámetros", 3),
  tabla(ANCHOS_MET, [ENC_MET, ...sd2Metodos], { noPartirFilas: true, tam: 9 }),
  titulo("Descripción del flujo", 3),
  p("El Encargado de Almacén escanea el código del producto (1). La interfaz envía la búsqueda a su controlador (2), que obtiene " +
    "el producto (3) y devuelve su existencia y ubicación para mostrarlas (4-5). El Encargado captura el tipo de movimiento, la " +
    "cantidad, la ubicación y el documento de referencia (6); la interfaz valida los campos (7) y envía el movimiento al controlador (8)."),
  p("El controlador valida los datos (9): revisa la ubicación (10-11) y, por ser una salida, que haya existencia suficiente (12-13). " +
    "Si todo es correcto crea la salida (14), que genera su folio (15), resta la existencia del producto (16) y se agrega al " +
    "kardex (17). Después el controlador registra la operación en la bitácora (19), revisa el punto de reorden (20-21) y la " +
    "interfaz muestra la nota de salida con el folio (22-24). La interfaz nunca habla directamente con las entidades: todo pasa " +
    "por ControladorMovimientos."),
  p("Flujos alternos: si el producto no existe (4a), el mensaje 4 regresa vacío y la interfaz ofrece darlo de alta o cancelar. " +
    "Si falta un campo obligatorio (8b), validarCampos() regresa false y no se envía nada al controlador. Si la cantidad es mayor " +
    "a la existencia (8a), el mensaje 13 regresa false, no se crea el movimiento (14 a 21) y la interfaz muestra una alerta con " +
    "mostrarMensaje(). Si el usuario cancela (7a), no se envía el mensaje 8 y el inventario no cambia. Si " +
    "verificarPuntoDeReorden() regresa true, el controlador llama a notificarReorden() y la interfaz muestra el aviso. Una " +
    "entrada, un ajuste o una devolución siguen la misma secuencia con su propia subclase de Movimiento; en las entradas no se " +
    "verifica la existencia (12-13)."),
];

const doc = documento(null, {
  titulo: "SIA-NP — Diagramas de secuencia",
  secciones: [
    seccion1,
    paginaFigura("2. SD1 Recibir mercancía contra orden de compra", "SD1_CU6_Recibir_mercancia.png",
      "Figura 1. Diagrama de secuencia SD1 del caso de uso CU6 Recibir Mercancía contra Orden de Compra (RF13).", 944),
    sd1Texto,
    paginaFigura("3. SD2 Registrar movimientos", "SD2_CU1_Registrar_movimientos.png",
      "Figura 2. Diagrama de secuencia SD2 del caso de uso CU1 Registrar Movimientos (RF3, RF8, RF9), con una salida como ejemplo.", 840),
    sd2Texto,
  ],
});

guardar(doc, path.join(DIR, "SIA-NP_Diagramas_de_Secuencia.docx"));
