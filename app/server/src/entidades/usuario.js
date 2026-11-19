// Entidad Usuario.
import { consulta } from '../db.js';

export async function buscarPorNombre(nombreUsuario) {
  const r = await consulta(
    `SELECT u.id_usuario, u.nombre_usuario, u.password_hash, u.nombre_completo, u.activo,
            u.intentos_fallidos, r.clave AS rol, r.nombre AS rol_nombre
       FROM USUARIO u JOIN ROL r ON r.id_rol = u.id_rol
      WHERE u.nombre_usuario = @n`, { n: nombreUsuario });
  return r[0] ?? null;
}

export async function registrarIntentoFallido(id) {
  const r = await consulta(
    `UPDATE USUARIO SET intentos_fallidos = CASE WHEN intentos_fallidos < 3 THEN intentos_fallidos + 1 ELSE 3 END
      OUTPUT inserted.intentos_fallidos WHERE id_usuario = @id`, { id });
  return r[0].intentos_fallidos;
}

export async function registrarAccesoExitoso(id) {
  await consulta(`UPDATE USUARIO SET intentos_fallidos = 0, ultimo_acceso = SYSDATETIME() WHERE id_usuario = @id`, { id });
}

// ---- Catálogo de usuarios (IE-010). Nunca se devuelve password_hash. ----
export const listarRoles = () => consulta('SELECT id_rol, clave, nombre FROM ROL ORDER BY id_rol');

export function listar({ q = '', estado = 'activos' } = {}) {
  return consulta(
    `SELECT u.id_usuario, u.nombre_usuario, u.nombre_completo, u.correo, u.id_rol, r.clave AS rol, r.nombre AS rol_nombre,
            u.activo, u.intentos_fallidos, u.fecha_alta, u.ultimo_acceso
       FROM USUARIO u JOIN ROL r ON r.id_rol = u.id_rol
      WHERE (@q = '' OR u.nombre_usuario LIKE @like OR u.nombre_completo LIKE @like)
        AND (@estado = 'todos' OR (@estado = 'activos' AND u.activo = 1) OR (@estado = 'inactivos' AND u.activo = 0))
      ORDER BY u.nombre_usuario`, { q, like: `%${q}%`, estado });
}

export async function obtener(id) {
  return (await consulta(
    `SELECT u.id_usuario, u.nombre_usuario, u.nombre_completo, u.correo, u.id_rol, r.clave AS rol, r.nombre AS rol_nombre,
            u.activo, u.intentos_fallidos, u.fecha_alta, u.ultimo_acceso
       FROM USUARIO u JOIN ROL r ON r.id_rol = u.id_rol WHERE u.id_usuario = @id`, { id }))[0] ?? null;
}

export async function nombreUsado(nombre, exceptoId = 0) {
  return (await consulta('SELECT 1 AS x FROM USUARIO WHERE nombre_usuario = @n AND id_usuario <> @id', { n: nombre, id: exceptoId })).length > 0;
}

export async function crear(u) {
  const r = await consulta(
    `INSERT INTO USUARIO (nombre_usuario, password_hash, nombre_completo, correo, id_rol, activo)
     OUTPUT inserted.id_usuario VALUES (@nombre_usuario, @hash, @nombre_completo, @correo, @id_rol, @activo)`, u);
  return r[0].id_usuario;
}

export async function actualizar(id, u) {
  await consulta(
    `UPDATE USUARIO SET nombre_usuario=@nombre_usuario, nombre_completo=@nombre_completo, correo=@correo,
            id_rol=@id_rol, activo=@activo WHERE id_usuario=@id`, { ...u, id });
}

export async function cambiarPassword(id, hash) {
  await consulta('UPDATE USUARIO SET password_hash=@hash, intentos_fallidos=0 WHERE id_usuario=@id', { id, hash });
}

export async function desbloquear(id) {
  await consulta('UPDATE USUARIO SET intentos_fallidos=0 WHERE id_usuario=@id', { id });
}
