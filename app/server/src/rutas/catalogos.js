// Rutas de /api/catalogos: productos, ubicaciones, proveedores, clientes y usuarios.
import { Router } from 'express';
import { requiereRol } from '../auth.js';
import * as C from '../controladores/controladorCatalogos.js';

const r = Router();
const filtros = (req) => ({ q: String(req.query.q ?? '').trim(), estado: req.query.estado ?? 'activos' });

// Productos: consultan todos los roles; editan E y X
r.get('/familias', async (req, res) => res.json(await C.listarFamilias()));
r.get('/productos', async (req, res) => res.json(await C.listarProductos(filtros(req))));
r.get('/productos/:id', async (req, res) => res.json(await C.obtenerProducto(req.params.id)));
r.post('/productos', requiereRol('E', 'X'), async (req, res) => res.status(201).json(await C.crearProducto(req)));
r.put('/productos/:id', requiereRol('E', 'X'), async (req, res) => res.json(await C.modificarProducto(req)));
r.delete('/productos/:id', requiereRol('E', 'X'), async (req, res) => res.json(await C.cambiarEstadoProducto(req, false)));
r.post('/productos/:id/reactivar', requiereRol('E', 'X'), async (req, res) => res.json(await C.cambiarEstadoProducto(req, true)));

// Ubicaciones: consultan todos (las usan los selects); editan E y X
r.get('/ubicaciones', async (req, res) => res.json(await C.listarUbicaciones()));
r.get('/ubicaciones/:id', async (req, res) => res.json(await C.obtenerUbicacion(req.params.id)));
r.post('/ubicaciones', requiereRol('E', 'X'), async (req, res) => res.status(201).json(await C.crearUbicacion(req)));
r.put('/ubicaciones/:id', requiereRol('E', 'X'), async (req, res) => res.json(await C.modificarUbicacion(req)));

// Proveedores: C y X
r.get('/proveedores', requiereRol('C', 'X'), async (req, res) => res.json(await C.listarProveedores(filtros(req))));
r.get('/proveedores/:id', requiereRol('C', 'X'), async (req, res) => res.json(await C.obtenerProveedor(req.params.id)));
r.post('/proveedores', requiereRol('C', 'X'), async (req, res) => res.status(201).json(await C.crearProveedor(req)));
r.put('/proveedores/:id', requiereRol('C', 'X'), async (req, res) => res.json(await C.modificarProveedor(req)));
r.post('/proveedores/:id/precios', requiereRol('C', 'X'), async (req, res) => res.json(await C.guardarPrecioProveedor(req)));
r.delete('/proveedores/:id/precios/:idProducto', requiereRol('C', 'X'), async (req, res) => res.json(await C.quitarPrecioProveedor(req)));

// Clientes: E, A y X
r.get('/clientes', requiereRol('E', 'A', 'X'), async (req, res) => res.json(await C.listarClientes(filtros(req))));
r.get('/clientes/:id', requiereRol('E', 'A', 'X'), async (req, res) => res.json(await C.obtenerCliente(req.params.id)));
r.post('/clientes', requiereRol('E', 'A', 'X'), async (req, res) => res.status(201).json(await C.crearCliente(req)));
r.put('/clientes/:id', requiereRol('E', 'A', 'X'), async (req, res) => res.json(await C.modificarCliente(req)));

// Usuarios: solo X
r.get('/roles', requiereRol('X'), async (req, res) => res.json(await C.listarRoles()));
r.get('/usuarios', requiereRol('X'), async (req, res) => res.json(await C.listarUsuarios(filtros(req))));
r.get('/usuarios/:id', requiereRol('X'), async (req, res) => res.json(await C.obtenerUsuario(req.params.id)));
r.post('/usuarios', requiereRol('X'), async (req, res) => res.status(201).json(await C.crearUsuario(req)));
r.put('/usuarios/:id', requiereRol('X'), async (req, res) => res.json(await C.modificarUsuario(req)));
r.post('/usuarios/:id/restablecer', requiereRol('X'), async (req, res) => res.json(await C.restablecerPassword(req)));
r.post('/usuarios/:id/desbloquear', requiereRol('X'), async (req, res) => res.json(await C.desbloquearUsuario(req)));

export default r;
