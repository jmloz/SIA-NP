// Controlador de Catálogos: validaciones de negocio y bitácora (RF19, RF20).
import bcrypt from 'bcryptjs';
import { ErrorNegocio } from '../db.js';
import * as Producto from '../entidades/producto.js';
import * as Familia from '../entidades/familia.js';
import * as Ubicacion from '../entidades/ubicacion.js';
import * as Proveedor from '../entidades/proveedor.js';
import * as Cliente from '../entidades/cliente.js';
import * as Usuario from '../entidades/usuario.js';
import * as Bitacora from '../entidades/bitacora.js';

// ---------- utilidades ----------
const texto = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
const oblig = (v, nombre, max) => {
  const t = texto(v);
  if (!t) throw new ErrorNegocio(`${nombre} es obligatorio.`);
  if (t.length > max) throw new ErrorNegocio(`${nombre} admite máximo ${max} caracteres.`);
  return t;
};
const opc = (v, nombre, max) => {
  const t = texto(v);
  if (t && t.length > max) throw new ErrorNegocio(`${nombre} admite máximo ${max} caracteres.`);
  return t;
};
const num = (v, nombre) => {
  const n = Number(v);
  if (v === '' || v == null || !Number.isFinite(n)) throw new ErrorNegocio(`${nombre} debe ser un número.`);
  return n;
};
const correo = (v) => {
  const t = opc(v, 'El correo', 100);
  if (t && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) throw new ErrorNegocio('El correo debe tener el formato nombre@dominio.ext.');
  return t;
};
const rfc = (v, obligatorio) => {
  const t = obligatorio ? oblig(v, 'El RFC', 13) : opc(v, 'El RFC', 13);
  if (t && ![12, 13].includes(t.length)) throw new ErrorNegocio('El RFC debe tener 12 o 13 caracteres.');
  return t ? t.toUpperCase() : null;
};
const bit = (v, def = true) => (v === undefined ? def : v ? 1 : 0);
const bitacora = (req, accion, modulo, tabla, id, detalle) =>
  Bitacora.registrar({ idUsuario: req.session.usuario.id, accion, modulo, tabla, idAfectado: id, detalle });
const existe = (x, nombre) => { if (!x) throw new ErrorNegocio(`${nombre} no existe.`, 404); return x; };

// ---------- Productos (IE-003) ----------
export const listarFamilias = () => Familia.listar();
export const listarProductos = (q) => Producto.listar(q);
export async function obtenerProducto(id) { return existe(await Producto.obtener(id), 'El producto'); }

async function validarProducto(b, id = 0) {
  const p = {
    codigo_interno: oblig(b.codigo_interno, 'El código interno', 20),
    codigo_barras: opc(b.codigo_barras, 'El código de barras', 30),
    descripcion: oblig(b.descripcion, 'La descripción', 150),
    id_familia: Number(b.id_familia),
    unidad_medida: b.unidad_medida,
    minimo: num(b.minimo, 'El mínimo'),
    maximo: num(b.maximo, 'El máximo'),
    punto_reorden: num(b.punto_reorden, 'El punto de reorden'),
    costo_unitario: num(b.costo_unitario, 'El costo unitario'),
    precio_venta: num(b.precio_venta, 'El precio de venta'),
    imagen_url: opc(b.imagen_url, 'La imagen', 255),
    id_ubicacion: b.id_ubicacion ? Number(b.id_ubicacion) : null,
  };
  if (!p.id_familia) throw new ErrorNegocio('Seleccione la familia.');
  if (!['PZA', 'M', 'KG', 'LT', 'JGO', 'ROLLO'].includes(p.unidad_medida)) throw new ErrorNegocio('Seleccione una unidad de medida válida.');
  if (p.minimo < 0 || p.maximo < 0 || p.punto_reorden < 0 || p.costo_unitario < 0 || p.precio_venta < 0)
    throw new ErrorNegocio('Los valores no pueden ser negativos.');
  if (p.maximo < p.minimo) throw new ErrorNegocio('El máximo debe ser mayor o igual al mínimo.');
  if (p.punto_reorden < p.minimo || p.punto_reorden > p.maximo) throw new ErrorNegocio('El punto de reorden debe estar entre el mínimo y el máximo.');
  if (await Producto.codigoInternoUsado(p.codigo_interno, id)) throw new ErrorNegocio('El código interno ya existe.', 409);
  if (p.codigo_barras && await Producto.codigoBarrasUsado(p.codigo_barras, id)) throw new ErrorNegocio('El código de barras ya está asignado a otro producto.', 409);
  return p;
}

