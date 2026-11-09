// Entregable 06: Diagrama de estados de la clase OrdenDeCompra.
// Uso (desde scripts/docx): node 06_estados.js
// Requiere haber corrido antes: python ../estados/diagrama_estados.py (genera el PNG de la figura).
const path = require("path");
const {
  RAIZ, p, titulo, vineta, tabla, imagen, pieFigura, portada, documento, guardar,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "06-estados");
const PNG = path.join(DIR, "Diagrama_de_Estados_SIA-NP.png");
const DOCX = path.join(DIR, "Diagrama_de_Estados_SIA-NP.docx");

const J = { justificado: true };

const estados = [
  ["Estado", "Descripción", "Actividades"],
  ["Pendiente",
    "La Encargada de Compras creó la orden y está capturando los productos. Es un borrador sin folio definitivo (CU5, flujo alternativo 7a).",
    ["entry / guardarBorrador()", "do / agregarProducto(producto, cantidad)"]],
  ["Emitida",
    "La orden se confirmó con folio consecutivo y se envió al proveedor. Espera la llegada de la mercancía (CU5, paso 8).",
    ["entry / generarDocumento()"]],
  ["Parcialmente recibida",
    "Se registró al menos una recepción, pero algún producto todavía tiene saldo pendiente. La orden sigue abierta (CU6, flujo alternativo 4a).",
    ["entry / actualizarEstado(diferencias)"]],
  ["Recibida",
    "Se recibió la cantidad solicitada de todos los productos: el saldo pendiente es cero (CU6, paso 9).",
    ["entry / actualizarEstado(diferencias)"]],
  ["Cerrada",
    "La Encargada de Compras dio por terminada la orden. Ya no admite recepciones; solo se consulta.",
    "—"],
  ["Cancelada",
    "La orden se anuló antes de recibir mercancía, desde Pendiente o desde Emitida.",
    "—"],
];

const transiciones = [
  ["#", "Origen", "Evento [guarda] / acción", "Destino", "CU / RF"],
  ["T1", "Inicio", "se creó la orden / crearOrden()", "Pendiente", "CU5, RF12"],
  ["T2", "Pendiente", "se confirmó la emisión [total > 0] / emitirOrden()", "Emitida", "CU5 (pasos 7–8), RF12"],
  ["T3", "Pendiente", "se canceló la orden / cancelarOrden()", "Cancelada", "CU5, RF12"],
  ["T4", "Emitida", "se canceló la orden / cancelarOrden()", "Cancelada", "RF12"],
  ["T5", "Emitida", "se recibió mercancía [calcularSaldoPendiente() > 0] / compararCantidades(cantidades)", "Parcialmente recibida", "CU6 (4a, 9), RF13"],
  ["T6", "Emitida", "se recibió mercancía [calcularSaldoPendiente() = 0] / compararCantidades(cantidades)", "Recibida", "CU6 (paso 9), RF13"],
  ["T7", "Parcialmente recibida", "se recibió mercancía [calcularSaldoPendiente() > 0] / compararCantidades(cantidades) (autotransición)", "Parcialmente recibida", "CU6 (4a), RF13"],
  ["T8", "Parcialmente recibida", "se recibió mercancía [calcularSaldoPendiente() = 0] / compararCantidades(cantidades)", "Recibida", "CU6 (paso 9), RF13"],
  ["T9", "Recibida", "se cerró la orden / cerrarOrden()", "Cerrada", "RF12"],
  ["T10", "Cerrada", "(fin del ciclo de vida)", "Final", "—"],
  ["T11", "Cancelada", "(fin del ciclo de vida)", "Final", "—"],
];

