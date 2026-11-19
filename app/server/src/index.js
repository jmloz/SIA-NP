// Servidor SIA-NP. Capas (diagrama de clases): rutas (HTTP) -> controladores -> entidades (SQL).
// Las rutas nunca consultan la BD directamente.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import { ErrorNegocio } from './db.js';
import { requiereSesion } from './auth.js';
import seguridad from './rutas/seguridad.js';
import catalogos from './rutas/catalogos.js';
import almacen from './rutas/almacen.js';
import compras from './rutas/compras.js';
import direccion from './rutas/direccion.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'sianp-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 },
}));

app.use('/api/sesion', seguridad);
app.use('/api/catalogos', requiereSesion, catalogos);   // productos, ubicaciones, familias, proveedores, clientes, usuarios
app.use('/api/almacen', requiereSesion, almacen);       // CU1 movimientos, notas de salida, CU2 kardex/existencias
app.use('/api/compras', requiereSesion, compras);       // CU5 órdenes de compra, CU6 recepción, reorden
app.use('/api/direccion', requiereSesion, direccion);   // bitácora, dashboard, exportaciones

// En la demo (npm start) el mismo servidor entrega la app compilada de web/dist.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (req, res, next) => res.sendFile(path.join(dist, 'index.html'), (e) => e && next()));

// Errores: los de negocio (ErrorNegocio o THROW 5xxxx de los procedimientos) llegan al usuario con su mensaje.
app.use((err, req, res, _next) => {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message });
  const num = err.number ?? err.originalError?.info?.number;
  if (num >= 50000) return res.status(400).json({ error: err.message });
  if (num === 547) return res.status(400).json({ error: 'El dato no cumple una regla de la base de datos: ' + err.message });
  if (num === 2627 || num === 2601) return res.status(409).json({ error: 'Ya existe un registro con ese valor único.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`SIA-NP API en http://localhost:${port}`));
