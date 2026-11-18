// Entregable 09: Diseño de interfaces de entrada del SIA-NP.
// Basado en Kendall y Kendall (2011), cap. 12 "Diseño de una entrada eficaz".
// Uso (desde scripts/docx): node 09_interfaces.js   (luego: python a_pdf.py <docx>)
// Requiere las figuras en entregables/09-interfaces/figuras/ (las genera
// scripts/interfaces/construir_mockups.js + render con navegador).
const path = require("path");
const fs = require("fs");
const {
  RAIZ, p, titulo, vineta, tabla, celda, imagen, pieFigura, portada, documento, guardar,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "09-interfaces");
const FIG = path.join(DIR, "figuras");
const DOCX = path.join(DIR, "Diseno_de_Interfaces_SIA-NP.docx");

const J = { justificado: true };

// Relación de interfaces (misma fuente que el explicador).
const RELACION = JSON.parse(fs.readFileSync(path.join(RAIZ, "scripts", "interfaces", "relacion.json"), "utf8"));

// Nombres de cada pantalla para los títulos de la sección 5.
const NOMBRES = {
  "IE-001": "Inicio de sesión",
  "IE-002": "Registrar movimiento",
  "IE-003": "Alta de producto",
  "IE-004": "Alta de ubicación",
  "IE-005": "Alta de proveedor",
  "IE-006": "Generar orden de compra",
  "IE-007": "Recepción de mercancía",
  "IE-008": "Registrar devolución de cliente",
  "IE-009": "Captura de inventario físico",
  "IE-010": "Alta de usuario",
};

// Principios de diseño del libro aplicados.
const principios = [
  ["#", "Principio de entrada eficaz (Kendall y Kendall, cap. 12)", "Cómo se aplica en el SIA-NP"],
  ["1", "Efectividad: capturar solo los datos necesarios para el propósito.", "Cada pantalla pide únicamente los campos de su caso de uso; los datos derivados (existencia, totales, saldo) se muestran como solo lectura, no se capturan."],
  ["2", "Precisión: el diseño asegura que la captura sea correcta.", "Validaciones visibles por campo, listas desplegables para valores finitos (familia, unidad, rol) y lectura por código de barras para evitar errores de tecleo (RF9)."],
  ["3", "Facilidad de uso: pantallas claras para el usuario.", "Formularios agrupados por secciones, etiquetas a la izquierda, marca (*) de campo obligatorio y botones de acción consistentes."],
  ["4", "Consistencia: todas las pantallas se ven y operan igual.", "Barra de aplicación con logo y módulo, misma rejilla de dos columnas, mismos colores y la misma posición de los botones primario y secundario."],
  ["5", "Atractivo: una interfaz agradable invita a usar el sistema.", "Paleta índigo sobria sobre fondo claro, buen contraste, logo del sistema y espaciado uniforme."],
];

// Lineamientos de captura de datos del libro.
const lineamientos = [
  "Agrupar los campos relacionados en secciones con un título (p. ej. “Datos del movimiento”, “Totales”).",
  "Marcar los campos obligatorios con un asterisco (*) y mostrar la validación esperada debajo de cada campo.",
  "Usar listas desplegables y botones de opción para los valores de dominio finito (familia, unidad, clasificación, rol, tipo de movimiento), de modo que el usuario elija en vez de escribir.",
  "Mostrar como solo lectura los datos que el sistema calcula o recupera (existencia actual, subtotal, IVA, total, saldo pendiente), para que no se capturen por error.",
  "Permitir la captura por lector de código de barras en los campos de producto (RF9), reduciendo errores en pedidos grandes.",
  "Ofrecer siempre una acción primaria (guardar/registrar) y una secundaria (cancelar o guardar borrador) en la misma posición.",
];

// Construye el bloque de una interfaz: título, maqueta, ficha y validaciones.
function bloqueInterfaz(fila, i) {
  const [id, desc, rf, val, usuarios] = fila;
  const png = path.join(FIG, id + ".png");
  const hijos = [
    titulo(`${id} — ${NOMBRES[id]}`, 2, { nuevaPagina: i > 0 }),
    p(desc, J),
    imagen(png, { altoMaxPx: 560, conSiguiente: true }),
    pieFigura(`Figura ${i + 1}. Interfaz ${id}: ${NOMBRES[id]}.`),
    tabla([2300, 7060], [
      [celda("Requerimientos asociados", { negrita: true, tam: 10 }), celda(rf, { tam: 10 })],
      [celda("Validaciones", { negrita: true, tam: 10 }), celda(val, { tam: 10 })],
      [celda("Usuarios de la interfaz", { negrita: true, tam: 10 }), celda(usuarios, { tam: 10 })],
    ], { encabezado: false, noPartirFilas: true }),
  ];
  return hijos;
}

