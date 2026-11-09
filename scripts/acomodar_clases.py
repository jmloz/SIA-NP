"""Ayuda para acomodar cajas: recocido simulado que minimiza cruces de lineas,
lineas sobre cajas y longitud total. Las lineas se suponen rectas (del borde de
una caja hacia el centro de la otra, como las dibuja draw.io por defecto).

Se uso para obtener las posiciones de la Figura 1 y de la Figura 3; las
posiciones resultantes quedan fijas en construir_drawio.py.
"""
import math
import random



def _perim(c, w, h, hacia):
    dx, dy = hacia[0] - c[0], hacia[1] - c[1]
    if dx == 0 and dy == 0:
        return c
    t = min((w / 2.0) / abs(dx) if dx else 1e9, (h / 2.0) / abs(dy) if dy else 1e9)
    return (c[0] + dx * t, c[1] + dy * t)


def _seg_rect(p, q, r, m=2.0):
    x0, y0, x1, y1 = r[0] + m, r[1] + m, r[2] - m, r[3] - m
    dx, dy = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, p[0] - x0), (dx, x1 - p[0]), (-dy, p[1] - y0), (dy, y1 - p[1])):
        if pp == 0:
            if qq < 0:
                return 0.0
        else:
            t = qq / pp
            if pp < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
            if t0 > t1:
                return 0.0
    return (t1 - t0) * math.hypot(dx, dy)


def _cruza(a, b, c, d):
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def costo(pos, tam, aristas, wmax, hmax, margen=26, pcruce=150):
    nombres = list(pos)
    c = 0.0
    rects = {n: (pos[n][0], pos[n][1], pos[n][0] + tam[n][0], pos[n][1] + tam[n][1]) for n in nombres}
    for i, a in enumerate(nombres):
        ra = rects[a]
        for b in nombres[i + 1:]:
            rb = rects[b]
            ox = min(ra[2], rb[2]) - max(ra[0], rb[0]) + margen
            oy = min(ra[3], rb[3]) - max(ra[1], rb[1]) + margen
            if ox > 0 and oy > 0:
                c += 400 + min(ox, oy) * 10
    segs = []
    for a, b, minlen in aristas:
        ca = (pos[a][0] + tam[a][0] / 2.0, pos[a][1] + tam[a][1] / 2.0)
        cb = (pos[b][0] + tam[b][0] / 2.0, pos[b][1] + tam[b][1] / 2.0)
        p = _perim(ca, tam[a][0], tam[a][1], cb)
        q = _perim(cb, tam[b][0], tam[b][1], ca)
        l = math.hypot(q[0] - p[0], q[1] - p[1])
        segs.append((a, b, p, q))
        c += 0.04 * l
        if l < minlen:
            c += (minlen - l) * 4 + 50
        c += 0.35 * min(abs(q[0] - p[0]), abs(q[1] - p[1]))
        for n in nombres:
            if n != a and n != b:
                c += 600 + 5 * _seg_rect(p, q, rects[n]) if _seg_rect(p, q, rects[n]) > 0 else 0
    for i, (a1, b1, p1, q1) in enumerate(segs):
        for a2, b2, p2, q2 in segs[i + 1:]:
            if a1 in (a2, b2) or b1 in (a2, b2):
                continue
            if _cruza(p1, q1, p2, q2):
                c += pcruce
    xs0 = min(r[0] for r in rects.values())
    xs1 = max(r[2] for r in rects.values())
    ys0 = min(r[1] for r in rects.values())
    ys1 = max(r[3] for r in rects.values())
    c += max(0, xs1 - xs0 - wmax) * 15 + max(0, ys1 - ys0 - hmax) * 15
    return c


def acomodar(tam, aristas, wmax, hmax, semilla=1, iters=60000, inicial=None, fijos=(), T0=1.0, pcruce=150):
    rnd = random.Random(semilla)
    nombres = list(tam)
    if inicial:
        pos = {n: list(inicial[n]) for n in nombres}
    else:
        pos = {n: [rnd.uniform(0, wmax - tam[n][0]), rnd.uniform(0, hmax - tam[n][1])]
               for n in nombres}
    actual = costo(pos, tam, aristas, wmax, hmax, pcruce=pcruce)
    mejor, mejor_pos = actual, {n: tuple(p) for n, p in pos.items()}
    libres = [n for n in nombres if n not in fijos]
    for it in range(iters):
        T = T0 * (1.0 - it / float(iters))
        n = rnd.choice(libres)
        viejo = list(pos[n])
        if rnd.random() < 0.15:
            m = rnd.choice(libres)
            pos[n], pos[m] = list(pos[m]), list(pos[n])
            nuevo = costo(pos, tam, aristas, wmax, hmax, pcruce=pcruce)
            if nuevo < actual or rnd.random() < math.exp((actual - nuevo) / (60 * T + 1e-9)):
                actual = nuevo
            else:
                pos[n], pos[m] = list(pos[m]), list(pos[n])
        else:
            s = 15 + 220 * T
            pos[n] = [viejo[0] + rnd.gauss(0, s), viejo[1] + rnd.gauss(0, s)]
            nuevo = costo(pos, tam, aristas, wmax, hmax, pcruce=pcruce)
            if nuevo < actual or rnd.random() < math.exp((actual - nuevo) / (60 * T + 1e-9)):
                actual = nuevo
            else:
                pos[n] = viejo
        if actual < mejor:
            mejor, mejor_pos = actual, {k: tuple(p) for k, p in pos.items()}
    return mejor, {k: (round(p[0] / 10) * 10, round(p[1] / 10) * 10) for k, p in mejor_pos.items()}
