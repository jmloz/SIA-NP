# Plan: sistema funcional SIA-NP para entregar en clase

Fecha: 18 nov 2026. Alcance: prototipo funcional que se demuestra en clase (no se implanta en Neumática del Pacífico). Base de datos: **SQL Server**, la del Taller de BD (`base-de-datos/sql/`). Requerimientos citados con la numeración del Apéndice C de la ERS.

## 1. Qué se reutiliza

| Entregable | Se convierte en |
|---|---|
| BD del Taller (script 01, 14 tablas, vistas; script 02 datos de prueba) | La base de datos del sistema, sin rehacerla |
| CU1–CU8 con flujos normales y alternos | Las funciones a programar y el guion de la demostración |
| Diagrama de clases (Interfaz → Controlador → Entidad) | Las carpetas del backend |
| Diagrama de estados de la OC | Los cambios de estado permitidos en compras |
| Interfaces IE-001…IE-010 | Las pantallas |
| Salidas S1–S10 | Los reportes e impresos |

## 2. Tecnología

| Parte | Elección | Motivo |
|---|---|---|
| Base de datos | SQL Server 2022 (Express o Developer). Windows: instalación normal + SSMS. Ubuntu: contenedor Docker `mcr.microsoft.com/mssql/server:2022-latest` | Es la BD del Taller; los scripts 01 y 02 corren tal cual |
| Backend | Node.js + Express + librería `mssql` | El equipo ya usa Node en los generadores; `mssql` maneja transacciones de SQL Server |
| Frontend | React + Vite (web responsiva) | Las maquetas de IE ya están pensadas como formularios web; se ve bien en PC y en celular para la demo |
| Impresos | PDF con `pdfkit` (nota de salida, OC) | RF8 y RF12 piden documento imprimible |
| Excel/CSV | `exceljs` | RF18 |
| Código de barras | Un lector USB escribe como teclado; sin lector, se teclea o se pega el código | No requiere programar nada especial |

Arranque en cualquier computadora: `npm install` y `npm run dev` en `app/`, con la cadena de conexión en un archivo `.env` (no se sube a git).

### Cambios a la BD (sin tocar el script 01 ya entregado)

Un script nuevo `base-de-datos/sql/04_ajustes_app.sql`:

1. **CLIENTE** (CU4 busca al cliente): id, nombre, teléfono.
2. **NOTA_SALIDA** (RF8, S1): folio, cliente, usuario, fecha. `MOVIMIENTO` gana `id_nota_salida` para que una nota tenga varios productos.
3. **Procedimientos almacenados con transacción** para lo crítico. Así la regla "todo o nada" (RNF2) vive en la BD, que además luce en la materia de BD:
   - `sp_registrar_movimiento`: valida existencia, inserta el movimiento con `saldo_resultante`, actualiza `PRODUCTO.existencia` y escribe en la bitácora.
   - `sp_registrar_recepcion`: crea la recepción, sus entradas, actualiza `DETALLE_ORDEN.cantidad_recibida` y el estado de la OC.
   - `sp_siguiente_folio`: folios consecutivos (`OC-0001`, `NS-0001`, etc.).
4. Usuarios de prueba, uno por rol, con contraseña conocida para la demo.

## 3. Alcance por prioridad

**Imprescindible (lo que se demuestra):**
- CU8 / RF1: inicio de sesión con bcrypt, bloqueo a los 3 intentos, menú según el rol.
- RF2, RF5, RF11: catálogos de productos, ubicaciones y proveedores (altas, cambios, bajas lógicas).
- **CU1** / RF3, RF8, RF9: registrar entradas y salidas, con los alternos 7a cancelar, 8a salida mayor que existencia y 8b falta un campo. Nota de salida en PDF.
- CU2 / RF4: existencias y kardex (vista `vw_KARDEX`).
- CU5 / RF12: orden de compra con folio y PDF.
- **CU6** / RF13: recepción total o parcial contra OC, con los alternos 6a defectos y 7a excedente. Estados según el diagrama de estados.
- RF19: bitácora en cada operación y una pantalla para consultarla.

**Si da tiempo:**
- CU3 / RF6: inventario físico con reporte de diferencias (S8) y ajustes.
- CU4 / RF7: devoluciones de cliente.
- CU7 / RF17: dashboard con 3–4 indicadores (valor del inventario, productos bajo reorden, OC pendientes).
- RF14: lista de reorden (`vw_PRODUCTOS_BAJO_REORDEN`). RF18: exportar a Excel.

**Fuera:** landed cost (RF15), modo sin conexión, respaldos automáticos, hosting, migración del Excel del cliente, CONTPAQi y CFDI.

## 4. Fases

| Fase | Contenido | Semanas |
|---|---|---|
| 0 | Instalar SQL Server, correr los scripts 01, 02 y 04, armar la carpeta `app/` y la conexión | 1 |
| 1 | Inicio de sesión, roles, bitácora y catálogos | 1–2 |
| 2 | CU1 movimientos + nota de salida + kardex | 2 |
| 3 | CU5 orden de compra + CU6 recepción | 2 |
| 4 | Extras ("si da tiempo") según lo que quede | 1–2 |
| 5 | Pruebas con el guion de los CU, datos de demo y ensayo de la presentación | 1 |

Total: unas 6–8 semanas. Reparto sugerido, igual que en el Taller de BD: Seguridad (Andrea), Productos y Ubicaciones (José Martín), Proveedores y Compras (Adolfo), Movimientos (Edgardo).

## 5. Pruebas y demostración

- Recorrer cada flujo normal y alterno de CU1 y CU6 tal como están escritos en el entregable 1.
- Correr el script 03 (28 pruebas de integridad) después del 04 para confirmar que nada se rompió.
- Caso a mostrar en clase: una salida mayor que la existencia es rechazada y la existencia no cambia (alterno 8a).
- Guion de la demo: entrar como Compras → crear OC → recibir parcial → entrar como Almacén → ver kardex → registrar salida → imprimir nota → entrar como Dirección → ver bitácora y dashboard.

## 6. Pendiente de decidir

1. Fecha de entrega, para ajustar cuántos extras entran.
2. Si el profesor pide que corra en una computadora del salón (Windows con SQL Server instalado) o basta con la laptop de un integrante.
