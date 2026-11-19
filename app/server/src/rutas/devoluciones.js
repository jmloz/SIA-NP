// Rutas de /api/devoluciones: CU4 Registrar devolución de cliente (RF7, IE-008).
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import * as Dev from '../controladores/controladorDevoluciones.js';

const r = Router();
const registran = requiereRol('E', 'A');

// Paso 2 (2a si la lista viene vacía)
r.get('/clientes', registran, async (req, res) => res.json(await Dev.buscarClientes(req.query.q)));
// Paso 3: notas de salida del cliente
r.get('/clientes/:id/notas', registran, async (req, res) => res.json(await Dev.notasDelCliente(req.params.id)));
// Paso 4: productos de la nota con vendida, ya devuelta y disponible
r.get('/notas/:id', registran, async (req, res) => res.json(await Dev.productosDeNota(req.params.id)));
// Lista de devoluciones recientes
r.get('/', registran, async (req, res) => res.json(await Dev.recientes()));
// Pasos 5 a 9 (6a, 3a y 7a)
r.post('/', registran, async (req, res) => res.status(201).json(await Dev.registrar(req.body, req.session.usuario)));

export default r;
