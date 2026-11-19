// Entidad Cliente (destinatario de las notas de salida).
import { consulta } from '../db.js';

export function listar({ q = '', estado = 'activos' } = {}) {
  return consulta(
    `SELECT id_cliente, nombre, rfc, telefono, activo FROM CLIENTE
      WHERE (@q = '' OR nombre LIKE @like OR rfc LIKE @like)
        AND (@estado = 'todos' OR (@estado = 'activos' AND activo = 1) OR (@estado = 'inactivos' AND activo = 0))
      ORDER BY nombre`, { q, like: `%${q}%`, estado });
}

export async function obtener(id) {
  return (await consulta('SELECT * FROM CLIENTE WHERE id_cliente = @id', { id }))[0] ?? null;
}

export async function crear(c) {
  const r = await consulta(
    `INSERT INTO CLIENTE (nombre, rfc, telefono, activo) OUTPUT inserted.id_cliente
     VALUES (@nombre, @rfc, @telefono, @activo)`, c);
  return r[0].id_cliente;
}

export async function actualizar(id, c) {
  await consulta('UPDATE CLIENTE SET nombre=@nombre, rfc=@rfc, telefono=@telefono, activo=@activo WHERE id_cliente=@id', { ...c, id });
}
