// Rutas de sesión: /api/sesion
import { Router } from 'express';
import * as Ctrl from '../controladores/controladorSesion.js';

const r = Router();

r.post('/login', async (req, res) => {
  const usuario = await Ctrl.iniciarSesion(req.body.usuario, req.body.password);
  req.session.usuario = usuario;
  res.json(usuario);
});

r.post('/logout', async (req, res) => {
  if (req.session.usuario) await Ctrl.cerrarSesion(req.session.usuario);
  req.session.destroy(() => res.json({ ok: true }));
});

r.get('/actual', (req, res) => {
  if (!req.session.usuario) return res.status(401).json({ error: 'Sin sesión.' });
  res.json(req.session.usuario);
});

export default r;