export async function crearProducto(req) {
  const p = await validarProducto(req.body);
  const id = await Producto.crear(p);
  await bitacora(req, 'ALTA', 'CATALOGOS', 'PRODUCTO', id, `Alta de producto ${p.codigo_interno}`);
  return Producto.obtener(id);
}

export async function modificarProducto(req) {
  const id = Number(req.params.id);
  existe(await Producto.obtener(id), 'El producto');
  const p = await validarProducto(req.body, id);
  await Producto.actualizar(id, p);
  await bitacora(req, 'MODIFICACION', 'CATALOGOS', 'PRODUCTO', id, `Modificación de producto ${p.codigo_interno}`);
  return Producto.obtener(id);
}

export async function cambiarEstadoProducto(req, activo) {
  const id = Number(req.params.id);
  const p = existe(await Producto.obtener(id), 'El producto');
  await Producto.cambiarActivo(id, activo);
  await bitacora(req, activo ? 'MODIFICACION' : 'BAJA', 'CATALOGOS', 'PRODUCTO', id,
    `${activo ? 'Reactivación' : 'Baja lógica'} de producto ${p.codigo_interno}`);
  return Producto.obtener(id);
}

// ---------- Ubicaciones (IE-004) ----------
export const listarUbicaciones = () => Ubicacion.listar();
export async function obtenerUbicacion(id) { return existe(await Ubicacion.obtener(id), 'La ubicación'); }

async function validarUbicacion(b, id = 0) {
  const pasillo = String(b.pasillo ?? '').toUpperCase();
  if (!['A', 'B', 'C', 'P'].includes(pasillo)) throw new ErrorNegocio('El pasillo debe ser A, B, C o P (patio).');
  let anaquel = null, nivel = null, clave = opc(b.clave, 'La clave', 10);
  if (pasillo === 'P') {
    if (texto(b.anaquel) || texto(b.nivel)) throw new ErrorNegocio('El patio no lleva anaquel ni nivel.');
    if (!clave) throw new ErrorNegocio('Capture la clave de la ubicación del patio.');
  } else {
    anaquel = num(b.anaquel, 'El anaquel');
    nivel = num(b.nivel, 'El nivel');
    if (!Number.isInteger(anaquel) || anaquel < 1 || anaquel > 8) throw new ErrorNegocio('El anaquel debe ser un entero de 1 a 8.');
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 3) throw new ErrorNegocio('El nivel debe ser un entero de 1 a 3.');
    if (!clave) clave = `${pasillo}-${String(anaquel).padStart(2, '0')}-${nivel}`;
  }
  const otra = await Ubicacion.porClave(clave);
  if (otra && otra.id_ubicacion !== id) throw new ErrorNegocio('La clave de ubicación ya existe.', 409);
  return { clave, pasillo, anaquel, nivel, descripcion: opc(b.descripcion, 'La descripción', 100), disponible: bit(b.disponible) };
}

export async function crearUbicacion(req) {
  const u = await validarUbicacion(req.body);
  const id = await Ubicacion.crear(u);
  await bitacora(req, 'ALTA', 'CATALOGOS', 'UBICACION', id, `Alta de ubicación ${u.clave}`);
  return Ubicacion.obtener(id);
}

export async function modificarUbicacion(req) {
  const id = Number(req.params.id);
  existe(await Ubicacion.obtener(id), 'La ubicación');
  const u = await validarUbicacion(req.body, id);
  await Ubicacion.actualizar(id, u);
  await bitacora(req, u.disponible ? 'MODIFICACION' : 'BAJA', 'CATALOGOS', 'UBICACION', id,
    `Modificación de ubicación ${u.clave}${u.disponible ? '' : ' (no disponible)'}`);
  return Ubicacion.obtener(id);
}

// ---------- Proveedores (IE-005) ----------
export const listarProveedores = (q) => Proveedor.listar(q);
export async function obtenerProveedor(id) {
  const p = existe(await Proveedor.obtener(id), 'El proveedor');
  return { ...p, precios: await Proveedor.listarPrecios(id) };
}

