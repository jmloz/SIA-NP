// CU8 Autenticar Usuario.
import bcrypt from 'bcryptjs';
import { ErrorNegocio } from '../db.js';
import * as Usuario from '../entidades/usuario.js';
import * as Bitacora from '../entidades/bitacora.js';

export async function iniciarSesion(nombreUsuario, password) {
  if (!nombreUsuario || !password) throw new ErrorNegocio('Capture usuario y contraseña.');
  const u = await Usuario.buscarPorNombre(nombreUsuario.trim());
  if (!u) throw new ErrorNegocio('Usuario o contraseña incorrectos.', 401);                       // 4a
  if (!u.activo) throw new ErrorNegocio('Cuenta inactiva. Contacte al administrador.', 403);       // 4c
  if (u.intentos_fallidos >= 3)                                                                    // 4b
    throw new ErrorNegocio('Cuenta bloqueada por tres intentos fallidos. Solicite al administrador que la desbloquee.', 423);

  if (!(await bcrypt.compare(password, u.password_hash))) {
    const intentos = await Usuario.registrarIntentoFallido(u.id_usuario);
    if (intentos >= 3) {
      await Bitacora.registrar({ idUsuario: u.id_usuario, accion: 'ACCESO', modulo: 'SEGURIDAD', tabla: 'USUARIO',
        idAfectado: u.id_usuario, detalle: 'Cuenta bloqueada por tres intentos fallidos (aviso al administrador)' });
      throw new ErrorNegocio('Cuenta bloqueada por tres intentos fallidos. Solicite al administrador que la desbloquee.', 423);
    }
    throw new ErrorNegocio(`Usuario o contraseña incorrectos. Intentos restantes: ${3 - intentos}.`, 401);
  }

  await Usuario.registrarAccesoExitoso(u.id_usuario);
  await Bitacora.registrar({ idUsuario: u.id_usuario, accion: 'ACCESO', modulo: 'SEGURIDAD', detalle: 'Inicio de sesión' });
  return { id: u.id_usuario, usuario: u.nombre_usuario, nombre: u.nombre_completo, rol: u.rol, rolNombre: u.rol_nombre };
}

export async function cerrarSesion(usuario) {
  await Bitacora.registrar({ idUsuario: usuario.id, accion: 'CIERRE_SESION', modulo: 'SEGURIDAD', detalle: 'Cierre de sesión' });
}
