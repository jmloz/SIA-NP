// Entregable 07: Diccionario de datos del SIA-NP.
// Uso (desde scripts/docx): node 07_diccionario.js   y luego   python a_pdf.py <docx>
// Los datos salen de los atributos del diagrama de clases (scripts/modelo_clases.py) y de la
// descripción lógica de datos de la ERS (sección 4.1). Las llaves foráneas se escriben con el
// nombre de la llave que referencian.
const path = require("path");
const {
  RAIZ, p, titulo, vineta, tabla, portada, documento, guardar, run, docx,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "07-diccionario-datos");
const DOCX = path.join(DIR, "Diccionario_de_Datos_SIA-NP.docx");
const FECHA = "11 de noviembre de 2026";
const J = { justificado: true };

// [nombre, descripción, tipo, tamaño]
const ENTIDADES = [
  ["Usuario", [
    ["nombreUsuario", "Clave de acceso única del usuario. Llave primaria.", "VARCHAR", "20"],
    ["contrasena", "Contraseña del usuario, guardada como hash (nunca en texto plano).", "VARCHAR", "255"],
    ["nombreCompleto", "Nombre completo de la persona que usa el sistema.", "VARCHAR", "100"],
    ["rol", "Rol asignado: E Encargado de Almacén, A Auxiliar de Almacén, C Encargada de Compras, D Dirección General, X Administrador.", "CHAR", "1"],
    ["activo", "Indica si la cuenta está habilitada (Y/N).", "CHAR", "1"],
    ["intentosFallidos", "Intentos consecutivos fallidos de inicio de sesión; sirve para bloquear la cuenta.", "INT", "4 bytes"],
  ]],
  ["Producto", [
    ["codigo", "Código interno del producto, el que lleva el código de barras y se escanea. Llave primaria.", "VARCHAR", "20"],
    ["codigoProveedor", "Código del fabricante o proveedor para el mismo producto.", "VARCHAR", "30"],
    ["descripcion", "Descripción del producto (p. ej. «Manguera poliuretano 8 mm»).", "VARCHAR", "150"],
    ["familia", "Familia o categoría (mangueras, racores, válvulas, cilindros, etc.).", "VARCHAR", "50"],
    ["unidadMedida", "Unidad en que se mide y vende (pza, m, kg).", "VARCHAR", "10"],
    ["existencia", "Cantidad disponible actualmente. Es decimal porque hay productos que se venden por metro.", "DECIMAL", "10,2"],
    ["puntoReorden", "Existencia mínima; al llegar a ella se avisa que hay que reabastecer.", "DECIMAL", "10,2"],
    ["costoUnitario", "Costo de compra por unidad; sirve para valuar el inventario.", "DECIMAL", "12,2"],
    ["claveUbicacion", "Ubicación donde está el producto. Llave foránea a Ubicacion.", "VARCHAR", "10"],
    ["imagen", "Nombre del archivo con la foto del producto, para no confundir racores parecidos.", "VARCHAR", "100"],
    ["activo", "Indica si el producto sigue vigente o fue dado de baja (Y/N).", "CHAR", "1"],
  ]],
  ["Ubicacion", [
    ["claveUbicacion", "Clave de la ubicación física (pasillo-anaquel-nivel). Llave primaria.", "VARCHAR", "10"],
    ["pasillo", "Pasillo del almacén (A, B, C).", "CHAR", "1"],
    ["anaquel", "Anaquel dentro del pasillo (1 a 8).", "VARCHAR", "3"],
    ["nivel", "Nivel del anaquel (1 a 3).", "INT", "4 bytes"],
    ["disponible", "Indica si la ubicación puede recibir mercancía (Y/N).", "CHAR", "1"],
  ]],
  ["Proveedor", [
    ["rfc", "RFC del proveedor. Llave primaria.", "VARCHAR", "13"],
    ["razonSocial", "Razón social del proveedor.", "VARCHAR", "150"],
    ["nombreContacto", "Nombre de la persona de contacto.", "VARCHAR", "100"],
    ["telefono", "Teléfono del proveedor.", "VARCHAR", "15"],
    ["correo", "Correo electrónico para enviar las órdenes de compra.", "VARCHAR", "100"],
    ["clasificacion", "Local, Nacional o Importación.", "VARCHAR", "20"],
    ["leadTimeDias", "Tiempo de entrega del proveedor, en días; sirve para comparar proveedores.", "INT", "4 bytes"],
    ["activo", "Indica si el proveedor está vigente (Y/N).", "CHAR", "1"],
  ]],
  ["OrdenDeCompra", [
    ["folio", "Folio consecutivo de la orden de compra. Llave primaria.", "VARCHAR", "20"],
    ["fechaEmision", "Fecha en que se emitió la orden al proveedor.", "DATE", "3 bytes"],
    ["rfcProveedor", "Proveedor al que se le compra. Llave foránea a Proveedor.", "VARCHAR", "13"],
    ["nombreUsuario", "Usuario que elaboró la orden. Llave foránea a Usuario.", "VARCHAR", "20"],
    ["total", "Importe total de la orden.", "DECIMAL", "12,2"],
    ["estado", "Estado de la orden: Pendiente, Emitida, Parcialmente recibida, Recibida, Cerrada o Cancelada.", "VARCHAR", "25"],
  ]],
  ["DetalleOrden", [
    ["folioOC", "Orden a la que pertenece la línea. Llave foránea a OrdenDeCompra (parte de la llave).", "VARCHAR", "20"],
    ["codigoProducto", "Producto solicitado. Llave foránea a Producto (parte de la llave).", "VARCHAR", "20"],
    ["cantidadSolicitada", "Cantidad pedida al proveedor.", "DECIMAL", "10,2"],
    ["cantidadRecibida", "Cantidad que ya llegó; con ella se calcula el saldo pendiente.", "DECIMAL", "10,2"],
    ["costoUnitario", "Costo pactado por unidad en esta orden.", "DECIMAL", "12,2"],
  ]],
  ["Recepcion", [
    ["folioRecepcion", "Folio de la recepción de mercancía. Llave primaria.", "VARCHAR", "20"],
    ["fechaRecepcion", "Fecha en que llegó la mercancía.", "DATE", "3 bytes"],
    ["folioOC", "Orden contra la que se recibe. Llave foránea a OrdenDeCompra.", "VARCHAR", "20"],
    ["numeroFactura", "Número de la factura o remisión del proveedor.", "VARCHAR", "30"],
    ["cantidadRecibida", "Total de piezas recibidas en esta recepción.", "DECIMAL", "10,2"],
    ["saldoPendiente", "Lo que falta por recibir de la orden después de esta recepción.", "DECIMAL", "10,2"],
  ]],
  ["Movimiento", [
    ["folio", "Folio consecutivo del movimiento. Llave primaria.", "VARCHAR", "20"],
    ["tipoMovimiento", "Tipo: E Entrada, S Salida, A Ajuste, D Devolución.", "CHAR", "1"],
    ["fecha", "Fecha y hora en que se registró el movimiento.", "DATETIME", "8 bytes"],
    ["cantidad", "Cantidad que entra o sale del almacén.", "DECIMAL", "10,2"],
    ["documentoReferencia", "Documento que respalda el movimiento (factura, orden de compra, nota de salida).", "VARCHAR", "50"],
    ["nombreUsuario", "Usuario que lo registró. Llave foránea a Usuario.", "VARCHAR", "20"],
    ["codigoProducto", "Producto afectado. Llave foránea a Producto.", "VARCHAR", "20"],
    ["claveUbicacion", "Ubicación de donde sale o a donde entra el producto. Llave foránea a Ubicacion.", "VARCHAR", "10"],
  ]],
  ["Kardex", [
    ["codigoProducto", "Producto al que pertenece el registro. Llave foránea a Producto.", "VARCHAR", "20"],
    ["folioMovimiento", "Movimiento que originó el registro. Llave foránea a Movimiento.", "VARCHAR", "20"],
    ["fecha", "Fecha y hora del movimiento.", "DATETIME", "8 bytes"],
    ["tipoMovimiento", "Tipo del movimiento (E, S, A, D).", "CHAR", "1"],
    ["cantidad", "Cantidad del movimiento.", "DECIMAL", "10,2"],
    ["saldo", "Existencia del producto después del movimiento.", "DECIMAL", "10,2"],
  ]],
  ["InventarioFisico", [
    ["folioConteo", "Folio de la hoja de conteo. Llave primaria.", "VARCHAR", "20"],
    ["tipoConteo", "Tipo de conteo: C cíclico, T total.", "CHAR", "1"],
    ["fecha", "Fecha en que se realizó el conteo.", "DATE", "3 bytes"],
    ["codigoProducto", "Producto contado. Llave foránea a Producto.", "VARCHAR", "20"],
    ["cantidadContada", "Cantidad que se contó físicamente.", "DECIMAL", "10,2"],
    ["diferencia", "Cantidad contada menos existencia del sistema; sirve para el reporte de diferencias.", "DECIMAL", "10,2"],
    ["estado", "Situación del conteo (p. ej. En proceso, Aplicado).", "VARCHAR", "15"],
  ]],
  ["Reporte", [
    ["tipoReporte", "Nombre del reporte (valor y rotación, productos bajo reorden, diferencias, etc.).", "VARCHAR", "30"],
    ["periodo", "Periodo que cubre el reporte.", "VARCHAR", "20"],
    ["fechaGeneracion", "Fecha y hora en que se generó.", "DATETIME", "8 bytes"],
    ["valorInventario", "Valor total del inventario en el periodo.", "DECIMAL", "14,2"],
    ["rotacion", "Índice de rotación del inventario.", "DECIMAL", "8,2"],
    ["formato", "Formato de exportación: X Excel, C CSV (para CONTPAQi).", "CHAR", "1"],
  ]],
  ["DashboardEjecutivo", [
    ["periodoAnalisis", "Periodo que se grafica en el tablero de Dirección: S semanal, M mensual.", "CHAR", "1"],
  ]],
  ["BitacoraDeAuditoria", [
    ["idRegistro", "Número consecutivo del registro. Llave primaria.", "INT", "4 bytes"],
    ["fechaHora", "Fecha y hora en que ocurrió la acción.", "DATETIME", "8 bytes"],
    ["nombreUsuario", "Usuario que realizó la acción. Llave foránea a Usuario.", "VARCHAR", "20"],
    ["accion", "Acción realizada (p. ej. registrar salida, recibir mercancía, iniciar sesión).", "VARCHAR", "100"],
    ["modulo", "Parte del sistema donde se hizo la acción.", "VARCHAR", "30"],
  ]],
];

