"""Genera Diagrama_de_Clases_SIA-NP.drawio (5 paginas) a partir de modelo_clases.py.

Pagina 1 = Figura 1 (diagrama completo); paginas 2 a 5 = vistas por area.
Cada relacion lleva su ruta explicita (puntos de salida/entrada y puntos
intermedios) para que no atraviese cajas; las etiquetas se colocan con
offsets absolutos. Despues de escribir, revisa solapes y cruces.

Uso: python construir_drawio.py [salida.drawio]
Regla de las vistas: cada relacion aparece en la vista del area de su clase
origen; las asociaciones tambien en la del otro extremo (la otra clase sale
como caja solo con su nombre).
"""
import math
import os
import sys
from xml.sax.saxutils import quoteattr

from modelo_clases import (ABSTRACTAS, CLASE_DE, CLASES, F_ETIQ, ID_DE, NOTAS, RELACIONES,
                           ASOCCLASE, ancho, tam_clase, tam_nota, tam_stub)
from render_drawio import _longitud, _perimetro, punto_en
from ruteador_clases import rutear

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "entregables", "05-clases", "Diagrama_de_Clases_SIA-NP.drawio")
REL = {r[0]: r for r in RELACIONES}

ESTILO_CLASE = ("swimlane;html=1;fontStyle=0;align=center;verticalAlign=top;childLayout=stackLayout;"
                "horizontal=1;startSize=%d;horizontalStack=0;resizeParent=1;resizeParentMax=0;"
                "resizeLast=0;collapsible=0;marginBottom=0;fillColor=#E6E6E6;"
                "swimlaneFillColor=#FFFFFF;strokeColor=#000000;fontColor=#000000;"
                "fontFamily=Arial;fontSize=12;")
ESTILO_TEXTO = ("text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;"
                "spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;"
                "points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontFamily=Arial;fontSize=11;"
                "fontColor=#000000;whiteSpace=wrap;")
ESTILO_LINEA = ("line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;"
                "spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];"
                "portConstraint=eastwest;strokeColor=#000000;")
ESTILO_STUB = ("rounded=0;whiteSpace=wrap;html=1;fillColor=#E6E6E6;strokeColor=#000000;"
               "fontColor=#000000;fontFamily=Arial;fontSize=12;")
ESTILO_NOTA = ("shape=note;size=14;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;"
               "fontColor=#000000;fontFamily=Arial;fontSize=10;align=left;spacingLeft=4;")
BASE_ARISTA = ("html=1;rounded=0;fontFamily=Arial;fontSize=11;fontColor=#000000;"
               "strokeColor=#000000;labelBackgroundColor=#FFFFFF;")
ESTILO_ETIQ = ("edgeLabel;resizable=0;html=1;fontFamily=Arial;fontSize=10;fontColor=#000000;"
               "labelBackgroundColor=#FFFFFF;")
TIPO_ESTILO = {
    "gen": "endArrow=block;endFill=0;endSize=12;",
    "assoc": "endArrow=none;",
    "agg": "startArrow=diamondThin;startFill=0;startSize=16;endArrow=none;",
    "comp": "startArrow=diamondThin;startFill=1;startSize=16;endArrow=none;",
    "dep": "dashed=1;endArrow=open;endSize=10;",
    "nota": "dashed=1;endArrow=none;",
    "asocclase": "dashed=1;endArrow=none;",
}


def esc(s):
    return quoteattr(s)


