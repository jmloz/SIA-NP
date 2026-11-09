"""Diagrama de estados de la clase OrdenDeCompra (entregable 06).

Uso (desde la raiz del repositorio o desde cualquier carpeta):
    python scripts/estados/diagrama_estados.py

A partir de UNA definicion (NODOS y ARISTAS, mas abajo) genera:
  entregables/06-estados/Diagrama_de_Estados_SIA-NP.drawio      (editable en draw.io)
  entregables/06-estados/Diagrama_de_Estados_SIA-NP_figura.pdf  (vectorial, PyMuPDF)
  entregables/06-estados/Diagrama_de_Estados_SIA-NP.png         (200 dpi, para el .docx)
y comprueba que ninguna etiqueta se encime con lineas, estados u otras etiquetas.

Notacion (Kendall & Kendall, cap. 10, pp. 309-311): estados como rectangulos
redondeados, transiciones "evento [guarda] / accion", inicio = circulo relleno,
fin = circulos concentricos con el centro relleno. Todo en negro, Arial.
"""
import html
import math
import os
import sys
import xml.etree.ElementTree as ET

import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.dirname(AQUI)
RAIZ = os.path.dirname(SCRIPTS)
sys.path.insert(0, SCRIPTS)
from modelo_clases import ancho, ruta_fuente          # noqa: E402
from actualizar_pdf_clases import arreglar_tounicode  # noqa: E402

SALIDA = os.path.join(RAIZ, "entregables", "06-estados")
BASE = "Diagrama_de_Estados_SIA-NP"

NEGRO = (0, 0, 0)
BLANCO = (1, 1, 1)
F_NOMBRE = 11       # nombre del estado
F_ACT = 10          # actividades entry/do/exit
F_ETIQ = 10         # etiquetas de transicion
ALTO_NOMBRE = 28    # alto del compartimento del nombre
PASO = 14           # alto por linea de actividad / etiqueta
PAD_ACT = 6         # relleno vertical del compartimento de actividades
RADIO = 8           # radio de las esquinas redondeadas
FLECHA_L, FLECHA_A = 10, 5   # punta abierta: largo y semiancho

# ------------------------------------------------------------------ definicion
# Columna principal y columnas auxiliares (coordenadas en puntos)
XB = 20             # linea de la transicion Emitida -> Recibida (lado izquierdo)
X0, W = 200, 210    # estados principales
XC = X0 + W / 2     # eje de la columna principal
XL = X0 + W + 35    # autotransicion de Parcialmente recibida
XK, WK = 470, 120   # estado Cancelada


def estado(nombre, x, y, w, actividades=()):
    h = ALTO_NOMBRE + (2 * PAD_ACT + PASO * len(actividades) if actividades else 6)
    return dict(tipo="estado", nombre=nombre, x=x, y=y, w=w, h=h, actividades=list(actividades))


NODOS = {
    "ini": dict(tipo="inicial", x=XC - 10, y=10, w=20, h=20),
    "pend": estado("Pendiente", X0, 70, W,
                   ["entry / guardarBorrador()", "do / agregarProducto(producto, cantidad)"]),
    "emit": estado("Emitida", X0, 230, W, ["entry / generarDocumento()"]),
    "parc": estado("Parcialmente recibida", X0, 400, W, ["entry / actualizarEstado(diferencias)"]),
    "rec": estado("Recibida", X0, 570, W, ["entry / actualizarEstado(diferencias)"]),
    "cer": estado("Cerrada", X0, 700, W),
    "fin": dict(tipo="final", x=XC - 12, y=790, w=24, h=24),
    "can": estado("Cancelada", XK, 168, WK),
}
NODOS["fin2"] = dict(tipo="final", x=XK + WK + 30, y=NODOS["can"]["y"] + NODOS["can"]["h"] / 2 - 12,
                     w=24, h=24)


def _n(k):
    return NODOS[k]


