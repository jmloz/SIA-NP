# Guion para explicar la app — SIA-NP

Duración: unos 5 minutos, hablado. Sirve de introducción antes de la demo (`GUION_DEMO.md`) o para responder "¿qué hace y cómo está hecho?". Lo que va entre comillas se puede decir tal cual.

---

## 1. Qué problema resuelve (1 min)

> "Neumática del Pacífico vende componentes neumáticos: cilindros, válvulas, mangueras, racores, compresores. Hoy controlan el almacén con un Excel y un libro de remisiones. Eso provoca tres problemas que nos contaron en las entrevistas: la existencia del sistema no coincide con lo que hay en el anaquel (la diferencia anda en un 5 %), no se sabe a tiempo qué hay que volver a pedir, y no queda registro de quién movió qué."

> "SIA-NP, Sistema de Inventario y Almacén, sustituye ese Excel. Cada entrada, salida, ajuste o devolución queda registrada con usuario, fecha y hora, y la existencia se actualiza en el momento."

## 2. Quién la usa (1 min)

> "Hay cinco roles, los mismos de los casos de uso. Cada usuario solo ve los módulos de su rol."

| Rol | Persona | Qué hace en el sistema |
|---|---|---|
| Encargado de Almacén | Lodevar Pablovich | Movimientos, notas de salida, recepción, inventario físico, autoriza ajustes y devoluciones sin nota |
| Auxiliar de Almacén | Ricardo Mendoza Quintero | Registra movimientos y devoluciones, captura los conteos |
| Encargada de Compras | Karla Patricia Domínguez Rivera | Sugerencias de reorden, órdenes de compra, recepción, proveedores |
| Dirección General | Paulina Pérez Estrada | Dashboard de indicadores con detalle, bitácora |
| Administrador | — | Usuarios y catálogos; desbloquea cuentas |

## 3. Qué hace: los módulos (1.5 min)

> "La app tiene cuatro módulos, y cada pantalla corresponde a un caso de uso."

- **Acceso (CU8):** usuario y contraseña; al tercer intento fallido la cuenta se bloquea.
- **Almacén:**
  - Registrar movimientos (CU1): entradas, salidas, ajustes, con lector de código de barras. Un lector USB funciona como teclado, así que no hace falta software especial.
  - Nota de salida (RF8): la venta al cliente, en PDF, y la orden de surtido ordenada por ubicación.
  - Existencias y kardex (CU2): el historial de cada producto con su saldo.
  - Devolución de cliente (CU4): contra la nota original; la mercancía dañada se registra pero no suma a la existencia.
  - Inventario físico (CU3): hoja de conteo sin la existencia del sistema (para que no influya en quien cuenta), reporte de diferencias y ajuste automático al cerrar.
- **Compras:**
  - Sugerencias de reorden (RF14): los productos en o bajo su punto de reorden, con el proveedor de mejor precio.
  - Orden de compra (CU5): sigue los estados del diagrama de estados: Pendiente, Emitida, Parcialmente recibida, Recibida, Cerrada o Cancelada.
  - Recibir mercancía (CU6): contra la orden; separa lo no conforme y pide autorización si llega de más.
- **Dirección:** dashboard de indicadores (CU7), exportación a Excel (RF18) y bitácora de auditoría (RF19).

## 4. Cómo está hecho (1 min)

> "Es una aplicación web de tres capas."

- **Interfaz:** React. Se abre en el navegador de la PC, una tablet o un teléfono. Las pantallas siguen las maquetas del entregable de interfaces (IE-001 a IE-010).
- **Servidor:** Node.js con Express. Está organizado como el diagrama de clases: la pantalla llama a su controlador (`ControladorMovimientos`, `ControladorRecepcion`…) y el controlador usa las entidades (`Producto`, `Movimiento`, `OrdenDeCompra`…). La interfaz nunca toca la base de datos directamente.
- **Base de datos:** SQL Server, la misma que diseñamos en Taller de Base de Datos, con unas tablas extra (clientes, notas de salida, folios).

> "Lo más importante para el almacén era la confiabilidad (RNF2). Por eso registrar un movimiento o una recepción es un procedimiento almacenado con transacción: se guardan completos o no se guardan. Si una recepción trae tres productos y uno falla, no entra ninguno, y la existencia nunca queda a medias."

- **Seguridad:** las contraseñas se guardan cifradas (bcrypt) y cada operación revisa el rol del usuario en el servidor, no solo en la pantalla.
- **Reportes:** los PDF (nota de salida, orden de compra, hoja de conteo) y el Excel se generan en el servidor.

## 5. De los diagramas al sistema (30 s)

> "Todo lo que entregamos en el semestre está en la app: los casos de uso son las pantallas, y los flujos alternos (contraseña incorrecta, salida mayor a la existencia, mercancía excedente) son los mensajes que van a ver. Las clases del diagrama son los controladores y las entidades del código, el diagrama de estados es el ciclo de la orden de compra y el diccionario de datos es la base de datos."

## 6. Qué no incluye (15 s)

> "Es un prototipo para la clase, no una implantación. Quedó fuera el costo de importación (RF15), el modo sin conexión y los respaldos automáticos."

> "Ahora lo vamos a ver funcionando con la historia de un día en el almacén."  → pasar a `GUION_DEMO.md`.
