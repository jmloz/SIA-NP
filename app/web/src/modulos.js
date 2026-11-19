// Registro de módulos. Cada carpeta de paginas/ exporta { grupo, menu, rutas } desde su modulo.jsx:
//   menu:  [{ texto, ruta, roles }]                 -> aparece en el menú lateral si el rol coincide
//   rutas: [{ ruta, elemento, roles, titulo }]      -> se registra en el enrutador; titulo va en la barra
// Roles: E Encargado de Almacén, A Auxiliar, C Compras, D Dirección, X Administrador. Sin roles = todos.
import almacen from './paginas/almacen/modulo.jsx';
import compras from './paginas/compras/modulo.jsx';
import catalogos from './paginas/catalogos/modulo.jsx';
import direccion from './paginas/direccion/modulo.jsx';

export const MODULOS = [almacen, compras, catalogos, direccion];
