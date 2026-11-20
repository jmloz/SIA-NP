/**
 * Generador del entregable 10: Diagrama de Componentes UML
 * Sistema de Inventario y Almacén — Neumática del Pacífico (SIA-NP)
 */
const path = require('path');
const {
  RAIZ, p, titulo, vineta, tabla, celda, pieFigura, portada, documento, guardar, saltoPagina, imagen,
  GRIS,
} = require('./comun');

const DIR = path.join(RAIZ, 'entregables', '10-componentes');
const DOCX = path.join(DIR, 'Diagrama_de_Componentes_SIA-NP.docx');

const J = { justificado: true };
const enc = { negrita: true, fill: GRIS };

// ============ Sección 1: Introducción ============
function introduccion() {
  return [
    titulo('1. Introducción', 1),
    p('El diagrama de componentes es uno de los diagramas estructurales de UML que muestra cómo un sistema de software está dividido en componentes y las dependencias entre ellos. Según el estándar IEEE 1471-2000, la arquitectura de software es "la organización fundamental de un sistema encarnada en sus componentes, las relaciones entre ellos y el ambiente".', J),
    p('Este diagrama proporciona una vista de alto nivel de la arquitectura del sistema, mostrando los componentes de software, hardware y sus interfaces. Es especialmente útil para:', J),
    vineta('Describir sistemas con arquitectura orientada a servicios o en capas'),
    vineta('Mostrar la estructura del código y sus módulos'),
    vineta('Representar la infraestructura física (servidores, dispositivos)'),
    vineta('Comunicar la organización del sistema a los interesados'),
    p('Para el SIA-NP se utiliza una arquitectura de tres capas desplegada en infraestructura cliente-servidor.', J),
  ];
}

// ============ Sección 2: Arquitectura del Sistema ============
function arquitectura() {
  return [
    titulo('2. Arquitectura del Sistema', 1, { nuevaPagina: true }),
    p('El SIA-NP implementa una arquitectura de tres capas desplegada sobre una infraestructura de hardware que incluye dispositivos cliente, servidor de aplicaciones y servidor de base de datos.', J),
    
    titulo('2.1 Capas de software', 2),
    tabla([1500, 2000, 3000, 2860], [
      [celda('Capa', enc), celda('Tecnología', enc), celda('Componentes', enc), celda('Responsabilidad', enc)],
      [celda('Presentación'), celda('React 18 + Vite'), celda('SIA-NP Web, Navegador'), celda('Interfaz de usuario')],
      [celda('Lógica de Negocio'), celda('Node.js + Express'), celda('API REST, Rutas, Controladores'), celda('Validaciones, reglas')],
      [celda('Datos'), celda('SQL Server 2022'), celda('BD SIA_NP, Scripts, Docker'), celda('Persistencia')],
    ]),
    
    titulo('2.2 Componentes de hardware', 2),
    tabla([2000, 3500, 3860], [
      [celda('Componente', enc), celda('Especificación', enc), celda('Función', enc)],
      [celda('PC Escritorio'), celda('Windows 10/11, Chrome/Firefox, red LAN'), celda('Estación de trabajo para almacén y compras')],
      [celda('Laptop'), celda('Windows 10/11, Wi-Fi'), celda('Acceso móvil para dirección general')],
      [celda('Tablet/Smartphone'), celda('Android/iOS, navegador móvil, Wi-Fi'), celda('Consultas rápidas y conteo físico en piso')],
      [celda('Lector de código de barras'), celda('USB o Bluetooth, emulación de teclado'), celda('Captura rápida de códigos de producto')],
      [celda('Impresora'), celda('Láser o inyección, red o USB'), celda('Notas de salida, órdenes, hojas de conteo')],
      [celda('Servidor de aplicaciones'), celda('Linux/Docker, Node.js, 4GB RAM'), celda('Ejecuta la API REST (puerto 3001)')],
      [celda('Servidor de base de datos'), celda('Linux/Docker, SQL Server 2022, 8GB RAM'), celda('Almacena la BD SIA_NP (puerto 1433)')],
      [celda('Red LAN/Wi-Fi'), celda('Switch, router, access point'), celda('Conecta clientes con servidores')],
    ]),
    
    titulo('2.3 Comunicación', 2),
    vineta('Clientes → Servidor de aplicaciones: HTTP/JSON (fetch, puerto 3001)'),
    vineta('Servidor de aplicaciones → Servidor de BD: TDS/SQL (mssql, puerto 1433)'),
    vineta('Lector de código de barras → PC/Tablet: USB o Bluetooth (emulación de teclado)'),
  ];
}

