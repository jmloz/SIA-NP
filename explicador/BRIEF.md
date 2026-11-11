# Brief común: explicador animado de SIA-NP

Objetivo: una página web (artifact de claude.ai) que explica **cada entregable y cada diagrama** de SIA-NP con animaciones paso a paso y ejemplos concretos de Neumática del Pacífico. Sirve para estudiar y presentar ante la profesora. Todo en español.

Este explicador NO es un entregable: no modifica nada de `entregables/` ni de `scripts/`. Solo lee.

## Arquitectura (obligatoria)
- Página única `explicador/index.html` (la arma el coordinador insertando los fragmentos en `explicador/marco.html`, que ya existe: léelo para ver CSS y utilidades). Cada agente entrega UN fragmento: `explicador/secciones/0N-nombre.html`.
- El fragmento contiene, en este orden: un `<style>` con TODAS sus reglas prefijadas con `#sec-XX` (sin selectores globales), un `<section id="sec-XX" class="sec">…</section>` y un `<script>` en IIFE que llama `SIA.registrar('XX', function(raiz){ … })`. La función se ejecuta la primera vez que se muestra la sección. Sin variables globales nuevas.
- Ids: `cu` (01), `act` (02), `crc` (03), `seq` (04), `cls` (05), `est` (06).
- Sin dependencias externas: SVG inline + CSS + JS vanilla. Sin imágenes remotas. No incrustar los PNG de `entregables/` (redibujar en SVG: así se puede animar).
- Peso razonable: < 250 KB por fragmento.

