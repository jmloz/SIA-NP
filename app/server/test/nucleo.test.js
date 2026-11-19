// Pruebas del núcleo transaccional (RNF2) contra la BD real.
// Ejecutar con la BD recién creada: bash db/init-docker.sh && npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { consulta, procedimiento, pool, sql } from '../src/db.js';

const SALIDAS = { folio: sql.VarChar(20), saldo: sql.Decimal(10, 2) };

async function existencia(id) {
  return Number((await consulta('SELECT existencia FROM PRODUCTO WHERE id_producto = @id', { id }))[0].existencia);
}

function movimiento(tipo, id_producto, cantidad, extra = {}) {
  return procedimiento('sp_registrar_movimiento', {
    tipo, id_producto, id_ubicacion: 1, id_usuario: 1, cantidad,
    documento_ref: 'PRUEBA', motivo: 'Prueba automática', ...extra,
  }, SALIDAS);
}

after(async () => (await pool()).close());

test('CU1 alterno 8a: una salida mayor que la existencia se rechaza y no cambia nada', async () => {
  const antes = await existencia(1);
  await assert.rejects(movimiento('S', 1, antes + 1), /excede la existencia/);
  assert.equal(await existencia(1), antes);
});

test('CU1: una salida válida descuenta la existencia y devuelve folio MOV', async () => {
  const antes = await existencia(1);
  const { output } = await movimiento('S', 1, 1);
  assert.match(output.folio, /^MOV-\d{4}-\d{4}$/);
  assert.equal(Number(output.saldo), antes - 1);
  assert.equal(await existencia(1), antes - 1);
});

test('RNF2: dos salidas simultáneas por toda la existencia no dejan existencia negativa', async () => {
  const id = 4; // cilindro
  const antes = await existencia(id);
  const res = await Promise.allSettled([movimiento('S', id, antes), movimiento('S', id, antes)]);
  assert.equal(res.filter((r) => r.status === 'fulfilled').length, 1, 'solo una debe pasar');
  assert.equal(await existencia(id), 0);
  await movimiento('E', id, antes); // deja el dato como estaba
});

test('Kardex: la existencia de cada producto es igual al último saldo de sus movimientos', async () => {
  const r = await consulta(`
    SELECT p.id_producto, p.existencia,
           (SELECT TOP 1 saldo_resultante FROM MOVIMIENTO m
             WHERE m.id_producto = p.id_producto ORDER BY m.id_movimiento DESC) AS ultimo_saldo
      FROM PRODUCTO p`);
  for (const f of r)
    if (f.ultimo_saldo != null) assert.equal(Number(f.existencia), Number(f.ultimo_saldo), `producto ${f.id_producto}`);
});

test('CU6 alterno 7a y 6a: excedente requiere autorización; lo no conforme no entra al inventario', async () => {
  // Orden nueva de 10 piezas del producto 3
  const { output: oc } = await procedimiento('sp_siguiente_folio', { prefijo: 'OC' }, { folio: sql.VarChar(20) });
  const [{ id_oc }] = await consulta(
    `INSERT INTO ORDEN_COMPRA (folio, id_proveedor, id_usuario, estado, subtotal)
     OUTPUT inserted.id_oc VALUES (@f, 3, 3, 'EMITIDA', 6400)`, { f: oc.folio });
  await consulta(`INSERT INTO DETALLE_ORDEN (id_oc, id_producto, cantidad_solicitada, costo_unitario) VALUES (@id, 3, 10, 640)`, { id: id_oc });
  const recibir = (partidas, autorizar = 0) => procedimiento('sp_registrar_recepcion', {
    id_oc, id_usuario: 3, numero_factura: 'F-PRUEBA', partidas: JSON.stringify(partidas), autorizar_excedente: autorizar,
  }, { folio: sql.VarChar(20) });

  const antes = await existencia(3);
  await assert.rejects(recibir([{ id_producto: 3, cantidad: 12, no_conforme: 0, id_ubicacion: 3 }]), /excede la solicitada/);
  assert.equal(await existencia(3), antes);

  await recibir([{ id_producto: 3, cantidad: 6, no_conforme: 1, id_ubicacion: 3 }]);
  assert.equal(await existencia(3), antes + 6, 'la pieza no conforme no suma');
  let [o] = await consulta('SELECT estado FROM ORDEN_COMPRA WHERE id_oc = @id', { id: id_oc });
  assert.equal(o.estado, 'RECIBIDA_PARCIAL');

  await recibir([{ id_producto: 3, cantidad: 5, no_conforme: 0, id_ubicacion: 3 }], 1);
  [o] = await consulta('SELECT estado FROM ORDEN_COMPRA WHERE id_oc = @id', { id: id_oc });
  assert.equal(o.estado, 'RECIBIDA_TOTAL');
});