// ============ Sección 3: Componentes de Software ============
function componentesSoftware() {
  return [
    titulo('3. Componentes de Software', 1, { nuevaPagina: true }),
    
    titulo('3.1 Capa de Presentación', 2),
    tabla([2000, 5000, 2360], [
      [celda('Componente', enc), celda('Descripción', enc), celda('Archivos', enc)],
      [celda('Navegador Web'), celda('Cliente HTTP que ejecuta la aplicación (Chrome, Firefox, Edge)'), celda('—')],
      [celda('SIA-NP Web'), celda('Aplicación de página única (SPA) construida con React 18 y Vite'), celda('App.jsx, main.jsx')],
      [celda('  Páginas'), celda('Vistas de cada módulo: login, movimientos, órdenes, recepción'), celda('paginas/*.jsx')],
      [celda('  Componentes'), celda('Elementos reutilizables de la interfaz'), celda('componentes/*.jsx')],
      [celda('  api.js'), celda('Cliente HTTP para comunicación con la API REST'), celda('api.js')],
      [celda('  sesion.jsx'), celda('Contexto de React para manejo de sesión y JWT'), celda('sesion.jsx')],
    ]),
    
    titulo('3.2 Capa de Lógica de Negocio', 2),
    tabla([2000, 5000, 2360], [
      [celda('Componente', enc), celda('Descripción', enc), celda('Archivos', enc)],
      [celda('API REST'), celda('Servidor Express que expone los endpoints del sistema (puerto 3001)'), celda('index.js')],
      [celda('  Rutas'), celda('Definición de endpoints: /productos, /movimientos, /ordenes'), celda('rutas/*.js')],
      [celda('  Controladores'), celda('Lógica de negocio para cada caso de uso'), celda('controladores/*.js')],
      [celda('  Entidades'), celda('Modelos de dominio: Producto, Movimiento, OrdenCompra'), celda('entidades/*.js')],
      [celda('  Autenticación'), celda('Middleware JWT y verificación de contraseñas con bcrypt'), celda('auth.js')],
      [celda('  Conexión BD'), celda('Pool de conexiones a SQL Server mediante mssql'), celda('db.js')],
    ]),
    
    titulo('3.3 Capa de Datos', 2),
    tabla([2000, 5000, 2360], [
      [celda('Componente', enc), celda('Descripción', enc), celda('Archivos', enc)],
      [celda('SQL Server 2022'), celda('Motor de base de datos en contenedor Docker (puerto 1433)'), celda('docker-compose.yml')],
      [celda('  SIA_NP'), celda('Base de datos con 14 tablas, 3 vistas y 2 stored procedures'), celda('—')],
      [celda('Scripts SQL'), celda('Scripts de creación, datos de prueba y ajustes'), celda('sql/*.sql')],
      [celda('Docker'), celda('Contenedor y script de inicialización'), celda('init-docker.sh')],
    ]),
  ];
}

// ============ Sección 4: Diagrama ============
function diagrama() {
  return [
    titulo('4. Diagrama de Componentes', 1, { nuevaPagina: true }),
    p('El siguiente diagrama muestra la arquitectura de componentes del SIA-NP utilizando notación UML 2.x. Incluye los componentes de software organizados en tres capas, los componentes de hardware (clientes, servidores, dispositivos) y las interfaces de comunicación.', J),
    imagen(path.join(DIR, 'figuras', 'componentes.png'), { ancho: 16 }),
    pieFigura('Figura 1. Diagrama de componentes del SIA-NP (software y hardware).'),
  ];
}

