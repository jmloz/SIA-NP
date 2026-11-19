# SIA-NP — Sistema funcional

Sistema de Inventario y Almacén para Neumática del Pacífico. Proyecto de Fundamentos de Ingeniería de Software (TecNM / ITH, grupo S5A).

- **Base de datos:** SQL Server 2022 (la del Taller de BD, `base-de-datos/sql/`).
- **Servidor:** Node.js + Express + `mssql`.
- **Interfaz:** React + Vite, web responsiva (PC, tablet y teléfono), con el diseño de las maquetas del entregable 9.

## Arrancar en Linux (Docker)

Requisitos: Docker, Node.js 20 o más reciente.

```bash
cd app
docker compose up -d            # levanta SQL Server 2022 en localhost:1433
bash db/init-docker.sh          # crea la BD SIA_NP: scripts 01, 02 y 04, y comprueba el 03
cp .env.example .env
npm run instalar                # dependencias de la raíz, server y web
npm start                       # compila la interfaz y abre http://localhost:3000
```

Para desarrollar con recarga automática: `npm run dev` (interfaz en http://localhost:5173).

Para volver a los datos de ejemplo: `bash db/init-docker.sh` (borra y recrea la BD).

## Arrancar en Windows

1. Instalar SQL Server 2022 Express y SQL Server Management Studio (SSMS).
2. En SSMS, abrir y ejecutar (F5), en orden: `base-de-datos/sql/01_creacion_SIA_NP.sql`, `02_datos_prueba.sql` y `04_ajustes_app.sql`.
3. Habilitar la autenticación de SQL Server (modo mixto) y el protocolo TCP/IP en el puerto 1433 (SQL Server Configuration Manager), y poner contraseña al usuario `sa`.
4. Copiar `app/.env.example` a `app/.env` y escribir esa contraseña en `DB_PASSWORD`.
5. En una terminal dentro de `app/`: `npm run instalar` y `npm start`.

## Usuarios de prueba

Contraseña de todos: `sianp2026`

| Usuario | Rol | Puede |
|---|---|---|
| `lpablovich` | Encargado de Almacén | Movimientos, notas de salida, kardex, recepción, productos, ubicaciones, clientes, dashboard (resumen) |
| `rmendoza` | Auxiliar de Almacén | Movimientos, notas de salida, kardex, clientes |
| `kdominguez` | Encargada de Compras | Órdenes de compra, recepción, reorden, proveedores, dashboard (resumen) |
| `pperez` | Dirección General | Dashboard con detalle, kardex, bitácora |
| `admin` | Administrador | Usuarios, catálogos, bitácora |

Tres intentos fallidos bloquean la cuenta; la desbloquea el administrador en Catálogos → Usuarios.

## Qué cubre

| Caso de uso / requerimiento | Pantalla |
|---|---|
| CU8 Autenticar usuario (RF1) | Inicio de sesión (IE-001) |
| CU1 Registrar movimientos (RF3, RF9) | Almacén → Registrar movimiento (IE-002) |
| RF8 Nota de salida y orden de surtido | Almacén → Nota de salida (S1, S3 en PDF) |
| CU2 Consultar kardex (RF4) | Almacén → Existencias y kardex (S5, S6) |
| CU5 Generar orden de compra (RF12) | Compras → Órdenes de compra (IE-006, PDF S2) |
| CU6 Recibir mercancía contra OC (RF13) | Compras → Recibir mercancía (IE-007) |
| RF14 Sugerencias de reorden | Compras → Sugerencias de reorden (S7) |
| RF2, RF5, RF11 Catálogos | Catálogos → Productos, Ubicaciones, Proveedores, Clientes, Usuarios (IE-003, IE-004, IE-005, IE-010) |
| CU7 Dashboard de KPIs (RF17), RF18 Exportación | Dirección → Dashboard (S9, S10) |
| RF19 Bitácora de auditoría | Dirección → Bitácora |

Fuera de esta versión: inventario físico (CU3), devoluciones con documento original (CU4), landed cost (RF15), modo sin conexión, respaldos automáticos.

## Arquitectura

Sigue el diagrama de clases (entregable 5): la interfaz solo habla con su controlador y el controlador con las entidades.

```
web/src/paginas/<módulo>/      Interfaz (pantallas React)
server/src/rutas/              HTTP: recibe la petición y llama al controlador
server/src/controladores/      ControladorMovimientos, ControladorRecepcion, …
server/src/entidades/          Producto, Movimiento, OrdenDeCompra, … (SQL)
base-de-datos/sql/04_…         Procedimientos con transacción: un movimiento o una
                               recepción se guarda completa o no se guarda (RNF2)
```

Detalles para programar: `CONVENCIONES.md`.
