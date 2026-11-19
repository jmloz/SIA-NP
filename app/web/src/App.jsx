import { Routes, Route, Navigate } from 'react-router-dom';
import { useSesion, tieneRol } from './sesion.jsx';
import { MODULOS } from './modulos.js';
import Layout from './componentes/Layout.jsx';
import Login from './paginas/Login.jsx';
import Inicio from './paginas/Inicio.jsx';
import { Pantalla, Alerta } from './componentes/ui.jsx';

function SinPermiso() {
  return <Pantalla titulo="Sin permiso"><Alerta tipo="aviso">Su rol no tiene acceso a esta función (CU8, paso 6).</Alerta></Pantalla>;
}

export default function App() {
  const { usuario } = useSesion();
  if (usuario === undefined) return null; // cargando sesión
  if (!usuario) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        {MODULOS.flatMap((m) => m.rutas).map((r) => (
          <Route key={r.ruta} path={r.ruta} element={tieneRol(usuario, r.roles) ? r.elemento : <SinPermiso />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