// Tabla de relación de interfaces (sección 4), en sección horizontal para que quepa.
function tablaRelacion() {
  const filas = [["Id_interfaz", "Descripción", "Requerimientos asociados", "Validaciones", "Usuarios de la interfaz"]];
  RELACION.forEach((f) => filas.push(f));
  // Ancho útil horizontal: 11 x 8.5 in, márgenes 1 in -> 9 in = 12960 twips.
  return tabla([1200, 2600, 3000, 4000, 2160], filas, { noPartirFilas: true, tam: 9 });
}

// La sección 4 va en una página horizontal propia; para eso usamos secciones.
// Reconstruimos el documento con tres secciones: vertical (1-3), horizontal (4), vertical (5+).
const seccionIntro = [
  ...portada("Diseño de interfaces de entrada del sistema"),
  titulo("1. Introducción"),
  p("Este documento presenta el diseño de las interfaces de entrada del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico: las pantallas con las que los usuarios capturan datos en el sistema. Mientras que el entregable anterior (Diseño de salidas) trató lo que el sistema entrega, este trata lo que el sistema recibe. El diseño sigue el capítulo 12 de Kendall y Kendall, “Diseño de una entrada eficaz”.", J),
  p("Se incluye una relación de todas las interfaces de entrada con su identificador, descripción, requerimientos asociados, validaciones y usuarios; en seguida se muestra la maqueta de cada pantalla. Los requerimientos se citan con la numeración del Apéndice C de la ERS.", J),

  titulo("2. Objetivos del diseño de la entrada"),
  p("Según Kendall y Kendall (cap. 12), una entrada bien diseñada persigue la efectividad, la precisión, la facilidad de uso, la consistencia, la sencillez y el atractivo. La captura es, además, la principal fuente de errores de un sistema: si el dato entra mal, todo lo que sigue (existencias, kardex, reportes) queda mal. Por eso el diseño de estas pantallas se apoya en validaciones y en controles que guían al usuario. La Tabla 1 relaciona los principios del libro con su aplicación en el SIA-NP.", J),
  tabla([500, 4560, 4300], principios, { noPartirFilas: true }),
  pieFigura("Tabla 1. Principios de diseño de entrada aplicados al SIA-NP."),

  titulo("3. Lineamientos de captura aplicados"),
  p("Todas las pantallas comparten los siguientes lineamientos, de manera que el sistema sea estandarizado y fácil de usar:", J),
  ...lineamientos.map((l) => vineta(l)),
  p("Cada pantalla presenta una barra superior con el logo del sistema, el módulo al que pertenece y el usuario que inició sesión; un cuerpo con los campos agrupados en secciones; y una barra de botones con la acción primaria y la secundaria. Los campos obligatorios se marcan con un asterisco rojo (*) y debajo de cada uno se indica la validación que aplica.", J),
];

const seccionTabla = {
  horizontal: true,
  hijos: [
    titulo("4. Relación de interfaces de entrada"),
    p("La Tabla 2 relaciona las diez interfaces de entrada del sistema con su identificador, descripción, requerimientos, validaciones y usuarios. Cada una se detalla, con su maqueta, en la sección 5.", J),
    tablaRelacion(),
    pieFigura("Tabla 2. Relación de interfaces de entrada del SIA-NP."),
  ],
};

const seccionMaquetas = [
  titulo("5. Diseño de cada interfaz"),
  p("A continuación se presenta la maqueta de cada interfaz de entrada con su identificador, su descripción y una ficha con los requerimientos, las validaciones y los usuarios.", J),
  ...RELACION.flatMap((fila, i) => bloqueInterfaz(fila, i)),

  titulo("6. Conclusión", 1, { nuevaPagina: true }),
  p("El SIA-NP cuenta con diez interfaces de entrada que cubren la captura de datos de todos sus módulos: seguridad (inicio de sesión y alta de usuario), catálogos (producto y ubicación), almacén (movimientos, devoluciones e inventario físico) y compras (proveedores, órdenes de compra y recepción). Todas siguen el mismo diseño estandarizado —barra con logo, secciones, validaciones por campo y botones consistentes— y aplican los principios de entrada eficaz de Kendall y Kendall, de modo que la captura sea efectiva, precisa y fácil de usar. Al validar el dato en el punto de captura, el sistema protege la confiabilidad del inventario, que es el atributo rector pedido por el cliente.", J),

  titulo("Referencias"),
  p("Kendall, K. E. y Kendall, J. E. (2011). Análisis y diseño de sistemas (8a ed.), cap. 12 “Diseño de una entrada eficaz”. México: Pearson Educación.", J),
  p("Equipo Grupo S5A (2026). Especificación de requerimientos de software SIA-NP (IEEE 830), Apéndice C, y base de datos del Taller de Base de Datos (Parte I).", J),
];

const doc = documento([], {
  titulo: "Diseño de interfaces de entrada SIA-NP",
  secciones: [seccionIntro, seccionTabla, seccionMaquetas],
});

guardar(doc, DOCX);
