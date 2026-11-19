// CU3 Realizar inventario físico (RF6, IE-009, S4 hoja de conteo, S8 diferencias).
import Inventarios from './Inventarios.jsx';
import CapturaConteo from './CapturaConteo.jsx';
import Diferencias from './Diferencias.jsx';

export const menu = [
  { texto: 'Inventario físico', ruta: '/almacen/inventario', roles: ['E', 'A'] },
];
export const rutas = [
  { ruta: '/almacen/inventario', titulo: 'Inventario físico', roles: ['E', 'A'], elemento: <Inventarios /> },
  { ruta: '/almacen/inventario/:id', titulo: 'Captura de inventario físico', roles: ['E', 'A'], elemento: <CapturaConteo /> },
  { ruta: '/almacen/inventario/:id/diferencias', titulo: 'Diferencias físico vs sistema', roles: ['E', 'A'], elemento: <Diferencias /> },
];
