# Plan: llevar SIA-NP a un sistema real en operación

Fecha: 18 nov 2026. Base: ERS (RF1–RF20, RNF1–RNF9, numeración del Apéndice C), entregables 1–9 y la BD del Taller (`base-de-datos/sql/`).

## 1. Diagnóstico: qué ya tenemos y qué falta

| Ya existe (reutilizable) | Falta para un sistema real |
|---|---|
| Requerimientos validados con el cliente (ERS) y entrevistas | Código: no hay ni una línea de aplicación |
| CU1–CU8 con flujos normales y alternos corregidos → son las historias de usuario y los casos de prueba | Arquitectura técnica, repo de código, CI, servidores |
| Diagrama de clases con capas Interfaz → Controlador → Entidad → es la estructura de carpetas del backend | Diseño de API (endpoints) |
| Diagrama de estados de la OC → máquina de estados del módulo de compras | Migración de datos del Excel del cliente |
| BD en SQL Server: 14 tablas, CHECKs, vistas de kardex/reorden/valor, 28 pruebas de integridad | Tablas que el diseño pide pero la BD no tiene (ver 1.1) |
| 10 maquetas de entrada (IE-001…IE-010) y 10 salidas (S1–S10) → son las pantallas y reportes | Acuerdo con el cliente: hosting, costos, soporte, propiedad del código |

### 1.1 Huecos del modelo de datos que hay que cerrar antes de programar

1. **CLIENTE**: CU4 (devolución) busca al cliente y sus documentos de salida, pero no hay tabla de clientes. Opción mínima: tabla `CLIENTE` (nombre, RFC opcional, teléfono) y FK opcional en la salida.
2. **Nota de salida / orden de surtido con varias partidas** (RF8, S1, S3): hoy `MOVIMIENTO` es una fila por producto con `documento_ref` de texto. Se necesita `NOTA_SALIDA` (folio, cliente, usuario, fecha, estado) + que cada `MOVIMIENTO` tipo S apunte a ella (`id_nota_salida`).
3. **Folios consecutivos**: definir el formato (p. ej. `OC-2026-0001`, `NS-2026-0001`) y generarlos con una secuencia por tipo dentro de la misma transacción.
4. **Landed cost** (RF15): no hay campos de flete, aduana ni tipo de cambio. Se propone dejarlo para la v1.1 (ver sección 6).
5. **Sesiones**: tabla de sesiones/refresh tokens para poder cerrar sesión y revocar accesos.
6. **Bitácora inmutable** (RNF3: "ningún registro podrá borrarse sin dejar huella"): el usuario de la app no debe tener `UPDATE/DELETE` sobre `BITACORA_AUDITORIA`.

## 2. Decisiones técnicas recomendadas

Criterios: lo puede mantener un equipo de estudiantes, cuesta poco al mes, cumple las RNF de la ERS y aprovecha lo que el equipo ya usa (Node/JavaScript en los generadores).

| Tema | Recomendación | Por qué |
|---|---|---|
| Tipo de app | Web responsiva instalable (**PWA**) | La ERS pide web en PC, tablet y teléfono (RNF8) y consulta sin internet (RNF5); una PWA hace ambas cosas sin tiendas de apps |
| Frontend | React + Vite + TypeScript | Un solo lenguaje en todo el proyecto; ecosistema grande para tablas, formularios y gráficas |
| Backend | Node.js + TypeScript (Fastify o Express) | Se organiza igual que el diagrama de clases: `rutas` (Interfaz) → `controladores` (ControladorMovimientos, ControladorRecepcion…) → `entidades/repositorios` |
| Base de datos | **PostgreSQL** (portar el script 01) | Gratis sin límite de tamaño, fácil de alojar y respaldar en Linux. El port es mecánico: `IDENTITY` → `GENERATED … AS IDENTITY`, columnas `PERSISTED` → `GENERATED ALWAYS AS … STORED`, `BIT` → `boolean`. *Alternativa:* quedarse en SQL Server Express si el profesor de BD lo exige (funciona en Docker, pero pide más RAM y el límite es 10 GB) |
| Acceso a datos | Migraciones SQL versionadas + Kysely (consultas tipadas) | El SQL del Taller sigue siendo la fuente de verdad; los CHECK y vistas se conservan |
| Código de barras | Lector USB/Bluetooth en modo HID (se comporta como teclado) + cámara del celular como respaldo (`BarcodeDetector`/ZXing) | RNF8 pide lectores estándar sin software del fabricante |
| Impresos | PDF generado en el servidor (nota de salida, OC, orden de surtido, hoja de conteo) | Formato corporativo fijo (RF8, RF12) |
| Excel/CSV | ExcelJS en el servidor | RF18, exportación para CONTPAQi |
| Despliegue | 1 VPS pequeño (2 GB RAM) con Docker Compose: app + PostgreSQL + Caddy (HTTPS automático) | ~6–12 USD/mes. Dos entornos en el mismo VPS: **pruebas** y **producción** (RNF7) |
| Respaldos | `pg_dump` diario automático, 30 días de retención, copia fuera del servidor (almacenamiento S3-compatible) + prueba de restauración mensual | RNF4 / RF19 |

