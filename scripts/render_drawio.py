"""Dibuja las paginas de un .drawio a PDF vectorial con PyMuPDF (no necesita draw.io).

Uso:
    python render_drawio.py entrada.drawio salida.pdf [--png pagina salida.png --dpi 200]

Cada pagina (<diagram>) del .drawio se dibuja en una pagina del PDF a escala 1.
El modulo tambien se usa desde actualizar_pdf_clases.py y verificar_clases.py:
    cargar(ruta) -> lista de paginas con cajas, notas, relaciones y etiquetas ya
    calculadas; dibujar(pagina_pdf, diagrama, x0, y0, escala) dibuja un diagrama.
Soporta lo que usa construir_drawio.py: clases swimlane de tres compartimentos,
notas shape=note, cajas simples, aristas con puntos intermedios, exitX/entryX,
puntas block / open / diamondThin, lineas punteadas y etiquetas con fondo blanco.
"""
import argparse
import base64
import html
import math
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

import pymupdf

from modelo_clases import ancho, ruta_fuente

NEGRO = (0, 0, 0)
BLANCO = (1, 1, 1)
GRIS = (0xE6 / 255.0, 0xE6 / 255.0, 0xE6 / 255.0)
PITCH = 13.5          # separacion de lineas en los compartimentos
LARGO_TRI = 14        # triangulo de generalizacion
LARGO_ABIERTA = 10    # flecha abierta de dependencia
LARGO_ROMBO = 18      # diamante
ANCHO_ROMBO = 6       # semiancho del diamante


# ----------------------------------------------------------------- lectura
def _estilo(s):
    d = {}
    for parte in (s or "").split(";"):
        if not parte:
            continue
        if "=" in parte:
            k, v = parte.split("=", 1)
            d[k] = v
        else:
            d[parte] = ""
    return d


def _lineas_html(valor):
    """'<i>a</i><br><b>b</b>' -> [('a','i'), ('b','b')]"""
    out = []
    for lin in re.split(r"<br\s*/?>", valor or ""):
        fmt = ""
        if "<b>" in lin:
            fmt += "b"
        if "<i>" in lin:
            fmt += "i"
        out.append((html.unescape(re.sub(r"<[^>]+>", "", lin)), fmt))
    return out


def _texto_plano(valor):
    return html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", "\n", valor or "")))


def _geom(c):
    g = c.find("mxGeometry")
    return g


def _xml_diagrama(d):
    """Devuelve el elemento mxGraphModel de un <diagram> (comprimido o no)."""
    m = d.find("mxGraphModel")
    if m is not None:
        return m
    datos = (d.text or "").strip()
    raw = zlib.decompress(base64.b64decode(datos), -15)
    return ET.fromstring(urllib.parse.unquote(raw.decode("utf8")))


def cargar(ruta):
    arbol = ET.parse(ruta)
    paginas = []
    for d in arbol.getroot().iter("diagram"):
        paginas.append(_cargar_pagina(d.get("name"), _xml_diagrama(d)))
    return paginas