def abajo(k):
    n = _n(k)
    return (n["x"] + n["w"] / 2, n["y"] + n["h"])


def arriba(k):
    n = _n(k)
    return (n["x"] + n["w"] / 2, n["y"])


def lado(k, cual, fy=0.5):
    n = _n(k)
    return (n["x"] + (n["w"] if cual == "der" else 0), n["y"] + n["h"] * fy)


EV_RECEP = "se recibió mercancía"
AC_RECEP = "/ compararCantidades(cantidades)"
G_SALDO = "[calcularSaldoPendiente() > 0]"
G_CERO = "[calcularSaldoPendiente() = 0]"

# Cada arista: ruta completa (de la orilla del origen a la orilla del destino),
# lineas de la etiqueta y su posicion: ("der"|"izq"|"arriba"|"abajo", segmento, t)
# o un centro absoluto.
_pe, _ce = lado("pend", "der", 0.3), lado("emit", "der", 0.5)
_ck = _n("can")
ARISTAS = [
    dict(id="t1", o="ini", d="pend", ruta=[abajo("ini"), arriba("pend")],
         etiqueta=["se creó la orden / crearOrden()"], pos=("izq", 0, 0.5)),
    dict(id="t2", o="pend", d="emit", ruta=[abajo("pend"), arriba("emit")],
         etiqueta=["se confirmó la emisión", "[total > 0]", "/ emitirOrden()"], pos=("der", 0, 0.5)),
    dict(id="t3", o="pend", d="can",
         ruta=[_pe, (_ck["x"] + WK / 2, _pe[1]), (_ck["x"] + WK / 2, _ck["y"])],
         etiqueta=["se canceló la orden", "/ cancelarOrden()"], pos=("arriba", 0, 0.5)),
    dict(id="t4", o="emit", d="can",
         ruta=[_ce, (_ck["x"] + WK / 2, _ce[1]), (_ck["x"] + WK / 2, _ck["y"] + _ck["h"])],
         etiqueta=["se canceló la orden", "/ cancelarOrden()"], pos=("abajo", 0, 0.5)),
    dict(id="t5", o="emit", d="parc", ruta=[abajo("emit"), arriba("parc")],
         etiqueta=[EV_RECEP, G_SALDO, AC_RECEP], pos=("der", 0, 0.5)),
    dict(id="t6", o="emit", d="rec",
         ruta=[lado("emit", "izq", 0.5), (XB, lado("emit", "izq", 0.5)[1]),
               (XB, lado("rec", "izq", 0.5)[1]), lado("rec", "izq", 0.5)],
         etiqueta=[EV_RECEP, G_CERO, AC_RECEP], pos=("der", 1, 0.5)),
    dict(id="t7", o="parc", d="parc",
         ruta=[lado("parc", "der", 0.3), (XL, lado("parc", "der", 0.3)[1]),
               (XL, lado("parc", "der", 0.8)[1]), lado("parc", "der", 0.8)],
         etiqueta=[EV_RECEP, G_SALDO, AC_RECEP], pos=("der", 1, 0.5)),
    dict(id="t8", o="parc", d="rec", ruta=[abajo("parc"), arriba("rec")],
         etiqueta=[EV_RECEP, G_CERO, AC_RECEP], pos=("der", 0, 0.5)),
    dict(id="t9", o="rec", d="cer", ruta=[abajo("rec"), arriba("cer")],
         etiqueta=["se cerró la orden / cerrarOrden()"], pos=("der", 0, 0.5)),
    dict(id="t10", o="cer", d="fin", ruta=[abajo("cer"), arriba("fin")], etiqueta=[]),
    dict(id="t11", o="can", d="fin2", ruta=[lado("can", "der"), lado("fin2", "izq")], etiqueta=[]),
]


