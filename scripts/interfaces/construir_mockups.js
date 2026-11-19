// Generador de maquetas de las interfaces de entrada del SIA-NP (entregable 09).
// Emite scripts/interfaces/mockups.html con un sistema de diseño estandarizado:
// barra de aplicación con logo SIA-NP, acento índigo, formularios con etiquetas,
// marcas de campo obligatorio y textos de validación. Luego se renderiza a PNG.
//
// Uso (desde scripts/interfaces): node construir_mockups.js
const fs = require("fs");
const path = require("path");

const SALIDA = path.join(__dirname, "mockups.html");

// --------------------------------------------------------------------------
// Logo del sistema (wordmark SVG): recuadro índigo con glifo de caja + "SIA-NP".
// --------------------------------------------------------------------------
const LOGO = `
<span class="logo">
  <svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
    <rect x="1" y="1" width="32" height="32" rx="8" fill="#ffffff" opacity=".16"/>
    <rect x="7" y="10" width="20" height="15" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/>
    <path d="M7 15 h20 M14 10 v5 M20 10 v5" stroke="#fff" stroke-width="2" fill="none"/>
  </svg>
  <span class="logo-txt"><b>SIA-NP</b><small>Neumática del Pacífico</small></span>
</span>`;

// --------------------------------------------------------------------------
// Catálogo de campos. Tipos: text, password, number, select, textarea, date,
// scan (con lector de código de barras), static (solo lectura), checks, radios.
// Cada campo: { l:etiqueta, t:tipo, req, hint:validación, val, ph:placeholder,
//               w:'full'|'half', opts:[...], icono }
// --------------------------------------------------------------------------
function campo(c) {
  const ancho = c.w === "full" ? "campo full" : "campo";
  const etq = `<label>${c.l}${c.req ? '<span class="req">*</span>' : ""}</label>`;
  let control = "";
  const val = c.val != null ? ` value="${c.val}"` : "";
  const ph = c.ph ? ` placeholder="${c.ph}"` : "";
  if (c.t === "select") {
    const ops = (c.opts || []).map((o, i) => `<option${i === 0 && c.val == null ? " selected" : ""}${o === c.val ? " selected" : ""}>${o}</option>`).join("");
    control = `<div class="control sel">${`<select>${ops}</select>`}<span class="flecha">▾</span></div>`;
  } else if (c.t === "textarea") {
    control = `<textarea rows="${c.filas || 2}"${ph}>${c.val || ""}</textarea>`;
  } else if (c.t === "scan") {
    control = `<div class="control"><input type="text"${val}${ph}><span class="scan" title="Lector de código de barras">▐█▌</span></div>`;
  } else if (c.t === "static") {
    control = `<div class="static">${c.val || ""}</div>`;
  } else if (c.t === "checks") {
    control = `<div class="opciones">${(c.opts || []).map((o) => `<label class="op"><input type="checkbox"${o.on ? " checked" : ""}><span>${o.t || o}</span></label>`).join("")}</div>`;
  } else if (c.t === "radios") {
    control = `<div class="opciones">${(c.opts || []).map((o, i) => `<label class="op"><input type="radio" name="${c.l}"${(o.on || (i === 0 && !c.opts.some((x) => x.on))) ? " checked" : ""}><span>${o.t || o}</span></label>`).join("")}</div>`;
  } else {
    const tipo = c.t === "password" ? "password" : c.t === "number" ? "number" : c.t === "date" ? "date" : "text";
    control = `<input type="${tipo}"${val}${ph}>`;
  }
  const hint = c.hint ? `<div class="hint"><span class="v">✓</span>${c.hint}</div>` : "";
  return `<div class="${ancho}">${etq}${control}${hint}</div>`;
}

function seccion(s) {
  return `<div class="seccion">${s.t ? `<div class="seccion-tit">${s.t}</div>` : ""}<div class="campos">${s.campos.map(campo).join("")}</div></div>`;
}