// Tabla única con número consecutivo.
const filas = [["Núm. consecutivo", "Nombre del dato", "Descripción del dato", "Tipo de dato", "Tamaño del dato", "Entidad"]];
let n = 0;
for (const [entidad, datos] of ENTIDADES) {
  for (const [nombre, desc, tipo, tam] of datos) {
    n += 1;
    filas.push([String(n), nombre, desc, tipo, tam, entidad]);
  }
}

const consultas = [
  ["Consulta o reporte", "Datos que usa", "Quién lo pide"],
  ["Existencia actual y ubicación de un producto", "Producto.codigo, existencia, claveUbicacion, imagen; Ubicacion", "Almacén"],
  ["Kardex (historial de movimientos) de un producto", "Kardex.*; Movimiento.folio, fecha, tipoMovimiento, cantidad", "Almacén, Dirección"],
  ["Quién movió qué y cuándo", "Movimiento.nombreUsuario, fecha; BitacoraDeAuditoria.*", "Almacén, Dirección"],
  ["Productos bajo punto de reorden", "Producto.existencia, puntoReorden", "Compras, Almacén"],
  ["Diferencias entre conteo físico y sistema", "InventarioFisico.cantidadContada, diferencia; Producto.existencia", "Almacén, Dirección"],
  ["Estado de una orden de compra y saldo pendiente", "OrdenDeCompra.estado; DetalleOrden.cantidadSolicitada, cantidadRecibida; Recepcion.saldoPendiente", "Compras"],
  ["Comparativo de proveedores", "Proveedor.clasificacion, leadTimeDias; DetalleOrden.costoUnitario", "Compras"],
  ["Valor y rotación del inventario", "Producto.existencia, costoUnitario; Reporte.valorInventario, rotacion", "Dirección"],
  ["Exportar a Excel o CSV", "Reporte.formato", "Dirección, Compras"],
];

