// Módulo Catálogos: productos (IE-003), ubicaciones (IE-004), proveedores (IE-005), clientes, usuarios (IE-010).
import Pendiente from '../Pendiente.jsx';

export default {
  grupo: 'Catálogos',
  menu: [
    { texto: 'Productos', ruta: '/catalogos/productos', roles: ['E', 'A', 'C', 'D', 'X'] },
    { texto: 'Ubicaciones', ruta: '/catalogos/ubicaciones', roles: ['E', 'X'] },
    { texto: 'Proveedores', ruta: '/catalogos/proveedores', roles: ['C', 'X'] },
    { texto: 'Clientes', ruta: '/catalogos/clientes', roles: ['E', 'A', 'X'] },
    { texto: 'Usuarios', ruta: '/catalogos/usuarios', roles: ['X'] },
  ],
  rutas: [
    { ruta: '/catalogos/productos', titulo: 'Productos', roles: ['E', 'A', 'C', 'D', 'X'], elemento: <Pendiente titulo="Productos" /> },
    { ruta: '/catalogos/ubicaciones', titulo: 'Ubicaciones', roles: ['E', 'X'], elemento: <Pendiente titulo="Ubicaciones" /> },
    { ruta: '/catalogos/proveedores', titulo: 'Proveedores', roles: ['C', 'X'], elemento: <Pendiente titulo="Proveedores" /> },
    { ruta: '/catalogos/clientes', titulo: 'Clientes', roles: ['E', 'A', 'X'], elemento: <Pendiente titulo="Clientes" /> },
    { ruta: '/catalogos/usuarios', titulo: 'Usuarios', roles: ['X'], elemento: <Pendiente titulo="Usuarios" /> },
  ],
};