# ------------------------------------------------------------------ geometria
def caja_etiqueta(a):
    """(cx, cy, w, h) de la etiqueta de una arista."""
    lineas = a["etiqueta"]
    w = max(ancho(t, F_ETIQ) for t in lineas) + 4
    h = PASO * len(lineas) + 2
    lado_, seg, t = a["pos"]
    p, q = a["ruta"][seg], a["ruta"][seg + 1]
    mx, my = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t
    sep = 6
    if lado_ == "der":
        return (mx + sep + w / 2, my, w, h)
    if lado_ == "izq":
        return (mx - sep - w / 2, my, w, h)
    if lado_ == "arriba":
        return (mx, my - sep - h / 2, w, h)
    return (mx, my + sep + h / 2, w, h)


def longitud(ruta):
    return sum(math.dist(ruta[i], ruta[i + 1]) for i in range(len(ruta) - 1))


def punto_medio(ruta):
    """Punto a la mitad del largo de la polilinea (asi coloca draw.io la etiqueta con x=0)."""
    resta = longitud(ruta) / 2
    for i in range(len(ruta) - 1):
        l = math.dist(ruta[i], ruta[i + 1])
        if resta <= l:
            f = resta / l if l else 0
            return (ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * f,
                    ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * f)
        resta -= l
    return ruta[-1]


def limites():
    xs, ys = [], []
    for n in NODOS.values():
        xs += [n["x"], n["x"] + n["w"]]
        ys += [n["y"], n["y"] + n["h"]]
    for a in ARISTAS:
        for p in a["ruta"]:
            xs.append(p[0])
            ys.append(p[1])
        if a["etiqueta"]:
            cx, cy, w, h = caja_etiqueta(a)
            xs += [cx - w / 2, cx + w / 2]
            ys += [cy - h / 2, cy + h / 2]
    return min(xs), min(ys), max(xs), max(ys)


# ------------------------------------------------------------------ verificacion
def _seg_rect(p, q, r):
    """True si el segmento p-q (horizontal o vertical) toca el rectangulo r=(x0,y0,x1,y1)."""
    x0, y0, x1, y1 = r
    if p[0] == q[0]:
        a, b = sorted((p[1], q[1]))
        return x0 <= p[0] <= x1 and b >= y0 and a <= y1
    if p[1] == q[1]:
        a, b = sorted((p[0], q[0]))
        return y0 <= p[1] <= y1 and b >= x0 and a <= x1
    # oblicuo: muestreo
    for i in range(51):
        x, y = p[0] + (q[0] - p[0]) * i / 50, p[1] + (q[1] - p[1]) * i / 50
        if x0 <= x <= x1 and y0 <= y <= y1:
            return True
    return False


def _rect(cx, cy, w, h, m=0):
    return (cx - w / 2 - m, cy - h / 2 - m, cx + w / 2 + m, cy + h / 2 + m)


def _cruza(r1, r2):
    return r1[0] < r2[2] and r2[0] < r1[2] and r1[1] < r2[3] and r2[1] < r1[3]


def verificar():
    errores = []
    etiquetas = {a["id"]: _rect(*caja_etiqueta(a), m=1) for a in ARISTAS if a["etiqueta"]}
    for k, r in etiquetas.items():
        for a in ARISTAS:
            for i in range(len(a["ruta"]) - 1):
                if _seg_rect(a["ruta"][i], a["ruta"][i + 1], r):
                    errores.append("etiqueta %s toca la linea de %s" % (k, a["id"]))
        for nk, n in NODOS.items():
            if _cruza(r, (n["x"], n["y"], n["x"] + n["w"], n["y"] + n["h"])):
                errores.append("etiqueta %s toca el nodo %s" % (k, nk))
        for k2, r2 in etiquetas.items():
            if k < k2 and _cruza(r, r2):
                errores.append("etiquetas %s y %s se enciman" % (k, k2))
    # las lineas no deben atravesar nodos ajenos
    for a in ARISTAS:
        for nk, n in NODOS.items():
            if nk in (a["o"], a["d"]):
                continue
            r = (n["x"] + 1, n["y"] + 1, n["x"] + n["w"] - 1, n["y"] + n["h"] - 1)
            for i in range(len(a["ruta"]) - 1):
                if _seg_rect(a["ruta"][i], a["ruta"][i + 1], r):
                    errores.append("la linea %s atraviesa el nodo %s" % (a["id"], nk))
    # actividades dentro del ancho del estado
    for nk, n in NODOS.items():
        if n["tipo"] != "estado":
            continue
        for t in n["actividades"]:
            if ancho(t, F_ACT) + 12 > n["w"]:
                errores.append("actividad '%s' no cabe en %s" % (t, nk))
        if ancho(n["nombre"], F_NOMBRE) + 12 > n["w"]:
            errores.append("nombre de %s no cabe" % nk)
    return errores