const hijos = [
  ...portada("Diagrama de estados"),

  titulo("1. Introducción"),
  p("En este documento se presenta el diagrama de estados de la clase OrdenDeCompra del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico. Se eligió esta clase porque una orden de compra cambia varias veces de situación durante su vida: se captura, se emite al proveedor, se recibe por partes o completa y al final se cierra o se cancela. Estos cambios los provocan los casos de uso CU5 Generar orden de compra y CU6 Recibir mercancía contra orden de compra, este último uno de los dos casos de uso críticos del sistema.", J),
  p("Los eventos, las guardas y las acciones del diagrama usan los atributos y métodos que ya aparecen en el diagrama de clases (OrdenDeCompra, DetalleOrden y Recepcion). Los requerimientos se citan con la numeración del Apéndice C de la ERS.", J),

  titulo("2. ¿Qué es un diagrama de estados?"),
  p("Según Kendall y Kendall (2011, cap. 10, pp. 309–311), el diagrama de estados, o de transiciones de estado, es otra herramienta para determinar los métodos de las clases. Se dibuja para una sola clase y muestra los distintos estados por los que pasa un objeto: por lo general los objetos se crean, pasan por cambios y se eliminan.", J),
  p("Los elementos que usa el libro, y que se siguen en este trabajo, son:", J),
  vineta("Estado: la condición de un objeto en un momento específico. La definen los valores de sus atributos; a veces hay un atributo, como el estado del pedido, que lo indica directamente (p. 309). En OrdenDeCompra ese atributo es estado. Se dibuja como un rectángulo con esquinas redondeadas."),
  vineta("Acciones de entrada y de salida: lo que el objeto debe hacer cada vez que entra o sale de un estado (p. 309). En UML se escriben en un compartimento del estado como entry / acción, do / actividad y exit / acción."),
  vineta("Evento y transición: un evento es algo que ocurre en un tiempo y lugar específicos y provoca el cambio de estado; se dice que la transición se “dispara”. Los eventos se nombran en pasado, porque ya ocurrieron (pp. 309 y 311)."),
  vineta("Condición de guardia: algo que se evalúa como verdadero o falso y se escribe entre corchetes junto al evento (p. 309). La etiqueta completa de una transición queda como evento [guarda] / acción."),
  vineta("Inicio y fin: un círculo relleno para el inicio y círculos concéntricos con el centro relleno para el fin, como en el diagrama de actividad (p. 311)."),
  p("El libro recomienda hacer diagramas de estados solo para las clases con un ciclo de vida complejo o cuyo comportamiento depende de lo que ocurrió antes, y revisar que cada estado tenga al menos una transición de entrada y una de salida (p. 311). OrdenDeCompra cumple ambos criterios: lo que se puede hacer con una orden depende de si ya se emitió o de si ya se recibió parte de la mercancía.", J),

  titulo("3. Diagrama de estados de OrdenDeCompra", 1, { nuevaPagina: true }),
  p("La Figura 1 muestra los seis estados del atributo estado de OrdenDeCompra, con su estado inicial y sus estados finales.", J),
  imagen(PNG, { altoMaxPx: 760, conSiguiente: true }),
  pieFigura("Figura 1. Diagrama de estados de la clase OrdenDeCompra."),

  titulo("4. Descripción de los estados", 1, { nuevaPagina: true }),
  p("La Tabla 1 describe cada estado y las actividades que realiza el objeto dentro de él.", J),
  tabla([1800, 4160, 3400], estados, { noPartirFilas: true }),
  pieFigura("Tabla 1. Estados de la clase OrdenDeCompra."),

  titulo("5. Descripción de las transiciones"),
  p("La Tabla 2 lista las transiciones de la Figura 1 con el caso de uso y el requerimiento del Apéndice C de la ERS con que se relacionan: RF12 Generación de órdenes de compra y RF13 Recepción de mercancía contra OC.", J),
  tabla([620, 1700, 3940, 1700, 1400], transiciones, { noPartirFilas: true }),
  pieFigura("Tabla 2. Transiciones de la clase OrdenDeCompra."),

  titulo("6. Notas sobre el diagrama"),
  vineta("Autotransición en Parcialmente recibida (T7): cuando llega otra recepción parcial, la orden sale y vuelve a entrar al mismo estado. Por eso la acción entry / actualizarEstado(diferencias) se ejecuta otra vez y la orden refleja el nuevo saldo pendiente, como pide la poscondición de CU6."),
  vineta("La guarda calcularSaldoPendiente() es el método de DetalleOrden (cantidadSolicitada menos cantidadRecibida). Se evalúa para cada producto de la orden: si algún detalle tiene saldo mayor que cero, la orden queda Parcialmente recibida; si todos están en cero, queda Recibida."),
  vineta("El evento “se recibió mercancía” ocurre cuando ControladorRecepcion registra la recepción (registrarRecepcion) y Recepcion llama a actualizarEstadoOrden(); en ese momento OrdenDeCompra compara las cantidades con compararCantidades(cantidades) y actualiza su estado."),
  vineta("Las cancelaciones (T3 y T4) y el cierre (T9) no tienen un caso de uso propio entre CU1–CU8; se incluyeron porque los métodos cancelarOrden() y cerrarOrden() y los valores Cancelada y Cerrada ya existen en la clase. Los estados son una propuesta del equipo."),
  vineta("Todos los atributos y métodos usados en el diagrama ya existen en el diagrama de clases (OrdenDeCompra y DetalleOrden); no fue necesario agregar ninguno."),

  titulo("Referencias"),
  p("Kendall, K. E. y Kendall, J. E. (2011). Análisis y diseño de sistemas (8a ed.), cap. 10 “Análisis y diseño de sistemas orientados a objetos mediante el uso de UML”, pp. 281–327. México: Pearson Educación.", J),
  p("Equipo Grupo S5A (2026). Especificación de requerimientos de software SIA-NP (IEEE 830), Apéndice C, y Escenarios de los casos de uso CU5 y CU6.", J),
];

guardar(documento(hijos, { titulo: "Diagrama de estados SIA-NP" }), DOCX);
