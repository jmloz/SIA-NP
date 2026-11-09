# Flujos finales de CU1–CU8 (entregable 01, versión del 9 nov 2026)

Fuente: `scripts/docx/01_casos_uso.js`. Numeración de pasos tal como queda en el .docx/.pdf.

## CU1 Registrar Movimientos (Encargado de Almacén; Auxiliar de Almacén)
Normal:
1. Usuario: selecciona "Registrar movimiento".
2. Sistema: muestra el formulario de captura.
3. Usuario: elige tipo (entrada o salida).
4. Usuario: busca el producto por código o descripción.
5. Sistema: muestra existencia actual y ubicación.
6. Usuario: captura cantidad, ubicación y número de documento de referencia.
7. Usuario: confirma la operación.
8. Sistema: valida los datos y, si es salida, verifica existencia suficiente.
9. Sistema: actualiza existencia, registra en kardex y en bitácora.
10. Sistema: muestra confirmación con folio.

Alternos:
- 4a. Producto no existe: el sistema lo notifica y ofrece darlo de alta o cancelar.
- 7a. Usuario cancela: se descarta la captura; el inventario no cambia.
- 8a. Salida mayor a la existencia: alerta; no se guarda el movimiento.
- 8b. Falta campo obligatorio: el sistema lo señala y pide completarlo.

## CU2 Consultar Kardex (Encargado y Auxiliar de Almacén; Encargada de Compras, Dirección General)
Normal:
1. Usuario: selecciona "Consultar kardex".
2. Sistema: muestra la búsqueda de productos.
3. Usuario: ingresa código, descripción o familia.
4. Sistema: despliega resultados.
5. Usuario: selecciona el producto.
6. Sistema: muestra existencia, ubicación e historial ordenado por fecha.
7. Usuario: puede filtrar por rango de fechas o tipo de movimiento.
8. Sistema: actualiza la vista.

Alternos:
- 4a. Sin coincidencias: mensaje y nueva búsqueda.
- 6a. Producto sin movimientos: muestra existencia inicial e indica que no hay historial.
- 8a. Usuario pide exportar: el sistema genera Excel o CSV.

## CU3 Realizar Inventario Físico (Encargado de Almacén; Auxiliar de Almacén)
Normal:
1. Usuario: selecciona "Inventario físico".
2. Usuario: elige conteo parcial por familia o completo.
3. Sistema: genera la hoja de conteo con productos y ubicaciones.
4. Usuario: captura la cantidad física contada.
5. Sistema: compara contra la existencia y calcula diferencias.
6. Sistema: muestra el reporte de diferencias.
7. Usuario: revisa y confirma el cierre del conteo.
8. Sistema: genera los ajustes y actualiza existencias.
9. Sistema: registra conteo y ajustes en la bitácora.

Alternos:
- 4a. Usuario deja pendiente el conteo: se guarda el avance para retomarlo.
- 6a. Sin diferencias: el sistema cierra el conteo sin generar ajustes.
- 7a. Usuario recuenta un producto: corrige la cantidad antes del cierre.
- 7b. Usuario cancela el conteo: se descarta; las existencias no cambian.

## CU4 Registrar Devolución de Cliente (Encargado de Almacén; Auxiliar de Almacén)
Normal:
1. Usuario: selecciona "Registrar devolución de cliente".
2. Usuario: busca y selecciona al cliente.
3. Sistema: muestra los documentos de salida del cliente.
4. Usuario: selecciona el documento original y los productos.
5. Usuario: captura cantidad, motivo y estado de la mercancía.
6. Sistema: valida que la cantidad devuelta no exceda la vendida.
7. Usuario: confirma la devolución.
8. Sistema: genera la entrada, actualiza existencia y kardex.
9. Sistema: muestra el folio de la devolución.

Alternos:
- 2a. Cliente no existe: darlo de alta o cancelar.
- 3a. No se localiza el documento original: registro manual con autorización.
- 6a. Cantidad devuelta excede la vendida: alerta; no permite continuar.
- 7a. Mercancía dañada: se marca como no disponible y entra a ubicación de resguardo.

## CU5 Generar Orden de Compra (Encargada de Compras)
Normal:
1. Usuario: selecciona "Generar orden de compra".
2. Sistema: muestra el formulario de la orden con la fecha actual.
3. Usuario: selecciona el proveedor.
4. Usuario: agrega productos con cantidad y precio unitario.
5. Sistema: calcula subtotales, impuestos y total.
6. Usuario: captura condiciones de entrega y pago.
7. Usuario: confirma la emisión.
8. Sistema: asigna el folio consecutivo, guarda la orden como "Emitida" y genera el documento corporativo.

Alternos:
- 3a. Proveedor no existe: darlo de alta o cancelar.
- 4a. Parte de una sugerencia de reorden: el sistema precarga productos bajo el punto de reorden.
- 5a. Producto de importación: captura de costos adicionales de importación.
- 7a. Guarda como borrador: estado "Pendiente", sin folio definitivo.

## CU6 Recibir Mercancía contra Orden de Compra (Encargada de Compras; Encargado de Almacén)
Normal:
1. Usuario: selecciona "Recibir mercancía".
2. Usuario: busca la orden por folio o proveedor.
3. Sistema: muestra productos y cantidades pendientes.
4. Usuario: captura cantidades recibidas y ubicación.
5. Usuario: registra la factura o remisión del proveedor.
6. Usuario: confirma la recepción.
7. Sistema: valida que lo recibido no exceda lo solicitado.
8. Sistema: genera la entrada, actualiza existencias y kardex.
9. Sistema: cambia la orden a "Recibida" o "Parcialmente recibida".

Alternos:
- 2a. No se localiza la orden: nueva búsqueda o cancelar.
- 4a. Recepción parcial: se conserva el saldo pendiente y la orden sigue abierta.
- 6a. Mercancía con defectos: se registra como no conforme y no se suma al inventario disponible.
- 7a. Cantidad recibida excede la solicitada: alerta y solicitud de autorización para continuar.

## CU7 Visualizar Dashboard de KPIs (Dirección General; Encargado de Almacén, Encargada de Compras)
Normal:
1. Usuario: selecciona "Dashboard".
2. Sistema: calcula indicadores del periodo actual.
3. Sistema: muestra KPIs (valor de inventario, rotación, productos bajo reorden, entradas/salidas, OC pendientes).
4. Usuario: elige periodo (semanal o mensual).
5. Sistema: actualiza gráficas e indicadores.
6. Usuario: consulta el detalle de un indicador.
7. Sistema: despliega el desglose.

Alternos:
- 2a. Información insuficiente: tablero con indicadores en cero y aviso.
- 5a. Usuario pide exportar: reporte en Excel o CSV.
- 7a. Sin permiso para el detalle: solo información resumida.

## CU8 Autenticar Usuario (todos: Encargado y Auxiliar de Almacén, Encargada de Compras, Dirección General, Administrador)
Normal:
1. Usuario: accede a la pantalla de inicio de sesión.
2. Usuario: captura usuario y contraseña.
3. Usuario: selecciona "Iniciar sesión".
4. Sistema: valida credenciales.
5. Sistema: identifica el rol.
6. Sistema: habilita solo los módulos y operaciones del rol.
7. Sistema: muestra la pantalla principal y registra el acceso en la bitácora.

Alternos:
- 2a. Olvidó la contraseña: solicita el restablecimiento al administrador.
- 4a. Credenciales incorrectas: error y reintento.
- 4b. Tres intentos fallidos consecutivos: bloqueo temporal y aviso al administrador.
- 4c. Cuenta inactiva: acceso negado; contactar al administrador.
