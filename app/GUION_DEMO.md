# Guion de la demostración en clase — SIA-NP

Duración: unos 15 minutos. Una sola historia, "un día en el almacén de Neumática del Pacífico", que pasa por los 8 casos de uso con los datos de ejemplo. Los folios y cantidades de este guion salen tal cual si la BD se recrea justo antes (paso 0) y se sigue el orden.

Contraseña de todos los usuarios: **sianp2026**. Para cambiar de rol: botón **Cerrar sesión** (arriba a la derecha) y entrar con el otro usuario.

| Parte | Quién presenta | Usuario | Casos de uso |
|---|---|---|---|
| 1. Introducción y acceso | Olivas Villareal Andrea | `rmendoza` | CU8 |
| 2. Compras: reorden y orden de compra | Moreno Ramos Adolfo | `kdominguez` | RF14, CU5 |
| 3. Recepción contra la orden | Moreno Ramos Adolfo | `lpablovich` | CU6 |
| 4. Almacén: kardex, movimiento y nota de salida | Rivera Torres Edgardo | `lpablovich` | CU2, CU1, RF8 |
| 5. Devolución de cliente | Rivera Torres Edgardo | `rmendoza` | CU4 |
| 6. Inventario físico | Hernández Castro José Martín | `lpablovich` | CU3 |
| 7. Dirección: dashboard y bitácora | Hernández Castro José Martín y Andrea | `pperez` | CU7, RF18, RF19 |
| 8. Cierre: cómo está hecho | Hernández Castro José Martín | — | — |

---

## 0. Antes de la clase (10 min antes)

En la laptop, dentro de la carpeta `app/`:

```bash
docker compose up -d        # SQL Server (normalmente ya está corriendo)
bash db/init-docker.sh      # BD limpia con los datos de ejemplo (borra lo que se haya probado)
npm start                   # compila la interfaz y abre el sistema en http://localhost:3000
```

- Abrir http://localhost:3000 en Chrome, zoom al 125 % para el proyector, y dejar la pantalla de inicio de sesión.
- Probar una vez que se entra con `rmendoza` y salir.
- Respaldo por si algo falla: capturas de pantalla o un video de este mismo recorrido.

---

## 1. Introducción y acceso — CU8 (Andrea, 1.5 min)

> "SIA-NP sustituye el Excel y el libro de remisiones de Neumática del Pacífico. Es una aplicación web con SQL Server; cada usuario tiene su cuenta y solo ve lo que le toca a su rol."

1. Usuario `rmendoza`, contraseña `hola` → **Iniciar sesión**.
   Mensaje: *"Usuario o contraseña incorrectos. Intentos restantes: 2."* (alterno 4a; al tercer intento la cuenta se bloquea, 4b).
2. Ahora con `sianp2026` → entra.
3. Señalar: la barra muestra **Ricardo Mendoza Quintero · Auxiliar de Almacén** y el menú solo trae Almacén y Catálogos (no hay Compras ni Dirección): *"el sistema habilita solo los módulos del rol"* (paso 6).
4. **Cerrar sesión**.

## 2. Compras: sugerencia de reorden y orden de compra — RF14, CU5 (Adolfo, 2.5 min)

Entrar con `kdominguez` (Encargada de Compras).

1. **Compras → Sugerencias de reorden**. Hay 3 productos en o bajo su punto de reorden, todos con *Fluidos Industriales de México* como mejor precio:
   - CIL-32-100 (existencia 4, reorden 5) → sugerido 16
   - COM-50L-2HP (2, reorden 2) → sugerido 4
   - RAC-RR-08 (40, reorden 40) → sugerido 260
2. **Generar OC** en esa fila → se abre la orden (IE-006) con el proveedor y los 3 productos precargados (alterno 4a del CU5).
3. Señalar que el subtotal, el IVA y el total se calculan solos: **$46,628.00 + IVA $7,460.48 = $54,088.48**.
4. Observaciones: `Crédito 30 días; entregar en almacén Hermosillo` → **Emitir orden**.
   Resultado: folio **OC-2026-0003**, estado **Emitida**. Abrir el **PDF** (salida S2): formato corporativo con RFC, partidas, IVA y total.
