// Entregable 02: Diagramas de actividad con carriles. Uso: node 02_actividades.js   (desde scripts/docx)
// Las figuras (entregables/02-actividades/figuras/CUn.png) las genera
// scripts/actividades/diagramas_actividad.py, que también escribe el .drawio editable.
const path = require("path");
const C = require("./comun");
const { p, titulo, vineta, imagen, pieFigura, portada } = C;
const { Document } = C.docx;

const DIR = path.join(C.RAIZ, "entregables", "02-actividades");
const FIG = path.join(DIR, "figuras");
const SALIDA = path.join(DIR, "Diagramas_de_Actividad_con_Carriles_SIA-NP.docx");

const casos = [
  ["CU1", "CU1. Registrar Movimientos"],
  ["CU2", "CU2. Consultar Kardex"],
  ["CU3", "CU3. Realizar Inventario Físico"],
  ["CU4", "CU4. Registrar Devolución de Cliente"],
  ["CU5", "CU5. Generar Orden de Compra"],
  ["CU6", "CU6. Recibir Mercancía contra Orden de Compra"],
  ["CU7", "CU7. Visualizar Dashboard de KPIs"],
  ["CU8", "CU8. Autenticar Usuario"],
];

// ---- Portada e introducción (texto del documento original) ----
const inicio = [
  ...portada("Diagramas de actividad en carril de los casos de uso"),
  titulo("Diagramas de actividad en carril de los casos de uso", 1),
  p("Sistema de Inventario y Almacén (SIA-NP) — Neumática del Pacífico", { negrita: true }),
  p("A continuación se presenta un diagrama de actividad en carril por cada caso de uso del sistema. Los carriles separan las responsabilidades del actor y del sistema, y cada diagrama incluye los nodos de inicio y final, las ramas de decisión con sus condiciones, las bifurcaciones y uniones para las actividades que se ejecutan en paralelo, y los ciclos correspondientes a los flujos alternativos descritos en los escenarios.", { justificado: true }),
  titulo("Notación utilizada", 2),
  vineta("Círculo negro: inicio de la actividad. Círculo negro con un anillo: final."),
  vineta("Rectángulo con esquinas redondeadas: acción que realiza el actor o el sistema."),
  vineta("Rombo: decisión (una flecha entra y varias salen) o fusión (varias flechas entran y una sale). Cada salida de una decisión lleva su condición de guardia entre corchetes, por ejemplo [no existe]."),
  vineta("Barra negra: bifurcación (las acciones que salen se realizan en paralelo) o unión (espera a que terminen todas)."),
  vineta("Carril: columna con el nombre del actor o del Sistema SIA-NP en el encabezado; cada acción se coloca en el carril de quien la realiza."),
  p("Los flujos normales y alternativos de cada diagrama corresponden a los escenarios de los casos de uso CU1 a CU8 (versión del 9 de noviembre de 2026). En CU1 y CU6 el usuario confirma la operación y después el sistema valida los datos.", { justificado: true, antes: 120 }),
];

// ---- Una página por diagrama, con márgenes de 0.5 in para que la letra quede legible ----
const MARGEN = 720;
const figuras = casos.map(([clave, nombre], i) => [
  titulo(nombre, 2),
  imagen(path.join(FIG, clave + ".png"), { anchoPx: 720, altoMaxPx: 905, conSiguiente: true }),
  pieFigura(`Figura ${i + 1}. Diagrama de actividad en carril del caso de uso ${clave}.`),
]);

const sec = (hijos, margen = 1440) => ({
  properties: { page: {
    size: { width: 12240, height: 15840, orientation: "portrait" },
    margin: { top: margen, bottom: margen, left: margen, right: margen },
  } },
  children: hijos,
});

const doc = new Document({
  creator: "Equipo Grupo S5A", title: "Diagramas de actividad SIA-NP",
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: "000000" } } },
    paragraphStyles: [1, 2, 3].map((n) => ({ id: "Heading" + n, name: "Heading " + n, basedOn: "Normal", next: "Normal",
      run: { font: "Arial", size: [28, 24, 22][n - 1], bold: true, color: "000000" } })),
  },
  sections: [sec(inicio), ...figuras.map((f) => sec(f, MARGEN))],
});
C.guardar(doc, SALIDA);
