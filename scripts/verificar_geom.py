"""Revision geometrica de una pagina cargada con render_drawio.cargar():
cajas solapadas, lineas sobre cajas, etiquetas encimadas y cruces de lineas."""
import itertools


def _inter_seg_rect(p, q, r, m=1.5):
    x0, y0, x1, y1 = r[0] + m, r[1] + m, r[0] + r[2] - m, r[1] + r[3] - m
    if x0 >= x1 or y0 >= y1:
        return False
    # Liang-Barsky
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


def _cruce(a, b, c, d):
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    o1, o2, o3, o4 = o(a, b, c), o(a, b, d), o(c, d, a), o(c, d, b)
    eps = 1e-3
    return (o1 * o2 < -eps) and (o3 * o4 < -eps)


def _rect_inter(a, b, m=0):
    return not (a[0] + a[2] <= b[0] + m or b[0] + b[2] <= a[0] + m or
                a[1] + a[3] <= b[1] + m or b[1] + b[3] <= a[1] + m)


def _dist_pt_seg(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return ((a[0] + t * dx - p[0]) ** 2 + (a[1] + t * dy - p[1]) ** 2) ** 0.5


def _toca_extremo(r1, r2):
    """True si algun extremo de r1 cae (a menos de 1 px) sobre la polilinea r2."""
    for p in (r1[0], r1[-1]):
        for a, b in zip(r2, r2[1:]):
            if _dist_pt_seg(p, a, b) < 1.0 and p not in (r2[0], r2[-1]):
                return True
    return False


def revisar(pag):
    prob = []
    cajas = {k: (c["x"], c["y"], c["w"], c["h"]) for k, c in pag["cajas"].items()}
    for (k1, r1), (k2, r2) in itertools.combinations(cajas.items(), 2):
        if _rect_inter((r1[0] - 6, r1[1] - 6, r1[2] + 12, r1[3] + 12), r2):
            prob.append("cajas %s y %s solapadas o a menos de 6 px" % (k1, k2))
    ar = pag["aristas"]
    for a in ar.values():
        for s, t in zip(a["ruta"], a["ruta"][1:]):
            for k, r in cajas.items():
                if _inter_seg_rect(s, t, r):
                    prob.append("linea %s atraviesa la caja %s" % (a["id"], k))
        for r in a["rotulos"]:
            rr = (r["c"][0] - r["w"] / 2, r["c"][1] - r["h"] / 2, r["w"], r["h"])
            for k, c in cajas.items():
                if _rect_inter(rr, c):
                    prob.append("etiqueta '%s' de %s toca la caja %s" % (r["texto"], a["id"], k))
    rots = [(a["id"], r) for a in ar.values() for r in a["rotulos"]]
    for (i1, r1), (i2, r2) in itertools.combinations(rots, 2):
        a1 = (r1["c"][0] - r1["w"] / 2, r1["c"][1] - r1["h"] / 2, r1["w"], r1["h"])
        a2 = (r2["c"][0] - r2["w"] / 2, r2["c"][1] - r2["h"] / 2, r2["w"], r2["h"])
        if _rect_inter(a1, a2):
            prob.append("etiquetas '%s'(%s) y '%s'(%s) se encima" % (r1["texto"], i1, r2["texto"], i2))
    # etiqueta sobre una linea ajena
    for i, r in rots:
        rr = (r["c"][0] - r["w"] / 2, r["c"][1] - r["h"] / 2, r["w"], r["h"])
        for a in ar.values():
            if a["id"] == i:
                continue
            for s, t in zip(a["ruta"], a["ruta"][1:]):
                if _inter_seg_rect(s, t, rr, m=0.5):
                    prob.append("etiqueta '%s' (%s) cae sobre la linea %s" % (r["texto"], i, a["id"]))
    cruces = []
    for a1, a2 in itertools.combinations(ar.values(), 2):
        if _toca_extremo(a1["ruta"], a2["ruta"]) or _toca_extremo(a2["ruta"], a1["ruta"]):
            continue          # p. ej. el enlace de la clase de asociacion termina sobre la linea
        n = 0
        for s1, t1 in zip(a1["ruta"], a1["ruta"][1:]):
            for s2, t2 in zip(a2["ruta"], a2["ruta"][1:]):
                if _cruce(s1, t1, s2, t2):
                    n += 1
        if n:
            cruces.append((a1["id"], a2["id"], n))
    return prob, cruces
