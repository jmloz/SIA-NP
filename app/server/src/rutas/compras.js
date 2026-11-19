// Rutas de /api/compras: CU5 órdenes de compra (rol C), CU6 recepción (roles C y E), reorden RF14 (rol C).
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import { ErrorNegocio } from '../db.js';
import * as CtrlOC from '../controladores/controladorOrdenCompra.js';
import * as CtrlRec from '../controladores/controladorRecepcion.js';

const r = Router();

/** Id numérico de la URL; si no lo es, 404. */
function id(req) {
  const n = Number(req.params.id);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorNegocio('La orden de compra no existe.', 404);
  return n;
}
const compras = requiereRol('C');
const recepcion = requiereRol('C', 'E');

/* ---- Órdenes de compra (CU5) ---- */
r.get('/ordenes', compras, async (req, res) => res.json(await CtrlOC.listar(req.query)));
r.get('/formulario', compras, async (req, res) => res.json(await CtrlOC.formulario()));   // { hoy, proveedores }
r.get('/productos', compras, async (req, res) => res.json(await CtrlOC.productos(req.query.proveedor)));
r.get('/ordenes/:id', compras, async (req, res) => res.json(await CtrlOC.obtener(id(req))));
r.get('/ordenes/:id/pdf', compras, async (req, res) => {
  const { nombre, buffer } = await CtrlOC.documentoPDF(id(req));
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}"` });
  res.send(buffer);
});
// Cuerpo: { id_proveedor, fecha_entrega_estimada, observaciones, partidas: [{ id_producto, cantidad, costo_unitario }], emitir }
r.post('/ordenes', compras, async (req, res) =>
  res.status(201).json(await CtrlOC.guardar(null, req.body ?? {}, req.session.usuario, Boolean(req.body?.emitir))));
r.put('/ordenes/:id', compras, async (req, res) =>
  res.json(await CtrlOC.guardar(id(req), req.body ?? {}, req.session.usuario, Boolean(req.body?.emitir))));
r.post('/ordenes/:id/emitir', compras, async (req, res) => res.json(await CtrlOC.emitir(id(req), req.session.usuario)));
r.post('/ordenes/:id/cancelar', compras, async (req, res) =>
  res.json(await CtrlOC.cambiarEstado(id(req), 'cancelar', req.session.usuario, req.body?.motivo)));
r.post('/ordenes/:id/cerrar', compras, async (req, res) =>
  res.json(await CtrlOC.cambiarEstado(id(req), 'cerrar', req.session.usuario)));

/* ---- Sugerencias de reorden (RF14, S7) ---- */
r.get('/reorden', compras, async (req, res) => res.json(await CtrlOC.sugerenciasReorden(req.query.proveedor)));

/* ---- Recepción de mercancía (CU6) ---- */
r.get('/recepcion/ordenes', recepcion, async (req, res) => res.json(await CtrlRec.buscarOrdenes(req.query.q)));
r.get('/recepcion/ordenes/:id', recepcion, async (req, res) => res.json(await CtrlRec.obtenerOrden(id(req))));
r.get('/recepcion/ubicaciones', recepcion, async (req, res) => res.json(await CtrlRec.ubicaciones()));
// Cuerpo: { numero_factura, observaciones, partidas: [{ id_producto, cantidad, no_conforme, id_ubicacion }], autorizar_excedente }
r.post('/recepcion/ordenes/:id', recepcion, async (req, res) =>
  res.status(201).json(await CtrlRec.registrar(id(req), req.body ?? {}, req.session.usuario)));

export default r;
