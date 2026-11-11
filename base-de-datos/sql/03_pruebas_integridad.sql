/* =====================================================================
   SIA-NP — Script 03: pruebas de las reglas de integridad
   Cada instrucción DEBE ser rechazada por una restricción.
   Ejecutar después de 02_datos_prueba.sql
   ===================================================================== */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO
USE SIA_NP;
GO

CREATE OR ALTER PROCEDURE dbo.usp_probar @descripcion VARCHAR(120), @sql NVARCHAR(MAX) AS
BEGIN
    BEGIN TRY
        BEGIN TRAN;
        EXEC sp_executesql @sql;
        ROLLBACK;
        PRINT 'FALLÓ LA PRUEBA (se aceptó): ' + @descripcion;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        PRINT 'OK  ' + @descripcion + '  ->  ' + LEFT(ERROR_MESSAGE(), 110);
    END CATCH
END;
GO

EXEC dbo.usp_probar 'UNIQUE: clave de rol repetida',
     N'INSERT INTO ROL (clave, nombre) VALUES (''E'', ''Otro rol'')';
EXEC dbo.usp_probar 'CHECK: rol con clave no permitida',
     N'INSERT INTO ROL (clave, nombre) VALUES (''Z'', ''Rol Z'')';
EXEC dbo.usp_probar 'FK: usuario con un rol que no existe',
     N'INSERT INTO USUARIO (nombre_usuario, password_hash, nombre_completo, id_rol) VALUES (''prueba'', ''x'', ''Prueba'', 99)';
EXEC dbo.usp_probar 'CHECK: más de 3 intentos fallidos',
     N'UPDATE USUARIO SET intentos_fallidos = 4 WHERE id_usuario = 1';
EXEC dbo.usp_probar 'CHECK: correo sin formato válido',
     N'UPDATE USUARIO SET correo = ''correo-sin-arroba'' WHERE id_usuario = 1';
EXEC dbo.usp_probar 'UNIQUE: código interno de producto repetido',
     N'INSERT INTO PRODUCTO (codigo_interno, descripcion, id_familia) VALUES (''MAN-PU-08'', ''Duplicado'', 1)';
EXEC dbo.usp_probar 'UNIQUE (índice filtrado): código de barras repetido',
     N'INSERT INTO PRODUCTO (codigo_interno, codigo_barras, descripcion, id_familia) VALUES (''NUEVO-1'', ''7501000000011'', ''Dup'', 1)';
EXEC dbo.usp_probar 'CHECK: existencia negativa',
     N'UPDATE PRODUCTO SET existencia = -1 WHERE id_producto = 1';
EXEC dbo.usp_probar 'CHECK: máximo menor que el mínimo',
     N'UPDATE PRODUCTO SET maximo = 10 WHERE id_producto = 1';
EXEC dbo.usp_probar 'CHECK: unidad de medida no permitida',
     N'UPDATE PRODUCTO SET unidad_medida = ''CAJA'' WHERE id_producto = 1';
EXEC dbo.usp_probar 'CHECK: anaquel fuera de rango (1-8)',
     N'INSERT INTO UBICACION (clave, pasillo, anaquel, nivel) VALUES (''A-09-1'', ''A'', 9, 1)';
EXEC dbo.usp_probar 'CHECK: ubicación en pasillo sin nivel',
     N'INSERT INTO UBICACION (clave, pasillo, anaquel) VALUES (''B-02'', ''B'', 2)';
EXEC dbo.usp_probar 'CHECK: clasificación de proveedor no válida',
     N'INSERT INTO PROVEEDOR (rfc, razon_social, clasificacion) VALUES (''AAA010101AAA'', ''X'', ''EXTRANJERO'')';
EXEC dbo.usp_probar 'CHECK: RFC con longitud incorrecta',
     N'INSERT INTO PROVEEDOR (rfc, razon_social) VALUES (''ABC123'', ''X'')';
EXEC dbo.usp_probar 'CHECK: precio de compra en cero',
     N'INSERT INTO PRODUCTO_PROVEEDOR (id_producto, id_proveedor, precio_compra) VALUES (1, 2, 0)';
EXEC dbo.usp_probar 'CHECK: estado de orden de compra no válido',
     N'UPDATE ORDEN_COMPRA SET estado = ''PERDIDA'' WHERE id_oc = 1';
EXEC dbo.usp_probar 'CHECK: fecha de entrega anterior a la emisión',
     N'UPDATE ORDEN_COMPRA SET fecha_entrega_estimada = ''2026-10-01'' WHERE id_oc = 1';
EXEC dbo.usp_probar 'PK compuesta: mismo producto dos veces en la orden',
     N'INSERT INTO DETALLE_ORDEN (id_oc, id_producto, cantidad_solicitada, costo_unitario) VALUES (1, 1, 5, 12.5)';
EXEC dbo.usp_probar 'CHECK: cantidad solicitada en cero',
     N'INSERT INTO DETALLE_ORDEN (id_oc, id_producto, cantidad_solicitada, costo_unitario) VALUES (1, 3, 0, 640)';
EXEC dbo.usp_probar 'FK: recepción de una orden que no existe',
     N'INSERT INTO RECEPCION (folio, id_oc, id_usuario, numero_factura) VALUES (''REC-X'', 999, 3, ''F-1'')';
EXEC dbo.usp_probar 'CHECK: tipo de movimiento no válido',
     N'INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante, documento_ref) VALUES (''MOV-X'', ''T'', 1, 1, 1, 5, 5, ''V-1'')';
EXEC dbo.usp_probar 'CHECK: salida con cantidad negativa',
     N'INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante, documento_ref) VALUES (''MOV-X'', ''S'', 1, 1, 1, -5, 5, ''V-1'')';
EXEC dbo.usp_probar 'CHECK: salida ligada a una recepción',
     N'INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante, documento_ref, id_recepcion) VALUES (''MOV-X'', ''S'', 1, 1, 1, 5, 5, ''V-1'', 1)';
EXEC dbo.usp_probar 'CHECK: ajuste sin motivo',
     N'INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante) VALUES (''MOV-X'', ''A'', 1, 1, 1, 2, 5)';
EXEC dbo.usp_probar 'CHECK: entrada sin documento de referencia',
     N'INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante) VALUES (''MOV-X'', ''E'', 1, 1, 1, 2, 5)';
EXEC dbo.usp_probar 'CHECK: conteo cíclico sin familia',
     N'INSERT INTO INVENTARIO_FISICO (folio, tipo_conteo, id_usuario) VALUES (''INV-X'', ''C'', 1)';
EXEC dbo.usp_probar 'CHECK: acción de bitácora no válida',
     N'INSERT INTO BITACORA_AUDITORIA (id_usuario, accion, modulo) VALUES (1, ''BORRAR'', ''ALMACEN'')';
EXEC dbo.usp_probar 'FK: borrar un producto que tiene movimientos',
     N'DELETE FROM PRODUCTO WHERE id_producto = 1';
GO

/* Consultas de comprobación de las vistas */
SELECT * FROM vw_KARDEX ORDER BY codigo_interno, fecha;
SELECT * FROM vw_PRODUCTOS_BAJO_REORDEN;
SELECT * FROM vw_VALOR_INVENTARIO;
SELECT folio, estado, subtotal, iva, total FROM ORDEN_COMPRA;
GO
DROP PROCEDURE dbo.usp_probar;
GO
