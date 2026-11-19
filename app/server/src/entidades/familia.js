// Entidad Familia (clasificación de productos).
import { consulta } from '../db.js';

export const listar = () => consulta('SELECT id_familia, nombre FROM FAMILIA ORDER BY nombre');
