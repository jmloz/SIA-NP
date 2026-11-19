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