# ------------------------------------------------------------------ draw.io
ESTILO_FUENTE = "fontFamily=Arial;fontColor=#000000;strokeColor=#000000;"


def _rel(n, p):
    return ((p[0] - n["x"]) / n["w"], (p[1] - n["y"]) / n["h"])


def construir_drawio(ruta):
    mx = ET.Element("mxfile", host="app.diagrams.net")
    dg = ET.SubElement(mx, "diagram", id="estados", name="Figura 1. Diagrama de estados de OrdenDeCompra")
    gm = ET.SubElement(dg, "mxGraphModel", dx="1000", dy="900", grid="1", gridSize="10", guides="1",
                       tooltips="1", connect="1", arrows="1", fold="1", page="0", pageScale="1",
                       math="0", shadow="0")
    root = ET.SubElement(gm, "root")
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")

    def geo(celda, x, y, w, h):
        ET.SubElement(celda, "mxGeometry", x=f"{x:g}", y=f"{y:g}", width=f"{w:g}", height=f"{h:g}",
                      **{"as": "geometry"})

    for k, n in NODOS.items():
        if n["tipo"] == "inicial":
            st = "ellipse;html=1;fillColor=#000000;" + ESTILO_FUENTE
            c = ET.SubElement(root, "mxCell", id=k, value="", style=st, vertex="1", parent="1")
        elif n["tipo"] == "final":
            st = "ellipse;html=1;shape=endState;fillColor=#000000;" + ESTILO_FUENTE
            c = ET.SubElement(root, "mxCell", id=k, value="", style=st, vertex="1", parent="1")
        elif n["actividades"]:
            st = ("swimlane;html=1;rounded=1;absoluteArcSize=1;arcSize=%d;fontStyle=0;horizontal=1;"
                  "startSize=%d;collapsible=0;fillColor=#FFFFFF;swimlaneFillColor=#FFFFFF;"
                  "fontSize=%d;" % (2 * RADIO, ALTO_NOMBRE, F_NOMBRE)) + ESTILO_FUENTE
            c = ET.SubElement(root, "mxCell", id=k, value=html.escape(n["nombre"]), style=st,
                              vertex="1", parent="1")
            geo(c, n["x"], n["y"], n["w"], n["h"])
            st2 = ("text;html=1;align=left;verticalAlign=top;spacingLeft=6;spacingTop=%d;"
                   "strokeColor=none;fillColor=none;fontFamily=Arial;fontSize=%d;fontColor=#000000;"
                   "whiteSpace=nowrap;" % (PAD_ACT - 4, F_ACT))
            c2 = ET.SubElement(root, "mxCell", id=k + "_act",
                               value="<br>".join(html.escape(t) for t in n["actividades"]),
                               style=st2, vertex="1", parent=k)
            geo(c2, 0, ALTO_NOMBRE, n["w"], n["h"] - ALTO_NOMBRE)
            continue
        else:
            st = ("rounded=1;absoluteArcSize=1;arcSize=%d;whiteSpace=wrap;html=1;fillColor=#FFFFFF;"
                  "fontSize=%d;" % (2 * RADIO, F_NOMBRE)) + ESTILO_FUENTE
            c = ET.SubElement(root, "mxCell", id=k, value=html.escape(n["nombre"]), style=st,
                              vertex="1", parent="1")
        geo(c, n["x"], n["y"], n["w"], n["h"])

    for a in ARISTAS:
        o, d = _n(a["o"]), _n(a["d"])
        ex, ey = _rel(o, a["ruta"][0])
        nx, ny = _rel(d, a["ruta"][-1])
        st = ("edgeStyle=none;html=1;rounded=0;endArrow=open;endFill=0;endSize=%d;"
              "fontSize=%d;labelBackgroundColor=#FFFFFF;align=center;"
              "exitX=%.4g;exitY=%.4g;exitDx=0;exitDy=0;exitPerimeter=0;"
              "entryX=%.4g;entryY=%.4g;entryDx=0;entryDy=0;entryPerimeter=0;"
              % (FLECHA_L, F_ETIQ, ex, ey, nx, ny)) + ESTILO_FUENTE
        valor = "<br>".join(html.escape(t) for t in a["etiqueta"])
        c = ET.SubElement(root, "mxCell", id=a["id"], value=valor, style=st, edge="1", parent="1",
                          source=a["o"], target=a["d"])
        g = ET.SubElement(c, "mxGeometry", relative="1", **{"as": "geometry"})
        medios = a["ruta"][1:-1]
        if medios:
            arr = ET.SubElement(g, "Array", **{"as": "points"})
            for p in medios:
                ET.SubElement(arr, "mxPoint", x=f"{p[0]:g}", y=f"{p[1]:g}")
        if a["etiqueta"]:
            cx, cy, _, _ = caja_etiqueta(a)
            mx_, my_ = punto_medio(a["ruta"])
            ET.SubElement(g, "mxPoint", x=f"{cx - mx_:.1f}", y=f"{cy - my_:.1f}", **{"as": "offset"})
    ET.indent(mx)
    ET.ElementTree(mx).write(ruta, encoding="utf-8", xml_declaration=False)


