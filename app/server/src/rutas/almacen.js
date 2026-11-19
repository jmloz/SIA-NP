// Rutas de /api/almacen: CU1 movimientos, nota de salida (RF8, S1, S3), CU2 existencias y kardex (S5, S6).
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import * as Movs from '../controladores/controladorMovimientos.js';
import * as Kardex from '../controladores/controladorKardex.js';
import * as Pdf from '../controladores/controladorAlmacenPdf.js';

const r = Router();
const registran = requiereRol('E', 'A');
const consultan = requiereRol('E', 'A', 'C', 'D');

function enviarArchivo(res, { nombre, buffer }, tipo, inline) {
  res.set('Content-Type', tipo);
  res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${nombre}"`);
  res.send(buffer);
}
const filtros = (q) => ({ desde: q.desde, hasta: q.hasta, tipo: q.tipo });

// Datos para las pantallas de captura (ubicaciones disponibles y clientes)
r.get('/catalogos', registran, async (req, res) => res.json(await Movs.datosCaptura()));

// CU1 paso 4 (y RF9): código interno, código de barras o descripción
r.get('/productos/buscar', consultan, async (req, res) => res.json(await Movs.buscarProducto(req.query.q)));

// CU1 pasos 8–10
r.post('/movimientos', registran, async (req, res) => {
  const errores = Movs.validarMovimiento(req.body);
  if (Object.keys(errores).length)   // 8b: se señala cada campo faltante
    return res.status(400).json({ error: Object.values(errores)[0], campos: errores });
  res.status(201).json(await Movs.registrarMovimiento(req.body, req.session.usuario));
});

// RF8 Nota de salida
r.get('/notas', registran, async (req, res) => res.json(await Movs.notasRecientes()));
r.post('/notas', registran, async (req, res) => res.status(201).json(await Movs.registrarNotaSalida(req.body, req.session.usuario)));
r.get('/notas/:id/pdf', registran, async (req, res) => enviarArchivo(res, await Pdf.pdfNotaSalida(req.params.id), 'application/pdf', true));
r.get('/notas/:id/surtido', registran, async (req, res) => enviarArchivo(res, await Pdf.pdfOrdenSurtido(req.params.id), 'application/pdf', true));

// CU2 existencias y kardex
r.get('/existencias', consultan, async (req, res) => res.json(await Kardex.buscar(req.query.q)));
r.get('/kardex/:id', consultan, async (req, res) => res.json(await Kardex.consultar(req.params.id, filtros(req.query))));
r.get('/kardex/:id/excel', consultan, async (req, res) =>
  enviarArchivo(res, await Kardex.exportarExcel(req.params.id, filtros(req.query)),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false));
r.get('/kardex/:id/csv', consultan, async (req, res) => {
  const { nombre, texto } = await Kardex.exportarCsv(req.params.id, filtros(req.query));
  enviarArchivo(res, { nombre, buffer: Buffer.from(texto, 'utf8') }, 'text/csv; charset=utf-8', false);
});

export default r;
