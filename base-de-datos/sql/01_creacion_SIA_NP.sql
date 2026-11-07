/* =====================================================================
   SIA-NP  Sistema de Inventario y Almacén — Neumática del Pacífico
   Taller de Base de Datos — Parte I
   Script 01: creación de la base de datos y sus tablas
   SGBD: Microsoft SQL Server 2019 / 2022 (T-SQL)
   ===================================================================== */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE master;
GO

IF DB_ID('SIA_NP') IS NOT NULL
BEGIN
    ALTER DATABASE SIA_NP SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SIA_NP;
END
GO

CREATE DATABASE SIA_NP COLLATE Modern_Spanish_CI_AS;
GO

USE SIA_NP;
GO

/* =====================================================================
   CATÁLOGO 3 — USUARIOS Y SEGURIDAD
   Responsable: Peñuñuri Fernández Sara Alejandra
   ===================================================================== */

CREATE TABLE ROL (
    id_rol          TINYINT       IDENTITY(1,1) NOT NULL,
    clave           CHAR(1)       NOT NULL,
    nombre          VARCHAR(30)   NOT NULL,
    descripcion     VARCHAR(150)  NULL,
    CONSTRAINT PK_ROL         PRIMARY KEY (id_rol),
    CONSTRAINT UQ_ROL_clave   UNIQUE (clave),
    CONSTRAINT UQ_ROL_nombre  UNIQUE (nombre),
    CONSTRAINT CK_ROL_clave   CHECK (clave IN ('E','A','C','D','X'))
);
GO

CREATE TABLE USUARIO (
    id_usuario         INT           IDENTITY(1,1) NOT NULL,
    nombre_usuario     VARCHAR(30)   NOT NULL,
    password_hash      VARCHAR(255)  NOT NULL,
    nombre_completo    VARCHAR(100)  NOT NULL,
    correo             VARCHAR(100)  NULL,
    id_rol             TINYINT       NOT NULL,
    activo             BIT           NOT NULL CONSTRAINT DF_USUARIO_activo DEFAULT (1),
    intentos_fallidos  TINYINT       NOT NULL CONSTRAINT DF_USUARIO_intentos DEFAULT (0),
    fecha_alta         DATE          NOT NULL CONSTRAINT DF_USUARIO_fecha_alta DEFAULT (CAST(GETDATE() AS DATE)),
    ultimo_acceso      DATETIME2(0)  NULL,
    CONSTRAINT PK_USUARIO                 PRIMARY KEY (id_usuario),
    CONSTRAINT UQ_USUARIO_nombre_usuario  UNIQUE (nombre_usuario),
    CONSTRAINT FK_USUARIO_ROL             FOREIGN KEY (id_rol) REFERENCES ROL (id_rol),
    CONSTRAINT CK_USUARIO_intentos        CHECK (intentos_fallidos BETWEEN 0 AND 3),
    CONSTRAINT CK_USUARIO_correo          CHECK (correo IS NULL OR correo LIKE '%_@_%._%'),
    CONSTRAINT CK_USUARIO_nombre_usuario  CHECK (LEN(nombre_usuario) >= 4)
);
GO

CREATE TABLE BITACORA_AUDITORIA (
    id_registro     BIGINT        IDENTITY(1,1) NOT NULL,
    id_usuario      INT           NOT NULL,
    fecha_hora      DATETIME2(0)  NOT NULL CONSTRAINT DF_BITACORA_fecha_hora DEFAULT (SYSDATETIME()),
    accion          VARCHAR(15)   NOT NULL,
    modulo          VARCHAR(15)   NOT NULL,
    tabla_afectada  VARCHAR(40)   NULL,
    id_afectado     VARCHAR(30)   NULL,
    detalle         VARCHAR(300)  NULL,
    CONSTRAINT PK_BITACORA_AUDITORIA   PRIMARY KEY (id_registro),
    CONSTRAINT FK_BITACORA_USUARIO     FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario),
    CONSTRAINT CK_BITACORA_accion      CHECK (accion IN ('ALTA','MODIFICACION','BAJA','MOVIMIENTO','ACCESO','CIERRE_SESION')),
    CONSTRAINT CK_BITACORA_modulo      CHECK (modulo IN ('SEGURIDAD','CATALOGOS','ALMACEN','COMPRAS','DIRECCION'))
);
GO

