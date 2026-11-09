"""Verifica que el .drawio y el PDF del diagrama de clases concuerden.

Uso: python verificar_clases.py archivo.drawio archivo.pdf [original.pdf]
Si se da original.pdf (el PDF de antes), compara el texto de las paginas que no cambian.
Sale con codigo 1 si alguna comprobacion falla.
"""
import re
import sys
import xml.etree.ElementTree as ET

import pymupdf

import render_drawio as R
import verificar_geom as V
from modelo_clases import CLASES, NOTAS, RELACIONES

PERMITIDOS = {"#000000", "#FFFFFF", "#E6E6E6", "none"}
FALLOS = []


def ok(cond, msg):
    print(("  ok   " if cond else "  FALLA ") + msg)
    if not cond:
        FALLOS.append(msg)


def norm(t):
    return re.sub(r"\s+", " ", t).strip()


def firmas_nuevas():
    return [
        "+registrarMovimiento(tipo, cantidad, ubicacion, documento)",
        "+registrarRecepcion(folioOC, cantidades, ubicacion, factura)",
        "+crearMovimiento(tipo, cantidad, ubicacion, documento): String",
        "+generarEntrada(cantidades, ubicacion)",
        "-campoTipo: char{E,S,A,D}", "-campoDocumento: String",
        "-campoCantidades: String", "-campoUbicacion: String",
        "-estado: String{Pendiente, Emitida, Parcialmente recibida, Recibida, Cerrada, Cancelada}",
        "+cancelarOrden()", "+cerrarOrden()",
    ]


def relaciones_pagina(pag):
    """Conjunto de (tipo, origen, destino, nombre, m_origen, m_destino) de una pagina cargada."""
    por_id = {}
    for c in pag["cajas"].values():
        txt = " ".join(t for t, f in c.get("encabezado", [])) if c["tipo"] != "nota" else ""
        nombre = txt.split()[-1] if txt else None
        por_id[c["id"]] = (c["tipo"], nombre)
    out = set()
    for a in pag["aristas"].values():
        st = a["estilo"]
        o = por_id.get(a["origen"], (None, None))
        d = por_id.get(a["destino"], (None, None))
        if o[0] == "nota" or o[0] is None or d[0] is None and a["destino"] is not None:
            continue
        if a["destino"] is None:        # clase de asociacion
            out.add(("asocclase", o[1], "(enlace)", "", "", ""))
            continue
        if st.get("endArrow") == "block":
            tipo = "gen"
        elif st.get("endArrow") == "open":
            tipo = "dep"
        elif st.get("startArrow") == "diamondThin":
            tipo = "comp" if st.get("startFill") == "1" else "agg"
        else:
            tipo = "assoc"
        m = {}
        for e, k in zip(a["etiquetas"], range(2)):
            m[k] = e["valor"]
        out.add((tipo, o[1], d[1], a["valor"], m.get(0, ""), m.get(1, "")))
    return out


