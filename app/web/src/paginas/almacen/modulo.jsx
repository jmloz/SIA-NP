// Módulo Almacén: CU1 Registrar movimientos (IE-002), nota de salida (RF8, S1, S3), CU2 existencias y kardex (S5, S6).
import RegistrarMovimiento from './RegistrarMovimiento.jsx';
import NotaSalida from './NotaSalida.jsx';
import Kardex from './Kardex.jsx';

export default {
  grupo: 'Almacén',
  menu: [
    { texto: 'Registrar movimiento', ruta: '/almacen/movimiento', roles: ['E', 'A'] },
    { texto: 'Nota de salida', ruta: '/almacen/nota-salida', roles: ['E', 'A'] },
    { texto: 'Existencias y kardex', ruta: '/almacen/kardex', roles: ['E', 'A', 'C', 'D'] },
  ],
  rutas: [
    { ruta: '/almacen/movimiento', titulo: 'Registrar movimiento', roles: ['E', 'A'], elemento: <RegistrarMovimiento /> },
    { ruta: '/almacen/nota-salida', titulo: 'Nota de salida', roles: ['E', 'A'], elemento: <NotaSalida /> },
    { ruta: '/almacen/kardex', titulo: 'Existencias y kardex', roles: ['E', 'A', 'C', 'D'], elemento: <Kardex /> },
  ],
};