/* =====================================================================
   CATÁLOGO 1 — PRODUCTOS Y UBICACIONES
   Responsable: Hernández Castro José Martín
   ===================================================================== */

CREATE TABLE FAMILIA (
    id_familia      SMALLINT      IDENTITY(1,1) NOT NULL,
    nombre          VARCHAR(50)   NOT NULL,
    descripcion     VARCHAR(150)  NULL,
    CONSTRAINT PK_FAMILIA         PRIMARY KEY (id_familia),
    CONSTRAINT UQ_FAMILIA_nombre  UNIQUE (nombre)
);
GO

CREATE TABLE UBICACION (
    id_ubicacion    INT           IDENTITY(1,1) NOT NULL,
    clave           VARCHAR(10)   NOT NULL,
    pasillo         CHAR(1)       NOT NULL,
    anaquel         TINYINT       NULL,
    nivel           TINYINT       NULL,
    descripcion     VARCHAR(100)  NULL,
    disponible      BIT           NOT NULL CONSTRAINT DF_UBICACION_disponible DEFAULT (1),
    CONSTRAINT PK_UBICACION         PRIMARY KEY (id_ubicacion),
    CONSTRAINT UQ_UBICACION_clave   UNIQUE (clave),
    CONSTRAINT CK_UBICACION_pasillo CHECK (pasillo IN ('A','B','C','P')),   -- P = patio techado
    CONSTRAINT CK_UBICACION_anaquel CHECK (anaquel BETWEEN 1 AND 8),
    CONSTRAINT CK_UBICACION_nivel   CHECK (nivel BETWEEN 1 AND 3),
    -- En pasillos A, B y C se exige anaquel y nivel; el patio no los tiene
    CONSTRAINT CK_UBICACION_estructura CHECK (
        (pasillo IN ('A','B','C') AND anaquel IS NOT NULL AND nivel IS NOT NULL)
     OR (pasillo = 'P' AND anaquel IS NULL AND nivel IS NULL))
);
GO

CREATE TABLE PRODUCTO (
    id_producto     INT            IDENTITY(1,1) NOT NULL,
    codigo_interno  VARCHAR(20)    NOT NULL,
    codigo_barras   VARCHAR(30)    NULL,
    descripcion     VARCHAR(150)   NOT NULL,
    id_familia      SMALLINT       NOT NULL,
    unidad_medida   VARCHAR(5)     NOT NULL CONSTRAINT DF_PRODUCTO_unidad DEFAULT ('PZA'),
    minimo          DECIMAL(10,2)  NOT NULL CONSTRAINT DF_PRODUCTO_minimo DEFAULT (0),
    maximo          DECIMAL(10,2)  NOT NULL CONSTRAINT DF_PRODUCTO_maximo DEFAULT (0),
    punto_reorden   DECIMAL(10,2)  NOT NULL CONSTRAINT DF_PRODUCTO_reorden DEFAULT (0),
    existencia      DECIMAL(10,2)  NOT NULL CONSTRAINT DF_PRODUCTO_existencia DEFAULT (0.0),
    costo_unitario  DECIMAL(12,2)  NOT NULL CONSTRAINT DF_PRODUCTO_costo DEFAULT (0),
    precio_venta    DECIMAL(12,2)  NOT NULL CONSTRAINT DF_PRODUCTO_precio DEFAULT (0),
    imagen_url      VARCHAR(255)   NULL,
    id_ubicacion    INT            NULL,
    activo          BIT            NOT NULL CONSTRAINT DF_PRODUCTO_activo DEFAULT (1),
    fecha_alta      DATE           NOT NULL CONSTRAINT DF_PRODUCTO_fecha_alta DEFAULT (CAST(GETDATE() AS DATE)),
    CONSTRAINT PK_PRODUCTO                 PRIMARY KEY (id_producto),
    CONSTRAINT UQ_PRODUCTO_codigo_interno  UNIQUE (codigo_interno),
    CONSTRAINT FK_PRODUCTO_FAMILIA         FOREIGN KEY (id_familia)   REFERENCES FAMILIA (id_familia),
    CONSTRAINT FK_PRODUCTO_UBICACION       FOREIGN KEY (id_ubicacion) REFERENCES UBICACION (id_ubicacion)
                                           ON DELETE SET NULL,
    CONSTRAINT CK_PRODUCTO_unidad          CHECK (unidad_medida IN ('PZA','M','KG','LT','JGO','ROLLO')),
    CONSTRAINT CK_PRODUCTO_minimo          CHECK (minimo >= 0),
    CONSTRAINT CK_PRODUCTO_maximo          CHECK (maximo >= minimo),
    CONSTRAINT CK_PRODUCTO_reorden         CHECK (punto_reorden >= minimo AND punto_reorden <= maximo),
    CONSTRAINT CK_PRODUCTO_existencia      CHECK (existencia >= 0),
    CONSTRAINT CK_PRODUCTO_costo           CHECK (costo_unitario >= 0),
    CONSTRAINT CK_PRODUCTO_precio          CHECK (precio_venta >= 0)
);
GO