5. Comentar: *"también se puede guardar como borrador (Pendiente) y emitir después; los estados siguen el diagrama de estados que entregamos."*
6. **Cerrar sesión**.

## 3. Recepción de la mercancía contra la orden — CU6 (Adolfo, 2 min)

Entrar con `lpablovich` (Encargado de Almacén).

1. **Compras → Recibir mercancía** (IE-007). Buscar `OC-2026-0003` y elegirla. Muestra solicitado, recibido y pendiente.
2. Factura del proveedor: `FIM-48210`. Capturar:
   - RAC-RR-08: recibido **260**
   - CIL-32-100: recibido **15**, no conforme **1** (llegó un cilindro golpeado — alterno 6a: no entra al inventario)
   - COM-50L-2HP: recibido **5** (se pidieron 4)
3. **Registrar recepción** → confirmar.
   Alerta: *"La cantidad recibida excede la solicitada. Se requiere autorización para continuar."* (alterno 7a).
4. Marcar **Autorizo recibir la cantidad excedente** y confirmar de nuevo.
   Resultado: **REC-2026-0002** y la orden queda **Parcialmente recibida** (falta 1 cilindro: el saldo pendiente se conserva, alterno 4a).
5. Remarcar: *"en una sola transacción se creó la recepción, las 3 entradas al inventario y el cambio de estado de la orden; si algo falla, no se guarda nada."*

## 4. Almacén: kardex, movimiento y nota de salida — CU2, CU1, RF8 (Edgardo, 3 min)

Sigue `lpablovich`.

**Kardex (CU2)**
1. **Almacén → Existencias y kardex**, buscar `RAC-RR-08`. Existencia **300**, ubicación **A-01-2**, y en el historial la **entrada de 260 con "Factura FIM-48210"** que acaba de registrar la recepción.

**Registrar movimiento (CU1, IE-002)**
2. **Almacén → Registrar movimiento**, tipo **Salida**.
3. En Producto teclear (o escanear) el código de barras `7501000000028` y **Enter** → muestra *Racor recto rápido 8 mm*, existencia **300 PZA**, ubicación A-01-2 (paso 5). *"Un lector USB escribe como teclado y manda Enter: no requiere software especial."*
4. Cantidad `1000`, documento `Vale V-2301` → **Guardar movimiento** → aparece el resumen (paso 7) → **Confirmar**.
   Mensaje: *"La salida (1000.00) excede la existencia actual (300.00). No se guardó el movimiento."* (alterno 8a).
5. Cambiar la cantidad a `10` → guardar y confirmar → folio **MOV-2026-0008**, saldo **290** (paso 10).

**Nota de salida (RF8)**
6. **Almacén → Nota de salida**. Cliente: **Talleres Industriales del Yaqui**.
7. Escanear `7501000000011` (Manguera 8 mm) → cantidad `25`; escanear `7501000000028` (Racor) → cantidad `20`.
8. **Confirmar nota de salida** → **NS-2026-0001**. Abrir el **PDF de la nota** (S1, con precios e importe) y la **orden de surtido** (S3, ordenada por ubicación para el auxiliar).
9. *"Las dos salidas se guardan juntas: si una partida no alcanza, no se guarda ninguna."*
10. **Cerrar sesión**.

## 5. Devolución de cliente — CU4 (Edgardo, 1.5 min)

Entrar con `rmendoza` (Auxiliar).

1. **Almacén → Devolución de cliente** (IE-008). Buscar `Talleres` → elegir al cliente → nota **NS-2026-0001**. Se ven los productos con lo vendido y lo disponible para devolver.
2. Marcar el racor, cantidad `30` → al registrar: *"…excede lo vendido menos lo ya devuelto (vendida 20…)"* (alterno 6a).
3. Corregir:
   - RAC-RR-08: cantidad `5`, estado **Buena**, motivo `No era la medida`
   - MAN-PU-08: cantidad `3`, estado **Dañada**, motivo `Manguera cortada`