def _cargar_pagina(nombre, modelo):
    cells = {c.get("id"): c for c in modelo.iter("mxCell")}
    hijos = {}
    for c in cells.values():
        hijos.setdefault(c.get("parent"), []).append(c)
    cajas, aristas = {}, {}
    for cid, c in cells.items():
        st = _estilo(c.get("style"))
        g = _geom(c)
        if c.get("vertex") == "1" and c.get("parent") in ("1", None):
            x, y = float(g.get("x")), float(g.get("y"))
            w, h = float(g.get("width")), float(g.get("height"))
            caja = dict(id=cid, x=x, y=y, w=w, h=h, valor=c.get("value") or "", estilo=st)
            if "swimlane" in st or "swimlane" in (c.get("style") or "").split(";")[0]:
                caja["tipo"] = "clase"
                caja["inicio"] = float(st.get("startSize", 26))
                caja["encabezado"] = _lineas_html(c.get("value"))
                textos, lineas = [], []
                for k in hijos.get(cid, []):
                    kg = _geom(k)
                    ks = k.get("style") or ""
                    if ks.startswith("line;"):
                        lineas.append(float(kg.get("y")))
                    elif ks.startswith("text;"):
                        textos.append((float(kg.get("y")), _lineas_html(k.get("value")),
                                       float(kg.get("height"))))
                textos.sort()
                lineas.sort()
                caja["attrs"] = [t for t, f in textos[0][1] if t] if len(textos) > 0 else []
                caja["mets"] = [t for t, f in textos[1][1] if t] if len(textos) > 1 else []
                caja["y_attrs"] = textos[0][0] if textos else caja["inicio"]
                caja["y_mets"] = textos[1][0] if len(textos) > 1 else None
                caja["y_sep"] = lineas[0] if lineas else None
            elif "shape" in st and st["shape"] == "note":
                caja["tipo"] = "nota"
                caja["lineas"] = [t for t, f in _lineas_html(c.get("value"))]
                caja["doblez"] = float(st.get("size", 14))
            else:
                caja["tipo"] = "stub"
                caja["encabezado"] = _lineas_html(c.get("value"))
            cajas[cid] = caja
        elif c.get("edge") == "1":
            pts = [(float(p.get("x")), float(p.get("y")))
                   for p in g.iter("mxPoint") if p.get("as") is None]
            tp = g.find("mxPoint[@as='targetPoint']")
            sp = g.find("mxPoint[@as='sourcePoint']")
            off = g.find("mxPoint[@as='offset']")
            aristas[cid] = dict(
                id=cid, origen=c.get("source"), destino=c.get("target"), estilo=st,
                valor=_texto_plano(c.get("value")), via=pts,
                tp=(float(tp.get("x")), float(tp.get("y"))) if tp is not None else None,
                sp=(float(sp.get("x")), float(sp.get("y"))) if sp is not None else None,
                gx=float(g.get("x", 0)), gy=float(g.get("y", 0)),
                off=(float(off.get("x")), float(off.get("y"))) if off is not None else (0, 0),
                etiquetas=[])
    for cid, c in cells.items():
        if "edgeLabel" in (c.get("style") or "") and c.get("parent") in aristas:
            g = _geom(c)
            off = g.find("mxPoint[@as='offset']")
            aristas[c.get("parent")]["etiquetas"].append(dict(
                valor=_texto_plano(c.get("value")), gx=float(g.get("x", 0)),
                gy=float(g.get("y", 0)),
                off=(float(off.get("x")), float(off.get("y"))) if off is not None else (0, 0),
                size=float(_estilo(c.get("style")).get("fontSize", 10))))
    pag = dict(nombre=nombre, cajas=cajas, aristas=aristas)
    _calcular(pag)
    return pag


# --------------------------------------------------------------- geometria
def _rect(caja):
    return caja["x"], caja["y"], caja["w"], caja["h"]


def _perimetro(caja, hacia):
    """Punto del borde de la caja en la recta del centro hacia un punto."""
    x, y, w, h = _rect(caja)
    cx, cy = x + w / 2.0, y + h / 2.0
    dx, dy = hacia[0] - cx, hacia[1] - cy
    if dx == 0 and dy == 0:
        return cx, cy
    t = min((w / 2.0) / abs(dx) if dx else 1e9, (h / 2.0) / abs(dy) if dy else 1e9)
    return cx + dx * t, cy + dy * t


def _centro(caja):
    return caja["x"] + caja["w"] / 2.0, caja["y"] + caja["h"] / 2.0


def _extremo(arista, caja, pref, otro):
    st = arista["estilo"]
    if caja is not None and (pref + "X") in st:
        return (caja["x"] + float(st[pref + "X"]) * caja["w"],
                caja["y"] + float(st[pref + "Y"]) * caja["h"])
    if caja is not None:
        return _perimetro(caja, otro)
    return None


def _longitud(pts):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))


def punto_en(pts, t):
    """Punto a la fraccion t (0..1) de la longitud de la polilinea."""
    total = _longitud(pts)
    d = t * total
    for a, b in zip(pts, pts[1:]):
        l = math.hypot(b[0] - a[0], b[1] - a[1])
        if d <= l or b is pts[-1]:
            f = d / l if l else 0
            return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
        d -= l
    return pts[-1]


def _calcular(pag):
    cajas = pag["cajas"]
    for a in pag["aristas"].values():
        o, d = cajas.get(a["origen"]), cajas.get(a["destino"])
        via = a["via"]
        sig_o = via[0] if via else (_centro(d) if d else a["tp"])
        sig_d = via[-1] if via else (_centro(o) if o else a["sp"])
        p0 = _extremo(a, o, "exit", sig_o) or a["sp"]
        p1 = _extremo(a, d, "entry", sig_d) or a["tp"]
        a["ruta"] = [p0] + list(via) + [p1]
        # etiquetas: (texto, centro, ancho, alto)
        a["rotulos"] = []
        if a["valor"]:
            a["rotulos"].append(_rotulo(a["ruta"], a["valor"], a["gx"], a["off"], 11))
        for e in a["etiquetas"]:
            a["rotulos"].append(_rotulo(a["ruta"], e["valor"], e["gx"], e["off"], e["size"]))