-- El código de barras es opcional, pero si existe no puede repetirse
CREATE UNIQUE INDEX UX_PRODUCTO_codigo_barras
    ON PRODUCTO (codigo_barras) WHERE codigo_barras IS NOT NULL;
GO

/* =====================================================================
   CATÁLOGO 2 — PROVEEDORES Y COMPRAS
   Responsable: Moreno Ramos Adolfo
   ===================================================================== */

CREATE TABLE PROVEEDOR (
    id_proveedor    INT           IDENTITY(1,1) NOT NULL,
    rfc             VARCHAR(13)   NOT NULL,
    razon_social    VARCHAR(150)  NOT NULL,
    clasificacion   VARCHAR(11)   NOT NULL CONSTRAINT DF_PROVEEDOR_clasificacion DEFAULT ('LOCAL'),
    nombre_contacto VARCHAR(100)  NULL,
    telefono        VARCHAR(15)   NULL,
    correo          VARCHAR(100)  NULL,
    lead_time_dias  SMALLINT      NOT NULL CONSTRAINT DF_PROVEEDOR_lead_time DEFAULT (7),
    activo          BIT           NOT NULL CONSTRAINT DF_PROVEEDOR_activo DEFAULT (1),
    CONSTRAINT PK_PROVEEDOR               PRIMARY KEY (id_proveedor),
    CONSTRAINT UQ_PROVEEDOR_rfc           UNIQUE (rfc),
    CONSTRAINT CK_PROVEEDOR_rfc           CHECK (LEN(rfc) IN (12,13)),
    CONSTRAINT CK_PROVEEDOR_clasificacion CHECK (clasificacion IN ('LOCAL','NACIONAL','IMPORTACION')),
    CONSTRAINT CK_PROVEEDOR_correo        CHECK (correo IS NULL OR correo LIKE '%_@_%._%'),
    CONSTRAINT CK_PROVEEDOR_lead_time     CHECK (lead_time_dias BETWEEN 0 AND 180)
);
GO

-- Relación "Proveedor surte Producto" (muchos a muchos) con su precio de compra
CREATE TABLE PRODUCTO_PROVEEDOR (
    id_producto          INT            NOT NULL,
    id_proveedor         INT            NOT NULL,
    codigo_proveedor     VARCHAR(30)    NULL,
    precio_compra        DECIMAL(12,2)  NOT NULL,
    moneda               CHAR(3)        NOT NULL CONSTRAINT DF_PRODPROV_moneda DEFAULT ('MXN'),
    fecha_actualizacion  DATE           NOT NULL CONSTRAINT DF_PRODPROV_fecha DEFAULT (CAST(GETDATE() AS DATE)),
    CONSTRAINT PK_PRODUCTO_PROVEEDOR  PRIMARY KEY (id_producto, id_proveedor),
    CONSTRAINT FK_PRODPROV_PRODUCTO   FOREIGN KEY (id_producto)  REFERENCES PRODUCTO (id_producto)
                                      ON DELETE CASCADE,
    CONSTRAINT FK_PRODPROV_PROVEEDOR  FOREIGN KEY (id_proveedor) REFERENCES PROVEEDOR (id_proveedor)
                                      ON DELETE CASCADE,
    CONSTRAINT CK_PRODPROV_precio     CHECK (precio_compra > 0),
    CONSTRAINT CK_PRODPROV_moneda     CHECK (moneda IN ('MXN','USD'))
);
GO