### Reglas de implementación que salen directo de la ERS

- **Transacciones en cada movimiento** (RNF2, la "confiabilidad" que pidió el encargado de almacén): bloquear la fila del producto (`SELECT … FOR UPDATE`), validar existencia, insertar el movimiento con `saldo_resultante`, actualizar `PRODUCTO.existencia` y escribir la bitácora, todo o nada.
- **Invariante probada automáticamente**: `PRODUCTO.existencia` = suma de sus movimientos. Una prueba y una consulta de verificación nocturna.
- **Contraseñas** con argon2/bcrypt; bloqueo tras 3 intentos fallidos (la BD ya tiene `intentos_fallidos ≤ 3`).
- **Permisos por rol** en el backend (no solo ocultar botones): Encargado de Almacén, Auxiliar, Encargada de Compras, Dirección, Administrador.
- **Modo sin internet = solo consulta** (así lo dice la ERS 2.5): el catálogo y las existencias se guardan en el navegador (IndexedDB) y se muestran con la hora de la última sincronización. No se capturan movimientos sin conexión; eso evita conflictos de existencias.
- **Regla de capas** del diagrama de clases: las rutas nunca tocan la BD directamente.

## 3. Fases de desarrollo

Duraciones pensadas para 4 personas a medio tiempo. El orden prioriza los CU críticos (CU1 y CU6) para tener algo útil cuanto antes.

### Fase 0 — Preparación (1 semana)
- Confirmar con Paulina Pérez (CEO) que se va a implementar de verdad y acordar: quién paga el hosting y el dominio, quién da soporte después, de quién es el código, fecha objetivo.
- Repo `sia-np-app` (monorepo `frontend/`, `backend/`, `db/`), CI en GitHub Actions (lint + pruebas), ramas por funcionalidad con PR.
- Port del script 01 a PostgreSQL + cerrar los huecos de 1.1; pasar el script 03 (28 pruebas de integridad) como prueba automática.
- Reparto: cada integrante es dueño de su catálogo, igual que en el Taller de BD (Seguridad: Andrea; Productos/Ubicaciones: José Martín; Proveedores/Compras: Adolfo; Movimientos: Edgardo).

### Fase 1 — Base: acceso y catálogos (2 semanas)
- CU8 / RF1: inicio de sesión, roles, bloqueo, cierre de sesión (IE-001, IE-010).
- RF19: bitácora en cada alta, modificación, baja, movimiento y acceso.
- RF2, RF5, RF11: catálogos de productos (con imagen), familias, ubicaciones y proveedores con precios (IE-003, IE-004, IE-005).
- **Entregable:** el cliente puede entrar y dar de alta su catálogo en el entorno de pruebas.

### Fase 2 — Núcleo del almacén (3 semanas) ← CU1 crítico
- CU1 / RF3, RF9: registrar entradas y salidas con lector de código de barras, con los alternos 7a, 8a y 8b del CU (IE-002).
- RF8: orden de surtido y nota de salida impresas (S1, S3).
- CU2 / RF4: existencias y kardex (S5, S6), respuesta < 10 s desde mostrador (RNF1).
- CU4 / RF7: devoluciones de cliente (IE-008).
- **Entregable:** el almacén puede operar entradas y salidas reales en pruebas.

### Fase 3 — Compras (2–3 semanas) ← CU6 crítico
- CU5 / RF12: orden de compra con folio, PDF corporativo (S2) y la máquina de estados del entregable 6 (Pendiente → Emitida → Parcialmente recibida → Recibida → Cerrada; Cancelada).
- CU6 / RF13: recepción total o parcial contra OC, con los alternos 6a (defectos) y 7a (excedente); cada recepción genera movimientos de entrada en la misma transacción (IE-007).
- RF14: sugerencias de reorden con la vista `vw_PRODUCTOS_BAJO_REORDEN` (S7).
- RF16: comparativo de precios entre proveedores.

