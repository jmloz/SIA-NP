"""Diagramas de actividad con carriles de CU1-CU8 (entregable 02 del SIA-NP).

Uso (desde cualquier carpeta):
    python scripts/actividades/diagramas_actividad.py [--dpi 300] [--solo CU1]

A partir de las definiciones de definiciones.py (carriles, nodos con su posicion
y aristas con guarda) genera:
  - entregables/02-actividades/Diagramas_de_Actividad_SIA-NP.drawio
    (una pagina por CU, XML sin comprimir, carriles como swimlane, editable en draw.io)
  - entregables/02-actividades/figuras/CUn.png  (dibujado con PyMuPDF, >= 250 dpi)
Ademas revisa la geometria: lineas que cruzan acciones o guardas, guardas
encimadas, nodos fuera de su carril, y lo informa en la consola.

No necesita draw.io, PlantUML ni rsvg-convert. Funciona en Windows y en Ubuntu
(Arial o Liberation Sans, mismas metricas).

Notacion (Kendall & Kendall, cap. 10): inicio = circulo negro; final = circulo
negro con anillo; accion = rectangulo redondeado; decision y fusion = rombo;
bifurcacion y union = barra negra; guardas entre corchetes junto a la flecha.
"""
import argparse
import html
import os
import sys

import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.dirname(AQUI))   # scripts/ (modelo_clases: fuentes)
sys.path.insert(0, AQUI)

from modelo_clases import ancho, ruta_fuente  # noqa: E402
import definiciones  # noqa: E402

SALIDA_DIR = os.path.join(RAIZ, "entregables", "02-actividades")
DRAWIO = os.path.join(SALIDA_DIR, "Diagramas_de_Actividad_SIA-NP.drawio")
FIG_DIR = os.path.join(SALIDA_DIR, "figuras")

# ------------------------------------------------------------- medidas
F_ACC = 11          # texto de acciones
F_GUARDA = 10       # guardas
F_CARRIL = 12       # encabezado de carril (negrita)
LH_ACC = 13         # interlineado de acciones
LH_GUARDA = 11.5
PAD_X = 9           # relleno horizontal de una accion
PAD_Y = 6           # relleno vertical de una accion
R_INI = 9           # radio del nodo inicial
R_FIN = 10          # radio del nodo final (anillo)
R_FIN_IN = 6        # radio del circulo interior del final
ROMBO = 12          # semidiagonal del rombo
BARRA = 5           # grueso de la barra de bifurcacion/union
FLECHA_L = 8        # largo de la punta de flecha
FLECHA_A = 3.5      # semiancho de la punta
MARGEN = 10         # margen alrededor de los carriles
NEGRO = (0, 0, 0)
BLANCO = (1, 1, 1)
GRIS = (0xE6 / 255.0, 0xE6 / 255.0, 0xE6 / 255.0)


# ------------------------------------------------------------- modelo
class Nodo:
    def __init__(self, nid, tipo, x, y, texto=""):
        self.id, self.tipo, self.x, self.y = nid, tipo, float(x), float(y)
        self.texto = texto
        if tipo == "acc":
            lineas = texto.split("\n")
            self.lineas = lineas
            self.w = max(ancho(l, F_ACC) for l in lineas) + 2 * PAD_X
            self.h = LH_ACC * len(lineas) + 2 * PAD_Y - 1
        elif tipo == "dec":
            self.w = self.h = 2 * ROMBO
        elif tipo == "ini":
            self.w = self.h = 2 * R_INI
        elif tipo == "fin":
            self.w = self.h = 2 * R_FIN
        elif tipo == "bar":
            self.w, self.h = float(texto), BARRA
        else:
            raise ValueError(tipo)

    @property
    def x0(self):
        return self.x - self.w / 2

    @property
    def x1(self):
        return self.x + self.w / 2

    @property
    def y0(self):
        return self.y - self.h / 2

    @property
    def y1(self):
        return self.y + self.h / 2

    def puerto(self, lado, xpref=None):
        """Punto de contacto en el lado t, b, l o r."""
        if lado == "t":
            x = self.x
            if self.tipo == "bar" and xpref is not None and self.x0 + 2 <= xpref <= self.x1 - 2:
                x = xpref
            return (x, self.y0)
        if lado == "b":
            x = self.x
            if self.tipo == "bar" and xpref is not None and self.x0 + 2 <= xpref <= self.x1 - 2:
                x = xpref
            return (x, self.y1)
        if lado == "l":
            return (self.x0, self.y)
        if lado == "r":
            return (self.x1, self.y)
        raise ValueError(lado)


