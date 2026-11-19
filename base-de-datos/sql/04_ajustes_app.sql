/* =====================================================================
   SIA-NP — Script 04: ajustes para la aplicación funcional
   Ejecutar después de 01 y 02. No modifica los scripts ya entregados.

   1. CLIENTE y NOTA_SALIDA (CU4, RF8): una nota de salida con varias partidas.
   2. DETALLE_ORDEN.cantidad_no_conforme (CU6 alterno 6a), DETALLE_CONTEO.contado (CU3)
      y DEVOLUCION_CLIENTE (CU4).
   3. FOLIO_CONSECUTIVO + sp_siguiente_folio: folios OC-2026-0001, etc.
   4. sp_registrar_movimiento (CU1): todo o nada (RNF2).
   5. sp_registrar_recepcion (CU6): recepción + entradas + estado de la OC.
   6. Contraseñas reales para la demostración (todas: sianp2026).
   ===================================================================== */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
USE SIA_NP;
GO

/* ---------- 1. Clientes y notas de salida ---------- */
CREATE TABLE CLIENTE (
    id_cliente      INT           IDENTITY(1,1) NOT NULL,
    nombre          VARCHAR(150)  NOT NULL,
    rfc             VARCHAR(13)   NULL,
    telefono        VARCHAR(15)   NULL,
    activo          BIT           NOT NULL CONSTRAINT DF_CLIENTE_activo DEFAULT (1),
    CONSTRAINT PK_CLIENTE      PRIMARY KEY (id_cliente),
    CONSTRAINT CK_CLIENTE_rfc  CHECK (rfc IS NULL OR LEN(rfc) IN (12,13))
);
GO

CREATE TABLE NOTA_SALIDA (
    id_nota_salida  INT           IDENTITY(1,1) NOT NULL,
    folio           VARCHAR(20)   NOT NULL,
    id_cliente      INT           NULL,
    id_usuario      INT           NOT NULL,
    fecha           DATETIME2(0)  NOT NULL CONSTRAINT DF_NOTA_fecha DEFAULT (SYSDATETIME()),
    observaciones   VARCHAR(250)  NULL,
    CONSTRAINT PK_NOTA_SALIDA      PRIMARY KEY (id_nota_salida),
    CONSTRAINT UQ_NOTA_folio       UNIQUE (folio),
    CONSTRAINT FK_NOTA_CLIENTE     FOREIGN KEY (id_cliente) REFERENCES CLIENTE (id_cliente),
    CONSTRAINT FK_NOTA_USUARIO     FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario)
);
GO

ALTER TABLE MOVIMIENTO ADD id_nota_salida INT NULL
    CONSTRAINT FK_MOV_NOTA FOREIGN KEY REFERENCES NOTA_SALIDA (id_nota_salida);
GO
-- Solo una Salida puede pertenecer a una nota de salida
ALTER TABLE MOVIMIENTO ADD CONSTRAINT CK_MOV_nota CHECK (id_nota_salida IS NULL OR tipo = 'S');
GO

/* ---------- 2. Mercancía no conforme en la recepción ---------- */
ALTER TABLE DETALLE_ORDEN ADD cantidad_no_conforme DECIMAL(10,2) NOT NULL
    CONSTRAINT DF_DETORD_no_conforme DEFAULT (0.0);
GO
ALTER TABLE DETALLE_ORDEN ADD CONSTRAINT CK_DETORD_no_conforme CHECK (cantidad_no_conforme >= 0);
GO

/* ---------- 2b. Inventario físico (CU3): distinguir "contado en 0" de "pendiente" (alterno 4a) ---------- */
ALTER TABLE DETALLE_CONTEO ADD contado BIT NOT NULL CONSTRAINT DF_DETCON_contado DEFAULT (0);
GO
-- El conteo de prueba del script 02 ya estaba capturado
UPDATE DETALLE_CONTEO SET contado = 1;
GO

/* ---------- 2c. Devoluciones de cliente (CU4) ----------
   Una fila por producto devuelto. Si la mercancía está dañada (alterno 7a) no genera
   movimiento ni suma a la existencia (id_movimiento queda NULL). Sin nota original
   (alterno 3a) se exige quién autorizó. */