4. **Registrar devolución** → **Confirmar** → **DEV-2026-0001**: el racor **entró al inventario** y la manguera quedó **no disponible** (alterno 7a: no suma a la existencia).
5. Señalar en el selector de nota la opción deshabilitada **"Registro manual: requiere autorización del Encargado de Almacén"** (alterno 3a: sin documento original solo el Encargado puede registrarla).
6. **Cerrar sesión**.

## 6. Inventario físico — CU3 (José Martín, 2 min)

Entrar con `lpablovich`.

1. **Almacén → Inventario físico → Nuevo conteo**: **Cíclico (por familia)**, familia **Válvulas** → **Abrir conteo** → **INV-2026-0002** (el sistema toma la foto de la existencia en ese momento).
2. En la fila del conteo, **Hoja** (PDF, S4): no muestra la existencia del sistema para no sesgar a quien cuenta.
3. **Capturar**: escanear `7501000000035` (VAL-5/2-14) → contado `10` → **Terminar captura y ver diferencias**. (Con **Guardar avance** se puede dejar a medias y retomar, alterno 4a.)
4. **Diferencias** (S8): sistema **11**, contado **10**, diferencia **−1** (**−$640.00**).
   *"La CEO quiere bajar la diferencia físico vs sistema del 5 % a menos del 1 %; este reporte es el que lo mide."*
5. **Confirmar cierre** → confirmar otra vez → se genera el **ajuste −1** y la existencia queda en **10**, igual a lo contado.
6. **Cerrar sesión**.

## 7. Dirección: dashboard y bitácora — CU7, RF18, RF19 (José Martín y Andrea, 2 min)

Entrar con `pperez` (Dirección General).

1. **Dirección → Dashboard** (S9), periodo **Semanal**: valor del inventario, entradas y salidas del periodo, OC abiertas y la diferencia del último inventario físico.
2. Clic en **Bajo punto de reorden** (ahora 1: la electroválvula quedó en su punto de reorden después del ajuste) → se despliega el detalle (pasos 6–7). *"Almacén y Compras ven solo el resumen; el detalle es de Dirección."*
3. **Exportar → Inventario (Excel)** (RF18): archivo listo para CONTPAQi.
4. (Andrea) **Dirección → Bitácora de auditoría**: filtrar módulo **ALMACEN**. Aparece todo lo que se hizo en la demo — la recepción, la salida, la nota, la devolución, el conteo y su ajuste — con **usuario, fecha y hora**. *"Ningún registro se puede borrar sin dejar huella."*

## 8. Cierre: cómo está hecho (José Martín, 1 min)

- **Base de datos:** la del Taller de BD en SQL Server (14 tablas + los ajustes del script 04). Las operaciones que tocan existencias son procedimientos almacenados con transacción: se guardan completas o no se guardan (RNF2, "confiabilidad", lo que pidió el encargado de almacén).
- **Diagrama de clases → código:** la interfaz solo habla con su controlador (`ControladorMovimientos`, `ControladorRecepcion`…) y el controlador con las entidades (`Producto`, `Movimiento`, `OrdenDeCompra`…), igual que en el diagrama.
- **Casos de uso → pantallas:** cada flujo alterno que se vio (4a, 6a, 7a, 8a…) es el que está escrito en los escenarios.
- **Diseño:** las pantallas siguen las maquetas del entregable de interfaces (IE-001 a IE-010) y los reportes, el de salidas (S1 a S10).

---

## Si algo sale mal

| Problema | Qué hacer |
|---|---|
| La página no carga | Revisar que la terminal de `npm start` siga abierta; volver a correr `npm start`. |
| "Error interno del servidor" al entrar | SQL Server no está arriba: `docker compose up -d`, esperar 20 s y recargar. |
| Los folios no coinciden con el guion | Se hicieron pruebas antes: `bash db/init-docker.sh` deja todo como al inicio. |
| Una cuenta quedó bloqueada | Entrar con `admin` → Catálogos → Usuarios → **Desbloquear**. |
| No abre el PDF | Permitir ventanas emergentes para localhost en Chrome. |
