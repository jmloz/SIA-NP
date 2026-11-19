// CU4 Registrar devolución de cliente (RF7, IE-008). Pendiente.
import Pendiente from '../../Pendiente.jsx';

export const menu = [
  { texto: 'Devolución de cliente', ruta: '/almacen/devolucion', roles: ['E', 'A'] },
];
export const rutas = [
  { ruta: '/almacen/devolucion', titulo: 'Registrar devolución de cliente', roles: ['E', 'A'], elemento: <Pendiente titulo="Devolución de cliente" /> },
];