def _rotulo(ruta, texto, gx, off, size):
    px, py = punto_en(ruta, (gx + 1) / 2.0)
    c = (px + off[0], py + off[1])
    return dict(texto=texto, c=c, w=ancho(texto, size) + 4, h=size + 3, size=size)


def limites(pag):
    xs, ys = [], []
    for c in pag["cajas"].values():
        xs += [c["x"], c["x"] + c["w"]]
        ys += [c["y"], c["y"] + c["h"]]
    for a in pag["aristas"].values():
        for p in a["ruta"]:
            xs.append(p[0])
            ys.append(p[1])
        for r in a["rotulos"]:
            xs += [r["c"][0] - r["w"] / 2, r["c"][0] + r["w"] / 2]
            ys += [r["c"][1] - r["h"] / 2, r["c"][1] + r["h"] / 2]
    return min(xs), min(ys), max(xs), max(ys)


# ----------------------------------------------------------------- dibujo
class Pintor:
    def __init__(self, pagina, x0, y0, escala, minx, miny):
        self.p = pagina
        self.s = escala
        self.ox = x0 - minx * escala
        self.oy = y0 - miny * escala
        self.sh = pagina.new_shape()
        self.textos = []   # (x, y, texto, estilo, tam)
        self.fuentes = {}

    def X(self, x):
        return self.ox + x * self.s

    def Y(self, y):
        return self.oy + y * self.s

    def pt(self, p):
        return pymupdf.Point(self.X(p[0]), self.Y(p[1]))

    def linea(self, pts, ancho_l=1.0, punteada=False, cerrada=False, relleno=None):
        sh = self.sh
        sh.draw_polyline([self.pt(p) for p in pts])
        if cerrada:
            sh.draw_line(self.pt(pts[-1]), self.pt(pts[0]))
        sh.finish(color=NEGRO, fill=relleno, width=ancho_l * self.s,
                  dashes="[%.2f %.2f] 0" % (4 * self.s, 3 * self.s) if punteada else None,
                  closePath=False, lineCap=0, lineJoin=0)

    def rect(self, x, y, w, h, relleno=None, borde=True, ancho_l=1.0):
        self.sh.draw_rect(pymupdf.Rect(self.X(x), self.Y(y), self.X(x + w), self.Y(y + h)))
        self.sh.finish(color=NEGRO if borde else None, fill=relleno, width=ancho_l * self.s)

    def texto(self, x, y, txt, estilo="regular", tam=11, centro=False):
        """(x, y) = punto base; si centro, x es el centro horizontal."""
        if centro:
            x = x - ancho(txt, tam, estilo) / 2.0
        self.textos.append((x, y, txt, estilo, tam))

    def cerrar(self):
        self.sh.commit()
        tw = pymupdf.TextWriter(self.p.rect)
        for x, y, txt, estilo, tam in self.textos:
            f = self.fuentes.get(estilo)
            if f is None:
                f = self.fuentes[estilo] = pymupdf.Font(fontfile=ruta_fuente(estilo))
            tw.append((self.X(x), self.Y(y)), txt, font=f, fontsize=tam * self.s)
        tw.write_text(self.p, color=NEGRO)


def _estilo_fmt(fmt):
    return {"": "regular", "b": "bold", "i": "italic", "bi": "bolditalic", "ib": "bolditalic"}[fmt]


def _dibujar_caja(pt, c):
    x, y, w, h = _rect(c)
    if c["tipo"] == "clase":
        pt.rect(x, y, w, h, BLANCO)
        pt.rect(x, y, w, c["inicio"], GRIS)
        lineas = c["encabezado"]
        n = len(lineas)
        # centrado vertical de las lineas del encabezado
        total = n * 14.5
        y0 = y + (c["inicio"] - total) / 2.0
        for i, (t, f) in enumerate(lineas):
            pt.texto(x + w / 2.0, y0 + i * 14.5 + 11.5, t, _estilo_fmt(f), 12, centro=True)
        if c["y_sep"] is not None:
            pt.linea([(x, y + c["y_sep"] + 0.0), (x + w, y + c["y_sep"] + 0.0)])
        for i, t in enumerate(c["attrs"]):
            pt.texto(x + 6, y + c["y_attrs"] + 5 + i * PITCH + 10, t)
        if c["y_mets"] is not None:
            for i, t in enumerate(c["mets"]):
                pt.texto(x + 6, y + c["y_mets"] + 5 + i * PITCH + 10, t)
    elif c["tipo"] == "stub":
        pt.rect(x, y, w, h, GRIS)
        for t, f in c["encabezado"]:
            pt.texto(x + w / 2.0, y + h / 2.0 + 4.2, t, _estilo_fmt(f), 12, centro=True)
    elif c["tipo"] == "nota":
        d = c["doblez"]
        pts = [(x, y), (x + w - d, y), (x + w, y + d), (x + w, y + h), (x, y + h)]
        pt.linea(pts, cerrada=True, relleno=BLANCO)
        pt.linea([(x + w - d, y), (x + w - d, y + d), (x + w, y + d)])
        for i, t in enumerate(c["lineas"]):
            pt.texto(x + 6, y + 6 + i * 13 + 9.5, t, "regular", 10)


