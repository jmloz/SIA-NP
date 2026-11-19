// CU4 Registrar devolución de cliente (RF7, IE-008).
import RegistrarDevolucion from './RegistrarDevolucion.jsx';

export const menu = [
  { texto: 'Devolución de cliente', ruta: '/almacen/devolucion', roles: ['E', 'A'] },
];
export const rutas = [
  { ruta: '/almacen/devolucion', titulo: 'Registrar devolución de cliente', roles: ['E', 'A'], elemento: <RegistrarDevolucion /> },
];