CREATE TABLE ORDEN_COMPRA (
    id_oc                   INT            IDENTITY(1,1) NOT NULL,
    folio                   VARCHAR(20)    NOT NULL,
    id_proveedor            INT            NOT NULL,
    id_usuario              INT            NOT NULL,
    fecha_emision           DATE           NOT NULL CONSTRAINT DF_OC_fecha_emision DEFAULT (CAST(GETDATE() AS DATE)),
    fecha_entrega_estimada  DATE           NULL,
    estado                  VARCHAR(16)    NOT NULL CONSTRAINT DF_OC_estado DEFAULT ('PENDIENTE'),
    subtotal                DECIMAL(12,2)  NOT NULL CONSTRAINT DF_OC_subtotal DEFAULT (0),
    iva                     AS CAST(ROUND(subtotal * 0.16, 2) AS DECIMAL(12,2)) PERSISTED,
    total                   AS CAST(subtotal + ROUND(subtotal * 0.16, 2) AS DECIMAL(12,2)) PERSISTED,
    observaciones           VARCHAR(250)   NULL,
    CONSTRAINT PK_ORDEN_COMPRA     PRIMARY KEY (id_oc),
    CONSTRAINT UQ_OC_folio         UNIQUE (folio),
    CONSTRAINT FK_OC_PROVEEDOR     FOREIGN KEY (id_proveedor) REFERENCES PROVEEDOR (id_proveedor),
    CONSTRAINT FK_OC_USUARIO       FOREIGN KEY (id_usuario)   REFERENCES USUARIO (id_usuario),
    CONSTRAINT CK_OC_estado        CHECK (estado IN ('PENDIENTE','EMITIDA','RECIBIDA_PARCIAL',
                                                     'RECIBIDA_TOTAL','CERRADA','CANCELADA')),
    CONSTRAINT CK_OC_subtotal      CHECK (subtotal >= 0),
    CONSTRAINT CK_OC_fecha_entrega CHECK (fecha_entrega_estimada IS NULL
                                          OR fecha_entrega_estimada >= fecha_emision)
);
GO

-- Clase de asociación DetalleOrden: resuelve OrdenDeCompra *—* Producto
CREATE TABLE DETALLE_ORDEN (
    id_oc                INT            NOT NULL,
    id_producto          INT            NOT NULL,
    cantidad_solicitada  DECIMAL(10,2)  NOT NULL,
    cantidad_recibida    DECIMAL(10,2)  NOT NULL CONSTRAINT DF_DETORD_recibida DEFAULT (0.0),
    costo_unitario       DECIMAL(12,2)  NOT NULL,
    importe              AS CAST(cantidad_solicitada * costo_unitario AS DECIMAL(14,2)) PERSISTED,
    CONSTRAINT PK_DETALLE_ORDEN       PRIMARY KEY (id_oc, id_producto),
    CONSTRAINT FK_DETORD_OC           FOREIGN KEY (id_oc)       REFERENCES ORDEN_COMPRA (id_oc)
                                      ON DELETE CASCADE,
    CONSTRAINT FK_DETORD_PRODUCTO     FOREIGN KEY (id_producto) REFERENCES PRODUCTO (id_producto),
    CONSTRAINT CK_DETORD_solicitada   CHECK (cantidad_solicitada > 0),
    CONSTRAINT CK_DETORD_recibida     CHECK (cantidad_recibida >= 0),
    CONSTRAINT CK_DETORD_costo        CHECK (costo_unitario >= 0)
);
GO

/* =====================================================================
   CATÁLOGO 4 — MOVIMIENTOS DE ALMACÉN
   Responsable: Rivera Torres Edgardo
   ===================================================================== */

CREATE TABLE RECEPCION (
    id_recepcion     INT           IDENTITY(1,1) NOT NULL,
    folio            VARCHAR(20)   NOT NULL,
    id_oc            INT           NOT NULL,
    id_usuario       INT           NOT NULL,
    fecha_recepcion  DATETIME2(0)  NOT NULL CONSTRAINT DF_RECEPCION_fecha DEFAULT (SYSDATETIME()),
    numero_factura   VARCHAR(40)   NOT NULL,
    tipo_recepcion   CHAR(1)       NOT NULL CONSTRAINT DF_RECEPCION_tipo DEFAULT ('T'),
    observaciones    VARCHAR(250)  NULL,
    CONSTRAINT PK_RECEPCION          PRIMARY KEY (id_recepcion),
    CONSTRAINT UQ_RECEPCION_folio    UNIQUE (folio),
    CONSTRAINT FK_RECEPCION_OC       FOREIGN KEY (id_oc)      REFERENCES ORDEN_COMPRA (id_oc),
    CONSTRAINT FK_RECEPCION_USUARIO  FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario),
    CONSTRAINT CK_RECEPCION_tipo     CHECK (tipo_recepcion IN ('T','P'))     -- Total / Parcial
);
GO