// ============ Sección 5: Interfaces ============
function interfaces() {
  return [
    titulo('5. Interfaces del Sistema', 1, { nuevaPagina: true }),
    p('Las interfaces definen los puntos de comunicación entre componentes y capas.', J),
    tabla([1500, 2000, 1500, 4360], [
      [celda('Interfaz', enc), celda('Componente', enc), celda('Tipo', enc), celda('Operaciones principales', enc)],
      [celda('IVistas'), celda('SIA-NP Web'), celda('Proporcionada'), celda('Renderizar páginas, capturar eventos')],
      [celda('IREST'), celda('API REST'), celda('Proporcionada'), celda('GET, POST, PUT, DELETE sobre recursos')],
      [celda('ISQL'), celda('SQL Server'), celda('Proporcionada'), celda('SELECT, INSERT, UPDATE, DELETE, EXEC')],
      [celda('IUSB'), celda('Lector código'), celda('Proporcionada'), celda('Envío de código escaneado como texto')],
      [celda('IImpresión'), celda('Impresora'), celda('Proporcionada'), celda('Recepción de documentos para imprimir')],
    ]),
    
    titulo('5.1 Endpoints de la API REST', 2),
    tabla([2500, 2500, 4360], [
      [celda('Recurso', enc), celda('Métodos', enc), celda('Caso de uso', enc)],
      [celda('/auth/login'), celda('POST'), celda('Iniciar sesión')],
      [celda('/productos'), celda('GET, POST, PUT'), celda('CU2: Consultar existencias')],
      [celda('/ubicaciones'), celda('GET, POST'), celda('CU2: Gestión de ubicaciones')],
      [celda('/movimientos'), celda('GET, POST'), celda('CU1: Registrar movimientos')],
      [celda('/ordenes'), celda('GET, POST, PUT'), celda('CU5: Crear orden de compra')],
      [celda('/recepcion'), celda('GET, POST'), celda('CU6: Recibir mercancía')],
      [celda('/inventario'), celda('GET, POST'), celda('CU3: Inventario físico')],
      [celda('/devoluciones'), celda('POST'), celda('CU4: Devolución de cliente')],
      [celda('/reportes'), celda('GET'), celda('CU7, CU8: Dashboard y reportes')],
    ]),
  ];
}

// ============ Sección 6: Conclusiones ============
function conclusiones() {
  return [
    titulo('6. Conclusiones', 1, { nuevaPagina: true }),
    p('El diagrama de componentes del SIA-NP muestra una arquitectura de tres capas de software desplegada sobre una infraestructura de hardware cliente-servidor. Esta arquitectura permite:', J),
    vineta('Separación de responsabilidades: cada capa tiene un rol definido'),
    vineta('Mantenibilidad: los cambios en una capa no afectan a las demás'),
    vineta('Escalabilidad: cada capa puede escalar de forma independiente'),
    vineta('Flexibilidad de dispositivos: acceso desde PC, laptop, tablet o smartphone'),
    vineta('Integración de hardware: lector de código de barras e impresora'),
    p('La comunicación entre capas se realiza mediante interfaces bien definidas, lo que facilita la evolución del sistema y la integración con otros sistemas o dispositivos en el futuro.', J),
  ];
}

// ============ Generar documento ============
async function main() {
  const doc = documento([
    ...portada('Diagrama de Componentes del SIA-NP'),
    ...introduccion(),
    ...arquitectura(),
    ...componentesSoftware(),
    ...diagrama(),
    ...interfaces(),
    ...conclusiones(),
  ]);
  await guardar(doc, DOCX);
}

main().catch(console.error);