class Arista:
    def __init__(self, o, d, guarda=None, **op):
        self.o, self.d, self.guarda, self.op = o, d, guarda, op


class Diagrama:
    def __init__(self, defin):
        self.clave = defin["clave"]
        self.titulo = defin["titulo"]
        self.carriles = []           # (nombre, x0, x1)
        x = 0.0
        for nombre, w in defin["carriles"]:
            self.carriles.append((nombre, x, x + w))
            x += w
        self.ancho = x
        self.cab = defin.get("cabecera", 28)   # alto del encabezado de carril
        self.nodos = {}
        for t in defin["nodos"]:
            n = Nodo(*t)
            if n.id in self.nodos:
                raise ValueError("nodo repetido " + n.id)
            self.nodos[n.id] = n
        self.alto = max(n.y1 for n in self.nodos.values()) + defin.get("pie", 14)
        self.aristas = [Arista(*a[:3], **(a[3] if len(a) > 3 else {})) for a in defin["aristas"]]
        for a in self.aristas:
            a.puntos = self._ruta(a)
            a.caja_guarda = self._caja_guarda(a) if a.guarda else None

    def carril_de(self, n):
        for i, (_, x0, x1) in enumerate(self.carriles):
            if x0 <= n.x < x1:
                return i
        return len(self.carriles) - 1

    # ------------------------------------------------ ruteo ortogonal
    def _ruta(self, a):
        o, d = self.nodos[a.o], self.nodos[a.d]
        so = a.op.get("s", "b")
        sd = a.op.get("t", "t")
        a.so, a.sd = so, sd
        # puntos de contacto (las barras se tocan a la altura del otro extremo)
        po = o.puerto(so, a.op.get("sx", d.x))
        pd = d.puerto(sd, a.op.get("tx", po[0]))
        if o.tipo == "bar" and "sx" not in a.op:
            po = o.puerto(so, pd[0])
        if "pts" in a.op:
            medios = [tuple(p) for p in a.op["pts"]]
        elif so in "bt" and sd in "bt":
            if abs(po[0] - pd[0]) < 0.5:
                medios = []
            else:
                if sd == "t":
                    hueco = pd[1] - po[1]
                    ym_def = pd[1] - 12 if hueco >= 24 else (po[1] + pd[1]) / 2
                else:
                    ym_def = max(po[1], pd[1]) + 14
                ym = a.op.get("ym", ym_def)
                medios = [(po[0], ym), (pd[0], ym)]
        elif so in "lr" and sd in "bt":
            medios = [(pd[0], po[1])]
        elif so in "bt" and sd in "lr":
            medios = [(po[0], pd[1])]
        else:  # l/r -> l/r
            if abs(po[1] - pd[1]) < 0.5:
                medios = []
            else:
                xm = a.op["xm"]
                medios = [(xm, po[1]), (xm, pd[1])]
        return [po] + medios + [pd]

    def _caja_guarda(self, a):
        lineas = a.guarda.split("\n")
        w = max(ancho(l, F_GUARDA) for l in lineas)
        h = LH_GUARDA * len(lineas)
        (sx, sy) = a.puntos[0]
        if "gp" in a.op:                      # esquina superior izquierda explicita
            x, y = a.op["gp"]
        elif a.so == "l":
            x, y = sx - 3 - w, sy - 2 - h
        elif a.so == "r":
            x, y = sx + 3, sy - 2 - h
        elif a.so == "b":
            x, y = (sx - 4 - w if a.op.get("gizq") else sx + 4), sy + 1
        else:
            x, y = sx + 4, sy - 1 - h
        if "gdx" in a.op:
            x += a.op["gdx"]
        if "gdy" in a.op:
            y += a.op["gdy"]
        return (x, y, x + w, y + h, lineas)

    # ------------------------------------------------ revision
    def revisar(self):
        avisos = []
        cajas = {nid: (n.x0, n.y0, n.x1, n.y1) for nid, n in self.nodos.items()}
        guardas = [(a, a.caja_guarda[:4]) for a in self.aristas if a.caja_guarda]

        def cruza(seg, r, holgura=1.0):
            (x1, y1), (x2, y2) = seg
            sx0, sx1 = min(x1, x2), max(x1, x2)
            sy0, sy1 = min(y1, y2), max(y1, y2)
            return (sx0 < r[2] - holgura and sx1 > r[0] + holgura
                    and sy0 < r[3] - holgura and sy1 > r[1] + holgura)

        for a in self.aristas:
            segs = list(zip(a.puntos[:-1], a.puntos[1:]))
            for s in segs:
                if abs(s[0][0] - s[1][0]) > 0.5 and abs(s[0][1] - s[1][1]) > 0.5:
                    avisos.append("diagonal %s->%s" % (a.o, a.d))
            for nid, r in cajas.items():
                for i, s in enumerate(segs):
                    if nid == a.o and i == 0 or nid == a.d and i == len(segs) - 1:
                        continue
                    if cruza(s, r):
                        avisos.append("linea %s->%s cruza nodo %s" % (a.o, a.d, nid))
            for b, g in guardas:
                for s in segs:
                    if cruza(s, g, 0.2):
                        avisos.append("linea %s->%s cruza guarda de %s->%s" % (a.o, a.d, b.o, b.d))
            # cruces con otras aristas
        for i, a in enumerate(self.aristas):
            for b in self.aristas[i + 1:]:
                for s in zip(a.puntos[:-1], a.puntos[1:]):
                    for t in zip(b.puntos[:-1], b.puntos[1:]):
                        if _se_cruzan(s, t):
                            avisos.append("cruce de lineas %s->%s y %s->%s" % (a.o, a.d, b.o, b.d))
        for i, (a, g) in enumerate(guardas):
            for nid, r in cajas.items():
                if cruza(((g[0], g[1]), (g[2], g[3])), r, 0):
                    avisos.append("guarda de %s->%s encima de %s" % (a.o, a.d, nid))
            for b, h in guardas[i + 1:]:
                if g[0] < h[2] and g[2] > h[0] and g[1] < h[3] and g[3] > h[1]:
                    avisos.append("guardas encimadas %s->%s y %s->%s" % (a.o, a.d, b.o, b.d))
            if g[0] < 2 or g[2] > self.ancho - 2:
                avisos.append("guarda de %s->%s sale del diagrama" % (a.o, a.d))
        ids = list(cajas)
        for i, p in enumerate(ids):
            n = self.nodos[p]
            c = self.carriles[self.carril_de(n)]
            if n.x0 < c[1] + 4 or n.x1 > c[2] - 4:
                avisos.append("nodo %s sale de su carril" % p)
            if n.y0 < self.cab + 6:
                avisos.append("nodo %s toca el encabezado" % p)
            for q in ids[i + 1:]:
                r, s = cajas[p], cajas[q]
                if r[0] < s[2] + 4 and r[2] > s[0] - 4 and r[1] < s[3] + 4 and r[3] > s[1] - 4:
                    avisos.append("nodos %s y %s demasiado juntos" % (p, q))
        return avisos


