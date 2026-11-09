// Genera entregables/01-casos-uso/Escenarios_Casos_de_Uso_SIA-NP_v2.docx
// Uso: node 01_casos_uso.js   (desde scripts/docx)
// Contenido tomado del PDF entregado (v2) con las correcciones del 9 nov 2026:
// - CU1 y CU6: el usuario confirma y DESPUÉS el sistema valida (como en SD2 y SD1).
// - CU2, CU3, CU5 y CU8: contradicciones internas corregidas (ver comentarios en cada CU).
const path = require("path");
const { RAIZ, p, titulo, celda, portada, documento, guardar, docx } = require("./comun");
const { Table, TableRow, WidthType, BorderStyle, TableLayoutType } = docx;

const FECHA_CU = "14 de septiembre de 2026";
const AUTOR = "Equipo Grupo S5A";

const CU = [
  {
    id: "CU1", nombre: "Registrar Movimientos",
    descripcion: "Permite registrar las entradas y salidas de mercancía del almacén, indicando el producto, la cantidad, la ubicación física y el documento de referencia que respalda la operación.",
    actores: "Encargado de Almacén (actor principal), Auxiliar de Almacén.",
    pre: [
      "El usuario ha iniciado sesión en el sistema con un rol que tiene permiso para registrar movimientos.",
      "El producto involucrado se encuentra dado de alta en el catálogo.",
      "Se cuenta con el documento de referencia físico o digital (factura, remisión o nota de salida).",
    ],
    normal: [
      "El usuario selecciona la opción \"Registrar movimiento\".",
      "El sistema muestra el formulario de captura.",
      "El usuario elige el tipo de movimiento: entrada o salida.",
      "El usuario busca el producto por código o por descripción.",
      "El sistema muestra la existencia actual y la ubicación física del producto.",
      "El usuario captura la cantidad, la ubicación y el número del documento de referencia.",
      // Corrección: confirmar (antes 8) va antes de validar (antes 7), como en SD2.
      "El usuario confirma la operación.",
      "El sistema valida los datos y, en el caso de las salidas, verifica que exista suficiente inventario.",
      "El sistema actualiza la existencia, registra el movimiento en el kardex y lo asienta en la bitácora de auditoría.",
      "El sistema muestra un mensaje de confirmación con el folio del movimiento.",
    ],
    alterno: [
      "4a. El producto no existe en el catálogo: el sistema lo notifica y ofrece dar de alta el producto o cancelar la operación.",
      "7a. El usuario cancela la operación: el sistema descarta la captura y no modifica el inventario.",
      "8a. La cantidad solicitada en una salida es mayor a la existencia: el sistema muestra una alerta y no permite guardar el movimiento.",
      "8b. Falta capturar un campo obligatorio: el sistema lo señala y solicita completarlo.",
    ],
    post: [
      "La existencia del producto queda actualizada en el sistema.",
      "El movimiento queda registrado en el kardex con fecha, usuario y documento de referencia.",
      "La operación queda asentada en la bitácora de auditoría.",
    ],
  },
  {
    id: "CU2", nombre: "Consultar Kardex",
    descripcion: "Permite consultar la existencia actual de un producto y su historial cronológico de movimientos de entrada y salida.",
    actores: "Encargado de Almacén, Auxiliar de Almacén (actores principales), Encargada de Compras, Dirección General.",
    pre: [
      "El usuario ha iniciado sesión en el sistema.",
      // Corrección: decía "...y tiene al menos un movimiento registrado", lo que contradice 6a.
      "El producto a consultar existe en el catálogo.",
    ],
    normal: [
      "El usuario selecciona la opción \"Consultar kardex\".",
      "El sistema muestra la pantalla de búsqueda de productos.",
      "El usuario ingresa el código, la descripción o la familia del producto.",
      "El sistema despliega los resultados coincidentes.",
      "El usuario selecciona el producto deseado.",
      "El sistema muestra la existencia actual, la ubicación física y el historial de movimientos ordenado por fecha.",
      "El usuario puede aplicar filtros por rango de fechas o por tipo de movimiento.",
      "El sistema actualiza la vista conforme a los filtros aplicados.",
    ],
    alterno: [
      "4a. No se encuentran productos que coincidan con la búsqueda: el sistema muestra el mensaje correspondiente y permite realizar una nueva búsqueda.",
      "6a. El producto no tiene movimientos registrados: el sistema muestra la existencia inicial e indica que no hay historial disponible.",
      "8a. El usuario solicita exportar la consulta: el sistema genera el archivo en formato Excel o CSV.",
    ],
    post: [
      "El usuario obtiene la información actualizada de existencias e historial del producto.",
      "La consulta queda registrada en la bitácora de auditoría.",
      "No se modifica ningún dato del inventario.",
    ],
  },
  {
    id: "CU3", nombre: "Realizar Inventario Físico",
    descripcion: "Permite ejecutar conteos parciales por familia de productos (conteos cíclicos) o conteos completos del almacén, comparando la existencia física contra la registrada en el sistema.",
    actores: "Encargado de Almacén (actor principal), Auxiliar de Almacén.",
    pre: [
      // Corrección: decía "con el rol de Encargado de Almacén", lo que deja fuera al Auxiliar, que es actor.
      "El usuario ha iniciado sesión con el rol de Encargado de Almacén o de Auxiliar de Almacén.",
      "Existen productos registrados en el catálogo con existencia en el sistema.",
      "No hay otro conteo abierto para las mismas familias de productos.",
    ],
    normal: [
      "El usuario selecciona la opción \"Inventario físico\".",
      "El usuario elige el tipo de conteo: parcial por familia o completo.",
      "El sistema genera la hoja de conteo con los productos correspondientes y sus ubicaciones.",
      "El usuario captura la cantidad física contada de cada producto.",
      "El sistema compara la cantidad capturada contra la existencia registrada y calcula las diferencias.",
      "El sistema muestra el reporte de diferencias encontradas.",
      "El usuario revisa las diferencias y confirma el cierre del conteo.",
      "El sistema genera los ajustes de inventario correspondientes y actualiza las existencias.",
      "El sistema registra el conteo y los ajustes en la bitácora de auditoría.",
    ],
    alterno: [
      "4a. El usuario deja pendiente el conteo: el sistema guarda el avance y permite retomarlo después.",
      "6a. No se detectan diferencias: el sistema cierra el conteo sin generar ajustes.",
      "7a. El usuario decide recontar un producto: el sistema permite corregir la cantidad capturada antes del cierre.",
      "7b. El usuario cancela el conteo: el sistema descarta la captura y no modifica las existencias.",
    ],
    post: [
      "Las existencias del sistema quedan conciliadas con el conteo físico.",
      // Corrección: decía "Se genera un reporte de diferencias y los ajustes correspondientes", falso en 6a.
      "Se genera un reporte de diferencias y, si las hay, los ajustes correspondientes.",
      "El conteo queda cerrado y registrado con fecha y usuario responsable.",
    ],
  },
  {
    id: "CU4", nombre: "Registrar Devolución de Cliente",
    descripcion: "Permite capturar la devolución de mercancía por parte de un cliente y generar automáticamente la entrada correspondiente al inventario.",
    actores: "Encargado de Almacén (actor principal), Auxiliar de Almacén.",
    pre: [
      "El usuario ha iniciado sesión con permisos para registrar devoluciones.",
      "El cliente se encuentra dado de alta en el catálogo de clientes.",
      "Existe la nota de salida o factura original que respalda la venta.",
    ],
    normal: [
      "El usuario selecciona la opción \"Registrar devolución de cliente\".",
      "El usuario busca y selecciona al cliente.",
      "El sistema muestra los documentos de salida asociados al cliente.",
      "El usuario selecciona el documento original y los productos a devolver.",
      "El usuario captura la cantidad devuelta, el motivo de la devolución y el estado de la mercancía.",
      "El sistema valida que la cantidad devuelta no exceda la cantidad vendida.",
      "El usuario confirma la devolución.",
      "El sistema genera la entrada al inventario, actualiza la existencia y registra el movimiento en el kardex.",
      "El sistema muestra el folio de la devolución registrada.",
    ],
    alterno: [
      "2a. El cliente no existe en el catálogo: el sistema permite darlo de alta o cancelar la operación.",
      "3a. No se localiza el documento original: el sistema permite registrar la devolución de manera manual con la autorización correspondiente.",
      "6a. La cantidad devuelta excede la vendida: el sistema muestra una alerta y no permite continuar.",
      "7a. La mercancía se recibe dañada: el usuario la marca como no disponible para venta y el sistema la ingresa a una ubicación de resguardo.",
    ],
    post: [
      "La devolución queda registrada con su motivo y documento de referencia.",
      "La existencia del producto se incrementa conforme a la mercancía recibida.",
      "El movimiento queda reflejado en el kardex y en la bitácora de auditoría.",
    ],
  },
  {
    id: "CU5", nombre: "Generar Orden de Compra",
    descripcion: "Permite emitir una orden de compra dirigida al proveedor, con formato corporativo y folio consecutivo asignado por el sistema.",
    // Corrección: decía "..., Dirección General (autorización)", pero ningún paso tiene autorización
    // y el paso 8 deja la orden "Emitida" sin ella. La ERS (CU5) solo da a la Encargada de Compras.
    actores: "Encargada de Compras (actor principal).",
    pre: [
      "El usuario ha iniciado sesión con el rol de Encargada de Compras.",
      "El proveedor está dado de alta en el catálogo de proveedores.",
      "Los productos a solicitar existen en el catálogo.",
    ],
    normal: [
      "El usuario selecciona la opción \"Generar orden de compra\".",
      // Corrección: decía "muestra el folio consecutivo asignado y la fecha actual", pero 7a guarda
      // la orden "sin asignar folio definitivo": el folio se asigna al emitir (paso 8).
      "El sistema muestra el formulario de la orden con la fecha actual.",
      "El usuario selecciona el proveedor.",
      "El usuario agrega los productos requeridos, indicando cantidad y precio unitario.",
      "El sistema calcula los subtotales, impuestos y el total de la orden.",
      "El usuario captura las condiciones de entrega y de pago.",
      "El usuario confirma la emisión de la orden de compra.",
      "El sistema asigna el folio consecutivo, guarda la orden con estado \"Emitida\" y genera el documento en formato corporativo para su impresión o envío.",
    ],
    alterno: [
      "3a. El proveedor no existe: el sistema permite darlo de alta o cancelar la operación.",
      "4a. El usuario parte de una sugerencia de reorden: el sistema precarga los productos que se encuentran por debajo del punto de reorden.",
      "5a. El producto es de importación: el sistema permite capturar los costos adicionales de importación.",
      "7a. El usuario guarda la orden como borrador: el sistema la conserva con estado \"Pendiente\" sin asignar folio definitivo.",
    ],
    post: [
      "La orden de compra queda registrada con folio consecutivo y estado \"Emitida\".",
      "La orden queda disponible para su seguimiento y para la recepción de mercancía.",
      "La emisión queda asentada en la bitácora de auditoría.",
    ],
  },
  {
    id: "CU6", nombre: "Recibir Mercancía contra Orden de Compra",
    descripcion: "Permite registrar la recepción total o parcial de mercancía vinculada a una orden de compra previamente emitida.",
    actores: "Encargada de Compras (actor principal), Encargado de Almacén.",
    pre: [
      "El usuario ha iniciado sesión con permisos para registrar recepciones.",
      "Existe una orden de compra emitida y pendiente de recibir.",
      "La mercancía se encuentra físicamente en el almacén.",
    ],
    normal: [
      "El usuario selecciona la opción \"Recibir mercancía\".",
      "El usuario busca la orden de compra por folio o por proveedor.",
      "El sistema muestra los productos solicitados y las cantidades pendientes de recibir.",
      "El usuario captura las cantidades recibidas y la ubicación física asignada.",
      "El usuario registra el número de factura o remisión del proveedor.",
      // Corrección: confirmar (antes 7) va antes de validar (antes 6), como en SD1.
      "El usuario confirma la recepción.",
      "El sistema valida que las cantidades recibidas no excedan las solicitadas.",
      "El sistema genera la entrada al inventario, actualiza las existencias y el kardex.",
      "El sistema actualiza el estado de la orden de compra a \"Recibida\" o \"Parcialmente recibida\".",
    ],
    alterno: [
      "2a. No se localiza la orden de compra: el sistema permite realizar una nueva búsqueda o cancelar la operación.",
      "4a. La recepción es parcial: el sistema conserva el saldo pendiente y mantiene la orden abierta.",
      "6a. La mercancía llega con defectos: el usuario la registra como no conforme y el sistema no la suma al inventario disponible.",
      "7a. La cantidad recibida excede la solicitada: el sistema muestra una alerta y solicita autorización para continuar.",
    ],
    post: [
      "Las existencias de los productos recibidos quedan actualizadas.",
      "La orden de compra refleja el estado y el saldo pendiente correctos.",
      "La recepción queda vinculada a la factura o remisión del proveedor y registrada en la bitácora.",
    ],
  },
  {
    id: "CU7", nombre: "Visualizar Dashboard de KPIs",
    descripcion: "Permite consultar el tablero ejecutivo con los indicadores semanales y mensuales de la operación del almacén.",
    actores: "Dirección General (actor principal), Encargado de Almacén, Encargada de Compras.",
    pre: [
      "El usuario ha iniciado sesión con un rol autorizado para consultar el tablero.",
      "Existen movimientos registrados en el sistema durante el periodo a consultar.",
    ],
    normal: [
      "El usuario selecciona la opción \"Dashboard\".",
      "El sistema calcula los indicadores del periodo actual.",
      "El sistema muestra los KPIs: valor del inventario, rotación, productos por debajo del punto de reorden, entradas y salidas del periodo y órdenes de compra pendientes.",
      "El usuario selecciona el periodo de análisis (semanal o mensual).",
      "El sistema actualiza las gráficas e indicadores conforme al periodo elegido.",
      "El usuario consulta el detalle de un indicador específico.",
      "El sistema despliega el desglose de la información que integra ese indicador.",
    ],
    alterno: [
      "2a. No existe información suficiente en el periodo: el sistema muestra el tablero con los indicadores en cero e informa la situación.",
      "5a. El usuario solicita exportar el tablero: el sistema genera el reporte en formato Excel o CSV.",
      "7a. El usuario no tiene permisos para ver el detalle: el sistema muestra únicamente la información resumida.",
    ],
    post: [
      "El usuario obtiene una visión consolidada del estado del inventario y de la operación.",
      "La consulta queda registrada en la bitácora de auditoría.",
      "No se modifica ningún dato del sistema.",
    ],
  },
  {
    id: "CU8", nombre: "Autenticar Usuario",
    descripcion: "Permite al usuario iniciar sesión en el sistema con una cuenta individual y aplicar los permisos correspondientes al rol asignado.",
    // Corrección: faltaba el Administrador, que es un rol del sistema (RF1) y aparece en 4b, 4c y 2a.
    actores: "Todos los usuarios del sistema (Encargado de Almacén, Auxiliar de Almacén, Encargada de Compras, Dirección General, Administrador).",
    pre: [
      // Corrección: decía "una cuenta activa", lo que contradice 4c (cuenta inactiva).
      "El usuario cuenta con una cuenta registrada en el sistema.",
      "El sistema se encuentra disponible y accesible desde el equipo del usuario.",
    ],
    normal: [
      "El usuario accede a la pantalla de inicio de sesión.",
      "El usuario captura su nombre de usuario y su contraseña.",
      "El usuario selecciona la opción \"Iniciar sesión\".",
      "El sistema valida las credenciales contra la base de datos.",
      "El sistema identifica el rol asignado al usuario.",
      "El sistema habilita únicamente los módulos y las operaciones permitidas para ese rol.",
      "El sistema muestra la pantalla principal y registra el inicio de sesión en la bitácora.",
    ],
    alterno: [
      // Corrección: 2a estaba al final, después de 4a–4c.
      "2a. El usuario olvidó su contraseña: solicita el restablecimiento al administrador del sistema.",
      "4a. Las credenciales son incorrectas: el sistema muestra un mensaje de error y permite reintentar.",
      "4b. Se acumulan tres intentos fallidos consecutivos: el sistema bloquea temporalmente la cuenta y notifica al administrador.",
      "4c. La cuenta se encuentra inactiva: el sistema niega el acceso e indica que debe contactar al administrador.",
    ],
    post: [
      "El usuario queda autenticado y con una sesión activa en el sistema.",
      "Los permisos del rol asignado quedan aplicados durante toda la sesión.",
      "El acceso queda registrado en la bitácora de auditoría con fecha y hora.",
    ],
  },
];

