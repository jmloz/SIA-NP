// Vuelve a incrustar el diccionario de datos en la sección 7 del explicador y regenera index.html.
// Uso (desde scripts/docx): node actualizar_explicador_dic.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const BD = path.resolve(__dirname, "..", "..", "base-de-datos", "scripts");
const meta = require(path.join(BD, "metadatos_columnas.json"));
const { catalogos, columnas } = require(path.join(BD, "descripciones.js"));

const BYTES = { INT: "4 bytes", BIGINT: "8 bytes", SMALLINT: "2 bytes", TINYINT: "1 byte", DATE: "3 bytes", BIT: "1 bit" };
function tipoYTamano(t) {
  const m = t.match(/^(\w+)\((.+)\)$/);
  if (m && m[1] === "DATETIME2") return ["DATETIME2", "6 bytes"];
  if (m) return [m[1], m[2]];
  return [t, BYTES[t] || "—"];
}
function llave(r) {
  const k = [];
  if (r.pk) k.push("Llave primaria.");
  if (r.fk) k.push(`Llave foránea a ${r.fk}.`);
  if (r.uq && !r.pk) k.push("Valor único.");
  if (!r.nulo && !r.pk && !r.ident && !r.calc) k.push("Obligatorio.");
  return k.join(" ");
}
const datos = catalogos.flatMap((c) => c.tablas).map((t) => [t,
  meta.filter((m) => m.tabla === t).sort((a, b) => a.orden - b.orden).map((r) => {
    const [tipo, tam] = tipoYTamano(r.tipo);
    return [r.columna, `${columnas[t][r.columna]} ${llave(r)}`.trim(), tipo, tam];
  })]);
const total = datos.reduce((a, e) => a + e[1].length, 0);

const EXP = path.resolve(__dirname, "..", "..", "explicador");
const ruta = path.join(EXP, "secciones", "07-diccionario.html");
let s = fs.readFileSync(ruta, "utf8");
const json = JSON.stringify(datos).replace(/\$/g, "$$$$");
s = s.replace(/var DATOS = .*?;\n  SIA/s, () => "var DATOS = " + JSON.stringify(datos) + ";\n  SIA");
s = s.replace(/Tiene <b>\d+ datos<\/b> de <b>\d+ tablas<\/b>/, `Tiene <b>${total} datos</b> de <b>${datos.length} tablas</b>`);
fs.writeFileSync(ruta, s);
let m = fs.readFileSync(path.join(EXP, "marco.html"), "utf8");
m = m.replace(/Los \d+ datos de la base de datos/, `Los ${total} datos de la base de datos`);
fs.writeFileSync(path.join(EXP, "marco.html"), m);
execSync("bash armar.sh", { cwd: EXP, stdio: "inherit" });
console.log(`Sección 7: ${total} datos, ${datos.length} tablas`);
