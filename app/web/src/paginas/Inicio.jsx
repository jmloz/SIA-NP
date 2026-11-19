import { Link } from 'react-router-dom';
import { useSesion, tieneRol } from '../sesion.jsx';
import { MODULOS } from '../modulos.js';
import { Pantalla } from '../componentes/ui.jsx';

export default function Inicio() {
  const { usuario } = useSesion();
  return (
    <Pantalla titulo={`Hola, ${usuario.nombre.split(' ')[0]}`}
      intro={`Ha iniciado sesión como ${usuario.rolNombre}. Estas son las funciones de su rol.`}>
      {MODULOS.map((m) => {
        const items = m.menu.filter((i) => tieneRol(usuario, i.roles));
        if (!items.length) return null;
        return (
          <div className="seccion" key={m.grupo}>
            <div className="seccion-tit"><span>{m.grupo}</span></div>
            <div className="opciones">
              {items.map((i) => <Link key={i.ruta} to={i.ruta} className="btn btn-sec">{i.texto}</Link>)}
            </div>
          </div>
        );
      })}
    </Pantalla>
  );
}