async function validarProveedor(b, id = 0) {
  const p = {
    rfc: rfc(b.rfc, true),
    razon_social: oblig(b.razon_social, 'La razón social', 150),
    clasificacion: b.clasificacion,
    nombre_contacto: opc(b.nombre_contacto, 'El contacto', 100),
    telefono: opc(b.telefono, 'El teléfono', 15),
    correo: correo(b.correo),
    lead_time_dias: num(b.lead_time_dias, 'El tiempo de entrega'),
    activo: bit(b.activo),
  };
  if (!['LOCAL', 'NACIONAL', 'IMPORTACION'].includes(p.clasificacion)) throw new ErrorNegocio('Seleccione la clasificación.');
  if (!Number.isInteger(p.lead_time_dias) || p.lead_time_dias < 0 || p.lead_time_dias > 180)
    throw new ErrorNegocio('El tiempo de entrega debe ser un entero entre 0 y 180 días.');
  if (await Proveedor.rfcUsado(p.rfc, id)) throw new ErrorNegocio('Ya existe un proveedor con ese RFC.', 409);
  return p;
}

export async function crearProveedor(req) {
  const p = await validarProveedor(req.body);
  const id = await Proveedor.crear(p);
  await bitacora(req, 'ALTA', 'CATALOGOS', 'PROVEEDOR', id, `Alta de proveedor ${p.razon_social}`);
  return obtenerProveedor(id);
}

export async function modificarProveedor(req) {
  const id = Number(req.params.id);
  const antes = existe(await Proveedor.obtener(id), 'El proveedor');
  const p = await validarProveedor(req.body, id);
  await Proveedor.actualizar(id, p);
  const accion = antes.activo && !p.activo ? 'BAJA' : 'MODIFICACION';
  await bitacora(req, accion, 'CATALOGOS', 'PROVEEDOR', id, `${accion === 'BAJA' ? 'Baja' : 'Modificación'} de proveedor ${p.razon_social}`);
  return obtenerProveedor(id);
}

export async function guardarPrecioProveedor(req) {
  const id = Number(req.params.id);
  const prov = existe(await Proveedor.obtener(id), 'El proveedor');
  const idProducto = Number(req.body.id_producto);
  const prod = existe(idProducto ? await Producto.obtener(idProducto) : null, 'El producto');
  const precio = num(req.body.precio_compra, 'El precio de compra');
  if (precio <= 0) throw new ErrorNegocio('El precio de compra debe ser mayor a 0.');
  if (!['MXN', 'USD'].includes(req.body.moneda)) throw new ErrorNegocio('La moneda debe ser MXN o USD.');
  await Proveedor.guardarPrecio(id, {
    id_producto: idProducto, codigo_proveedor: opc(req.body.codigo_proveedor, 'El código del proveedor', 30),
    precio_compra: precio, moneda: req.body.moneda,
  });
  await bitacora(req, 'MODIFICACION', 'CATALOGOS', 'PRODUCTO_PROVEEDOR', id,
    `Precio de ${prod.codigo_interno} para ${prov.razon_social}: ${precio} ${req.body.moneda}`);
  return Proveedor.listarPrecios(id);
}

export async function quitarPrecioProveedor(req) {
  const id = Number(req.params.id), idProducto = Number(req.params.idProducto);
  existe(await Proveedor.obtener(id), 'El proveedor');
  await Proveedor.quitarPrecio(id, idProducto);
  await bitacora(req, 'BAJA', 'CATALOGOS', 'PRODUCTO_PROVEEDOR', id, `Se quitó el producto ${idProducto} del proveedor ${id}`);
  return Proveedor.listarPrecios(id);
}

// ---------- Clientes ----------
export const listarClientes = (q) => Cliente.listar(q);
export async function obtenerCliente(id) { return existe(await Cliente.obtener(id), 'El cliente'); }

function validarCliente(b) {
  return { nombre: oblig(b.nombre, 'El nombre', 150), rfc: rfc(b.rfc, false), telefono: opc(b.telefono, 'El teléfono', 15), activo: bit(b.activo) };
}

