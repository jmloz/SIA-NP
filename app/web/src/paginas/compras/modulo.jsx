// Módulo Compras: CU5 Generar orden de compra (IE-006, S2), CU6 Recibir mercancía (IE-007), reorden (RF14, S7).
import Ordenes from './Ordenes.jsx';
import OrdenDetalle from './OrdenDetalle.jsx';
import OrdenForm from './OrdenForm.jsx';
import Recepcion from './Recepcion.jsx';
import Reorden from './Reorden.jsx';

export default {
  grupo: 'Compras',
  menu: [
    { texto: 'Órdenes de compra', ruta: '/compras/ordenes', roles: ['C'] },
    { texto: 'Recibir mercancía', ruta: '/compras/recepcion', roles: ['C', 'E'] },
    { texto: 'Sugerencias de reorden', ruta: '/compras/reorden', roles: ['C'] },
  ],
  // El orden importa para el título de la barra: gana la última ruta que coincide.
  rutas: [
    { ruta: '/compras/ordenes', titulo: 'Órdenes de compra', roles: ['C'], elemento: <Ordenes /> },
    { ruta: '/compras/ordenes/:id', titulo: 'Orden de compra', roles: ['C'], elemento: <OrdenDetalle /> },
    { ruta: '/compras/ordenes/nueva', titulo: 'Generar orden de compra', roles: ['C'], elemento: <OrdenForm key="nueva" /> },
    { ruta: '/compras/ordenes/:id/editar', titulo: 'Editar borrador de orden de compra', roles: ['C'], elemento: <OrdenForm key="editar" /> },
    { ruta: '/compras/recepcion', titulo: 'Recepción de mercancía', roles: ['C', 'E'], elemento: <Recepcion /> },
    { ruta: '/compras/reorden', titulo: 'Sugerencias de reorden', roles: ['C'], elemento: <Reorden /> },
  ],
};