const hijos = [
  ...portada("Diccionario de datos", FECHA),

  titulo("1. Introducción"),
  p("En este documento se presenta el diccionario de datos del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico. Es la lista de los datos que el sistema necesita guardar para gestionar el inventario y para obtener las consultas y los reportes que pidieron los usuarios: el Encargado de Almacén (confiabilidad de la existencia y del kardex), el Auxiliar de Almacén (ubicaciones e imagen del producto), la Encargada de Compras (proveedores, tiempos de entrega y órdenes) y la Dirección General (valor del inventario, diferencias y tablero ejecutivo).", J),
  p("Los datos salen de los atributos de las clases entidad del diagrama de clases, y los tipos y tamaños siguen la descripción lógica de datos de la ERS (sección 4.1). Las clases de interfaz y de control (Interfaz, InterfazRegistroMovimientos, InterfazRecepcion, ControladorMovimientos y ControladorRecepcion) no aparecen porque sus atributos son datos temporales de pantalla, no se guardan. Entrada, Salida, Ajuste y Devolucion tampoco tienen filas propias: son tipos de Movimiento y se distinguen con el dato tipoMovimiento.", J),

  titulo("2. Cómo leer la tabla"),
  vineta("Núm. consecutivo: número de renglón, del 1 al " + n + "."),
  vineta("Nombre del dato: se escribe igual que el atributo en el diagrama de clases."),
  vineta("Tipo de dato: VARCHAR (texto de longitud variable), CHAR (texto de longitud fija), INT (entero), DECIMAL (número con decimales), DATE (fecha) y DATETIME (fecha y hora)."),
  vineta("Tamaño del dato: en VARCHAR y CHAR, el número de caracteres; en DECIMAL, dígitos totales y decimales (10,2 = hasta 10 dígitos, 2 de ellos decimales); en INT, DATE y DATETIME, el espacio que ocupan."),
  vineta("Entidad: la clase del diagrama de clases a la que pertenece el dato."),
  vineta("«Llave primaria» identifica de forma única cada registro; «Llave foránea» liga el dato con otra entidad."),
  p("Las cantidades (existencia, cantidad, saldo) son DECIMAL y no INT porque algunos productos, como la manguera, se venden por metro. Los datos de tipo Boolean del diagrama (activo, disponible) se guardan como CHAR(1) con Y o N.", { ...J, antes: 120 }),

  "@@CORTE1@@",
  titulo("3. Diccionario de datos"),
  tabla([1400, 2100, 5400, 1300, 1200, 2280], filas, { noPartirFilas: true, tam: 9 }),
  "@@CORTE2@@",
  titulo("4. Consultas y reportes que cubre"),
  p("Cada consulta o reporte de los casos de uso se puede obtener con los datos de la tabla anterior:", J),
  tabla([3000, 4660, 1700], consultas, { noPartirFilas: true, tam: 9 }),

  titulo("5. Observaciones", 1, { antes: 240 }),
  vineta("La ERS (4.1) usa llaves numéricas (id_producto, id_usuario). En este diccionario las llaves son los datos propios del negocio (codigo, nombreUsuario, folio, rfc), que son los que aparecen en el diagrama de clases; en el diseño de la base de datos se puede agregar una llave numérica si se necesita."),
  vineta("La ERS guarda la existencia como INT; aquí es DECIMAL(10,2) para coincidir con el atributo existencia: Decimal=0.0 del diagrama de clases."),
  vineta("El estado de la orden de compra usa los seis estados del diagrama de estados. El diccionario de la ERS menciona otros (Abierta, Parcial, Cerrada, Cancelada); se mantienen los del diagrama de estados."),
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