# ------------------------------------------------------------------ PDF / PNG
class Pintor:
    def __init__(self, pagina, ox, oy):
        self.p, self.ox, self.oy = pagina, ox, oy
        self.sh = pagina.new_shape()
        self.textos = []
        self.fuentes = {}

    def P(self, p):
        return pymupdf.Point(p[0] + self.ox, p[1] + self.oy)

    def linea(self, pts, cerrada=False, relleno=None, ancho_l=1.0):
        self.sh.draw_polyline([self.P(p) for p in pts])
        if cerrada:
            self.sh.draw_line(self.P(pts[-1]), self.P(pts[0]))
        self.sh.finish(color=NEGRO, fill=relleno, width=ancho_l, closePath=cerrada,
                       lineCap=0, lineJoin=0)

    def caja(self, x, y, w, h, radio=0.0, relleno=BLANCO, borde=True):
        r = pymupdf.Rect(x + self.ox, y + self.oy, x + w + self.ox, y + h + self.oy)
        self.sh.draw_rect(r, radius=(radio / min(w, h)) if radio else None)
        self.sh.finish(color=NEGRO if borde else None, fill=relleno, width=1.0)

    def circulo(self, cx, cy, r, relleno, borde=True):
        self.sh.draw_circle(self.P((cx, cy)), r)
        self.sh.finish(color=NEGRO if borde else None, fill=relleno, width=1.0)

    def texto(self, x, y, t, tam, centro=False):
        if centro:
            x -= ancho(t, tam) / 2
        self.textos.append((x, y, t, tam))

    def cerrar(self):
        self.sh.commit()
        f = pymupdf.Font(fontfile=ruta_fuente("regular"))
        tw = pymupdf.TextWriter(self.p.rect)
        for x, y, t, tam in self.textos:
            tw.append(self.P((x, y)), t, font=f, fontsize=tam)
        tw.write_text(self.p, color=NEGRO)


