// Rutas de /api/direccion: CU7 dashboard, RF19 bitácora, RF18 exportaciones.
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import * as Ctrl from '../controladores/controladorDireccion.js';

const r = Router();
const filtrosDe = (q) => ({ desde: q.desde, hasta: q.hasta, usuario: q.usuario, modulo: q.modulo, accion: q.accion });

// CU7 Dashboard (D, E, C)
r.get('/dashboard', requiereRol('D', 'E', 'C'), async (req, res) => {
  res.json(await Ctrl.resumen(req.session.usuario, req.query.periodo));
});
r.get('/dashboard/detalle/:indicador', requiereRol('D', 'E', 'C'), async (req, res) => {
  res.json(await Ctrl.detalleIndicador(req.session.usuario, req.params.indicador, req.query.periodo));
});

// RF19 Bitácora (D, X): solo lectura
r.get('/bitacora/filtros', requiereRol('D', 'X'), async (req, res) => res.json(await Ctrl.filtrosBitacora()));
r.get('/bitacora', requiereRol('D', 'X'), async (req, res) => {
  res.json(await Ctrl.consultarBitacora(filtrosDe(req.query), req.query.pagina));
});

// RF18 / S10 Exportación: /exportar/inventario|reorden|bitacora?formato=xlsx|csv
const rolesExportar = (req, res, next) =>
  requiereRol(...(req.params.que === 'bitacora' ? ['D', 'X'] : ['D', 'E', 'C']))(req, res, next);
r.get('/exportar/:que', rolesExportar, async (req, res) => {
  const a = await Ctrl.exportar(req.session.usuario, req.params.que, req.query.formato || 'xlsx', filtrosDe(req.query));
  res.setHeader('Content-Type', a.tipo);
  res.setHeader('Content-Disposition', `attachment; filename="${a.nombre}"`);
  res.send(a.contenido);
});

export default r;