export async function crearCliente(req) {
  const c = validarCliente(req.body);
  const id = await Cliente.crear(c);
  await bitacora(req, 'ALTA', 'CATALOGOS', 'CLIENTE', id, `Alta de cliente ${c.nombre}`);
  return Cliente.obtener(id);
}

export async function modificarCliente(req) {
  const id = Number(req.params.id);
  const antes = existe(await Cliente.obtener(id), 'El cliente');
  const c = validarCliente(req.body);
  await Cliente.actualizar(id, c);
  const baja = antes.activo && !c.activo;
  await bitacora(req, baja ? 'BAJA' : 'MODIFICACION', 'CATALOGOS', 'CLIENTE', id, `${baja ? 'Baja' : 'Modificación'} de cliente ${c.nombre}`);
  return Cliente.obtener(id);
}

// ---------- Usuarios (IE-010), módulo SEGURIDAD ----------
export const listarRoles = () => Usuario.listarRoles();
export const listarUsuarios = (q) => Usuario.listar(q);
export async function obtenerUsuario(id) { return existe(await Usuario.obtener(id), 'El usuario'); }

async function validarUsuario(b, id = 0) {
  const u = {
    nombre_usuario: oblig(b.nombre_usuario, 'El nombre de usuario', 30),
    nombre_completo: oblig(b.nombre_completo, 'El nombre completo', 100),
    correo: correo(b.correo),
    id_rol: Number(b.id_rol),
    activo: bit(b.activo),
  };
  if (u.nombre_usuario.length < 4) throw new ErrorNegocio('El nombre de usuario debe tener al menos 4 caracteres.');
  if (!(await Usuario.listarRoles()).some((r) => r.id_rol === u.id_rol)) throw new ErrorNegocio('Seleccione el rol.');
  if (await Usuario.nombreUsado(u.nombre_usuario, id)) throw new ErrorNegocio('Ese nombre de usuario ya existe.', 409);
  return u;
}

function validarPassword(p) {
  if (!p || String(p).length < 8) throw new ErrorNegocio('La contraseña debe tener al menos 8 caracteres.');
  return bcrypt.hash(String(p), 10);
}

export async function crearUsuario(req) {
  const u = await validarUsuario(req.body);
  if (req.body.confirmar !== undefined && req.body.confirmar !== req.body.password) throw new ErrorNegocio('La confirmación de la contraseña no coincide.');
  const hash = await validarPassword(req.body.password);
  const id = await Usuario.crear({ ...u, hash });
  await bitacora(req, 'ALTA', 'SEGURIDAD', 'USUARIO', id, `Alta de usuario ${u.nombre_usuario}`);
  return Usuario.obtener(id);
}

export async function modificarUsuario(req) {
  const id = Number(req.params.id);
  const antes = existe(await Usuario.obtener(id), 'El usuario');
  const u = await validarUsuario(req.body, id);
  if (id === req.session.usuario.id && (!u.activo || u.id_rol !== antes.id_rol))
    throw new ErrorNegocio('No puede desactivar su propia cuenta ni cambiar su propio rol.');
  await Usuario.actualizar(id, u);
  const baja = antes.activo && !u.activo;
  await bitacora(req, baja ? 'BAJA' : 'MODIFICACION', 'SEGURIDAD', 'USUARIO', id, `${baja ? 'Baja' : 'Modificación'} de usuario ${u.nombre_usuario}`);
  return Usuario.obtener(id);
}

export async function restablecerPassword(req) {
  const id = Number(req.params.id);
  const u = existe(await Usuario.obtener(id), 'El usuario');
  await Usuario.cambiarPassword(id, await validarPassword(req.body.password));
  await bitacora(req, 'MODIFICACION', 'SEGURIDAD', 'USUARIO', id, `Restablecimiento de contraseña de ${u.nombre_usuario}`);
  return Usuario.obtener(id);
}

export async function desbloquearUsuario(req) {
  const id = Number(req.params.id);
  const u = existe(await Usuario.obtener(id), 'El usuario');
  await Usuario.desbloquear(id);
  await bitacora(req, 'MODIFICACION', 'SEGURIDAD', 'USUARIO', id, `Desbloqueo de cuenta ${u.nombre_usuario}`);
  return Usuario.obtener(id);
}
