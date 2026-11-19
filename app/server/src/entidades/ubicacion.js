// Entidad Ubicacion (RF5): pasillo, anaquel y nivel del almacén.
import { consulta } from '../db.js';

export const listar = () => consulta(
  `SELECT id_ubicacion, clave, pasillo, anaquel, nivel, descripcion, disponible FROM UBICACION ORDER BY clave`);

export async function obtener(id) {
  return (await consulta('SELECT * FROM UBICACION WHERE id_ubicacion = @id', { id }))[0] ?? null;
}

export async function porClave(clave) {
  return (await consulta('SELECT * FROM UBICACION WHERE clave = @clave', { clave }))[0] ?? null;
}

export async function crear(u) {
  const r = await consulta(
    `INSERT INTO UBICACION (clave, pasillo, anaquel, nivel, descripcion, disponible)
     OUTPUT inserted.id_ubicacion
     VALUES (@clave, @pasillo, @anaquel, @nivel, @descripcion, @disponible)`, u);
  return r[0].id_ubicacion;
}

export async function actualizar(id, u) {
  await consulta(
    `UPDATE UBICACION SET clave=@clave, pasillo=@pasillo, anaquel=@anaquel, nivel=@nivel,
            descripcion=@descripcion, disponible=@disponible WHERE id_ubicacion=@id`, { ...u, id });
}