CREATE TABLE INVENTARIO_FISICO (
    id_conteo       INT           IDENTITY(1,1) NOT NULL,
    folio           VARCHAR(20)   NOT NULL,
    tipo_conteo     CHAR(1)       NOT NULL,
    id_familia      SMALLINT      NULL,
    id_usuario      INT           NOT NULL,
    fecha           DATE          NOT NULL CONSTRAINT DF_INVFIS_fecha DEFAULT (CAST(GETDATE() AS DATE)),
    estado          VARCHAR(10)   NOT NULL CONSTRAINT DF_INVFIS_estado DEFAULT ('ABIERTO'),
    CONSTRAINT PK_INVENTARIO_FISICO  PRIMARY KEY (id_conteo),
    CONSTRAINT UQ_INVFIS_folio       UNIQUE (folio),
    CONSTRAINT FK_INVFIS_FAMILIA     FOREIGN KEY (id_familia) REFERENCES FAMILIA (id_familia),
    CONSTRAINT FK_INVFIS_USUARIO     FOREIGN KEY (id_usuario) REFERENCES USUARIO (id_usuario),
    CONSTRAINT CK_INVFIS_tipo        CHECK (tipo_conteo IN ('C','T')),   -- Cíclico / Total
    CONSTRAINT CK_INVFIS_estado      CHECK (estado IN ('ABIERTO','CAPTURADO','AJUSTADO','CANCELADO')),
    -- Un conteo cíclico se hace por familia; uno total abarca todo el almacén
    CONSTRAINT CK_INVFIS_familia     CHECK ((tipo_conteo = 'C' AND id_familia IS NOT NULL)
                                         OR (tipo_conteo = 'T' AND id_familia IS NULL))
);
GO

CREATE TABLE DETALLE_CONTEO (
    id_conteo           INT            NOT NULL,
    id_producto         INT            NOT NULL,
    id_ubicacion        INT            NOT NULL,
    existencia_sistema  DECIMAL(10,2)  NOT NULL,
    cantidad_contada    DECIMAL(10,2)  NOT NULL CONSTRAINT DF_DETCON_contada DEFAULT (0),
    diferencia          AS CAST(cantidad_contada - existencia_sistema AS DECIMAL(10,2)) PERSISTED,
    CONSTRAINT PK_DETALLE_CONTEO     PRIMARY KEY (id_conteo, id_producto),
    CONSTRAINT FK_DETCON_CONTEO      FOREIGN KEY (id_conteo)    REFERENCES INVENTARIO_FISICO (id_conteo)
                                     ON DELETE CASCADE,
    CONSTRAINT FK_DETCON_PRODUCTO    FOREIGN KEY (id_producto)  REFERENCES PRODUCTO (id_producto),
    CONSTRAINT FK_DETCON_UBICACION   FOREIGN KEY (id_ubicacion) REFERENCES UBICACION (id_ubicacion),
    CONSTRAINT CK_DETCON_sistema     CHECK (existencia_sistema >= 0),
    CONSTRAINT CK_DETCON_contada     CHECK (cantidad_contada >= 0)
);
GO

/* Movimiento y sus subclases (Entrada, Salida, Ajuste, Devolucion) se guardan
   en una sola tabla; la columna "tipo" indica la subclase.                   */
