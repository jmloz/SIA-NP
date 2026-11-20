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
    p('Este diagrama proporciona una vista de alto nivel de la arquitectura del sistema, mostrando los componentes de software, sus interfaces y las relaciones de dependencia. Es especialmente útil para:', J),
    vineta('Describir sistemas con arquitectura orientada a servicios o en capas'),
    vineta('Mostrar la estructura del código y sus módulos'),
    vineta('Comunicar la organización del sistema a los interesados'),
    vineta('Visualizar las relaciones entre componentes ocultando detalles de implementación'),
    p('Para el SIA-NP se utiliza una arquitectura de tres capas: presentación (interfaz de usuario), lógica de negocio (API y reglas) y datos (persistencia).', J),
  ];
}

// ============ Sección 2: Arquitectura del Sistema ============
function arquitectura() {
  return [
    titulo('2. Arquitectura del Sistema', 1, { nuevaPagina: true }),
    p('El SIA-NP implementa una arquitectura de tres capas que separa las responsabilidades del sistema en módulos independientes, facilitando el mantenimiento y la escalabilidad.', J),
    
    titulo('2.1 Capas del sistema', 2),
    tabla([1500, 2000, 3000, 2860], [
      [celda('Capa', enc), celda('Tecnología', enc), celda('Componentes', enc), celda('Responsabilidad', enc)],
      [celda('Presentación'), celda('React 18 + Vite'), celda('SIA-NP Web, Navegador'), celda('Interfaz de usuario')],
      [celda('Lógica de Negocio'), celda('Node.js + Express'), celda('API REST, Rutas, Controladores'), celda('Validaciones, reglas')],
      [celda('Datos'), celda('SQL Server 2022'), celda('BD SIA_NP, Scripts, Docker'), celda('Persistencia')],
    ]),
    
    titulo('2.2 Comunicación entre capas', 2),
    vineta('Presentación → Lógica: HTTP/JSON mediante fetch (puerto 3001)'),
    vineta('Lógica → Datos: TDS/SQL mediante el driver mssql (puerto 1433)'),
  ];
}

// ============ Sección 3: Componentes ============
function componentes() {
  return [
    titulo('3. Componentes del SIA-NP', 1, { nuevaPagina: true }),
    
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
    p('El siguiente diagrama muestra la arquitectura de componentes del SIA-NP utilizando notación UML 2.x. Los tres subsistemas (capas) contienen sus componentes con las interfaces proporcionadas y las dependencias entre ellos.', J),
    imagen(path.join(DIR, 'figuras', 'componentes.png'), { ancho: 16 }),
    pieFigura('Figura 1. Diagrama de componentes del SIA-NP (arquitectura de 3 capas).'),
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
    p('El diagrama de componentes del SIA-NP muestra una arquitectura clara de tres capas que permite:', J),
    vineta('Separación de responsabilidades: cada capa tiene un rol definido'),
    vineta('Mantenibilidad: los cambios en una capa no afectan a las demás'),
    vineta('Escalabilidad: cada capa puede escalar de forma independiente'),
    vineta('Pruebas: cada componente puede probarse de manera aislada'),
    p('La comunicación entre capas se realiza mediante interfaces bien definidas (HTTP/JSON para la API, TDS/SQL para la base de datos), lo que facilita la evolución del sistema.', J),
  ];
}

// ============ Generar documento ============
async function main() {
  const doc = documento([
    portada('Fundamentos de Ingeniería de Software', 'Diagrama de Componentes del SIA-NP'),
    ...introduccion(),
    ...arquitectura(),
    ...componentes(),
    ...diagrama(),
    ...interfaces(),
    ...conclusiones(),
  ]);
  await guardar(doc, DOCX);
}

main().catch(console.error);