function botones(bs) {
  return `<div class="barra-btn">${bs.map((b) => `<button class="btn ${b.tipo === "prim" ? "btn-prim" : "btn-sec"}">${b.txt}</button>`).join("")}</div>`;
}

function userChip(u) {
  if (!u) return "";
  const ini = u.n.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return `<span class="user"><span class="avatar">${ini}</span><span class="user-txt"><b>${u.n}</b><small>${u.r}</small></span></span>`;
}

// Pantalla normal: barra + cuerpo con secciones + botones + pie.
function pantalla(p) {
  if (p.tipo === "login") return pantallaLogin(p);
  return `
<section class="pantalla" id="${p.id}">
  <div class="barra">
    ${LOGO}
    <span class="barra-tit"><span class="modulo">${p.modulo}</span>${p.titulo}</span>
    ${userChip(p.user)}
  </div>
  <div class="cuerpo">
    ${p.intro ? `<div class="intro">${p.intro}</div>` : ""}
    ${p.secciones.map(seccion).join("")}
    ${botones(p.botones)}
  </div>
  <div class="pie"><span class="id-chip">${p.id}</span>${p.desc}</div>
</section>`;
}

// Pantalla de inicio de sesión: tarjeta centrada, sin barra de usuario.
function pantallaLogin(p) {
  return `
<section class="pantalla login" id="${p.id}">
  <div class="login-fondo">
    <div class="login-card">
      <div class="login-logo">${LOGO}</div>
      <h2>Iniciar sesión</h2>
      <p class="login-sub">Sistema de Inventario y Almacén</p>
      <div class="campos">${p.secciones[0].campos.map(campo).join("")}</div>
      <label class="op recordar"><input type="checkbox"><span>Recordar este equipo</span></label>
      ${botones(p.botones)}
      <div class="login-pie">¿Olvidó su contraseña? Contacte al administrador.</div>
    </div>
  </div>
  <div class="pie"><span class="id-chip">${p.id}</span>${p.desc}</div>
</section>`;
}

// --------------------------------------------------------------------------
// Definición de las 10 pantallas de entrada (campos y validaciones anclados a
// la ERS y a la base de datos del taller).
// --------------------------------------------------------------------------
const U = {
  almacen: { n: "Lodevar Pablovich", r: "Encargado de Almacén" },
  auxiliar: { n: "Ricardo Mendoza", r: "Auxiliar de Almacén" },
  compras: { n: "Karla Domínguez", r: "Encargada de Compras" },
  admin: { n: "Administrador", r: "Administrador" },
};

