// Módulo Almacén: CU1 Registrar movimientos (IE-002), nota de salida (RF8, S1, S3), CU2 existencias y kardex (S5, S6),
// CU3 inventario físico (inventario/rutas.jsx) y CU4 devoluciones de cliente (devoluciones/rutas.jsx).
import RegistrarMovimiento from './RegistrarMovimiento.jsx';
import NotaSalida from './NotaSalida.jsx';
import Kardex from './Kardex.jsx';
import * as inventario from './inventario/rutas.jsx';
import * as devoluciones from './devoluciones/rutas.jsx';

export default {
  grupo: 'Almacén',
  menu: [
    { texto: 'Registrar movimiento', ruta: '/almacen/movimiento', roles: ['E', 'A'] },
    { texto: 'Nota de salida', ruta: '/almacen/nota-salida', roles: ['E', 'A'] },
    { texto: 'Existencias y kardex', ruta: '/almacen/kardex', roles: ['E', 'A', 'C', 'D'] },
    ...devoluciones.menu,
    ...inventario.menu,
  ],
  rutas: [
    { ruta: '/almacen/movimiento', titulo: 'Registrar movimiento', roles: ['E', 'A'], elemento: <RegistrarMovimiento /> },
    { ruta: '/almacen/nota-salida', titulo: 'Nota de salida', roles: ['E', 'A'], elemento: <NotaSalida /> },
    { ruta: '/almacen/kardex', titulo: 'Existencias y kardex', roles: ['E', 'A', 'C', 'D'], elemento: <Kardex /> },
    ...devoluciones.rutas,
    ...inventario.rutas,
  ],
};
