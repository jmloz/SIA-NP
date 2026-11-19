// Módulo Almacén: CU1 Registrar movimientos (IE-002), nota de salida (RF8, S1), CU2 existencias y kardex (S5, S6).
import Pendiente from '../Pendiente.jsx';

export default {
  grupo: 'Almacén',
  menu: [
    { texto: 'Registrar movimiento', ruta: '/almacen/movimiento', roles: ['E', 'A'] },
    { texto: 'Nota de salida', ruta: '/almacen/nota-salida', roles: ['E', 'A'] },
    { texto: 'Existencias y kardex', ruta: '/almacen/kardex', roles: ['E', 'A', 'C', 'D'] },
  ],
  rutas: [
    { ruta: '/almacen/movimiento', titulo: 'Registrar movimiento', roles: ['E', 'A'], elemento: <Pendiente titulo="Registrar movimiento" /> },
    { ruta: '/almacen/nota-salida', titulo: 'Nota de salida', roles: ['E', 'A'], elemento: <Pendiente titulo="Nota de salida" /> },
    { ruta: '/almacen/kardex', titulo: 'Existencias y kardex', roles: ['E', 'A', 'C', 'D'], elemento: <Pendiente titulo="Existencias y kardex" /> },
  ],
};
