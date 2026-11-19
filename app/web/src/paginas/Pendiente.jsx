import { Pantalla, Alerta } from '../componentes/ui.jsx';
export default function Pendiente({ titulo }) {
  return <Pantalla titulo={titulo}><Alerta tipo="info">Pantalla en construcción.</Alerta></Pantalla>;
}