# ------------------------------------------------------------------ Pagina
class Pagina:
    def __init__(self, nombre, did, prefijo=""):
        self.nombre, self.did, self.pre = nombre, did, prefijo
        self.nodos = {}      # nombre -> [x, y, stub]
        self.notas = {}      # id -> [x, y, w]
        self.rutas = {}      # id de relacion -> spec
        self.orden = []

    # --- colocacion
    def n(self, nombre, x, y, stub=False):
        self.nodos[nombre] = [x, y, stub]

    def nota(self, nid, x, y, wmax=230):
        self.notas[nid] = [x, y, wmax]

    def r(self, rid, **spec):
        self.rutas[rid] = spec
        self.orden.append(rid)

    # --- geometria
    def tam(self, nombre):
        return tam_stub(nombre) if self.nodos[nombre][2] else tam_clase(nombre)

    def rect(self, nombre):
        x, y, _ = self.nodos[nombre]
        w, h = self.tam(nombre)
        return x, y, w, h

    def at(self, nombre, lado, f=0.5):
        x, y, w, h = self.rect(nombre)
        return {"T": (x + f * w, y), "B": (x + f * w, y + h),
                "L": (x, y + f * h), "R": (x + w, y + f * h)}[lado]

    def nota_rect(self, nid):
        x, y, wmax = self.notas[nid]
        texto = [n for n in NOTAS if n[0] == nid][0][2]
        w, h, lineas = tam_nota(texto, wmax)
        return x, y, w, h, lineas

    def caja_geom(self, nombre):
        if nombre in self.nodos:
            x, y, w, h = self.rect(nombre)
        else:
            x, y, w, h, _ = self.nota_rect(nombre)
        return dict(x=x, y=y, w=w, h=h)

    def id_de(self, nombre):
        return self.pre + (ID_DE[nombre] if nombre in ID_DE else nombre)

    def id_rel(self, rid):
        return self.pre + rid


def _salida(caja, spec):
    """(lado, f) -> (fx, fy) fracciones del borde."""
    lado, f = spec
    return {"T": (f, 0), "B": (f, 1), "L": (0, f), "R": (1, f)}[lado]


def _ruta_arista(P, o, d, spec):
    """Polilinea de una arista. o y d son nombres de nodo/nota."""
    co, cd = P.caja_geom(o), (P.caja_geom(d) if d else None)
    via = [tuple(p) for p in spec.get("via", [])]
    ctr = lambda c: (c["x"] + c["w"] / 2.0, c["y"] + c["h"] / 2.0)
    if "ex" in spec:
        fx, fy = _salida(co, spec["ex"])
        p0 = (co["x"] + fx * co["w"], co["y"] + fy * co["h"])
    else:
        p0 = _perimetro(co, via[0] if via else (ctr(cd) if cd else spec["tp"]))
    if "en" in spec:
        fx, fy = _salida(cd, spec["en"])
        p1 = (cd["x"] + fx * cd["w"], cd["y"] + fy * cd["h"])
    elif cd is not None:
        p1 = _perimetro(cd, via[-1] if via else ctr(co))
    else:
        p1 = tuple(spec["tp"])
    return [p0] + via + [p1]


def _param(ruta, c):
    """Fraccion de la polilinea mas cercana al punto c."""
    total = _longitud(ruta)
    mejor, tm = 1e18, 0.5
    n = max(int(total), 1)
    for i in range(n + 1):
        t = i / float(n)
        p = punto_en(ruta, t)
        d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
        if d < mejor:
            mejor, tm = d, t
    return tm


def _mult_auto(p, q, texto, lado, rombo):
    """Centro de una multiplicidad junto al extremo p de un segmento p-q."""
    w, h = ancho(texto, F_ETIQ) + 4, F_ETIQ + 3
    dx, dy = q[0] - p[0], q[1] - p[1]
    l = math.hypot(dx, dy) or 1
    ux, uy = dx / l, dy / l
    nx, ny = -uy * lado, ux * lado
    sep = 9 if rombo else 4
    a = (w / 2.0) * abs(ux) + (h / 2.0) * abs(uy) + 5      # a lo largo de la linea
    b = (w / 2.0) * abs(uy) + (h / 2.0) * abs(ux) + sep    # al costado
    if abs(ux) < abs(uy):    # vertical: a la derecha de la linea
        nx, ny = lado * 1.0, 0.0
        b = w / 2.0 + sep
        a = h / 2.0 + 5
    elif abs(uy) < abs(ux) * 0.01:
        nx, ny = 0.0, -lado * 1.0
        b = h / 2.0 + sep
        a = w / 2.0 + 5
    return (p[0] + ux * a + nx * b, p[1] + uy * a + ny * b)


def _centro_nombre(ruta, spec):
    if "lab" in spec:
        return spec["lab"]
    return punto_en(ruta, spec.get("t", 0.5))