def _se_cruzan(s, t):
    """Cruce en X de un segmento horizontal con uno vertical (no cuenta toques en extremos)."""
    def hv(seg):
        (x1, y1), (x2, y2) = seg
        if abs(y1 - y2) < 0.5:
            return "h", (min(x1, x2), max(x1, x2), y1)
        if abs(x1 - x2) < 0.5:
            return "v", (min(y1, y2), max(y1, y2), x1)
        return None, None
    ts, a = hv(s)
    tt, b = hv(t)
    if ts is None or tt is None or ts == tt:
        return False
    if ts == "v":
        a, b = b, a
    # a horizontal (x0, x1, y); b vertical (y0, y1, x)
    return a[0] + 0.5 < b[2] < a[1] - 0.5 and b[0] + 0.5 < a[2] < b[1] - 0.5


# ------------------------------------------------------------- dibujo PNG
class Lienzo:
    def __init__(self, dg, dpi):
        self.dg = dg
        self.dpi = dpi
        w = dg.ancho + 2 * MARGEN
        h = dg.alto + 2 * MARGEN
        self.doc = pymupdf.open()
        self.pag = self.doc.new_page(width=w, height=h)
        self.f = pymupdf.Font(fontfile=ruta_fuente("regular"))
        self.fb = pymupdf.Font(fontfile=ruta_fuente("bold"))

    def P(self, x, y):
        return pymupdf.Point(x + MARGEN, y + MARGEN)

    def R(self, x0, y0, x1, y1):
        return pymupdf.Rect(x0 + MARGEN, y0 + MARGEN, x1 + MARGEN, y1 + MARGEN)

    def texto(self, x, y, s, tam, negrita=False):
        """x, y = inicio de la linea base."""
        tw = pymupdf.TextWriter(self.pag.rect)
        tw.append(self.P(x, y), s, font=self.fb if negrita else self.f, fontsize=tam)
        tw.write_text(self.pag, color=NEGRO)

    def dibujar(self):
        dg, pag = self.dg, self.pag
        ancho_l = 0.8
        # carriles
        for i, (nombre, x0, x1) in enumerate(dg.carriles):
            pag.draw_rect(self.R(x0, 0, x1, dg.cab), color=NEGRO, fill=GRIS, width=ancho_l)
            pag.draw_rect(self.R(x0, 0, x1, dg.alto), color=NEGRO, width=1.0)
            lineas = nombre.split("\n")
            base = (dg.cab - 14 * len(lineas)) / 2 + 11
            for k, l in enumerate(lineas):
                w = ancho(l, F_CARRIL, "bold")
                self.texto((x0 + x1) / 2 - w / 2, base + 14 * k, l, F_CARRIL, True)
        # aristas
        for a in dg.aristas:
            pts = [self.P(*p) for p in a.puntos]
            pag.draw_polyline(pts, color=NEGRO, width=ancho_l)
            self.punta(a.puntos[-2], a.puntos[-1])
            if a.caja_guarda:
                x0, y0, x1, y1, lineas = a.caja_guarda
                for k, l in enumerate(lineas):
                    self.texto(x0, y0 + LH_GUARDA * k + 8.6, l, F_GUARDA)
        # nodos
        for n in dg.nodos.values():
            if n.tipo == "acc":
                pag.draw_rect(self.R(n.x0, n.y0, n.x1, n.y1), color=NEGRO, fill=BLANCO,
                              width=ancho_l, radius=min(0.45, 8.0 / n.h))
                alto_txt = LH_ACC * len(n.lineas)
                y = n.y - alto_txt / 2 + 9.6
                for k, l in enumerate(n.lineas):
                    w = ancho(l, F_ACC)
                    self.texto(n.x - w / 2, y + LH_ACC * k, l, F_ACC)
            elif n.tipo == "dec":
                r = ROMBO
                pts = [self.P(n.x, n.y - r), self.P(n.x + r, n.y), self.P(n.x, n.y + r),
                       self.P(n.x - r, n.y), self.P(n.x, n.y - r)]
                pag.draw_polyline(pts, color=NEGRO, fill=BLANCO, width=ancho_l, closePath=True)
            elif n.tipo == "ini":
                pag.draw_circle(self.P(n.x, n.y), R_INI, color=NEGRO, fill=NEGRO, width=ancho_l)
            elif n.tipo == "fin":
                pag.draw_circle(self.P(n.x, n.y), R_FIN, color=NEGRO, fill=BLANCO, width=1.0)
                pag.draw_circle(self.P(n.x, n.y), R_FIN_IN, color=NEGRO, fill=NEGRO, width=0)
            elif n.tipo == "bar":
                pag.draw_rect(self.R(n.x0, n.y0, n.x1, n.y1), color=NEGRO, fill=NEGRO, width=0)

    def punta(self, p0, p1):
        (x0, y0), (x1, y1) = p0, p1
        dx, dy = x1 - x0, y1 - y0
        L = (dx * dx + dy * dy) ** 0.5 or 1.0
        ux, uy = dx / L, dy / L
        bx, by = x1 - ux * FLECHA_L, y1 - uy * FLECHA_L
        pts = [self.P(x1, y1), self.P(bx - uy * FLECHA_A, by + ux * FLECHA_A),
               self.P(bx + uy * FLECHA_A, by - ux * FLECHA_A), self.P(x1, y1)]
        self.pag.draw_polyline(pts, color=NEGRO, fill=NEGRO, width=0.5, closePath=True)

    def png(self, ruta):
        self.pag.get_pixmap(dpi=self.dpi, alpha=False).save(ruta)