CREATE TABLE DEVOLUCION_CLIENTE (
    id_devolucion     INT            IDENTITY(1,1) NOT NULL,
    folio             VARCHAR(20)    NOT NULL,
    id_cliente        INT            NOT NULL,
    id_nota_salida    INT            NULL,
    id_producto       INT            NOT NULL,
    cantidad          DECIMAL(10,2)  NOT NULL,
    estado_mercancia  VARCHAR(7)     NOT NULL,
    motivo            VARCHAR(200)   NOT NULL,
    autorizado_por    INT            NULL,
    id_movimiento     INT            NULL,
    id_usuario        INT            NOT NULL,
    fecha             DATETIME2(0)   NOT NULL CONSTRAINT DF_DEV_fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_DEVOLUCION_CLIENTE PRIMARY KEY (id_devolucion),
    CONSTRAINT FK_DEV_CLIENTE     FOREIGN KEY (id_cliente)     REFERENCES CLIENTE (id_cliente),
    CONSTRAINT FK_DEV_NOTA        FOREIGN KEY (id_nota_salida) REFERENCES NOTA_SALIDA (id_nota_salida),
    CONSTRAINT FK_DEV_PRODUCTO    FOREIGN KEY (id_producto)    REFERENCES PRODUCTO (id_producto),
    CONSTRAINT FK_DEV_AUTORIZA    FOREIGN KEY (autorizado_por) REFERENCES USUARIO (id_usuario),
    CONSTRAINT FK_DEV_MOVIMIENTO  FOREIGN KEY (id_movimiento)  REFERENCES MOVIMIENTO (id_movimiento),
    CONSTRAINT FK_DEV_USUARIO     FOREIGN KEY (id_usuario)     REFERENCES USUARIO (id_usuario),
    CONSTRAINT CK_DEV_cantidad    CHECK (cantidad > 0),
    CONSTRAINT CK_DEV_estado      CHECK (estado_mercancia IN ('BUENA','DANADA')),
    -- Sin documento original debe registrarse quién autorizó (alterno 3a)
    CONSTRAINT CK_DEV_autoriza    CHECK (id_nota_salida IS NOT NULL OR autorizado_por IS NOT NULL),
    -- Solo la mercancía en buen estado entra al inventario (alterno 7a)
    CONSTRAINT CK_DEV_movimiento  CHECK (estado_mercancia = 'BUENA' OR id_movimiento IS NULL)
);
GO
CREATE INDEX IX_DEV_nota ON DEVOLUCION_CLIENTE (id_nota_salida, id_producto);
GO

/* ---------- 3. Folios consecutivos ---------- */
CREATE TABLE FOLIO_CONSECUTIVO (
    prefijo   VARCHAR(5)  NOT NULL,
    ultimo    INT         NOT NULL,
    CONSTRAINT PK_FOLIO_CONSECUTIVO PRIMARY KEY (prefijo)
);
GO
-- Continúa la numeración de los datos de prueba (script 02)
INSERT INTO FOLIO_CONSECUTIVO (prefijo, ultimo) VALUES
 ('OC', 2), ('MOV', 4), ('REC', 1), ('INV', 1), ('NS', 0), ('DEV', 0);
GO

CREATE PROCEDURE sp_siguiente_folio
    @prefijo VARCHAR(5),
    @folio   VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT;
    UPDATE FOLIO_CONSECUTIVO WITH (UPDLOCK, ROWLOCK)
       SET @n = ultimo = ultimo + 1
     WHERE prefijo = @prefijo;
    IF @n IS NULL
        THROW 50000, 'Prefijo de folio desconocido.', 1;
    SET @folio = @prefijo + '-' + CAST(YEAR(GETDATE()) AS CHAR(4)) + '-' + RIGHT('0000' + CAST(@n AS VARCHAR(10)), 4);
END
GO

/* ---------- 4. Registrar movimiento (CU1) ----------
   Tipos: E entrada, S salida, A ajuste (cantidad con signo), D devolución.
   Errores de negocio con THROW 5xxxx para que la aplicación muestre el mensaje. */