## Utilidades que da el marco (`index.html`), úsalas
- `SIA.registrar(id, init)`.
- `SIA.reproductor(raiz, pasos, opciones)`: crea controles ⏮ ◀ ▶/⏸ ▶ ⏭, barra de progreso y velocidad. `pasos` es un arreglo de `{titulo, texto, aplicar(estado)}`; ve el comentario en `marco.html` para la firma exacta. Úsalo en lugar de hacer tus propios botones, para que todas las secciones se manejen igual.
- Clases CSS globales disponibles: `.panel`, `.narracion`, `.chip`, `.ejemplo` (caja de "ejemplo real"), `.nota-fuente` (cita de dónde sale el dato), `.resaltado` (aplica a elementos SVG: trazo y relleno de acento), `.atenuado`, `.tabs`.
- Variables CSS: `--tinta` (#111), `--papel` (#fff), `--gris` (#E6E6E6), `--acento` (#d9480f, naranja), `--ok` (#2b8a3e), `--error` (#c92a2a), `--borde` (#111). Diagramas en negro sobre blanco, como en los entregables; el acento se usa SOLO para lo que la animación está señalando en ese paso.
- Tipografía Arial.

## Qué debe tener cada sección
1. **Qué es este entregable** (2–4 frases, en lenguaje del libro Kendall & Kendall cap. 10, con página citada si aplica, págs. 281–327).
2. **El diagrama redibujado en SVG, fiel al entregable** (mismos nombres, numeración, notación). Si el entregable tiene varios diagramas (8 CU, 8 actividades, 14 CRC, 2 secuencias, 5 vistas de clases), da un selector (`.tabs`) para todos.
3. **Animación paso a paso** sobre el diagrama, con narración: qué pasa en cada paso, quién lo hace, qué dato cambia. Incluye el flujo normal Y al menos un alterno por diagrama (los críticos CU1 y CU6: todos sus alternos).
4. **Ejemplo real** contado con el escenario canónico de abajo (mismos datos en todas las secciones).
5. **Cómo leer la notación** (leyenda breve de los símbolos de ese diagrama).
6. **"Para la exposición"**: 3–5 preguntas que la profesora podría hacer, con respuesta corta. Incluye las notas de CLAUDE.md que apliquen (p. ej. T4/T9 sin CU propio; DetalleOrden sin tarjeta; RF del Apéndice C).

Fidelidad: los textos, pasos, mensajes, atributos y métodos salen de los entregables (`entregables/…pdf`, generadores `scripts/docx/0N_*.js`, `scripts/actividades/definiciones.py`, `scripts/modelo_clases.py`, `scripts/estados/diagrama_estados.py`, `scripts/docx/NOTAS_01.md`). No inventes pasos ni métodos. Si encuentras una contradicción entre entregables, NO la corrijas: anótala en tu informe final.

Texto ya extraído de los PDF (UTF-8) en:
`C:/Users/jmloz/AppData/Local/Temp/claude/9919beaa12ed540b/42503085-1c63-4f86-bbb7-a930843fb9a9/scratchpad/txt/*.txt`

## Datos reales (de la ERS, apéndices A–C y §1.4/§4) — úsalos tal cual
- Neumática del Pacífico, Hermosillo, Sonora. Vende mangueras, racores, válvulas, cilindros, FRL, electroválvulas, compresores, manómetros, lubricantes.
- ~1,200 productos; el Excel actual "INV ALMACÉN" tiene 454 registros; la columna UBICACIÓN está vacía para muchos; no hay bitácora de quién movió qué; el Excel se actualiza al final del día; libro físico de remisiones.
- Lodevar Pablovich, Encargado de Almacén (8 años): problema más grave, vender lo que el sistema dice tener y no está; pide código de barras, ubicaciones y kardex confiable; palabra clave: "confiabilidad".
- Ricardo Mendoza Quintero, Auxiliar de Almacén (2 años): órdenes de surtido impresas e ilegibles; confunde racores de distintos diámetros; pide imagen del producto, interfaz simple, pistola escáner.
- Karla Patricia Domínguez Rivera, Encargada de Compras (5 años): ~35 proveedores (local, nacional, importación); hoy hace las OC en Word; pide lead time, comparativo, landed cost.
- Paulina Pérez Estrada, CEO (10 años): pérdidas 8–10 % del margen anual por inventario mal controlado; quiere bajar la diferencia físico vs sistema de 5 % a < 1 %; dashboard ejecutivo; exportar a Excel/CSV para CONTPAQi.
- Ubicación en la ERS: pasillo (A, B, C), anaquel (1–8), nivel (1–3). Proveedor: clasificación Local / Nacional / Importación, lead_time_dias.

## Escenario canónico (ilustrativo; los nombres de personas, giros y estructura son reales, las cifras y códigos concretos son de ejemplo). Márcalo con `.nota-fuente`: "Cifras de ejemplo con datos reales del cliente".
- Producto P1: **Racor recto 1/4" NPT × 8 mm**, código interno `RAC-0408`, familia Racores, unidad pza, mínimo 30, máximo 150, existencia **40**, ubicación `B-04-2` (pasillo B, anaquel 4, nivel 2).
- Producto P2: **Cilindro neumático Ø32 × 100 mm**, código `CIL-32100`, familia Cilindros, existencia **3**, mínimo 5, ubicación `C-02-1`.
- Proveedor: "Proveedor nacional de neumática" (clasificación Nacional, lead time 7 días). No inventes razón social.
- **CU1 (salida)**: Ricardo recibe la orden de surtido del pedido de un cliente taller; escanea `RAC-0408` con la pistola; el sistema muestra existencia 40 y ubicación B-04-2; captura 12 pzas, documento `NS-2026-0318` (nota de salida); confirma; valida; existencia 40 → **28**; kardex y bitácora; folio de movimiento `MOV-2026-01542`. Como 28 < mínimo 30, queda bajo mínimo (sirve para enlazar con CU5/reorden).
  - 8a: si captura 50 pzas (> 40) → alerta, no se guarda. 8b: deja vacío el documento → lo señala. 7a: cancela → no cambia nada. 4a: escanea un código que no existe.
- **CU5**: Karla genera la OC `OC-2026-0147` al proveedor nacional: 100 × RAC-0408 y 10 × CIL-32100.
- **CU6 (recepción)**: llega la mercancía con factura `F-A-88213`; Karla (Encargada de Compras, actor principal de CU6 en el entregable; Lodevar participa como actor secundario) busca la OC-2026-0147; primera entrega: 60 racores y 10 cilindros → OC "Parcialmente recibida"; segunda entrega: 40 racores → "Recibida". 6a: 2 cilindros con defecto. 7a: llegan 110 racores (excedente).
- **Estados (06)**: la misma OC-2026-0147 recorre Pendiente → Emitida → Parcialmente recibida (1.ª entrega; autotransición en la 2.ª si aún falta) → Recibida → Cerrada. Contraejemplo: una OC que se cancela.
- **CU3 inventario**: conteo de la familia Racores: sistema 28, contado 26 → ajuste −2 (Ajuste).
- **CU4 devolución**: el cliente taller devuelve 2 racores de la NS-2026-0318.
- **CU7 dashboard**: Paulina ve KPI de exactitud de inventario (5 % → meta < 1 %).
- Adapta el resto con estos mismos datos.

## Entrega del agente
- Escribe solo tu fragmento en `C:/Projects/SIA-NP/explicador/secciones/`.
- Comprueba que el HTML es válido y que el JS no tiene errores de sintaxis. No hay node: revisa con cuidado a mano (o `python` no está disponible tampoco). Mantén el JS simple.
- Informe final (corto): qué cubre, decisiones, y una lista de contradicciones o dudas encontradas en los entregables.
