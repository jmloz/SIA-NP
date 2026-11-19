import { NavLink, Outlet, useLocation, matchPath } from 'react-router-dom';
import { useSesion, tieneRol } from '../sesion.jsx';
import { MODULOS } from '../modulos.js';
import { Logo } from './ui.jsx';

function iniciales(nombre = '') {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function Layout() {
  const { usuario, salir } = useSesion();
  const { pathname } = useLocation();

  // Título y módulo de la barra según la ruta actual
  let modulo = 'Inicio', titulo = 'Bienvenido';
  for (const m of MODULOS)
    for (const r of m.rutas)
      if (matchPath(r.ruta, pathname)) { modulo = m.grupo; titulo = r.titulo; }

  return (
    <>
      <header className="barra">
        <NavLink to="/" className="logo-link" style={{ textDecoration: 'none' }}><Logo /></NavLink>
        <div className="barra-tit"><span className="modulo">{modulo}</span>{titulo}</div>
        <div className="user">
          <div className="user-txt"><b>{usuario.nombre}</b><small>{usuario.rolNombre}</small></div>
          <div className="avatar">{iniciales(usuario.nombre)}</div>
          <button className="btn-salir" onClick={salir}>Cerrar sesión</button>
        </div>
      </header>
      <div className="marco">
        <nav className="menu">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'activo' : '')}>Inicio</NavLink>
          {MODULOS.map((m) => {
            const items = m.menu.filter((i) => tieneRol(usuario, i.roles));
            if (!items.length) return null;
            return (
              <div key={m.grupo}>
                <div className="menu-grupo">{m.grupo}</div>
                {items.map((i) => (
                  <NavLink key={i.ruta} to={i.ruta} end className={({ isActive }) => (isActive ? 'activo' : '')}>{i.texto}</NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <main className="contenido"><Outlet /></main>
      </div>
    </>
  );
}