// ---- Tabla del escenario ----
const ANCHOS = [2200, 7160];
const TOTAL = ANCHOS[0] + ANCHOS[1];
const SANGRIA = 240;

const bordeN = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const BORDES = { top: bordeN, bottom: bordeN, left: bordeN, right: bordeN, insideHorizontal: bordeN, insideVertical: bordeN };

const linea = (t) => p(t, { tam: 10, despues: 20, sangria: SANGRIA });
const etiqueta = (t) => p(t, { tam: 10, negrita: true, despues: 40 });

function filaDato(etq, valor) {
  return new TableRow({
    cantSplit: true,
    children: [
      celda(etq, { encabezado: true, ancho: ANCHOS[0] }),
      celda(valor, { ancho: ANCHOS[1] }),
    ],
  });
}

function filaSeccion(etq, lineas) {
  return new TableRow({
    children: [celda([etiqueta(etq), ...lineas.map(linea)], { ancho: TOTAL, columnas: 2 })],
  });
}

function tablaCU(cu) {
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: ANCHOS,
    layout: TableLayoutType.FIXED,
    borders: BORDES,
    rows: [
      filaDato("Nombre:", cu.nombre),
      filaDato("Autor:", AUTOR),
      filaDato("Fecha:", FECHA_CU),
      filaSeccion("Descripción:", [cu.descripcion]),
      filaSeccion("Actores:", [cu.actores]),
      filaSeccion("Precondiciones:", cu.pre),
      filaSeccion("Flujo Normal:", cu.normal.map((t, i) => `${i + 1}. ${t}`)),
      filaSeccion("Flujo Alternativo:", cu.alterno),
      filaSeccion("Poscondiciones:", cu.post),
    ],
  });
}

const hijos = [...portada("Descripción del escenario de los casos de uso")];
hijos.push(p("Descripción del escenario de los casos de uso", { centro: true, negrita: true, tam: 14, despues: 60 }));
hijos.push(p("Sistema de Inventario y Almacén (SIA-NP) — Neumática del Pacífico", { centro: true, tam: 10, despues: 200 }));
CU.forEach((cu, i) => {
  hijos.push(titulo(`${cu.id}. ${cu.nombre}`, 2, { nuevaPagina: i > 0 }));
  hijos.push(tablaCU(cu));
  hijos.push(p(`Tabla ${i + 1}. Escenario del caso de uso ${cu.id}.`, { centro: true, cursiva: true, tam: 9, antes: 60 }));
});

const salida = path.join(RAIZ, "entregables", "01-casos-uso", "Escenarios_Casos_de_Uso_SIA-NP_v2.docx");
guardar(documento(hijos, { titulo: "Descripción del escenario de los casos de uso — SIA-NP" }), salida);
