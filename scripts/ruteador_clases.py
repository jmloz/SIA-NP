"""Ruteador ortogonal de aristas (Dijkstra sobre una rejilla) para construir_drawio.py.

Dadas las cajas ya colocadas, calcula para cada arista el punto de salida, el de
entrada y los puntos intermedios de modo que las lineas no atraviesen cajas,
doblen poco y se crucen o encimen lo menos posible con las ya trazadas.
"""
import heapq
import math

DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]   # arriba, derecha, abajo, izquierda
LADOS = ["T", "R", "B", "L"]


class Ruteador:
    def __init__(self, cajas, g=10, margen=6, extra=60):
        self.g, self.m = g, margen
        self.cajas = cajas
        xs = [c[0] for c in cajas.values()] + [c[0] + c[2] for c in cajas.values()]
        ys = [c[1] for c in cajas.values()] + [c[1] + c[3] for c in cajas.values()]
        self.x0 = int(math.floor((min(xs) - extra) / g)) * g
        self.y0 = int(math.floor((min(ys) - extra) / g)) * g
        self.nx = int(math.ceil((max(xs) + extra - self.x0) / g)) + 1
        self.ny = int(math.ceil((max(ys) + extra - self.y0) / g)) + 1
        self.bloq = set()
        for (x, y, w, h) in cajas.values():
            for ix in range(self.nx):
                px = self.x0 + ix * g
                if x - margen < px < x + w + margen:
                    for iy in range(self.ny):
                        py = self.y0 + iy * g
                        if y - margen < py < y + h + margen:
                            self.bloq.add((ix, iy))
        self.uso_h = {}   # (ix, iy) -> n   celda horizontal entre (ix,iy) y (ix+1,iy)
        self.uso_v = {}   # (ix, iy) -> n   celda vertical entre (ix,iy) y (ix,iy+1)
        self.puertos = []  # puntos ya usados como salida/entrada

    # --- rejilla
    def _nodo(self, x, y):
        return (int(round((x - self.x0) / self.g)), int(round((y - self.y0) / self.g)))

    def _pt(self, n):
        return (self.x0 + n[0] * self.g, self.y0 + n[1] * self.g)

    def candidatos(self, nombre, extra_pts=None):
        """Puertos de una caja: (lado, fraccion, punto en borde, nodo exterior, dir de salida)."""
        x, y, w, h = self.cajas[nombre]
        g, m = self.g, self.m
        out = []
        esq = 14
        # superior e inferior
        for lado, py, dy in (("T", y, -1), ("B", y + h, 1)):
            px = int(math.ceil((x + esq) / g)) * g
            while px <= x + w - esq:
                ny = (math.floor((py - m) / g) * g) if dy < 0 else (math.ceil((py + m) / g) * g)
                out.append((lado, (px - x) / float(w), (px, py), self._nodo(px, ny), 0 if dy < 0 else 2))
                px += g
        for lado, px, dx in (("L", x, -1), ("R", x + w, 1)):
            py = int(math.ceil((y + esq) / g)) * g
            while py <= y + h - esq:
                nx = (math.floor((px - m) / g) * g) if dx < 0 else (math.ceil((px + m) / g) * g)
                out.append((lado, (py - y) / float(h), (px, py), self._nodo(nx, py), 3 if dx < 0 else 1))
                py += g
        return [c for c in out if c[3] not in self.bloq]

    # --- busqueda
    def ruta(self, o, d, p_obj=None, dobl=14, cruce=45, solape=70, cerca=3):
        src = self.candidatos(o)
        if p_obj is None:
            dst = self.candidatos(d)
            fin = {}
            for c in dst:
                fin.setdefault(c[3], []).append(c)
            cx, cy = self.cajas[d][0] + self.cajas[d][2] / 2, self.cajas[d][1] + self.cajas[d][3] / 2
        else:
            nd = self._nodo(*p_obj)
            fin = {nd: [("P", 0, p_obj, nd, None)]}
            cx, cy = p_obj
        heap, mejor, padre = [], {}, {}
        for c in src:
            pen = 0
            for q in self.puertos:
                if abs(q[0] - c[2][0]) + abs(q[1] - c[2][1]) < 20:
                    pen += 40
            est = (c[3], c[4])
            if mejor.get(est, 1e18) > pen:
                mejor[est] = pen
                padre[est] = ("S", c)
                heapq.heappush(heap, (pen, est))
        meta = None
        while heap:
            costo, est = heapq.heappop(heap)
            if costo > mejor.get(est, 1e18):
                continue
            nodo, dr = est
            if nodo in fin:
                # llegada al nodo exterior del puerto destino
                for c in fin[nodo]:
                    if c[0] == "P":
                        tot = costo
                        extra_ = 0
                    else:
                        entrada = (c[4] + 2) % 4    # direccion para entrar a la caja
                        extra_ = 0 if dr == entrada else dobl
                        extra_ += sum(40 for q in self.puertos
                                      if abs(q[0] - c[2][0]) + abs(q[1] - c[2][1]) < 20)
                    tot = costo + extra_
                    if meta is None or tot < meta[0]:
                        meta = (tot, est, c)
                if meta is not None and costo > meta[0]:
                    break
            for nd_i, (dx, dy) in enumerate(DIRS):
                if nd_i == (dr + 2) % 4:
                    continue
                nn = (nodo[0] + dx, nodo[1] + dy)
                if not (0 <= nn[0] < self.nx and 0 <= nn[1] < self.ny) or nn in self.bloq:
                    continue
                paso = 10
                if nd_i != dr:
                    paso += dobl
                if dx:
                    k = (min(nodo[0], nn[0]), nodo[1])
                    paso += solape * self.uso_h.get(k, 0)
                    if self.uso_v.get((nn[0], nn[1]), 0) or self.uso_v.get((nn[0], nn[1] - 1), 0):
                        paso += cruce
                else:
                    k = (nodo[0], min(nodo[1], nn[1]))
                    paso += solape * self.uso_v.get(k, 0)
                    if self.uso_h.get((nn[0], nn[1]), 0) or self.uso_h.get((nn[0] - 1, nn[1]), 0):
                        paso += cruce
                # cerca de otras cajas: evita rozarlas
                nest = (nn, nd_i)
                nc = costo + paso
                if nc < mejor.get(nest, 1e18):
                    mejor[nest] = nc
                    padre[nest] = ("N", est)
                    heapq.heappush(heap, (nc, nest))
        if meta is None:
            return None
        _, est, cdst = meta
        nodos = []
        e = est
        while True:
            nodos.append(e[0])
            tipo, ant = padre[e]
            if tipo == "S":
                csrc = ant
                break
            e = ant
        nodos.reverse()
        # registrar uso
        for a, b in zip(nodos, nodos[1:]):
            if a[1] == b[1]:
                k = (min(a[0], b[0]), a[1])
                self.uso_h[k] = self.uso_h.get(k, 0) + 1
            else:
                k = (a[0], min(a[1], b[1]))
                self.uso_v[k] = self.uso_v.get(k, 0) + 1
        self.puertos.append(csrc[2])
        if cdst[0] != "P":
            self.puertos.append(cdst[2])
        pts = [csrc[2]] + [self._pt(n) for n in nodos] + ([cdst[2]] if cdst[0] != "P" else [p_obj])
        # simplificar colineales y puntos repetidos
        lim = [pts[0]]
        for p in pts[1:]:
            if p != lim[-1]:
                lim.append(p)
        simp = [lim[0]]
        for i in range(1, len(lim) - 1):
            a, b, c = simp[-1], lim[i], lim[i + 1]
            if (a[0] == b[0] == c[0]) or (a[1] == b[1] == c[1]):
                continue
            simp.append(b)
        simp.append(lim[-1])
        return dict(ex=(csrc[0], csrc[1]),
                    en=((cdst[0], cdst[1]) if cdst[0] != "P" else None),
                    via=simp[1:-1], puntos=simp)


def rutear(cajas, aristas, g=10):
    """aristas: lista de (id, origen, destino); devuelve {id: spec}. Las mas cortas primero."""
    r = Ruteador(cajas, g)
    def dist(a):
        o, d = cajas[a[1]], cajas[a[2]]
        return abs(o[0] + o[2] / 2 - d[0] - d[2] / 2) + abs(o[1] + o[3] / 2 - d[1] - d[3] / 2)
    out = {}
    for a in sorted(aristas, key=dist):
        res = r.ruta(a[1], a[2])
        out[a[0]] = res
    return out, r