# --------------------------------------------------------------- XML
def _num(v):
    v = round(v, 2)
    return str(int(v)) if v == int(v) else repr(v)


def _xml_clase(P, nombre, dx, dy):
    _, cid_o, estereo, attrs, mets = CLASE_DE[nombre]
    cid = P.id_de(nombre)
    x, y, w, h = P.rect(nombre)
    x, y = x + dx, y + dy
    if nombre in ABSTRACTAS:
        val = "<b><i>%s</i></b>" % nombre
    elif estereo:
        val = "<i>«%s»</i><br><b>%s</b>" % (estereo, nombre)
    else:
        val = "<b>%s</b>" % nombre
    hdr = 40 if estereo else 26
    ha = 14 * len(attrs) + 10 if attrs else 10
    hm = 14 * len(mets) + 10 if mets else 10
    n = int(cid_o[1:])
    out = ['<mxCell id="%s" value=%s style=%s vertex="1" parent="1"><mxGeometry x="%s" y="%s" '
           'width="%s" height="%s" as="geometry"/></mxCell>'
           % (cid, esc(val), esc(ESTILO_CLASE % hdr), _num(x), _num(y), _num(w), _num(h))]
    sid = P.pre + "c%d" % (n + 1)
    out.append('<mxCell id="%s" value=%s style=%s vertex="1" parent="%s"><mxGeometry y="%d" '
               'width="%s" height="%d" as="geometry"/></mxCell>'
               % (sid, esc("<br>".join(attrs)), esc(ESTILO_TEXTO), cid, hdr, _num(w), ha))
    out.append('<mxCell id="%s" value="" style=%s vertex="1" parent="%s"><mxGeometry y="%d" '
               'width="%s" height="%d" as="geometry"/></mxCell>'
               % (P.pre + "c%d" % (n + 2), esc(ESTILO_LINEA), cid, hdr + ha, _num(w), 8))
    out.append('<mxCell id="%s" value=%s style=%s vertex="1" parent="%s"><mxGeometry y="%d" '
               'width="%s" height="%d" as="geometry"/></mxCell>'
               % (P.pre + "c%d" % (n + 3), esc("<br>".join(mets)), esc(ESTILO_TEXTO), cid,
                  hdr + ha + 8, _num(w), hm))
    return out


def _xml_stub(P, nombre, dx, dy):
    x, y, w, h = P.rect(nombre)
    val = "<b><i>%s</i></b>" % nombre if nombre in ABSTRACTAS else "<b>%s</b>" % nombre
    return ['<mxCell id="%s" value=%s style=%s vertex="1" parent="1"><mxGeometry x="%s" y="%s" '
            'width="%s" height="%s" as="geometry"/></mxCell>'
            % (P.id_de(nombre), esc(val), esc(ESTILO_STUB), _num(x + dx), _num(y + dy),
               _num(w), _num(h))]


def _xml_nota(P, nid, dx, dy):
    x, y, w, h, lineas = P.nota_rect(nid)
    return ['<mxCell id="%s" value=%s style=%s vertex="1" parent="1"><mxGeometry x="%s" y="%s" '
            'width="%s" height="%s" as="geometry"/></mxCell>'
            % (P.pre + nid, esc("<br>".join(lineas)), esc(ESTILO_NOTA), _num(x + dx),
               _num(y + dy), _num(w), _num(h))]


