// Conexión a SQL Server y utilidades comunes de acceso a datos.
import sql from 'mssql';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'SiaNp_2026!',
  database: process.env.DB_NAME || 'SIA_NP',
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;
export function pool() {
  if (!poolPromise) poolPromise = new sql.ConnectionPool(config).connect();
  return poolPromise;
}

/** Ejecuta una consulta con parámetros nombrados: consulta('SELECT * FROM X WHERE id=@id', { id: 5 }).
 *  Puede recibir una transacción (sql.Transaction) como tercer argumento. Devuelve el recordset. */
export async function consulta(texto, params = {}, tx = null) {
  const req = tx ? new sql.Request(tx) : (await pool()).request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  const r = await req.query(texto);
  return r.recordset ?? [];
}

/** Ejecuta un procedimiento almacenado.
 *  entradas: { nombre: valor }, salidas: { nombre: sql.Tipo }. Devuelve { output, recordset }. */
export async function procedimiento(nombre, entradas = {}, salidas = {}, tx = null) {
  const req = tx ? new sql.Request(tx) : (await pool()).request();
  for (const [k, v] of Object.entries(entradas)) req.input(k, v);
  for (const [k, t] of Object.entries(salidas)) req.output(k, t);
  const r = await req.execute(nombre);
  return { output: r.output, recordset: r.recordset ?? [] };
}

/** Ejecuta fn(tx) dentro de una transacción: si algo falla se revierte todo (RNF2). */
export async function enTransaccion(fn) {
  const tx = new sql.Transaction(await pool());
  await tx.begin();
  try {
    const res = await fn(tx);
    await tx.commit();
    return res;
  } catch (e) {
    try { await tx.rollback(); } catch { /* ya revertida por XACT_ABORT */ }
    throw e;
  }
}

/** Error de negocio con mensaje para el usuario (se responde con 400). */
export class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

export { sql };
