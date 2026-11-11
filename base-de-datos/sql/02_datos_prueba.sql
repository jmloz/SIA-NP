/* =====================================================================
   SIA-NP — Script 02: datos de prueba (unos cuantos registros por catálogo)
   Ejecutar después de 01_creacion_SIA_NP.sql
   ===================================================================== */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
USE SIA_NP;
GO

/* ---------- Catálogo 3: Usuarios y seguridad ---------- */
INSERT INTO ROL (clave, nombre, descripcion) VALUES
 ('E', 'Encargado de Almacén', 'Registra movimientos, conteos y devoluciones'),
 ('A', 'Auxiliar de Almacén',  'Surte pedidos y consulta existencias'),
 ('C', 'Encargada de Compras', 'Proveedores, órdenes de compra y recepciones'),
 ('D', 'Dirección General',    'Consulta el dashboard y los reportes'),
 ('X', 'Administrador',        'Administra usuarios y respaldos');

INSERT INTO USUARIO (nombre_usuario, password_hash, nombre_completo, correo, id_rol) VALUES
 ('lpablovich', '$2b$10$hashDeEjemplo0000000000000000000000000000000000000001', 'Lodevar Pablovich',               'almacen@neumaticadelpacifico.mx', 1),
 ('rmendoza',   '$2b$10$hashDeEjemplo0000000000000000000000000000000000000002', 'Ricardo Mendoza Quintero',        NULL,                              2),
 ('kdominguez', '$2b$10$hashDeEjemplo0000000000000000000000000000000000000003', 'Karla Patricia Domínguez Rivera', 'compras@neumaticadelpacifico.mx', 3),
 ('pperez',     '$2b$10$hashDeEjemplo0000000000000000000000000000000000000004', 'Paulina Pérez Estrada',           'direccion@neumaticadelpacifico.mx', 4),
 ('admin',      '$2b$10$hashDeEjemplo0000000000000000000000000000000000000005', 'Administrador del sistema',       NULL,                              5);

/* ---------- Catálogo 1: Productos y ubicaciones ---------- */
INSERT INTO FAMILIA (nombre, descripcion) VALUES
 ('Mangueras',       'Mangueras de poliuretano y nylon'),
 ('Racores',         'Conexiones rápidas y racores'),
 ('Válvulas',        'Válvulas manuales y electroválvulas'),
 ('Cilindros',       'Cilindros neumáticos'),
 ('Compresores',     'Compresores de aire');

INSERT INTO UBICACION (clave, pasillo, anaquel, nivel, descripcion) VALUES
 ('A-01-1', 'A', 1, 1, 'Pasillo A, anaquel 1, nivel 1'),
 ('A-01-2', 'A', 1, 2, 'Pasillo A, anaquel 1, nivel 2'),
 ('B-03-1', 'B', 3, 1, 'Pasillo B, anaquel 3, nivel 1'),
 ('C-08-3', 'C', 8, 3, 'Pasillo C, anaquel 8, nivel 3'),
 ('PATIO',  'P', NULL, NULL, 'Patio techado para compresores');

INSERT INTO PRODUCTO (codigo_interno, codigo_barras, descripcion, id_familia, unidad_medida,
                      minimo, maximo, punto_reorden, existencia, costo_unitario, precio_venta, id_ubicacion) VALUES
 ('MAN-PU-08', '7501000000011', 'Manguera poliuretano 8 mm azul',       1, 'M',   50, 500, 100, 320.00,  12.50,  21.00, 1),
 ('RAC-RR-08', '7501000000028', 'Racor recto rápido 8 mm x 1/4 NPT',     2, 'PZA', 20, 300,  40,  35.00,  18.90,  32.00, 2),
 ('VAL-5/2-14','7501000000035', 'Electroválvula 5/2 1/4 24 VDC',         3, 'PZA',  5,  40,  10,  12.00, 640.00, 980.00, 3),
 ('CIL-32-100', NULL,           'Cilindro ISO 32 x 100 mm doble efecto', 4, 'PZA',  3,  20,   5,   4.00, 1150.00,1790.00, 4),
 ('COM-50L-2HP','7501000000059', 'Compresor 50 L 2 HP',                   5, 'PZA',  1,   6,   2,   2.00, 5900.00,8490.00, 5);

/* ---------- Catálogo 2: Proveedores y compras ---------- */
INSERT INTO PROVEEDOR (rfc, razon_social, clasificacion, nombre_contacto, telefono, correo, lead_time_dias) VALUES
 ('NSO010203AB1',  'Neumática del Noroeste S.A. de C.V.', 'LOCAL',       'Luis Valenzuela', '6622101010', 'ventas@nnoroeste.mx', 2),
 ('FIM990101XY2',  'Fluidos Industriales de México',      'NACIONAL',    'Ana Torres',      '5555202020', 'ana@fimsa.mx',        7),
 ('XEXX010101000', 'Pneumatic Supply Inc.',               'IMPORTACION', 'John Carter',     '15205550101','sales@pnsupply.com',  30);