def _xml_arista(P, eid, tipo, o, d, nombre, m1, m2, spec, ruta):
    """ruta ya incluye el desplazamiento (dx, dy)."""
    est = BASE_ARISTA + TIPO_ESTILO[tipo]
    if "ex" in spec:
        fx, fy = _salida(None, spec["ex"])
        est += "exitX=%s;exitY=%s;exitDx=0;exitDy=0;" % (_num(fx), _num(fy))
    if "en" in spec:
        fx, fy = _salida(None, spec["en"])
        est += "entryX=%s;entryY=%s;entryDx=0;entryDy=0;" % (_num(fx), _num(fy))
    centro = _centro_nombre(ruta, spec) if nombre else None
    gx, off = 0, (0, 0)
    if nombre:
        t = _param(ruta, centro)
        pp = punto_en(ruta, t)
        gx, off = 2 * t - 1, (centro[0] - pp[0], centro[1] - pp[1])
    intermedios = ruta[1:-1]
    g = ['<mxGeometry x="%s" relative="1" as="geometry">' % _num(gx)]
    if d is None:
        g.append('<mxPoint x="%s" y="%s" as="targetPoint"/>' % (_num(ruta[-1][0]), _num(ruta[-1][1])))
    if intermedios:
        g.append('<Array as="points">%s</Array>' % "".join(
            '<mxPoint x="%s" y="%s"/>' % (_num(p[0]), _num(p[1])) for p in intermedios))
    if nombre:
        g.append('<mxPoint x="%s" y="%s" as="offset"/>' % (_num(off[0]), _num(off[1])))
    g.append("</mxGeometry>")
    attrs = 'id="%s" value=%s style=%s edge="1" parent="1"' % (eid, esc(nombre or ""), esc(est))
    attrs += ' source="%s"' % P.id_de(o)
    if d is not None:
        attrs += ' target="%s"' % P.id_de(d)
    out = ["<mxCell %s>%s</mxCell>" % (attrs, "".join(g))]
    for k, (txt, key, rombo) in enumerate(((m1, "m1", tipo in ("agg", "comp")), (m2, "m2", False))):
        if not txt:
            continue
        if key in spec:
            c = spec[key]
        elif k == 0:
            c = _mult_auto(ruta[0], ruta[1], txt, spec.get("s1", 1), rombo)
        else:
            c = _mult_auto(ruta[-1], ruta[-2], txt, spec.get("s2", 1), False)
        t = _param(ruta, c)
        pp = punto_en(ruta, t)
        out.append('<mxCell id="%s_%s" value=%s style=%s vertex="1" connectable="0" parent="%s">'
                   '<mxGeometry x="%s" relative="1" as="geometry"><mxPoint x="%s" y="%s" '
                   'as="offset"/></mxGeometry></mxCell>'
                   % (eid, key, esc(txt), esc(ESTILO_ETIQ), eid, _num(2 * t - 1),
                      _num(c[0] - pp[0]), _num(c[1] - pp[1])))
    return out


def _limites_pagina(P):
    xs, ys = [], []
    for nom in P.nodos:
        x, y, w, h = P.rect(nom)
        xs += [x, x + w]
        ys += [y, y + h]
    for nid in P.notas:
        x, y, w, h, _ = P.nota_rect(nid)
        xs += [x, x + w]
        ys += [y, y + h]
    for rid, spec in P.rutas.items():
        for p in spec.get("via", []):
            xs.append(p[0])
            ys.append(p[1])
    return min(xs), min(ys), max(xs), max(ys)


def _extremos(rid):
    """(tipo, origen, destino, nombre, m1, m2) de una relacion, enlace de nota o clase de asociacion."""
    if rid.endswith("e") and rid[:-1] in [n[0] for n in NOTAS]:
        return "nota", rid[:-1], [n for n in NOTAS if n[0] == rid[:-1]][0][1], "", "", ""
    if rid == ASOCCLASE[0]:
        return "asocclase", ASOCCLASE[1], None, "", "", ""
    _, tipo, o, d, nombre, m1, m2 = REL[rid]
    return tipo, o, d, nombre, m1, m2


def _punto_medio_largo(ruta):
    """Punto medio del segmento mas largo de una polilinea."""
    mejor = max(zip(ruta, ruta[1:]), key=lambda s: math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]))
    mx, my = (mejor[0][0] + mejor[1][0]) / 2.0, (mejor[0][1] + mejor[1][1]) / 2.0
    if abs(mejor[1][0] - mejor[0][0]) > abs(mejor[1][1] - mejor[0][1]):
        return (round(mx / 10.0) * 10, my)
    return (mx, round(my / 10.0) * 10)