### Fase 4 — Inventario físico (2 semanas)
- CU3 / RF6: conteo cíclico por familia y conteo total, hoja de conteo (S4), captura en tablet (IE-009), reporte de diferencias (S8) y ajustes con motivo.
- Este módulo es el que mide el objetivo de la CEO: diferencia físico vs sistema de 5 % a < 1 %.

### Fase 5 — Dirección y reportes (2 semanas)
- CU7 / RF17: dashboard de KPIs (S9): valor del inventario, diferencia de conteo, productos bajo reorden, cumplimiento de proveedores (lead time real vs prometido).
- RF18: exportación Excel/CSV (S10). RF20: reportes operativos del almacén.

### Fase 6 — Móvil y sin conexión (1–2 semanas)
- RF10: vista móvil de consulta con imagen grande del producto (pedido del auxiliar para no confundir racores y mangueras).
- RNF5: PWA instalable, caché de catálogo/existencias, aviso de "sin conexión, datos de las HH:MM".

### Fase 7 — Puesta en marcha (3–4 semanas)
1. **Migración de datos**: limpiar el Excel "INV ALMACÉN" (454 registros) y "Hoja4" (precios), quitar duplicados, asignar familia y unidad. Script de importación con reporte de errores.
2. **Ubicaciones**: el Excel tiene la columna vacía en muchos productos → levantamiento físico pasillo por pasillo y etiquetado (códigos de barras impresos para productos que no traen).
3. **Saldo inicial**: un conteo total el fin de semana anterior al arranque; ese conteo se carga como ajuste inicial (no se confía en la existencia del Excel).
4. **Capacitación** en el entorno de pruebas con datos reales (RNF7), una sesión por rol.
5. **Operación en paralelo** 2 semanas con el Excel, comparando existencias cada día.
6. **Arranque** un lunes; mantenimiento solo en domingo (pedido del auxiliar, ERS 3.3.4).
7. Entregar manual de usuario por rol, guía de despliegue y de restauración de respaldos (RNF7).

**Total estimado:** 16–19 semanas hasta producción. Un MVP útil (Fases 0–3: acceso, catálogos, movimientos, compras) en ~8–9 semanas.

## 4. Pruebas

- Cada flujo normal y alterno de CU1–CU8 se vuelve una prueba de extremo a extremo (los escenarios del entregable 1 ya están escritos como pasos).
- Pruebas de integración de la BD: las 28 del script 03 + la invariante de existencias + dos salidas simultáneas del mismo producto (no debe quedar existencia negativa).
- Prueba de carga sencilla: 12 usuarios concurrentes (RNF1 / RNF9).
- Prueba de restauración del respaldo antes del arranque.
- Aceptación: el encargado de almacén y la encargada de compras validan cada fase en pruebas antes de pasar a la siguiente.

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Datos del Excel sucios o incompletos | Conteo total como saldo inicial; importación con reporte de errores |
| Internet inestable en Hermosillo | Modo consulta sin conexión; el servidor está en la nube, no en la oficina |
| El equipo se gradúa y nadie da soporte | Documentación + código en un repo del cliente; acordar soporte desde la Fase 0 |
| Alcance que crece (CFDI, CONTPAQi, Guaymas) | Fijado por escrito como fase 2 en la ERS (2.5 y 2.6) |
| Errores al tocar existencias | Transacciones, invariante verificada cada noche, bitácora inmutable |
| Datos personales de empleados | Aviso de privacidad interno (LFPDPPP, ya citada en la ERS) |

## 6. Fuera de la versión 1

- RF15 landed cost → v1.1 (requiere campos de flete, aduana y tipo de cambio; se hace después de que compras esté estable).
- Integración con CONTPAQi y timbrado CFDI 4.0 con PAC (ERS 2.5).
- Sucursal Guaymas y multi-almacén (ERS 2.6). El esquema actual tiene una sola existencia por producto; para multi-almacén habría que pasar la existencia a una tabla producto-ubicación.

## 7. Preguntas abiertas para decidir antes de empezar

1. ¿Es implementación real para Neumática del Pacífico o un prototipo funcional para la escuela? Cambia hosting, migración y soporte.
2. ¿PostgreSQL o hay que mantener SQL Server por la materia de BD?
3. ¿Quién paga hosting/dominio y quién da soporte después de la entrega?
4. ¿El cliente ya tiene lectores de código de barras e impresora? ¿Los productos traen código de barras de fábrica?
5. ¿Se necesita el catálogo de clientes completo o basta con el nombre en la nota de salida?
