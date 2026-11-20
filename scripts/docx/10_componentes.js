// Entregable 10: Diagrama de Componentes del SIA-NP.
// Uso (desde scripts/docx): node 10_componentes.js   (luego: python a_pdf.py <docx>)
const path = require("path");
const {
  RAIZ, p, titulo, vineta, tabla, celda, imagen, pieFigura, portada, documento, guardar,
} = require("./comun");

const DIR = path.join(RAIZ, "entregables", "10-componentes");
const FIG = path.join(DIR, "figuras");
const DOCX = path.join(DIR, "Diagrama_de_Componentes_SIA-NP.docx");

const J = { justificado: true };

// Componentes del SIA-NP (datos para las tablas).
const COMPONENTES = [
  {
    nombre: "GestionMovimientos",
    descripcion: "Registra entradas, salidas, ajustes y devoluciones de mercancía en el almacén.",
    interfaces: "IMovimientos",
    dependencias: "GestionProductos, GestionInventario, BaseDeDatos",
  },
  {
    nombre: "GestionInventario",
    descripcion: "Control de existencias, conteos físicos y mantenimiento del kardex.",
    interfaces: "IInventario",
    dependencias: "GestionProductos, BaseDeDatos",
  },
  {
    nombre: "GestionOrdenes",
    descripcion: "Creación y seguimiento de órdenes de compra y recepción de mercancía.",
    interfaces: "IOrdenes",
    dependencias: "GestionProveedores, GestionProductos, GestionInventario, BaseDeDatos",
  },
  {
    nombre: "GestionProveedores",
    descripcion: "Administración del catálogo de proveedores.",
    interfaces: "IProveedores",
    dependencias: "BaseDeDatos",
  },
  {
    nombre: "GestionProductos",
    descripcion: "Administración del catálogo de productos y sus ubicaciones en el almacén.",
    interfaces: "IProductos, IUbicaciones",
    dependencias: "BaseDeDatos",
  },
  {
    nombre: "GestionReportes",
    descripcion: "Generación del dashboard ejecutivo y reportes operativos del sistema.",
    interfaces: "IReportes, IDashboard",
    dependencias: "GestionInventario, GestionMovimientos, BaseDeDatos",
  },
  {
    nombre: "GestionUsuarios",
    descripcion: "Autenticación de usuarios, gestión de roles y mantenimiento de la bitácora de auditoría.",
    interfaces: "IAutenticacion, IBitacora",
    dependencias: "BaseDeDatos",
  },
  {
    nombre: "BaseDeDatos",
    descripcion: "Componente de persistencia que encapsula el acceso a SQL Server.",
    interfaces: "IPersistencia",
    dependencias: "—",
  },
];

// Interfaces y sus operaciones principales.
const INTERFACES = [
  { interfaz: "IMovimientos", componente: "GestionMovimientos", operaciones: "registrarEntrada(), registrarSalida(), registrarAjuste(), registrarDevolucion(), consultarMovimientos()" },
  { interfaz: "IInventario", componente: "GestionInventario", operaciones: "consultarExistencia(), actualizarExistencia(), generarKardex(), iniciarConteoFisico(), cerrarConteoFisico()" },
  { interfaz: "IOrdenes", componente: "GestionOrdenes", operaciones: "crearOrdenCompra(), consultarOrden(), recibirMercancia(), cancelarOrden()" },
  { interfaz: "IProveedores", componente: "GestionProveedores", operaciones: "altaProveedor(), consultarProveedor(), actualizarProveedor(), listarProveedores()" },
  { interfaz: "IProductos", componente: "GestionProductos", operaciones: "altaProducto(), consultarProducto(), actualizarProducto(), listarProductos()" },
  { interfaz: "IUbicaciones", componente: "GestionProductos", operaciones: "altaUbicacion(), consultarUbicacion(), listarUbicaciones()" },
  { interfaz: "IReportes", componente: "GestionReportes", operaciones: "generarReporteReorden(), generarReporteDiferencias(), exportarExcel()" },
  { interfaz: "IDashboard", componente: "GestionReportes", operaciones: "obtenerKPIs(), actualizarGraficas()" },
  { interfaz: "IAutenticacion", componente: "GestionUsuarios", operaciones: "iniciarSesion(), cerrarSesion(), validarToken()" },
  { interfaz: "IBitacora", componente: "GestionUsuarios", operaciones: "registrarEvento(), consultarBitacora()" },
  { interfaz: "IPersistencia", componente: "BaseDeDatos", operaciones: "ejecutarConsulta(), ejecutarComando(), iniciarTransaccion(), confirmarTransaccion(), revertirTransaccion()" },
];