def xml_pagina(P, margen=40):
    minx, miny, _, _ = _limites_pagina(P)
    dx, dy = margen - minx, margen - miny
    celdas = []
    for nom in P.nodos:
        celdas += (_xml_stub if P.nodos[nom][2] else _xml_clase)(P, nom, dx, dy)
    for nid in P.notas:
        celdas += _xml_nota(P, nid, dx, dy)
    vista = _Desplazada(P, dx, dy)
    cajas = {}
    for n in list(P.nodos) + list(P.notas):
        g = vista.caja_geom(n)
        cajas[n] = (g["x"], g["y"], g["w"], g["h"])
    # especificaciones desplazadas
    specs = {}
    for rid in P.orden:
        sp = dict(P.rutas[rid])
        sp["via"] = [(p[0] + dx, p[1] + dy) for p in sp.get("via", [])]
        for k in ("lab", "m1", "m2"):
            if k in sp:
                sp[k] = (sp[k][0] + dx, sp[k][1] + dy)
        specs[rid] = sp
    # rutas automaticas (ruteador ortogonal)
    auto = [rid for rid in P.orden if specs[rid].get("auto") and rid != ASOCCLASE[0]]
    router = None
    if auto:
        res, router = rutear(cajas, [(rid, _extremos(rid)[1], _extremos(rid)[2]) for rid in auto])
        for rid in auto:
            if res[rid] is None:
                raise RuntimeError("sin ruta para " + rid)
            specs[rid].update(ex=res[rid]["ex"], en=res[rid]["en"], via=res[rid]["via"])
    rutas = {}
    for rid in P.orden:
        if rid == ASOCCLASE[0]:
            continue
        tipo, o, d, nombre, m1, m2 = _extremos(rid)
        rutas[rid] = _ruta_arista(vista, o, d, specs[rid])
    if ASOCCLASE[0] in specs:
        sp = specs[ASOCCLASE[0]]
        base = rutas[ASOCCLASE[2]]
        if sp.get("auto"):
            tp = _punto_medio_largo(base)
            res = router.ruta(ASOCCLASE[1], None, p_obj=tp)
            sp.update(ex=res["ex"], via=res["via"])
            sp["tp"] = tp
        else:
            sp["tp"] = punto_en(base, sp["on"])
        rutas[ASOCCLASE[0]] = _ruta_arista(vista, ASOCCLASE[1], None, sp)
    _colocar_etiquetas(P, cajas, specs, rutas)
    for rid in P.orden:
        tipo, o, d, nombre, m1, m2 = _extremos(rid)
        celdas += _xml_arista(P, P.id_rel(rid), tipo, o, d, nombre, m1, m2, specs[rid], rutas[rid])
    return celdas


# ------------------------------------------------- colocacion de etiquetas
def _rect_c(c, w, h):
    return (c[0] - w / 2.0, c[1] - h / 2.0, w, h)


def _inter(a, b, m=0.0):
    return not (a[0] + a[2] <= b[0] + m or b[0] + b[2] <= a[0] + m or
                a[1] + a[3] <= b[1] + m or b[1] + b[3] <= a[1] + m)


def _seg_toca(p, q, r):
    """True si el segmento p-q corta el rectangulo r."""
    x0, y0, x1, y1 = r[0], r[1], r[0] + r[2], r[1] + r[3]
    dx, dy = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, p[0] - x0), (dx, x1 - p[0]), (-dy, p[1] - y0), (dy, y1 - p[1])):
        if pp == 0:
            if qq < 0:
                return False
        else:
            t = qq / pp
            if pp < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
            if t0 > t1:
                return False
    return True