def _flecha(pt, p, q, tipo, relleno):
    """Punta en p; q es el punto siguiente de la polilinea (define la direccion)."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    l = math.hypot(dx, dy) or 1.0
    ux, uy = dx / l, dy / l            # hacia dentro de la linea
    nx, ny = -uy, ux
    if tipo == "block":
        a = (p[0] + ux * LARGO_TRI + nx * 7, p[1] + uy * LARGO_TRI + ny * 7)
        b = (p[0] + ux * LARGO_TRI - nx * 7, p[1] + uy * LARGO_TRI - ny * 7)
        pt.linea([p, a, b], cerrada=True, relleno=BLANCO)
    elif tipo == "open":
        a = (p[0] + ux * LARGO_ABIERTA + nx * 5, p[1] + uy * LARGO_ABIERTA + ny * 5)
        b = (p[0] + ux * LARGO_ABIERTA - nx * 5, p[1] + uy * LARGO_ABIERTA - ny * 5)
        pt.linea([a, p, b])
    elif tipo == "diamond":
        m = (p[0] + ux * LARGO_ROMBO / 2, p[1] + uy * LARGO_ROMBO / 2)
        a = (m[0] + nx * ANCHO_ROMBO, m[1] + ny * ANCHO_ROMBO)
        b = (m[0] - nx * ANCHO_ROMBO, m[1] - ny * ANCHO_ROMBO)
        f = (p[0] + ux * LARGO_ROMBO, p[1] + uy * LARGO_ROMBO)
        pt.linea([p, a, f, b], cerrada=True, relleno=NEGRO if relleno else BLANCO)


def _dibujar_arista(pt, a):
    st = a["estilo"]
    ruta = list(a["ruta"])
    pt.linea(ruta, punteada=st.get("dashed") == "1")
    fin = st.get("endArrow", "classic")
    if fin in ("block", "open"):
        _flecha(pt, ruta[-1], ruta[-2], fin, st.get("endFill", "1") == "1")
    ini = st.get("startArrow")
    if ini and ini != "none":
        _flecha(pt, ruta[0], ruta[1], "diamond" if "diamond" in ini else ini,
                st.get("startFill", "1") == "1")


def dibujar(pagina_pdf, pag, x0, y0, escala, limites_pag=None):
    """Dibuja el diagrama con su esquina superior izquierda en (x0, y0) del PDF."""
    minx, miny, _, _ = limites_pag or limites(pag)
    pt = Pintor(pagina_pdf, x0, y0, escala, minx, miny)
    for a in pag["aristas"].values():
        _dibujar_arista(pt, a)
    for c in pag["cajas"].values():
        _dibujar_caja(pt, c)
    for a in pag["aristas"].values():
        for r in a["rotulos"]:
            pt.rect(r["c"][0] - r["w"] / 2, r["c"][1] - r["h"] / 2, r["w"], r["h"],
                    BLANCO, borde=False)
            pt.texto(r["c"][0], r["c"][1] + r["size"] * 0.36, r["texto"], "regular",
                     r["size"], centro=True)
    pt.cerrar()


def exportar_pdf(ruta_drawio, ruta_pdf, margen=20):
    doc = pymupdf.open()
    for pag in cargar(ruta_drawio):
        l = limites(pag)
        w, h = l[2] - l[0] + 2 * margen, l[3] - l[1] + 2 * margen
        p = doc.new_page(width=w, height=h)
        dibujar(p, pag, margen, margen, 1.0, l)
    doc.save(ruta_pdf, garbage=3, deflate=True)
    return doc


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("drawio")
    ap.add_argument("pdf")
    ap.add_argument("--png", nargs=2, metavar=("PAGINA", "SALIDA"),
                    help="exporta una pagina (1 = Figura 1) a PNG")
    ap.add_argument("--dpi", type=int, default=200)
    a = ap.parse_args(argv)
    doc = exportar_pdf(a.drawio, a.pdf)
    if a.png:
        n = int(a.png[0]) - 1
        doc[n].get_pixmap(dpi=a.dpi, alpha=False).save(a.png[1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
