// Sesión y permisos por rol (CU8 / RF1).
// Claves de rol (tabla ROL): E Encargado de Almacén, A Auxiliar de Almacén,
// C Encargada de Compras, D Dirección General, X Administrador.

export function requiereSesion(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: 'Inicie sesión.' });
  next();
}

/** requiereRol('E','A') deja pasar solo a esos roles. El Administrador (X) no entra automáticamente. */
export function requiereRol(...claves) {
  return (req, res, next) => {
    const u = req.session.usuario;
    if (!u) return res.status(401).json({ error: 'Inicie sesión.' });
    if (!claves.includes(u.rol)) return res.status(403).json({ error: 'Su rol no tiene permiso para esta operación.' });
    next();
  };
}
