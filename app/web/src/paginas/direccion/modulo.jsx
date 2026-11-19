// Módulo Dirección: CU7 Dashboard de KPIs (S9), bitácora de auditoría (RF19), exportación Excel/CSV (RF18, S10).
import Dashboard from './Dashboard.jsx';
import Bitacora from './Bitacora.jsx';

export default {
  grupo: 'Dirección',
  menu: [
    { texto: 'Dashboard', ruta: '/direccion/dashboard', roles: ['D', 'E', 'C'] },
    { texto: 'Bitácora de auditoría', ruta: '/direccion/bitacora', roles: ['D', 'X'] },
  ],
  rutas: [
    { ruta: '/direccion/dashboard', titulo: 'Dashboard ejecutivo', roles: ['D', 'E', 'C'], elemento: <Dashboard /> },
    { ruta: '/direccion/bitacora', titulo: 'Bitácora de auditoría', roles: ['D', 'X'], elemento: <Bitacora /> },
  ],
};