# ------------------------------------------------------------- draw.io
FUENTE_DIO = "fontFamily=Arial;fontColor=#000000;"


def _esc(s):
    return html.escape(s, quote=True)


def _valor_html(texto):
    return "<br>".join(html.escape(l, quote=False) for l in texto.split("\n"))


def _puerto_rel(n, p):
    """exitX/exitY relativos (0..1) de un punto p sobre el nodo n."""
    return ((p[0] - n.x0) / n.w if n.w else 0.5, (p[1] - n.y0) / n.h if n.h else 0.5)


def diagrama_xml(dg, num):
    c = []
    c.append('<mxCell id="0" />')
    c.append('<mxCell id="1" parent="0" />')
    carril_id = []
    for i, (nombre, x0, x1) in enumerate(dg.carriles):
        cid = "%s_carril%d" % (dg.clave, i + 1)
        carril_id.append(cid)
        estilo = ("swimlane;html=1;startSize=%d;horizontal=1;fillColor=#E6E6E6;swimlaneFillColor=#FFFFFF;"
                  "strokeColor=#000000;fontStyle=1;fontSize=%d;collapsible=0;%s" % (dg.cab, F_CARRIL, FUENTE_DIO))
        c.append('<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1">'
                 '<mxGeometry x="%.1f" y="0" width="%.1f" height="%.1f" as="geometry" /></mxCell>'
                 % (cid, _esc(_valor_html(nombre)), estilo, x0, x1 - x0, dg.alto))
    for n in dg.nodos.values():
        i = dg.carril_de(n)
        x0c = dg.carriles[i][1]
        nid = "%s_%s" % (dg.clave, n.id)
        valor = ""
        if n.tipo == "acc":
            estilo = ("rounded=1;arcSize=%d;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;"
                      "fontSize=%d;%s" % (min(45, int(800 / n.h)), F_ACC, FUENTE_DIO))
            valor = _valor_html(n.texto)
        elif n.tipo == "dec":
            estilo = "rhombus;html=1;fillColor=#FFFFFF;strokeColor=#000000;"
        elif n.tipo == "ini":
            estilo = "ellipse;html=1;fillColor=#000000;strokeColor=#000000;"
        elif n.tipo == "fin":
            estilo = "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;"
        else:
            estilo = "rounded=0;html=1;fillColor=#000000;strokeColor=#000000;"
        c.append('<mxCell id="%s" value="%s" style="%s" vertex="1" parent="%s">'
                 '<mxGeometry x="%.1f" y="%.1f" width="%.1f" height="%.1f" as="geometry" /></mxCell>'
                 % (nid, _esc(valor), estilo, carril_id[i], n.x0 - x0c, n.y0, n.w, n.h))
    for k, a in enumerate(dg.aristas):
        o, d = dg.nodos[a.o], dg.nodos[a.d]
        ex, ey = _puerto_rel(o, a.puntos[0])
        nx, ny = _puerto_rel(d, a.puntos[-1])
        estilo = ("edgeStyle=none;rounded=0;html=1;endArrow=block;endFill=1;endSize=6;strokeColor=#000000;"
                  "exitX=%.4f;exitY=%.4f;exitDx=0;exitDy=0;exitPerimeter=0;"
                  "entryX=%.4f;entryY=%.4f;entryDx=0;entryDy=0;entryPerimeter=0;%s"
                  % (ex, ey, nx, ny, FUENTE_DIO))
        pts = "".join('<mxPoint x="%.1f" y="%.1f" />' % p for p in a.puntos[1:-1])
        geo = '<mxGeometry relative="1" as="geometry">%s</mxGeometry>' % (
            '<Array as="points">%s</Array>' % pts if pts else "")
        c.append('<mxCell id="%s_e%d" style="%s" edge="1" parent="1" source="%s_%s" target="%s_%s">%s</mxCell>'
                 % (dg.clave, k + 1, estilo, dg.clave, a.o, dg.clave, a.d, geo))
        if a.caja_guarda:
            x0, y0, x1, y1, lineas = a.caja_guarda
            estilo_g = ("text;html=1;align=left;verticalAlign=top;spacing=0;spacingTop=-1;fontSize=%d;"
                        "resizable=0;%s" % (F_GUARDA, FUENTE_DIO))
            c.append('<mxCell id="%s_g%d" value="%s" style="%s" vertex="1" parent="1">'
                     '<mxGeometry x="%.1f" y="%.1f" width="%.1f" height="%.1f" as="geometry" /></mxCell>'
                     % (dg.clave, k + 1, _esc(_valor_html(a.guarda)), estilo_g, x0, y0, x1 - x0 + 2, y1 - y0))
    modelo = ('<mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" '
              'arrows="1" fold="1" page="1" pageScale="1" pageWidth="%d" pageHeight="%d" math="0" shadow="0">'
              '<root>%s</root></mxGraphModel>' % (int(dg.ancho) + 20, int(dg.alto) + 20, "".join(c)))
    return '<diagram id="%s" name="%s">%s</diagram>' % (dg.clave, _esc(dg.titulo), modelo)