const PANTALLAS = [
  {
    id: "IE-001", tipo: "login", titulo: "Inicio de sesión", modulo: "Seguridad",
    desc: "Pantalla de inicio de sesión del sistema.",
    secciones: [{ campos: [
      { l: "Usuario", t: "text", req: true, val: "lpablovich", hint: "Mínimo 4 caracteres." },
      { l: "Contraseña", t: "password", req: true, val: "••••••••", hint: "Se bloquea tras 3 intentos fallidos." },
    ] }],
    botones: [{ txt: "Iniciar sesión", tipo: "prim" }],
  },
  {
    id: "IE-002", titulo: "Registrar movimiento", modulo: "Almacén", user: U.auxiliar,
    desc: "Captura de entradas y salidas de mercancía (CU1).",
    intro: "Registre la entrada o salida indicando el producto, la ubicación y el documento que la respalda.",
    secciones: [
      { t: "Datos del movimiento", campos: [
        { l: "Tipo de movimiento", t: "radios", req: true, opts: [{ t: "Entrada" }, { t: "Salida", on: true }, { t: "Ajuste" }, { t: "Devolución" }] },
        { l: "Fecha", t: "date", val: "2026-11-12" },
        { l: "Producto (código o escáner)", t: "scan", req: true, w: "full", val: "RAC-0408 · Racor recto 1/4\" × 8 mm", hint: "El producto debe existir en el catálogo." },
        { l: "Ubicación", t: "select", req: true, opts: ["B-04-2 (pasillo B, anaquel 4, nivel 2)", "C-02-1", "A-01-1"], hint: "Se toma la ubicación asignada al producto." },
        { l: "Existencia actual", t: "static", val: "40 pza" },
        { l: "Cantidad", t: "number", req: true, val: "12", hint: "Mayor a 0; en salidas no puede exceder la existencia." },
        { l: "Documento de referencia", t: "text", req: true, val: "NS-2026-0318", ph: "Factura, OC o vale", hint: "Obligatorio en entradas y salidas." },
      ] },
      { t: "Observaciones", campos: [
        { l: "Motivo / nota", t: "textarea", w: "full", ph: "Obligatorio en ajustes y devoluciones." },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Guardar movimiento", tipo: "prim" }],
  },
  {
    id: "IE-003", titulo: "Alta de producto", modulo: "Catálogos", user: U.almacen,
    desc: "Alta y edición de productos del catálogo (RF2).",
    secciones: [
      { t: "Identificación", campos: [
        { l: "Código interno (SKU)", t: "text", req: true, val: "RAC-0408", hint: "Único; no puede repetirse." },
        { l: "Código de barras", t: "scan", val: "7501000000028", hint: "Opcional, pero no se repite." },
        { l: "Descripción", t: "text", req: true, w: "full", val: "Racor recto 1/4\" NPT × 8 mm", hint: "Obligatoria." },
        { l: "Familia", t: "select", req: true, opts: ["Racores", "Mangueras", "Válvulas", "Cilindros", "Compresores"] },
        { l: "Unidad de medida", t: "select", req: true, opts: ["PZA", "M", "KG", "LT", "JGO", "ROLLO"] },
      ] },
      { t: "Existencias y precios", campos: [
        { l: "Mínimo", t: "number", req: true, val: "30", hint: "Mayor o igual a 0." },
        { l: "Máximo", t: "number", req: true, val: "150", hint: "Mayor o igual al mínimo." },
        { l: "Punto de reorden", t: "number", req: true, val: "40", hint: "Entre el mínimo y el máximo." },
        { l: "Costo unitario", t: "number", req: true, val: "18.00", hint: "Mayor o igual a 0." },
        { l: "Precio de venta", t: "number", req: true, val: "32.00", hint: "Mayor o igual a 0." },
        { l: "Ubicación", t: "select", opts: ["B-04-2", "C-02-1", "A-01-1", "(sin asignar)"] },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Guardar producto", tipo: "prim" }],
  },
  {
    id: "IE-004", titulo: "Alta de ubicación", modulo: "Catálogos", user: U.almacen,
    desc: "Alta y edición de ubicaciones físicas del almacén (RF5).",
    secciones: [
      { t: "Ubicación física", campos: [
        { l: "Clave", t: "text", req: true, val: "B-04-2", hint: "Única, p. ej. B-04-2." },
        { l: "Pasillo", t: "select", req: true, opts: ["A", "B", "C", "P (patio techado)"], val: "B" },
        { l: "Anaquel", t: "number", val: "4", hint: "De 1 a 8; vacío en el patio." },
        { l: "Nivel", t: "number", val: "2", hint: "De 1 a 3; vacío en el patio." },
        { l: "Descripción", t: "text", w: "full", val: "Pasillo B, anaquel 4, nivel 2" },
        { l: "Disponible para asignar", t: "checks", opts: [{ t: "La ubicación está disponible", on: true }] },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Guardar ubicación", tipo: "prim" }],
  },
  {
    id: "IE-005", titulo: "Alta de proveedor", modulo: "Compras", user: U.compras,
    desc: "Alta y edición de proveedores (RF11).",
    secciones: [
      { t: "Datos fiscales", campos: [
        { l: "RFC", t: "text", req: true, val: "FIM990101XY2", hint: "12 o 13 caracteres." },
        { l: "Clasificación", t: "select", req: true, opts: ["Local", "Nacional", "Importación"], val: "Nacional" },
        { l: "Razón social", t: "text", req: true, w: "full", val: "Fluidos Industriales de México" },
      ] },
      { t: "Contacto y entrega", campos: [
        { l: "Nombre de contacto", t: "text", val: "Ana Torres" },
        { l: "Teléfono", t: "text", val: "5555202020" },
        { l: "Correo electrónico", t: "text", val: "ana@fimsa.mx", hint: "Formato nombre@dominio.ext." },
        { l: "Tiempo de entrega (días)", t: "number", req: true, val: "7", hint: "Entre 0 y 180 días." },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Guardar proveedor", tipo: "prim" }],
  },
  {
    id: "IE-006", titulo: "Generar orden de compra", modulo: "Compras", user: U.compras,
    desc: "Captura y emisión de órdenes de compra (CU5).",
    intro: "Agregue los productos a solicitar; el sistema calcula el subtotal, el IVA y el total.",
    secciones: [
      { t: "Encabezado", campos: [
        { l: "Proveedor", t: "select", req: true, w: "full", opts: ["Fluidos Industriales de México (Nacional, 7 días)", "Neumática del Noroeste (Local, 2 días)"], hint: "El proveedor debe estar dado de alta." },
        { l: "Fecha de emisión", t: "date", val: "2026-11-12" },
        { l: "Fecha de entrega estimada", t: "date", val: "2026-11-19", hint: "No puede ser anterior a la emisión." },
      ] },
      { t: "Productos de la orden", campos: [
        { l: "Producto", t: "scan", req: true, w: "full", val: "RAC-0408 · Racor recto 1/4\" × 8 mm", hint: "Cantidad mayor a 0; no se repite el producto en la orden." },
        { l: "Cantidad", t: "number", req: true, val: "100" },
        { l: "Costo unitario", t: "number", req: true, val: "18.00" },
      ] },
      { t: "Totales", campos: [
        { l: "Subtotal", t: "static", val: "$6,000.00" },
        { l: "IVA (16%)", t: "static", val: "$960.00" },
        { l: "Total", t: "static", val: "$6,960.00" },
      ] },
    ],
    botones: [{ txt: "Guardar borrador", tipo: "sec" }, { txt: "Emitir orden", tipo: "prim" }],
  },
  {
    id: "IE-007", titulo: "Recepción de mercancía", modulo: "Compras", user: U.compras,
    desc: "Registro de recepción de mercancía contra una orden de compra (CU6).",
    intro: "Busque la orden de compra y capture las cantidades recibidas; el saldo pendiente se calcula solo.",
    secciones: [
      { t: "Orden y factura", campos: [
        { l: "Orden de compra", t: "select", req: true, opts: ["OC-2026-0147 — Fluidos Industriales (Emitida)", "OC-2026-0150 — Neumática del Noroeste"], hint: "Debe existir y estar abierta." },
        { l: "Factura del proveedor", t: "text", req: true, val: "F-A-88213", hint: "Obligatoria." },
        { l: "Tipo de recepción", t: "radios", req: true, opts: [{ t: "Total" }, { t: "Parcial", on: true }] },
        { l: "Fecha de recepción", t: "date", val: "2026-11-12" },
      ] },
      { t: "Productos recibidos", campos: [
        { l: "Producto", t: "static", w: "full", val: "RAC-0408 — Racor recto 1/4\" NPT × 8 mm" },
        { l: "Solicitado", t: "static", val: "100" },
        { l: "Recibido", t: "number", req: true, val: "60", hint: "No puede exceder el saldo pendiente." },
        { l: "Ubicación de entrada", t: "select", req: true, opts: ["B-04-2", "C-02-1", "A-01-1"] },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Registrar recepción", tipo: "prim" }],
  },
  {
    id: "IE-008", titulo: "Registrar devolución de cliente", modulo: "Almacén", user: U.almacen,
    desc: "Captura de devoluciones de cliente (CU4).",
    secciones: [
      { t: "Documento de venta", campos: [
        { l: "Cliente", t: "text", req: true, val: "Taller Mecánico del Norte", hint: "Si no existe, se puede dar de alta." },
        { l: "Nota de salida / factura", t: "select", req: true, opts: ["NS-2026-0318 (12/11/2026)", "NS-2026-0305"], hint: "Respalda la venta original." },
      ] },
      { t: "Mercancía devuelta", campos: [
        { l: "Producto", t: "static", w: "full", val: "RAC-0408 — Racor recto 1/4\" NPT × 8 mm" },
        { l: "Cantidad vendida", t: "static", val: "12" },
        { l: "Cantidad devuelta", t: "number", req: true, val: "2", hint: "No puede exceder la cantidad vendida." },
        { l: "Estado de la mercancía", t: "radios", req: true, opts: [{ t: "Buen estado (reingresa)" }, { t: "Dañada (resguardo)" }] },
        { l: "Motivo de la devolución", t: "textarea", req: true, w: "full", val: "Pieza con rosca equivocada; en buen estado.", hint: "Obligatorio." },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Registrar devolución", tipo: "prim" }],
  },
  {
    id: "IE-009", titulo: "Captura de inventario físico", modulo: "Almacén", user: U.almacen,
    desc: "Captura de conteos de inventario físico (CU3).",
    intro: "Conteo a ciegas: no se muestra la existencia del sistema hasta cerrar el conteo.",
    secciones: [
      { t: "Conteo", campos: [
        { l: "Tipo de conteo", t: "radios", req: true, opts: [{ t: "Cíclico (por familia)", on: true }, { t: "Total (todo el almacén)" }] },
        { l: "Familia", t: "select", req: true, opts: ["Racores", "Mangueras", "Válvulas", "Cilindros"], hint: "Obligatoria en el conteo cíclico." },
      ] },
      { t: "Productos a contar", campos: [
        { l: "Producto", t: "static", w: "full", val: "RAC-0408 — Racor recto 1/4\" NPT × 8 mm · B-04-2" },
        { l: "Cantidad contada", t: "number", req: true, val: "26", hint: "Mayor o igual a 0." },
        { l: "Producto", t: "static", w: "full", val: "RAC-0612 — Racor recto 3/8\" NPT × 12 mm · B-04-3" },
        { l: "Cantidad contada", t: "number", req: true, val: "18", hint: "Mayor o igual a 0." },
      ] },
    ],
    botones: [{ txt: "Guardar avance", tipo: "sec" }, { txt: "Cerrar conteo", tipo: "prim" }],
  },
  {
    id: "IE-010", titulo: "Alta de usuario", modulo: "Seguridad", user: U.admin,
    desc: "Alta y edición de usuarios del sistema (RF1).",
    secciones: [
      { t: "Cuenta", campos: [
        { l: "Nombre de usuario", t: "text", req: true, val: "rmendoza", hint: "Único; mínimo 4 caracteres." },
        { l: "Rol", t: "select", req: true, opts: ["Encargado de Almacén", "Auxiliar de Almacén", "Encargada de Compras", "Dirección General", "Administrador"], val: "Auxiliar de Almacén" },
        { l: "Nombre completo", t: "text", req: true, w: "full", val: "Ricardo Mendoza Quintero" },
        { l: "Correo electrónico", t: "text", val: "rmendoza@neumaticadelpacifico.mx", hint: "Formato nombre@dominio.ext." },
        { l: "Cuenta activa", t: "checks", opts: [{ t: "El usuario puede iniciar sesión", on: true }] },
      ] },
      { t: "Contraseña", campos: [
        { l: "Contraseña", t: "password", req: true, val: "••••••••", hint: "Se guarda cifrada (hash)." },
        { l: "Confirmar contraseña", t: "password", req: true, val: "••••••••", hint: "Debe coincidir con la anterior." },
      ] },
    ],
    botones: [{ txt: "Cancelar", tipo: "sec" }, { txt: "Guardar usuario", tipo: "prim" }],
  },
];

// --------------------------------------------------------------------------
// Documento HTML con el sistema de diseño.
// --------------------------------------------------------------------------
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e2e8f0;font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:24px}
.pantalla{width:940px;background:#fff;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin:0 0 40px;box-shadow:0 10px 30px rgba(30,41,59,.14)}
.barra{display:flex;align-items:center;gap:16px;background:linear-gradient(90deg,#3730a3,#4f46e5);color:#fff;padding:12px 20px}
.logo{display:flex;align-items:center;gap:9px}
.logo-txt{display:flex;flex-direction:column;line-height:1.05}
.logo-txt b{font-size:17px;letter-spacing:.3px}
.logo-txt small{font-size:10.5px;opacity:.85}
.barra-tit{flex:1;display:flex;flex-direction:column;line-height:1.15;font-size:18px;font-weight:bold;padding-left:6px;border-left:1px solid rgba(255,255,255,.3)}
.barra-tit .modulo{font-size:11px;font-weight:normal;text-transform:uppercase;letter-spacing:1px;opacity:.85}
.user{display:flex;align-items:center;gap:9px}
.avatar{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold}
.user-txt{display:flex;flex-direction:column;line-height:1.1;text-align:right}
.user-txt b{font-size:13px}
.user-txt small{font-size:10.5px;opacity:.85}
.cuerpo{padding:22px 24px 24px}
.intro{font-size:13.5px;color:#475569;margin-bottom:16px;padding:9px 13px;background:#eef2ff;border-left:3px solid #4f46e5;border-radius:4px}
.seccion{margin-bottom:18px}
.seccion-tit{font-size:11.5px;font-weight:bold;text-transform:uppercase;letter-spacing:.8px;color:#4338ca;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:12px}
.campos{display:grid;grid-template-columns:1fr 1fr;gap:13px 20px}
.campo{display:flex;flex-direction:column}
.campo.full{grid-column:1 / -1}
.campo label{font-size:13px;font-weight:bold;color:#334155;margin-bottom:5px}
.req{color:#dc2626;margin-left:3px}
.campo input,.campo select,.campo textarea{font-family:inherit;font-size:14px;color:#1e293b;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;width:100%}
.campo input::placeholder,.campo textarea::placeholder{color:#94a3b8}
.control{position:relative;display:flex;align-items:center}
.control.sel{display:block}
.control .flecha{position:absolute;right:11px;top:9px;color:#64748b;pointer-events:none}
.control .scan{position:absolute;right:10px;color:#4f46e5;font-size:15px;letter-spacing:-2px}
.campo select{appearance:none;-webkit-appearance:none;padding-right:28px}
.static{font-size:14px;padding:9px 11px;border:1px solid #e2e8f0;border-radius:7px;background:#f8fafc;color:#475569;font-weight:bold}
.opciones{display:flex;flex-wrap:wrap;gap:8px 18px;padding-top:3px}
.op{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:normal;color:#334155;cursor:default}
.op input{width:16px;height:16px;accent-color:#4f46e5}
.hint{font-size:12px;color:#64748b;margin-top:5px;display:flex;align-items:center;gap:5px}
.hint .v{color:#16a34a;font-weight:bold}
.barra-btn{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:16px;border-top:1px solid #e2e8f0}
.btn{font-family:inherit;font-size:14px;font-weight:bold;padding:10px 20px;border-radius:7px;border:1px solid transparent;cursor:pointer}
.btn-prim{background:#4f46e5;color:#fff}
.btn-sec{background:#fff;color:#334155;border-color:#cbd5e1}
.pie{display:flex;align-items:center;gap:10px;background:#f8fafc;border-top:1px solid #e2e8f0;padding:9px 20px;font-size:12.5px;color:#64748b}
.id-chip{background:#4338ca;color:#fff;font-weight:bold;font-size:12px;padding:2px 9px;border-radius:999px;letter-spacing:.5px}
/* Inicio de sesión */
.pantalla.login{width:940px}
.login-fondo{background:linear-gradient(135deg,#3730a3,#4f46e5);padding:34px;display:flex;justify-content:center}
.login-card{background:#fff;border-radius:12px;padding:30px 34px;width:390px;box-shadow:0 12px 30px rgba(0,0,0,.25);text-align:center}
.login-logo{display:flex;justify-content:center;margin-bottom:14px}
.login-logo .logo-txt b{color:#312e81}
.login-logo .logo-txt small{color:#6366f1}
.login-logo svg rect[opacity]{fill:#4f46e5;opacity:.14}
.login-logo svg rect[stroke],.login-logo svg path{stroke:#4f46e5}
.login-card h2{font-size:20px;color:#1e293b;margin-bottom:3px}
.login-sub{font-size:13px;color:#64748b;margin-bottom:20px}
.login-card .campo{text-align:left;margin-bottom:14px}
.login-card .recordar{justify-content:flex-start;margin-bottom:18px}
.login-card .barra-btn{justify-content:center;border-top:none;padding-top:0}
.login-card .btn-prim{width:100%;padding:11px}
.login-pie{font-size:12px;color:#94a3b8;margin-top:16px}
`;

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Maquetas de interfaces de entrada — SIA-NP</title>
<style>${CSS}</style></head><body>
${PANTALLAS.map(pantalla).join("\n")}
</body></html>`;

fs.writeFileSync(SALIDA, html);
console.log("Escrito", SALIDA, "con", PANTALLAS.length, "pantallas");

// Exporta la relación de interfaces para el generador del documento y el explicador.
const RELACION = [
  ["IE-001", "Pantalla de inicio de sesión del sistema.", "RF1 (autenticación y permisos por rol)", "Usuario de 4+ caracteres; bloqueo tras 3 intentos fallidos; cuenta activa.", "Todos los usuarios del sistema"],
  ["IE-002", "Captura de entradas y salidas de mercancía.", "RF3 Registro de movimientos; RF8 Nota de salida; RF9 Código de barras", "Cantidad mayor a 0; en salidas no excede la existencia; documento obligatorio; producto existente.", "Encargado y Auxiliar de Almacén"],
  ["IE-003", "Alta y edición de productos del catálogo.", "RF2 Catálogo de productos; RF5 Ubicaciones", "Código interno único; máximo ≥ mínimo; reorden entre mínimo y máximo; precios ≥ 0; unidad de la lista.", "Encargado de Almacén; Administrador"],
  ["IE-004", "Alta y edición de ubicaciones físicas.", "RF5 Ubicaciones físicas del almacén", "Clave única; pasillo A/B/C/P; anaquel 1–8 y nivel 1–3 (salvo patio).", "Encargado de Almacén; Administrador"],
  ["IE-005", "Alta y edición de proveedores.", "RF11 Gestión de proveedores y precios", "RFC de 12–13 caracteres; clasificación de la lista; correo con formato válido; lead time 0–180 días.", "Encargada de Compras"],
  ["IE-006", "Captura y emisión de órdenes de compra.", "RF12 Generación de órdenes de compra; RF14 Reorden", "Cantidad mayor a 0; producto no repetido; fecha de entrega ≥ emisión; proveedor existente.", "Encargada de Compras"],
  ["IE-007", "Registro de recepción de mercancía contra OC.", "RF13 Recepción de mercancía contra OC", "Cantidad recibida ≤ saldo pendiente; factura obligatoria; la OC debe existir y estar abierta.", "Encargada de Compras; Encargado de Almacén"],
  ["IE-008", "Captura de devoluciones de cliente.", "RF7 Devoluciones de cliente", "Cantidad devuelta ≤ cantidad vendida; motivo obligatorio; documento de venta válido.", "Encargado y Auxiliar de Almacén"],
  ["IE-009", "Captura de conteos de inventario físico.", "RF6 Inventario físico cíclico y completo", "Cantidad contada ≥ 0; el conteo cíclico exige familia; conteo a ciegas.", "Encargado de Almacén"],
  ["IE-010", "Alta y edición de usuarios del sistema.", "RF1 Autenticación y permisos por rol", "Usuario único de 4+ caracteres; correo con formato; rol de la lista; contraseña confirmada.", "Administrador"],
];
fs.writeFileSync(path.join(__dirname, "relacion.json"), JSON.stringify(RELACION, null, 2));
console.log("Escrito relacion.json con", RELACION.length, "filas");