def _colocar_etiquetas(P, cajas, specs, rutas):
    """Elige el centro de cada etiqueta (nombre y multiplicidades) que no se encime con
    cajas, con otras etiquetas ni con lineas ajenas. Respeta lo que ya trae la especificacion."""
    puestas = []     # rectangulos de etiquetas ya colocadas
    for rid in P.orden:
        sp = specs[rid]
        tipo, o, d, nombre, m1, m2 = _extremos(rid)
        if nombre and "lab" in sp:
            puestas.append(_rect_c(sp["lab"], ancho(nombre, 11) + 6, 14))
        for k, t in (("m1", m1), ("m2", m2)):
            if t and k in sp:
                puestas.append(_rect_c(sp[k], ancho(t, F_ETIQ) + 4, F_ETIQ + 3))
    cr = list(cajas.values())

    def puntaje(rect, rid, propia_ok):
        s = 0.0
        for c in cr:
            if _inter(rect, c, 0.5):
                s += 1000
        for q in puestas:
            if _inter(rect, q, -2):
                s += 400
        for rid2, ruta in rutas.items():
            if rid2 == rid and propia_ok:
                continue
            for a, b in zip(ruta, ruta[1:]):
                if _seg_toca(a, b, rect):
                    s += 60
        return s

    # 1) multiplicidades (van pegadas a los extremos)
    for rid in P.orden:
        sp = specs[rid]
        tipo, o, d, nombre, m1, m2 = _extremos(rid)
        ruta = rutas[rid]
        for k, txt, extremo in (("m1", m1, 0), ("m2", m2, 1)):
            if not txt or k in sp:
                continue
            w, h = ancho(txt, F_ETIQ) + 4, F_ETIQ + 3
            rombo = extremo == 0 and tipo in ("agg", "comp")
            if extremo == 0:
                p, q = ruta[0], ruta[1]
            else:
                p, q = ruta[-1], ruta[-2]
            l = math.hypot(q[0] - p[0], q[1] - p[1]) or 1
            cand = []
            for lado in (1, -1):
                for extra in (0, 8, 16, 24, 32, 44):
                    if extra > l - 10 and extra > 0:
                        continue
                    c = _mult_auto(p, q, txt, lado, rombo)
                    c = (c[0] + (q[0] - p[0]) / l * extra, c[1] + (q[1] - p[1]) / l * extra)
                    cand.append((extra * 0.6 + (0 if lado == 1 else 2), c))
            if not cand:
                cand = [(0, _mult_auto(p, q, txt, 1, rombo))]
            mejor = min(cand, key=lambda x: x[0] + puntaje(_rect_c(x[1], w, h), rid, False))
            sp[k] = mejor[1]
            puestas.append(_rect_c(mejor[1], w, h))
    # 2) nombres (sobre la linea, con fondo blanco)
    for rid in P.orden:
        sp = specs[rid]
        tipo, o, d, nombre, m1, m2 = _extremos(rid)
        ruta = rutas[rid]
        if not nombre or "lab" in sp:
            continue
        segs = [(a, b, math.hypot(b[0] - a[0], b[1] - a[1])) for a, b in zip(ruta, ruta[1:])]
        w, h = ancho(nombre, 11) + 6, 14
        cand = []
        for a, b, l in segs:
            if l < 1:
                continue
            for t in (0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8):
                c = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                horiz = abs(b[1] - a[1]) < abs(b[0] - a[0])
                ok = (horiz and l >= w + 24) or ((not horiz) and l >= h + 30)
                pen = abs(t - 0.5) * 30 + (0 if ok else 150)
                pen += max(0, 200 - l) * 0.3
                cand.append((pen, c))
                # tambien junto a la linea (arriba/abajo o a los lados)
                if horiz:
                    cand.append((pen + 12, (c[0], c[1] - h / 2.0 - 3)))
                    cand.append((pen + 14, (c[0], c[1] + h / 2.0 + 3)))
                else:
                    cand.append((pen + 12, (c[0] + w / 2.0 + 5, c[1])))
                    cand.append((pen + 14, (c[0] - w / 2.0 - 5, c[1])))
        mejor = min(cand, key=lambda x: x[0] + puntaje(_rect_c(x[1], w, h), rid, True))
        sp["lab"] = mejor[1]
        puestas.append(_rect_c(mejor[1], w, h))


class _Desplazada:
    """Vista de una Pagina con todas las cajas movidas (dx, dy)."""
    def __init__(self, P, dx, dy):
        self.P, self.dx, self.dy = P, dx, dy

    def caja_geom(self, nombre):
        c = dict(self.P.caja_geom(nombre))
        c["x"] += self.dx
        c["y"] += self.dy
        return c


def documento(paginas):
    partes = ['<mxfile host="app.diagrams.net">']
    for P in paginas:
        modelo = ('<mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" '
                  'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" '
                  'math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>')
        partes.append('<diagram id=%s name=%s>%s%s</root></mxGraphModel></diagram>'
                      % (esc(P.did), esc(P.nombre), modelo, "".join(xml_pagina(P))))
    partes.append("</mxfile>")
    return "\n".join(partes)


