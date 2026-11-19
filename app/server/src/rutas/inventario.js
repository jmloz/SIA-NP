// Rutas de /api/inventario: CU3 Realizar inventario físico (RF6), S4 hoja de conteo y S8 diferencias.
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import * as Inv from '../controladores/controladorInventario.js';

const r = Router();
const almacen = requiereRol('E', 'A');
const encargado = requiereRol('E');   // cierre con ajustes y cancelación: solo el Encargado de Almacén

function enviarArchivo(res, { nombre, buffer }, tipo, inline) {
  res.set('Content-Type', tipo);
  res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${nombre}"`);
  res.send(buffer);
}

// Paso 1: lista de conteos y datos para abrir uno nuevo
r.get('/', almacen, async (req, res) => res.json(await Inv.listar()));
r.get('/nuevo', almacen, async (req, res) => res.json(await Inv.datosNuevo()));

// Pasos 2–3: abrir conteo cíclico (familia) o total
r.post('/', almacen, async (req, res) => res.status(201).json(await Inv.abrirConteo(req.body, req.session.usuario)));

// Conteo con sus partidas, diferencias (paso 5) y totales (S8)
r.get('/:id', almacen, async (req, res) => res.json(await Inv.consultar(req.params.id)));

// S4 hoja de conteo (PDF) y S8 diferencias (Excel)
r.get('/:id/hoja', almacen, async (req, res) => enviarArchivo(res, await Inv.pdfHojaConteo(req.params.id), 'application/pdf', true));
r.get('/:id/diferencias/excel', almacen, async (req, res) =>
  enviarArchivo(res, await Inv.excelDiferencias(req.params.id),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false));

// Paso 4 y alterno 4a: guardar avance { partidas: [{ idProducto, cantidad }], terminar }
r.put('/:id/conteo', almacen, async (req, res) => res.json(await Inv.guardarConteo(req.params.id, req.body, req.session.usuario)));

// Alterno 7a: recontar un producto { cantidad }
r.put('/:id/productos/:idProducto', almacen, async (req, res) =>
  res.json(await Inv.recontar(req.params.id, req.params.idProducto, req.body.cantidad, req.session.usuario)));

// Pasos 7–9: cierre con ajustes (6a sin diferencias) y alterno 7b: cancelar
r.post('/:id/cerrar', encargado, async (req, res) => res.json(await Inv.cerrar(req.params.id, req.session.usuario)));
r.post('/:id/cancelar', encargado, async (req, res) => res.json(await Inv.cancelar(req.params.id, req.session.usuario)));

export default r;