INSERT INTO PRODUCTO_PROVEEDOR (id_producto, id_proveedor, codigo_proveedor, precio_compra, moneda) VALUES
 (1, 1, 'PU8-AZ',   12.50, 'MXN'),
 (2, 1, 'KQ2H08',   18.90, 'MXN'),
 (2, 2, 'RR-08-14', 17.80, 'MXN'),
 (3, 3, 'SY5120',   34.00, 'USD'),
 (4, 2, 'ISO32100', 1150.00,'MXN'),
 (5, 2, 'C50-2HP',  5900.00,'MXN');

INSERT INTO ORDEN_COMPRA (folio, id_proveedor, id_usuario, fecha_emision, fecha_entrega_estimada, estado, subtotal) VALUES
 ('OC-2026-0001', 1, 3, '2026-11-02', '2026-11-04', 'EMITIDA',   2512.50),
 ('OC-2026-0002', 2, 3, '2026-11-03', '2026-11-10', 'PENDIENTE', 4600.00);

INSERT INTO DETALLE_ORDEN (id_oc, id_producto, cantidad_solicitada, costo_unitario) VALUES
 (1, 1, 100, 12.50),
 (1, 2,  50, 18.90),
 (2, 4,   4, 1150.00);

/* ---------- Catálogo 4: Movimientos de almacén ---------- */
-- Recepción parcial de la OC-2026-0001 (llegaron las mangueras, faltan los racores)
INSERT INTO RECEPCION (folio, id_oc, id_usuario, numero_factura, tipo_recepcion) VALUES
 ('REC-2026-0001', 1, 3, 'A-15874', 'P');

UPDATE DETALLE_ORDEN SET cantidad_recibida = 100 WHERE id_oc = 1 AND id_producto = 1;
UPDATE ORDEN_COMPRA  SET estado = 'RECIBIDA_PARCIAL' WHERE id_oc = 1;

INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante,
                        documento_ref, id_recepcion, motivo) VALUES
 ('MOV-2026-0001', 'E', 1, 1, 3, 100, 420, 'Factura A-15874', 1,    NULL),
 ('MOV-2026-0002', 'S', 1, 1, 1,  30, 390, 'Vale V-2231',     NULL, NULL),
 ('MOV-2026-0003', 'D', 2, 2, 1,   5,  40, 'Nota NS-0912',    NULL, 'Devolución de cliente, pieza en buen estado');

UPDATE PRODUCTO SET existencia = 390 WHERE id_producto = 1;
UPDATE PRODUCTO SET existencia = 40  WHERE id_producto = 2;

-- Conteo cíclico de la familia Válvulas: se encontraron 11 en lugar de 12
INSERT INTO INVENTARIO_FISICO (folio, tipo_conteo, id_familia, id_usuario, estado) VALUES
 ('INV-2026-0001', 'C', 3, 1, 'AJUSTADO');

INSERT INTO DETALLE_CONTEO (id_conteo, id_producto, id_ubicacion, existencia_sistema, cantidad_contada) VALUES
 (1, 3, 3, 12, 11);

INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante,
                        documento_ref, id_conteo, motivo) VALUES
 ('MOV-2026-0004', 'A', 3, 3, 1, -1, 11, 'INV-2026-0001', 1, 'Diferencia en conteo cíclico');

UPDATE PRODUCTO SET existencia = 11 WHERE id_producto = 3;

INSERT INTO BITACORA_AUDITORIA (id_usuario, accion, modulo, tabla_afectada, id_afectado, detalle) VALUES
 (3, 'ACCESO',     'SEGURIDAD', NULL,           NULL,            'Inicio de sesión'),
 (3, 'ALTA',       'COMPRAS',   'ORDEN_COMPRA', 'OC-2026-0001',  'Emisión de orden de compra'),
 (3, 'MOVIMIENTO', 'ALMACEN',   'MOVIMIENTO',   'MOV-2026-0001', 'Entrada por recepción REC-2026-0001'),
 (1, 'MOVIMIENTO', 'ALMACEN',   'MOVIMIENTO',   'MOV-2026-0002', 'Salida con vale V-2231'),
 (1, 'MOVIMIENTO', 'ALMACEN',   'MOVIMIENTO',   'MOV-2026-0004', 'Ajuste por conteo INV-2026-0001');
GO