# ------------------------------------------------------------- paginas
def _lc(P, o, d, lado_o, f_o, lado_d, f_d, **kw):
    return dict(ex=(lado_o, f_o), en=(lado_d, f_d), **kw)


# posiciones de la Figura 1 (obtenidas con acomodar_clases.py y afinadas con el ruteador)
POS_FIG1 = {
    'Interfaz': (650, -100),
    'InterfazRegistroMovimientos': (650, 270),
    'InterfazRecepcion': (220, -60),
    'ControladorMovimientos': (500, 820),
    'ControladorRecepcion': (160, 230),
    'Usuario': (920, 520),
    'Producto': (-180, 1010),
    'Ubicacion': (360, 1110),
    'Movimiento': (440, 1380),
    'Entrada': (440, 650),
    'Salida': (810, 1470),
    'Ajuste': (960, 1430),
    'Devolucion': (560, 1630),
    'Kardex': (-190, 1430),
    'InventarioFisico': (920, 960),
    'Proveedor': (-210, 230),
    'OrdenDeCompra': (-110, 510),
    'DetalleOrden': (-310, 810),
    'Recepcion': (270, 760),
    'Reporte': (80, 1300),
    'DashboardEjecutivo': (170, 1180),
    'BitacoraDeAuditoria': (540, 470),
    'nota1': (-340, 1640),
    'nota2': (920, 420),
    'nota3': (910, 1510),
    'nota4': (680, 1640),
}


def figura1():
    P = Pagina("Figura 1. Diagrama de clases completo", "clases", "")
    for n, (x, y) in POS_FIG1.items():
        if n in [m[0] for m in NOTAS]:
            P.nota(n, x, y, 250 if n == "nota2" else 230)
        else:
            P.n(n, x, y)
    for r in RELACIONES:
        P.r(r[0], auto=True)
    P.r(ASOCCLASE[0], auto=True)
    for n in NOTAS:
        P.r(n[0] + "e", auto=True)
    return P


def vista_interfaz():
    P = Pagina("Figura 2. Interfaz y control", "vista2", "f2_")
    yC = 520
    P.n("Interfaz", 251, 0)
    P.n("InterfazRecepcion", 62, 270)
    P.n("InterfazRegistroMovimientos", 441, 270)
    P.n("ControladorRecepcion", 0, yC)
    P.n("ControladorMovimientos", 380, yC)
    ys = 850
    orden = ["Entrada", "Recepcion", "OrdenDeCompra", "BitacoraDeAuditoria", "Movimiento",
             "Ubicacion", "Producto"]
    x = -50
    for nom in orden:
        P.n(nom, x, ys, True)
        x += P.tam(nom)[0] + 14
    # generalizaciones
    P.r("c92", ex=("T", 0.5), en=("B", 0.25), via=[(157, 246), (298, 246)])
    P.r("c91", ex=("T", 0.5), en=("B", 0.75), via=[(534, 246), (392, 246)])
    P.r("c96", ex=("B", 0.5), en=("T", 0.5))
    P.r("c93", ex=("B", 0.5), en=("T", 0.5))
    # dependencias de CR (izquierda) y CM (derecha)
    for rid, f, dest in (("c105", .12, "Entrada"), ("c104", .34, "Recepcion"),
                         ("c103", .56, "OrdenDeCompra"), ("c106", .88, "BitacoraDeAuditoria")):
        P.r(rid, ex=("B", f), en=("T", 0.5))
    for rid, f, dest in (("c102", .12, "BitacoraDeAuditoria"), ("c101", .38, "Movimiento"),
                         ("c100", .62, "Ubicacion"), ("c99", .88, "Producto")):
        P.r(rid, ex=("B", f), en=("T", 0.5))
    return P