CREATE TABLE MOVIMIENTO (
    id_movimiento     INT            IDENTITY(1,1) NOT NULL,
    folio             VARCHAR(20)    NOT NULL,
    tipo              CHAR(1)        NOT NULL,
    fecha             DATETIME2(0)   NOT NULL CONSTRAINT DF_MOVIMIENTO_fecha DEFAULT (SYSDATETIME()),
    id_producto       INT            NOT NULL,
    id_ubicacion      INT            NOT NULL,
    id_usuario        INT            NOT NULL,
    cantidad          DECIMAL(10,2)  NOT NULL,
    saldo_resultante  DECIMAL(10,2)  NOT NULL,
    documento_ref     VARCHAR(50)    NULL,
    id_recepcion      INT            NULL,
    id_conteo         INT            NULL,
    motivo            VARCHAR(200)   NULL,
    CONSTRAINT PK_MOVIMIENTO           PRIMARY KEY (id_movimiento),
    CONSTRAINT UQ_MOVIMIENTO_folio     UNIQUE (folio),
    CONSTRAINT FK_MOV_PRODUCTO         FOREIGN KEY (id_producto)  REFERENCES PRODUCTO (id_producto),
    CONSTRAINT FK_MOV_UBICACION        FOREIGN KEY (id_ubicacion) REFERENCES UBICACION (id_ubicacion),
    CONSTRAINT FK_MOV_USUARIO          FOREIGN KEY (id_usuario)   REFERENCES USUARIO (id_usuario),
    CONSTRAINT FK_MOV_RECEPCION        FOREIGN KEY (id_recepcion) REFERENCES RECEPCION (id_recepcion),
    CONSTRAINT FK_MOV_CONTEO           FOREIGN KEY (id_conteo)    REFERENCES INVENTARIO_FISICO (id_conteo),
    CONSTRAINT CK_MOV_tipo             CHECK (tipo IN ('E','S','A','D')),
    -- Entradas, salidas y devoluciones son positivas; un ajuste puede ser + o -
    CONSTRAINT CK_MOV_cantidad         CHECK ((tipo = 'A' AND cantidad <> 0)
                                           OR (tipo IN ('E','S','D') AND cantidad > 0)),
    CONSTRAINT CK_MOV_saldo            CHECK (saldo_resultante >= 0),
    -- Solo una Entrada puede venir de una recepción y solo un Ajuste de un conteo
    CONSTRAINT CK_MOV_recepcion        CHECK (id_recepcion IS NULL OR tipo = 'E'),
    CONSTRAINT CK_MOV_conteo           CHECK (id_conteo IS NULL OR tipo = 'A'),
    -- Ajustes y devoluciones deben explicar su motivo
    CONSTRAINT CK_MOV_motivo           CHECK (tipo IN ('E','S') OR motivo IS NOT NULL),
    -- Entradas y salidas deben traer documento de referencia (factura, OC, vale)
    CONSTRAINT CK_MOV_documento        CHECK (tipo IN ('A','D') OR documento_ref IS NOT NULL)
);
GO

-- Índices para las consultas más frecuentes (kardex por producto y fecha)
CREATE INDEX IX_MOVIMIENTO_producto_fecha ON MOVIMIENTO (id_producto, fecha);
CREATE INDEX IX_BITACORA_usuario_fecha    ON BITACORA_AUDITORIA (id_usuario, fecha_hora);
GO

/* =====================================================================
   VISTAS — Kardex y Reporte se obtienen de las tablas anteriores
   ===================================================================== */

CREATE VIEW vw_KARDEX AS
SELECT  p.codigo_interno,
        p.descripcion,
        m.fecha,
        m.folio,
        m.tipo,
        CASE WHEN m.tipo IN ('E','D') OR (m.tipo = 'A' AND m.cantidad > 0)
             THEN ABS(m.cantidad) ELSE 0 END                         AS entrada,
        CASE WHEN m.tipo = 'S' OR (m.tipo = 'A' AND m.cantidad < 0)
             THEN ABS(m.cantidad) ELSE 0 END                         AS salida,
        m.saldo_resultante                                           AS saldo,
        m.documento_ref,
        u.nombre_usuario                                             AS usuario
FROM    MOVIMIENTO m
        JOIN PRODUCTO p ON p.id_producto = m.id_producto
        JOIN USUARIO  u ON u.id_usuario  = m.id_usuario;
GO

CREATE VIEW vw_PRODUCTOS_BAJO_REORDEN AS
SELECT  p.codigo_interno, p.descripcion, f.nombre AS familia,
        p.existencia, p.punto_reorden, p.maximo,
        p.maximo - p.existencia AS cantidad_sugerida
FROM    PRODUCTO p
        JOIN FAMILIA f ON f.id_familia = p.id_familia
WHERE   p.activo = 1 AND p.existencia <= p.punto_reorden;
GO

CREATE VIEW vw_VALOR_INVENTARIO AS
SELECT  f.nombre                              AS familia,
        COUNT(*)                              AS productos,
        SUM(p.existencia)                     AS unidades,
        SUM(p.existencia * p.costo_unitario)  AS valor_inventario
FROM    PRODUCTO p
        JOIN FAMILIA f ON f.id_familia = p.id_familia
WHERE   p.activo = 1
GROUP BY f.nombre;
GO