def escribir_drawio(diagramas, ruta):
    cuerpo = "".join(diagrama_xml(dg, i + 1) for i, dg in enumerate(diagramas))
    xml = ('<mxfile host="SIA-NP diagramas_actividad.py" version="24.0.0" compressed="false">%s</mxfile>\n'
           % cuerpo)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(xml)


# ------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--solo", help="clave de un CU (p. ej. CU1) para generar solo su PNG")
    ap.add_argument("--fig", default=FIG_DIR, help="carpeta de los PNG")
    a = ap.parse_args()
    os.makedirs(a.fig, exist_ok=True)
    diagramas = [Diagrama(d) for d in definiciones.CASOS]
    total = 0
    for dg in diagramas:
        if a.solo and dg.clave != a.solo:
            continue
        avisos = dg.revisar()
        total += len(avisos)
        print("%s: %.0f x %.0f, %d nodos, %d aristas%s" % (
            dg.clave, dg.ancho, dg.alto, len(dg.nodos), len(dg.aristas),
            "" if not avisos else ", %d avisos" % len(avisos)))
        for av in avisos:
            print("   -", av)
        lz = Lienzo(dg, a.dpi)
        lz.dibujar()
        lz.png(os.path.join(a.fig, dg.clave + ".png"))
    if not a.solo:
        escribir_drawio(diagramas, DRAWIO)
        print("Escrito", DRAWIO)
    print("Avisos de geometria:", total)


if __name__ == "__main__":
    main()