def vista_reportes():
    P = Pagina("Figura 5. Reportes y auditoría", "vista5", "f5_")
    P.n("DashboardEjecutivo", 0, 60)
    P.n("Reporte", 242, 0)
    P.n("Kardex", 560, 10, True)
    P.n("Producto", 560, 120, True)
    P.n("Movimiento", 200, 330, True)
    P.n("OrdenDeCompra", 350, 330, True)
    P.n("BitacoraDeAuditoria", 250, 520)
    P.n("Usuario", 640, 590, True)
    P.r("c111", ex=("R", 0.5), en=("L", 0.486))
    P.r("c151", ex=("R", 0.17), en=("L", 0.5))
    P.r("n7", ex=("R", 0.65), en=("L", 0.5))
    P.r("n8", ex=("B", 0.25), en=("T", 0.5))
    P.r("n9", ex=("B", 0.75), en=("T", 0.5))
    P.r("n10", ex=("T", 0.2), en=("B", 0.5))
    P.r("n11", ex=("T", 0.8), en=("B", 0.5))
    P.r("c118", ex=("L", 0.5), en=("R", 0.5))
    return P


def vista_compras():
    P = Pagina("Figura 4. Compras", "vista4", "f4_")
    P.n("Proveedor", 0, 0)
    P.n("OrdenDeCompra", 260, 0)
    P.n("Usuario", 0, 245, True)
    P.n("Producto", 720, 40, True)
    P.n("DetalleOrden", 590, 130)
    P.nota("nota1", 590, 330, 230)
    P.n("Recepcion", 250, 360)
    P.n("Entrada", 60, 425, True)
    P.n("Ubicacion", 260, 650, True)
    P.n("BitacoraDeAuditoria", 390, 650, True)
    P.r("c133", ex=("R", 0.43), en=("L", 0.324))
    P.r("n1", ex=("T", 0.5), en=("T", 0.5), via=[(69, -70), (760, -70)])
    P.r("c136", ex=("R", 0.198), en=("L", 0.5), lab=(595, 55))
    P.r("c154", ex=("T", 0.5), on=0.6)
    P.r("nota1e", ex=("T", 0.5), en=("B", 0.5))
    P.r("c139", ex=("B", 0.43), en=("T", 0.58))
    P.r("c115", ex=("R", 0.5), en=("L", 0.935))
    P.r("c142", ex=("L", 0.4), en=("R", 0.5))
    P.r("n4", ex=("R", 0.385), en=("R", 0.5), via=[(850, 440), (850, 55)])
    P.r("n5", ex=("B", 0.2), en=("T", 0.5))
    P.r("n6", ex=("B", 0.8), en=("T", 0.5))
    return P


def vista_inventario():
    P = Pagina("Figura 3. Inventario", "vista3", "f3_")
    pos = {'Usuario': (620, 450), 'Producto': (-160, 0), 'Ubicacion': (-110, 330),
           'Movimiento': (220, 250), 'Entrada': (320, 150), 'Salida': (600, 330),
           'Ajuste': (120, 540), 'Devolucion': (510, 490), 'Kardex': (740, 40),
           'InventarioFisico': (-160, 580), 'BitacoraDeAuditoria': (410, 610),
           'OrdenDeCompra': (590, 100), 'Proveedor': (130, 120), 'Reporte': (800, 310),
           'Recepcion': (470, 160)}
    stubs = ("BitacoraDeAuditoria", "OrdenDeCompra", "Proveedor", "Reporte", "Recepcion")
    for n, (x, y) in pos.items():
        P.n(n, x, y, n in stubs)
    P.nota("nota2", 610, 700, 250)
    P.nota("nota3", 80, 660, 230)
    P.nota("nota4", 230, 500, 230)
    for rid in ("c107", "c108", "c109", "c110", "c112", "c115", "c118", "c121", "c124", "c127",
                "c130", "n1", "c136", "c142", "c145", "c148", "c151", "n2", "n3", "n20",
                "nota2e", "nota3e", "nota4e"):
        P.r(rid, auto=True)
    return P


PAGINAS = [figura1, vista_interfaz, vista_inventario, vista_compras, vista_reportes]


def main():
    salida = sys.argv[1] if len(sys.argv) > 1 else SALIDA
    paginas = [f() for f in PAGINAS]
    with open(salida, "w", encoding="utf8") as f:
        f.write(documento(paginas))
    print("escrito", salida)


if __name__ == "__main__":
    main()