def main(drawio, pdf, original=None):
    print("== drawio")
    arbol = ET.parse(drawio)
    diagramas = list(arbol.getroot().iter("diagram"))
    ok(len(diagramas) == 5, "5 paginas (<diagram>): %d" % len(diagramas))
    todos_ids = set()
    for d in diagramas:
        m = d.find("mxGraphModel")
        ok(m is not None, "%s tiene mxGraphModel" % d.get("name"))
        ids = [c.get("id") for c in m.iter("mxCell")]
        ok(len(ids) == len(set(ids)), "ids unicos en %s (%d celdas)" % (d.get("name"), len(ids)))
        solo = set(ids) - {"0", "1"}
        ok(not (solo & todos_ids), "ids no repetidos entre paginas (%s)" % d.get("name"))
        todos_ids |= solo
        for c in m.iter("mxCell"):
            if c.get("vertex") == "1" or c.get("edge") == "1":
                if c.find("mxGeometry") is None:
                    FALLOS.append("sin mxGeometry: " + c.get("id"))
            for k in ("source", "target", "parent"):
                if c.get(k) and c.get(k) not in ids:
                    FALLOS.append("referencia rota %s=%s en %s" % (k, c.get(k), c.get("id")))
    ok(not [f for f in FALLOS if f.startswith(("sin mxGeometry", "referencia"))],
       "mxGeometry presente y referencias source/target/parent validas")
    # colores del .drawio
    colores = set()
    for c in arbol.getroot().iter("mxCell"):
        for k in ("fillColor", "strokeColor", "fontColor", "swimlaneFillColor", "labelBackgroundColor"):
            for v in re.findall(k + r"=(#[0-9A-Fa-f]{6}|none)", c.get("style") or ""):
                colores.add(v.upper() if v != "none" else v)
    ok(colores <= PERMITIDOS, "colores del .drawio: %s" % sorted(colores))

    paginas = R.cargar(drawio)
    f1 = paginas[0]
    clases1 = [c for c in f1["cajas"].values() if c["tipo"] == "clase"]
    ok(len(clases1) == 22, "Figura 1 tiene 22 clases: %d" % len(clases1))
    ok(sorted(c["encabezado"][-1][0] for c in clases1) == sorted(c[0] for c in CLASES),
       "nombres de las 22 clases")
    rel1 = relaciones_pagina(f1)
    esperadas = {(r[1], r[2], r[3], r[4], r[5], r[6]) for r in RELACIONES}
    esperadas.add(("asocclase", "DetalleOrden", "(enlace)", "", "", ""))
    ok(rel1 == esperadas, "relaciones de la Figura 1 = modelo (%d); faltan %s; sobran %s" % (
        len(rel1), sorted(esperadas - rel1)[:3], sorted(rel1 - esperadas)[:3]))
    union = set()
    for i, pag in enumerate(paginas[1:], 2):
        r = relaciones_pagina(pag)
        ok(r <= rel1, "relaciones de la Figura %d son subconjunto de la Figura 1 (%d); sobran %s" %
           (i, len(r), sorted(r - rel1)[:3]))
        union |= r
    ok(union == rel1, "toda relacion aparece en alguna vista; faltan %s" % sorted(rel1 - union))
    # notas: cada nota en la Figura 1 y en la vista de su clase
    areas = {1: {"Interfaz", "InterfazRegistroMovimientos", "InterfazRecepcion",
                 "ControladorMovimientos", "ControladorRecepcion"},
             2: {"Usuario", "Producto", "Ubicacion", "Movimiento", "Entrada", "Salida", "Ajuste",
                 "Devolucion", "Kardex", "InventarioFisico"},
             3: {"Proveedor", "OrdenDeCompra", "DetalleOrden", "Recepcion"},
             4: {"Reporte", "DashboardEjecutivo", "BitacoraDeAuditoria"}}
    for nid, clase, texto in NOTAS:
        en1 = any(norm(" ".join(c["lineas"])) == norm(texto) for c in f1["cajas"].values()
                  if c["tipo"] == "nota")
        vista = [i for i, a in areas.items() if clase in a][0]
        enV = any(norm(" ".join(c["lineas"])) == norm(texto) for c in paginas[vista]["cajas"].values()
                  if c["tipo"] == "nota")
        ok(en1 and enV, "nota de %s en la Figura 1 y en la Figura %d" % (clase, vista + 1))
    # vistas: clases con detalle y cajas solo nombre
    for i, a in areas.items():
        det = {c["encabezado"][-1][0] for c in paginas[i]["cajas"].values() if c["tipo"] == "clase"}
        ok(det == a, "Figura %d tiene con detalle exactamente su area (%d clases)" % (i + 1, len(det)))
    # geometria
    for i, pag in enumerate(paginas, 1):
        pr, cr = V.revisar(pag)
        ok(not pr, "Figura %d: sin cajas encimadas, lineas sobre cajas ni etiquetas encimadas %s" %
           (i, pr[:3]))
        print("       Figura %d: %d cruces de lineas" % (i, len(cr)))
    txt = " ".join(norm(t) for pag in paginas for c in pag["cajas"].values()
                   for t in (c.get("attrs", []) + c.get("mets", [])))
    for f in firmas_nuevas():
        ok(norm(f) in txt or norm(f.replace("Emitida, Parcialmente", "Emitida, Parcialmente")) in txt,
           "drawio contiene %s" % f)

    print("== pdf")
    doc = pymupdf.open(pdf)
    ok(len(doc) == 13, "13 paginas (portada e intro de Word, figuras 3-7 vectoriales, tablas): %d" % len(doc))
    ok(all(abs(max(p.rect.width, p.rect.height) - 792) < 0.5 and abs(min(p.rect.width, p.rect.height) - 612) < 0.5
           for p in doc), "todas las paginas tamano carta")
    todo = norm(" ".join(p.get_text() for p in doc))
    for f in firmas_nuevas():
        ok(norm(f) in todo, "pdf contiene %s" % f)
    nombres = [c[0] for c in CLASES]
    for n in nombres:
        if n not in todo:
            ok(False, "pdf contiene la clase %s" % n)
    ok(all(n in todo for n in nombres), "pdf contiene los 22 nombres de clase")
    for i in (2, 3, 4, 5, 6):
        p = doc[i]
        tam_min = min(s["size"] for b in p.get_text("dict")["blocks"] if b["type"] == 0
                      for l in b["lines"] for s in l["spans"] if s["text"].strip()
                      and "Figura" not in s["text"])
        print("       pagina %d: %d imagenes, %d trazos, fuente minima %.2f pt" %
              (i + 1, len(p.get_images()), len(p.get_drawings()), tam_min))
        if i != 2:      # la Figura 1 es vectorial y se amplia al acercar; el minimo aplica a las vistas
            ok(tam_min >= 6.5, "pagina %d (Figura %d): fuente minima %.2f >= 6.5 pt" % (i + 1, i - 1, tam_min))
    for i in range(len(doc)):
        sin_uso = [im[7] for im in doc[i].get_images(full=True) if im[2] > 1000]
        ok(not sin_uso, "pagina %d sin la figura vieja embebida %s" % (i + 1, sin_uso))
    extraido = doc[4].get_text()
    ok("Decimal=0.0" in extraido, "el signo = se extrae bien del texto de la Figura 3")
    ok(" " not in extraido and "­" not in extraido, "espacios y guiones normales en la Figura 3")
    for i in (3, 4, 5, 6):
        ok(len(doc[i].get_images()) == 0, "Figura %d en vectores (sin imagenes)" % (i - 1))
    ok(len([im for im in doc[2].get_images(full=True) if doc[2].get_image_rects(im[0])]) == 0,
       "pagina 3 sin imagen raster")
    for i, p in enumerate(doc):
        pies = [l for l in p.get_text().splitlines() if l.startswith("Figura ")]
        if pies:
            print("       pagina %d pie: %s" % (i + 1, pies))
    # colores del pdf
    cols = set()
    for p in doc:
        for d in p.get_drawings():
            for k in ("fill", "color"):
                if d.get(k) is not None:
                    cols.add(tuple(round(x, 2) for x in d[k]))
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    cols.add(("texto", s["color"]))
    okc = {(0.0, 0.0, 0.0), (1.0, 1.0, 1.0), (0.9, 0.9, 0.9), ("texto", 0)}
    ok(cols <= okc, "colores en el pdf: %s" % sorted(map(str, cols)))
    ok(not any(re.search(r"Página \d+ de", l) or (re.fullmatch(r"\d+", l.strip()) and i not in range(2, 7))
               for i, p in enumerate(doc) for l in p.get_text().splitlines()),
       "sin numeros de pagina")
    if original:
        old = pymupdf.open(original)
        # paginas sin cambio: 1, 2 y la 6 original (ahora 10)
        for a, b in ((0, 0), (1, 1), (5, 9)):
            ok(old[a].get_text() == doc[b].get_text(),
               "texto igual: pagina %d original = pagina %d nueva" % (a + 1, b + 1))
    print("\nRESULTADO:", "TODO OK" if not FALLOS else "%d FALLAS" % len(FALLOS))
    return 1 if FALLOS else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
