// Módulo Compras: CU5 Generar orden de compra (IE-006, S2), CU6 Recibir mercancía (IE-007), reorden (RF14, S7).
import Pendiente from '../Pendiente.jsx';

export default {
  grupo: 'Compras',
  menu: [
    { texto: 'Órdenes de compra', ruta: '/compras/ordenes', roles: ['C'] },
    { texto: 'Recibir mercancía', ruta: '/compras/recepcion', roles: ['C', 'E'] },
    { texto: 'Sugerencias de reorden', ruta: '/compras/reorden', roles: ['C'] },
  ],
  rutas: [
    { ruta: '/compras/ordenes', titulo: 'Órdenes de compra', roles: ['C'], elemento: <Pendiente titulo="Órdenes de compra" /> },
    { ruta: '/compras/recepcion', titulo: 'Recibir mercancía', roles: ['C', 'E'], elemento: <Pendiente titulo="Recibir mercancía" /> },
    { ruta: '/compras/reorden', titulo: 'Sugerencias de reorden', roles: ['C'], elemento: <Pendiente titulo="Sugerencias de reorden" /> },
  ],
};