// Tabla de componentes (sección 2).
function tablaComponentes() {
  const filas = [["Componente", "Descripción", "Interfaces proporcionadas", "Dependencias"]];
  COMPONENTES.forEach((c) => filas.push([c.nombre, c.descripcion, c.interfaces, c.dependencias]));
  // Ancho útil carta vertical: 9360 twips.
  return tabla([2000, 3560, 2000, 1800], filas, { noPartirFilas: true });
}

// Tabla de interfaces (sección 4).
function tablaInterfaces() {
  const filas = [["Interfaz", "Componente", "Operaciones principales"]];
  INTERFACES.forEach((i) => filas.push([i.interfaz, i.componente, i.operaciones]));
  return tabla([1800, 2200, 5360], filas, { noPartirFilas: true });
}

const contenido = [
  ...portada("Diagrama de Componentes del SIA-NP", "noviembre de 2026"),

  titulo("1. Introducción"),
  p("Este documento presenta el diagrama de componentes del Sistema de Inventario y Almacén (SIA-NP) de Neumática del Pacífico. El diagrama de componentes es uno de los diagramas estructurales del Lenguaje Unificado de Modelado (UML) y muestra la organización del sistema en módulos de software (componentes) y las relaciones de dependencia entre ellos.", J),
  p("El propósito de este diagrama es:", J),
  vineta("Identificar los componentes principales del sistema y sus responsabilidades."),
  vineta("Definir las interfaces que cada componente proporciona y requiere."),
  vineta("Mostrar las dependencias entre componentes para entender el acoplamiento del sistema."),
  vineta("Servir de base para la distribución física del sistema en nodos de despliegue."),
  p("El diagrama de componentes complementa al diagrama de clases: mientras que el diagrama de clases muestra la estructura interna de cada módulo, el diagrama de componentes muestra cómo se agrupan esas clases en unidades de compilación y despliegue, y cómo interactúan a través de interfaces bien definidas.", J),

  titulo("2. Componentes del SIA-NP"),
  p("El SIA-NP se estructura en ocho componentes principales. La Tabla 1 describe cada componente, las interfaces que proporciona y los componentes de los que depende.", J),
  tablaComponentes(),
  pieFigura("Tabla 1. Componentes del SIA-NP."),
  p("Los componentes de gestión (GestionMovimientos, GestionInventario, GestionOrdenes, etc.) encapsulan la lógica de negocio de cada módulo funcional. Todos dependen del componente BaseDeDatos, que abstrae el acceso a la persistencia en SQL Server. Esta arquitectura por capas facilita el mantenimiento y las pruebas: cada componente puede probarse de forma aislada sustituyendo sus dependencias por dobles de prueba (mocks).", J),

  titulo("3. Diagrama de componentes"),
  p("La Figura 1 muestra el diagrama de componentes en notación UML. Cada caja con el estereotipo «componente» representa un componente; los círculos pequeños representan las interfaces proporcionadas (lollipop) y los semicírculos las interfaces requeridas (socket). Las líneas con flecha punteada indican dependencias.", J),
  imagen(path.join(FIG, "componentes.png"), { altoMaxPx: 600, conSiguiente: true }),
  pieFigura("Figura 1. Diagrama de componentes del SIA-NP."),

  titulo("4. Descripción de interfaces", 1, { nuevaPagina: true }),
  p("Las interfaces definen los contratos entre componentes: las operaciones que un componente ofrece a otros. La Tabla 2 describe cada interfaz, el componente que la proporciona y sus operaciones principales.", J),
  tablaInterfaces(),
  pieFigura("Tabla 2. Interfaces del SIA-NP."),
  p("El uso de interfaces desacopla a los componentes consumidores del componente proveedor: si mañana se reemplaza GestionInventario por una implementación distinta que respete la interfaz IInventario, los componentes que dependen de ella (GestionMovimientos, GestionOrdenes, GestionReportes) no requieren cambios.", J),

  titulo("5. Conclusión"),
  p("El diagrama de componentes del SIA-NP organiza el sistema en ocho componentes cohesivos con responsabilidades bien definidas. Cada componente expone sus servicios a través de interfaces y depende de otros componentes únicamente a través de las interfaces que estos proporcionan. Esta arquitectura modular facilita el desarrollo paralelo, las pruebas unitarias y la evolución del sistema.", J),

  titulo("Referencias"),
  p('Kendall, K. E. y Kendall, J. E. (2011). Análisis y diseño de sistemas (8a ed.), cap. 10 "Análisis y diseño de sistemas orientados a objetos mediante el uso de UML". México: Pearson Educación.', J),
  p("OMG (2017). Unified Modeling Language Specification, versión 2.5.1. Object Management Group.", J),
];

const doc = documento(contenido, { titulo: "Diagrama de Componentes SIA-NP" });
guardar(doc, DOCX);