CREATE PROCEDURE sp_registrar_movimiento
    @tipo            CHAR(1),
    @id_producto     INT,
    @id_ubicacion    INT,
    @id_usuario      INT,
    @cantidad        DECIMAL(10,2),
    @documento_ref   VARCHAR(50)  = NULL,
    @motivo          VARCHAR(200) = NULL,
    @id_nota_salida  INT = NULL,
    @id_recepcion    INT = NULL,
    @id_conteo       INT = NULL,
    @folio           VARCHAR(20)   OUTPUT,
    @saldo           DECIMAL(10,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @propia BIT = CASE WHEN @@TRANCOUNT = 0 THEN 1 ELSE 0 END;
    DECLARE @existencia DECIMAL(10,2), @delta DECIMAL(10,2), @msg NVARCHAR(200);

    IF @propia = 1 BEGIN TRANSACTION;

    -- Bloquea la fila del producto: dos salidas simultáneas no pueden dejar existencia negativa
    SELECT @existencia = existencia
      FROM PRODUCTO WITH (UPDLOCK, ROWLOCK)
     WHERE id_producto = @id_producto AND activo = 1;

    IF @existencia IS NULL
    BEGIN
        IF @propia = 1 ROLLBACK;
        THROW 50001, 'El producto no existe en el catálogo o está inactivo.', 1;
    END

    IF @tipo NOT IN ('E','S','A','D')
    BEGIN
        IF @propia = 1 ROLLBACK;
        THROW 50002, 'Tipo de movimiento no válido.', 1;
    END

    IF (@tipo <> 'A' AND ISNULL(@cantidad, 0) <= 0) OR (@tipo = 'A' AND ISNULL(@cantidad, 0) = 0)
    BEGIN
        IF @propia = 1 ROLLBACK;
        THROW 50004, 'La cantidad debe ser mayor a 0.', 1;
    END

    SET @delta = CASE @tipo WHEN 'S' THEN -@cantidad ELSE @cantidad END;

    IF @existencia + @delta < 0
    BEGIN
        IF @propia = 1 ROLLBACK;
        SET @msg = CONCAT(CASE @tipo WHEN 'A' THEN N'El ajuste (' ELSE N'La salida (' END,
                          ABS(@cantidad), N') excede la existencia actual (', @existencia, N'). No se guardó el movimiento.');
        THROW 50003, @msg, 1;
    END

    SET @saldo = @existencia + @delta;
    EXEC sp_siguiente_folio 'MOV', @folio OUTPUT;

    INSERT INTO MOVIMIENTO (folio, tipo, id_producto, id_ubicacion, id_usuario, cantidad, saldo_resultante,
                            documento_ref, id_recepcion, id_conteo, motivo, id_nota_salida)
    VALUES (@folio, @tipo, @id_producto, @id_ubicacion, @id_usuario, @cantidad, @saldo,
            @documento_ref, @id_recepcion, @id_conteo, @motivo, @id_nota_salida);

    UPDATE PRODUCTO SET existencia = @saldo WHERE id_producto = @id_producto;

    INSERT INTO BITACORA_AUDITORIA (id_usuario, accion, modulo, tabla_afectada, id_afectado, detalle)
    VALUES (@id_usuario, 'MOVIMIENTO', 'ALMACEN', 'MOVIMIENTO', @folio,
            CONCAT(CASE @tipo WHEN 'E' THEN 'Entrada' WHEN 'S' THEN 'Salida'
                              WHEN 'A' THEN 'Ajuste' ELSE 'Devolución' END,
                   ' de ', @cantidad, ' (producto ', @id_producto, '), saldo ', @saldo,
                   ISNULL(', doc. ' + @documento_ref, '')));

    IF @propia = 1 COMMIT;
END
GO

/* ---------- 5. Registrar recepción contra OC (CU6) ----------
   @partidas: JSON [{"id_producto":1,"cantidad":10,"no_conforme":0,"id_ubicacion":1}, ...]
   - cantidad: lo que entra al inventario.
   - no_conforme: mercancía con defectos (alterno 6a), se anota pero no entra.
   - Si lo recibido excede lo solicitado se rechaza, salvo @autorizar_excedente = 1 (alterno 7a). */
CREATE PROCEDURE sp_registrar_recepcion
    @id_oc               INT,
    @id_usuario          INT,
    @numero_factura      VARCHAR(40),
    @observaciones       VARCHAR(250) = NULL,
    @partidas            NVARCHAR(MAX),
    @autorizar_excedente BIT = 0,
    @folio               VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @estado VARCHAR(16), @msg NVARCHAR(300), @id_recepcion INT;

    DECLARE @p TABLE (id_producto INT PRIMARY KEY, cantidad DECIMAL(10,2), no_conforme DECIMAL(10,2), id_ubicacion INT);
    INSERT INTO @p (id_producto, cantidad, no_conforme, id_ubicacion)
    SELECT id_producto, ISNULL(cantidad, 0), ISNULL(no_conforme, 0), id_ubicacion
      FROM OPENJSON(@partidas)
      WITH (id_producto INT, cantidad DECIMAL(10,2), no_conforme DECIMAL(10,2), id_ubicacion INT);

    BEGIN TRANSACTION;

    SELECT @estado = estado FROM ORDEN_COMPRA WITH (UPDLOCK, ROWLOCK) WHERE id_oc = @id_oc;
    IF @estado IS NULL
    BEGIN ROLLBACK; THROW 50010, 'La orden de compra no existe.', 1; END
    IF @estado NOT IN ('EMITIDA','RECIBIDA_PARCIAL')
    BEGIN
        ROLLBACK;
        SET @msg = CONCAT(N'La orden está en estado ', @estado, N'; solo se recibe mercancía de órdenes emitidas o parcialmente recibidas.');
        THROW 50011, @msg, 1;
    END
    IF NOT EXISTS (SELECT 1 FROM @p WHERE cantidad > 0 OR no_conforme > 0)
    BEGIN ROLLBACK; THROW 50012, 'Capture al menos una cantidad recibida.', 1; END
    IF EXISTS (SELECT 1 FROM @p WHERE cantidad < 0 OR no_conforme < 0)
    BEGIN ROLLBACK; THROW 50013, 'Las cantidades no pueden ser negativas.', 1; END
    IF EXISTS (SELECT 1 FROM @p p WHERE NOT EXISTS
                 (SELECT 1 FROM DETALLE_ORDEN d WHERE d.id_oc = @id_oc AND d.id_producto = p.id_producto))
    BEGIN ROLLBACK; THROW 50014, 'Hay productos que no pertenecen a la orden.', 1; END
    IF EXISTS (SELECT 1 FROM @p WHERE cantidad > 0 AND id_ubicacion IS NULL)
    BEGIN ROLLBACK; THROW 50015, 'Indique la ubicación de cada producto recibido.', 1; END

    IF @autorizar_excedente = 0 AND EXISTS (
        SELECT 1 FROM @p p JOIN DETALLE_ORDEN d ON d.id_oc = @id_oc AND d.id_producto = p.id_producto
         WHERE d.cantidad_recibida + p.cantidad > d.cantidad_solicitada)
    BEGIN
        ROLLBACK;
        THROW 50016, 'La cantidad recibida excede la solicitada. Se requiere autorización para continuar.', 1;
    END

    EXEC sp_siguiente_folio 'REC', @folio OUTPUT;
    INSERT INTO RECEPCION (folio, id_oc, id_usuario, numero_factura, tipo_recepcion, observaciones)
    VALUES (@folio, @id_oc, @id_usuario, @numero_factura, 'P', @observaciones);
    SET @id_recepcion = SCOPE_IDENTITY();

    UPDATE d SET d.cantidad_recibida    = d.cantidad_recibida + p.cantidad,
                 d.cantidad_no_conforme = d.cantidad_no_conforme + p.no_conforme
      FROM DETALLE_ORDEN d JOIN @p p ON d.id_oc = @id_oc AND d.id_producto = p.id_producto;

    -- Una entrada al inventario por cada producto recibido conforme
    DECLARE @prod INT, @cant DECIMAL(10,2), @ubic INT, @folio_mov VARCHAR(20), @saldo DECIMAL(10,2),
            @doc VARCHAR(50) = LEFT('Factura ' + @numero_factura, 50);
    DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT id_producto, cantidad, id_ubicacion FROM @p WHERE cantidad > 0;
    OPEN c;
    FETCH NEXT FROM c INTO @prod, @cant, @ubic;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC sp_registrar_movimiento @tipo = 'E', @id_producto = @prod, @id_ubicacion = @ubic,
             @id_usuario = @id_usuario, @cantidad = @cant, @documento_ref = @doc,
             @id_recepcion = @id_recepcion, @folio = @folio_mov OUTPUT, @saldo = @saldo OUTPUT;
        FETCH NEXT FROM c INTO @prod, @cant, @ubic;
    END
    CLOSE c; DEALLOCATE c;

    -- Recibida si ya llegó todo lo solicitado; si no, Parcialmente recibida (diagrama de estados)
    IF NOT EXISTS (SELECT 1 FROM DETALLE_ORDEN WHERE id_oc = @id_oc AND cantidad_recibida < cantidad_solicitada)
    BEGIN
        UPDATE ORDEN_COMPRA SET estado = 'RECIBIDA_TOTAL' WHERE id_oc = @id_oc;
        UPDATE RECEPCION SET tipo_recepcion = 'T' WHERE id_recepcion = @id_recepcion;
    END
    ELSE
        UPDATE ORDEN_COMPRA SET estado = 'RECIBIDA_PARCIAL' WHERE id_oc = @id_oc;

    INSERT INTO BITACORA_AUDITORIA (id_usuario, accion, modulo, tabla_afectada, id_afectado, detalle)
    SELECT @id_usuario, 'ALTA', 'COMPRAS', 'RECEPCION', @folio,
           CONCAT('Recepción de ', o.folio, ' con factura ', @numero_factura, '; orden queda ', o.estado)
      FROM ORDEN_COMPRA o WHERE o.id_oc = @id_oc;

    COMMIT;
END
GO

/* ---------- 6. Datos para la demostración ---------- */
-- Contraseña de todos los usuarios de prueba: sianp2026 (bcrypt)
UPDATE USUARIO SET password_hash = '$2b$10$xgPYOfNPAI4yn/JfrechM.rpuLafC8gXg3x4MVNdvRZHLA/YgFJEq';
GO

INSERT INTO CLIENTE (nombre, rfc, telefono) VALUES
 ('Público en general',                   NULL,           NULL),
 ('Talleres Industriales del Yaqui',      'TIY050505AA1', '6441234567'),
 ('Empacadora de Mariscos de Guaymas',    'EMG100101BB2', '6229876543'),
 ('Mantenimiento Minero de Sonora',       'MMS120312CC3', '6622345678');
GO
