# Convenciones de código de la app SIA-NP

Proyecto escolar (Fundamentos de Ingeniería de Software, TecNM/ITH): el código debe ser claro y sencillo, no de nivel empresarial. Nombres, comentarios y textos de la interfaz en **español**.

## Arranque

```
cd app
docker compose up -d          # SQL Server 2022 (en Windows: SQL Server Express + SSMS)
bash db/init-docker.sh        # crea la BD: scripts 01, 02, 04 y comprueba el 03
cp .env.example .env
npm run instalar
npm run dev                   # API en :3000, web en :5173
```

Usuarios de prueba (contraseña de todos: `sianp2026`): `lpablovich` (E Encargado de Almacén), `rmendoza` (A Auxiliar), `kdominguez` (C Compras), `pperez` (D Dirección), `admin` (X Administrador).

## Base de datos

- Esquema: `base-de-datos/sql/01_creacion_SIA_NP.sql` (14 tablas, vistas `vw_KARDEX`, `vw_PRODUCTOS_BAJO_REORDEN`, `vw_VALOR_INVENTARIO`), datos en `02`, ajustes de la app en `04_ajustes_app.sql` (CLIENTE, NOTA_SALIDA, MOVIMIENTO.id_nota_salida, DETALLE_ORDEN.cantidad_no_conforme, FOLIO_CONSECUTIVO, procedimientos).
- Procedimientos (en `04`):
  - `sp_siguiente_folio @prefijo, @folio OUTPUT` → `OC-2026-0003`, prefijos `OC`, `MOV`, `REC`, `INV`, `NS`.
  - `sp_registrar_movimiento` (tipo E/S/A/D, valida existencia, folio, actualiza PRODUCTO.existencia y bitácora). Si se llama dentro de una transacción de la app no abre la suya.
  - `sp_registrar_recepcion` (CU6, partidas en JSON, alternos 6a y 7a, cambia el estado de la OC).
- Errores de negocio de SQL: `THROW 5xxxx, 'mensaje'` → el servidor responde 400 con ese mensaje.
- Estados de ORDEN_COMPRA: `PENDIENTE` (borrador), `EMITIDA`, `RECIBIDA_PARCIAL`, `RECIBIDA_TOTAL`, `CERRADA`, `CANCELADA` (diagrama de estados, entregable 6). Cancelar solo desde PENDIENTE o EMITIDA; cerrar solo desde RECIBIDA_TOTAL.
- No cambies el esquema. Si de verdad hace falta, dilo en tu reporte en vez de alterarlo.

## Backend (`app/server/src`)

Capas del diagrama de clases (regla: la ruta nunca habla con la BD):

```
rutas/<modulo>.js         HTTP: lee req, llama al controlador, responde JSON
controladores/<x>.js      lógica del caso de uso (ControladorMovimientos, ControladorRecepcion…)
entidades/<x>.js          acceso a datos con SQL (Producto, Movimiento, OrdenDeCompra…)
```

- `db.js`: `consulta(sql, params, tx?)`, `procedimiento(nombre, entradas, salidas, tx?)`, `enTransaccion(async tx => …)`, `ErrorNegocio(mensaje, status)`, `sql` (tipos de mssql, p. ej. `sql.VarChar(20)` para salidas).
- `auth.js`: `requiereRol('E','A')`. La sesión ya se exige al montar `/api/<modulo>`; el usuario está en `req.session.usuario` = `{ id, usuario, nombre, rol, rolNombre }`.
- `entidades/bitacora.js`: `registrar({ idUsuario, accion, modulo, tabla, idAfectado, detalle }, tx?)`. Toda alta, modificación y baja debe registrarse (los movimientos ya se registran dentro del procedimiento).
- Express 5: los errores de funciones `async` llegan solos al manejador; no hace falta try/catch en las rutas. Lanza `ErrorNegocio` para validaciones.
- Parámetros siempre con `@nombre` (nunca concatenar texto del usuario en el SQL).
- PDFs con `pdfkit`, Excel con `exceljs` (ya instalados). Los PDF: fuente Helvetica, en negro, encabezado con "SIA-NP · Neumática del Pacífico", y `Content-Type: application/pdf` con `inline`.

## Frontend (`app/web/src`)

- Cada módulo vive en `paginas/<modulo>/` y su `modulo.jsx` exporta `{ grupo, menu, rutas }`. Reemplaza el `<Pendiente/>` por tu página. Puedes agregar rutas (p. ej. `/compras/ordenes/:id`) en tu `modulo.jsx`.
- Componentes en `componentes/ui.jsx`: `Pantalla` (con `id` = IE-00X o S-n y `pie` = descripción, como las maquetas), `Seccion`, `Campo` (etiqueta, `req`, `hint`, `error`), `Alerta` (ok/error/aviso/info), `Botones`, `fmt` (num, dinero, fecha, fechaHora).
- `api.js`: `api.get/post/put/del('/almacen/…')` lanza `Error` con el mensaje del servidor; `abrirDocumento('/compras/ordenes/3/pdf')` abre un PDF.
- Clases CSS útiles (`estilos.css`): `campos` (rejilla de 2 columnas), `campos tres`, `campo full`, `static` (dato de solo lectura), `opciones`/`op` (radios), `tabla-env` + `table.tabla` (con `num`, `vacio`), `etiqueta verde|ambar|roja|indigo`, `herramientas` (barra sobre listas), `kpis`/`kpi`, `btn btn-prim|btn-sec|btn-peligro|btn-chico`, `input`.
- Sigue la maqueta correspondiente en `entregables/09-interfaces/figuras/IE-00X.png` (campos, textos de ayuda, botones). Las salidas (reportes/impresos) están descritas en `scripts/docx/08_salidas.js` (S1–S10).
- Flujos de los casos de uso (pasos y alternos): `scripts/docx/NOTAS_01.md`. Respeta la numeración de los alternos en los mensajes cuando ayude (p. ej. "8a").
- Sin librerías nuevas de UI. React 19 + react-router-dom 7.

## Probar

- API: `cd app/server && PORT=<tu puerto> node --env-file=../.env src/index.js` y `curl` con cookie (`-c/-b`) tras `POST /api/sesion/login {"usuario":"…","password":"sianp2026"}`.
- Web: compilar sin pisar a otros: `cd app/web && npx vite build --outDir /tmp/<tu-carpeta>`; para ver pantallas: `API_PORT=<puerto> WEB_PORT=<otro> npx vite` y captura con `chromium --headless --screenshot=… --window-size=1400,1000 <url>` (para páginas con sesión usa Playwright, que está en `~/.cache/ms-playwright`, o prueba solo la API).
- No reinicies la BD (`init-docker.sh`) mientras otros trabajan: comparte datos con otros agentes.