def _punta(pt, tip, prev):
    dx, dy = prev[0] - tip[0], prev[1] - tip[1]
    l = math.hypot(dx, dy) or 1.0
    ux, uy = dx / l, dy / l
    nx, ny = -uy, ux
    a = (tip[0] + ux * FLECHA_L + nx * FLECHA_A, tip[1] + uy * FLECHA_L + ny * FLECHA_A)
    b = (tip[0] + ux * FLECHA_L - nx * FLECHA_A, tip[1] + uy * FLECHA_L - ny * FLECHA_A)
    pt.linea([a, tip, b])   # punta abierta (transicion UML)


def dibujar(pagina, ox, oy):
    pt = Pintor(pagina, ox, oy)
    for a in ARISTAS:
        pt.linea(a["ruta"])
        _punta(pt, a["ruta"][-1], a["ruta"][-2])
    for n in NODOS.values():
        x, y, w, h = n["x"], n["y"], n["w"], n["h"]
        if n["tipo"] == "inicial":
            pt.circulo(x + w / 2, y + h / 2, w / 2, NEGRO)
        elif n["tipo"] == "final":
            ins = min(4, w / 5)
            pt.circulo(x + w / 2, y + h / 2, w / 2, BLANCO)
            pt.circulo(x + w / 2, y + h / 2, w / 2 - ins, NEGRO, borde=False)
        else:
            pt.caja(x, y, w, h, RADIO)
            if n["actividades"]:
                pt.texto(x + w / 2, y + ALTO_NOMBRE / 2 + F_NOMBRE * 0.36, n["nombre"], F_NOMBRE, True)
                pt.linea([(x, y + ALTO_NOMBRE), (x + w, y + ALTO_NOMBRE)])
                for i, t in enumerate(n["actividades"]):
                    pt.texto(x + 6, y + ALTO_NOMBRE + PAD_ACT + PASO * i + 10.5, t, F_ACT)
            else:
                pt.texto(x + w / 2, y + h / 2 + F_NOMBRE * 0.36, n["nombre"], F_NOMBRE, True)
    for a in ARISTAS:
        if not a["etiqueta"]:
            continue
        cx, cy, w, h = caja_etiqueta(a)
        pt.caja(cx - w / 2, cy - h / 2, w, h, relleno=BLANCO, borde=False)
        y0 = cy - PASO * len(a["etiqueta"]) / 2
        for i, t in enumerate(a["etiqueta"]):
            pt.texto(cx, y0 + PASO * i + 10.5, t, F_ETIQ, centro=True)
    pt.cerrar()


def exportar_pdf(ruta_pdf, ruta_png, margen=12, dpi=200):
    x0, y0, x1, y1 = limites()
    doc = pymupdf.open()
    pag = doc.new_page(width=x1 - x0 + 2 * margen, height=y1 - y0 + 2 * margen)
    dibujar(pag, margen - x0, margen - y0)
    arreglar_tounicode(doc)
    doc.save(ruta_pdf, garbage=3, deflate=True)
    doc[0].get_pixmap(dpi=dpi, alpha=False).save(ruta_png)
    return doc


def main():
    errores = verificar()
    for e in errores:
        print("AVISO:", e)
    os.makedirs(SALIDA, exist_ok=True)
    construir_drawio(os.path.join(SALIDA, BASE + ".drawio"))
    exportar_pdf(os.path.join(SALIDA, BASE + "_figura.pdf"), os.path.join(SALIDA, BASE + ".png"))
    x0, y0, x1, y1 = limites()
    print("Generados .drawio, _figura.pdf y .png en", SALIDA)
    print("Tamano del diagrama: %.0f x %.0f pt; %d avisos" % (x1 - x0, y1 - y0, len(errores)))
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
