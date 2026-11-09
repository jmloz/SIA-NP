"""Actualiza Diagrama_de_Clases_SIA-NP.pdf (no hay .docx fuente) con PyMuPDF.

Parte de un PDF base (el de antes de esta fase) y del .drawio nuevo:
  - pag. 3: reemplaza la imagen por la Figura 1 vectorial (render_drawio.py);
  - inserta las paginas de las Figuras 2 a 5 con su pie en cursiva;
  - redibuja la tabla "Relaciones entre las clases" con una fila nueva y la
    primera columna mas ancha, y reubica el parrafo siguiente completo;
  - sube el contenido de la pagina siguiente (ya no lleva el parrafo partido);
  - agrega "Decisiones de modelado" al final.

Uso: python actualizar_pdf_clases.py base.pdf archivo.drawio salida.pdf
"""
import re
import sys

import pymupdf

from modelo_clases import ancho, ruta_fuente
from render_drawio import cargar, dibujar, limites

NEGRO = (0, 0, 0)
GRIS = (0xE6 / 255.0, 0xE6 / 255.0, 0xE6 / 255.0)
IZQ, DER = 72.1, 543.2          # margenes del texto

# fila nueva despues de Ubicacion/contiene
FILAS = [
    ("Usuario", "registra", "1 — 0..*", "Movimiento", "Asociación"),
    ("Usuario", "elabora", "1 — 0..*", "OrdenDeCompra", "Asociación"),
    ("Usuario", "genera", "1 — 0..*", "BitacoraDeAuditoria", "Asociación"),
    ("Usuario", "realiza", "1 — 0..*", "InventarioFisico", "Asociación"),
    ("Producto", "afecta", "1 — 0..*", "Movimiento", "Asociación"),
    ("Producto", "tiene", "1 — 1", "Kardex", "Asociación"),
    ("Ubicacion", "contiene", "1 — 0..*", "Producto", "Agregación"),
    ("Ubicacion", "ubica", "1 — 0..*", "Movimiento", "Asociación"),
    ("Kardex", "consiste de", "1 — 0..*", "Movimiento", "Todo y sus partes"),
    ("Proveedor", "recibe", "1 — 0..*", "OrdenDeCompra", "Asociación"),
    ("Proveedor", "surte", "1..* — 1..*", "Producto", "Asociación"),
    ("OrdenDeCompra", "solicita", "0..* — 1..*", "Producto", "Asociación con clase DetalleOrden"),
    ("OrdenDeCompra", "se surte con", "1 — 0..*", "Recepcion", "Asociación"),
    ("Recepcion", "genera", "0..1 — 1..*", "Entrada", "Asociación"),
    ("Recepcion", "actualiza / asigna / registra en", "—", "Producto, Ubicacion, BitacoraDeAuditoria", "Dependencia"),
    ("InventarioFisico", "cuenta", "0..* — 1..*", "Producto", "Asociación"),
    ("InventarioFisico", "se realiza en", "0..* — 1..*", "Ubicacion", "Asociación"),
    ("InventarioFisico", "genera", "1 — 0..*", "Ajuste", "Asociación"),
    ("Reporte", "consulta", "0..* — 1..*", "Kardex", "Asociación"),
    ("Reporte", "consulta", "—", "Producto, Movimiento, OrdenDeCompra", "Dependencia"),
    ("BitacoraDeAuditoria", "registra", "—", "Movimiento, OrdenDeCompra", "Dependencia"),
    ("Entrada, Salida, Ajuste, Devolucion", "es un", "—", "Movimiento", "Generalización"),
    ("DashboardEjecutivo", "es un", "—", "Reporte", "Generalización"),
    ("InterfazRegistroMovimientos, InterfazRecepcion", "es un", "—", "Interfaz", "Generalización"),
    ("InterfazRegistroMovimientos", "envía solicitudes a", "1 — 1", "ControladorMovimientos", "Asociación"),
    ("InterfazRecepcion", "envía solicitudes a", "1 — 1", "ControladorRecepcion", "Asociación"),
    ("ControladorMovimientos", "coordina / valida / crea / registra en", "—",
     "Producto, Ubicacion, Movimiento, BitacoraDeAuditoria", "Dependencia"),
    ("ControladorRecepcion", "coordina / crea / genera / registra en", "—",
     "OrdenDeCompra, Recepcion, Entrada, BitacoraDeAuditoria", "Dependencia"),
]
ENCAB = ("Clase", "Relación", "Multiplicidad", "Clase", "Tipo")

VISTAS = {  # indice de pagina del .drawio -> area del pie
    1: "interfaz y control", 2: "inventario", 3: "compras", 4: "reportes y auditoría"}


class Fuentes:
    def __init__(self):
        self.f = {e: pymupdf.Font(fontfile=ruta_fuente(e))
                  for e in ("regular", "bold", "italic")}

    def w(self, t, tam, e="regular"):
        return self.f[e].text_length(t, fontsize=tam)


def escribir(page, fuentes, items):
    """items: (x, y_base, texto, tam, estilo)"""
    tw = pymupdf.TextWriter(page.rect)
    for x, y, t, tam, e in items:
        tw.append((x, y), t, font=fuentes.f[e], fontsize=tam)
    tw.write_text(page, color=NEGRO)


def partir(fuentes, texto, ancho_max, tam, e="regular"):
    palabras, lineas, act = texto.split(" "), [], ""
    for p in palabras:
        prueba = (act + " " + p).strip() if act else p
        if fuentes.w(prueba, tam, e) <= ancho_max or not act:
            act = prueba
        else:
            lineas.append(act)
            act = p
    lineas.append(act)
    return lineas


# ------------------------------------------------------------------ pasos
def pagina_figura1(doc, fuentes, pag1):
    p = doc[2]
    # quita la imagen (y el parche "0..1" de la fase anterior: texto y rectangulo blanco)
    for im in p.get_images(full=True):
        for r in p.get_image_rects(im[0]):
            p.add_redact_annot(r, fill=False)
    p.add_redact_annot(pymupdf.Rect(100, 440, 140, 470), fill=False)
    p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_REMOVE,
                       graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED,
                       text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    area = pymupdf.Rect(40, 40, 572, 678)
    colocar(p, pag1, area)


def colocar(page, pag, area):
    l = limites(pag)
    w, h = l[2] - l[0], l[3] - l[1]
    s = min(area.width / w, area.height / h)
    x0 = area.x0 + (area.width - w * s) / 2.0
    y0 = area.y0 + (area.height - h * s) / 2.0
    dibujar(page, pag, x0, y0, s, l)
    return s, (x0, y0, x0 + w * s, y0 + h * s)


def paginas_vistas(doc, fuentes, paginas, despues):
    """Inserta las Figuras 2 a 5 despues de la pagina `despues` (indice)."""
    info = {}
    for k, (i, area) in enumerate(VISTAS.items()):
        pag = paginas[i]
        l = limites(pag)
        w, h = l[2] - l[0], l[3] - l[1]
        horizontal = (w / h) > 1.0
        W, H = (792, 612) if horizontal else (612, 792)
        p = doc.new_page(pno=despues + 1 + k, width=W, height=H)
        a = pymupdf.Rect(30, 30, W - 30, H - 56)
        s, caja = colocar(p, pag, a)
        pie = "Figura %d. Vista de %s del diagrama de clases." % (i + 1, area)
        tam = 10
        yb = min(caja[3] + 22, H - 30)
        escribir(p, fuentes, [(W / 2.0 - fuentes.w(pie, tam, "italic") / 2.0, yb, pie, tam, "italic")])
        info[i + 1] = (W, H, s)
    return info


def altura_tabla(fuentes, anchos, tam=9, pad=4.0, paso=10.35, alto1=14.85):
    h = 0.0
    for fila in [ENCAB] + FILAS:
        n = 1
        for c, t in enumerate(fila):
            e = "bold" if fila is ENCAB else "regular"
            n = max(n, len(partir(fuentes, t, anchos[c] - 2 * pad, tam, e)))
        h += alto1 + paso * (n - 1)
    return h


def medir_tabla(fuentes, extra=20):
    """Anchos de columna (pt): primera columna lo bastante ancha para que no se partan los
    nombres de clase; el resto se reparte buscando la tabla mas baja."""
    tam, pad = 9, 4.0
    total = 540.25 - 72.3 + extra   # la tabla sale 10 pt por cada lado del margen de texto
    c1 = max(fuentes.w(t, tam) for t in ("InterfazRegistroMovimientos", "ControladorMovimientos",
                                         "ControladorRecepcion")) + 2 * pad + 1
    c3 = fuentes.w("Multiplicidad", tam, "bold") + 2 * pad + 1
    c4min = fuentes.w("ControladorMovimientos", tam) + 2 * pad + 1
    mejor = None
    c4 = c4min
    while c4 < c4min + 60:
        c5 = fuentes.w("Generalización", tam) + 2 * pad + 1
        while c5 < 130:
            c2 = total - c1 - c3 - c4 - c5
            if c2 > fuentes.w("registra en", tam) + 2 * pad:
                an = [c1, c2, c3, c4, c5]
                h = altura_tabla(fuentes, an)
                clave = (round(h, 2), -min(c2 - 70, c4 - c4min))
                if mejor is None or clave < mejor[0]:
                    mejor = (clave, an)
            c5 += 2
        c4 += 2
    return mejor[1]


def tabla(page, fuentes, x0, y0, anchos):
    tam, pad, paso, alto1 = 9, 4.0, 10.35, 14.85
    xs = [x0]
    for a in anchos:
        xs.append(xs[-1] + a)
    filas, alturas = [ENCAB] + FILAS, []
    celdas = []
    for fila in filas:
        lin = [partir(fuentes, t, anchos[c] - 2 * pad, tam, "bold" if fila is ENCAB else "regular")
               for c, t in enumerate(fila)]
        celdas.append(lin)
        alturas.append(alto1 + paso * (max(len(c) for c in lin) - 1))
    sh = page.new_shape()
    y = y0
    # encabezado gris
    for c in range(5):
        sh.draw_rect(pymupdf.Rect(xs[c], y, xs[c + 1], y + alturas[0]))
    sh.finish(fill=GRIS, color=None)
    ys = [y0]
    for h in alturas:
        ys.append(ys[-1] + h)
    for yy in ys:
        sh.draw_line((xs[0], yy), (xs[-1], yy))
    for xx in xs:
        sh.draw_line((xx, ys[0]), (xx, ys[-1]))
    sh.finish(color=NEGRO, width=0.5)
    sh.commit()
    items = []
    for r, lin in enumerate(celdas):
        for c, lineas in enumerate(lin):
            for k, t in enumerate(lineas):
                items.append((xs[c] + pad, ys[r] + 10.7 + k * paso, t, tam,
                              "bold" if r == 0 else "regular"))
    escribir(page, fuentes, items)
    return ys[-1]


def pagina_tabla(doc, fuentes, idx):
    p = doc[idx]
    # texto del parrafo siguiente (con la posicion de cada palabra) antes de borrarlo
    lineas = lineas_parrafo(doc, idx)
    # borra tabla (texto y lineas) y parrafo; el titulo y la introduccion quedan
    for r in (pymupdf.Rect(60, 103, 552, 655), pymupdf.Rect(60, 658, 552, 740)):
        p.add_redact_annot(r, fill=False)
    p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                       graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED,
                       text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    anchos = medir_tabla(fuentes)
    fin = tabla(p, fuentes, 72.3 - 10, 106.55, anchos)
    # parrafo completo, con las mismas posiciones x de cada palabra y 12.65 de interlineado
    arriba = fin + 19.2
    base0 = arriba + 9.95
    items = []
    for k, palabras in enumerate(lineas):
        for x, t in palabras:
            items.append((x, base0 + k * 12.65, t, 11, "regular"))
    escribir(p, fuentes, items)
    return fin, base0 + (len(lineas) - 1) * 12.65 + 2.75


def lineas_parrafo(doc, idx):
    """Palabras (x, texto) de las 5 lineas del parrafo en la pagina idx y de las 2 en idx+1."""
    out = []
    for n, (desde, hasta) in ((idx, (660, 740)), (idx + 1, (50, 82))):
        pg = doc[n]
        pal = [w for w in pg.get_text("words") if desde < w[1] < hasta]
        pal.sort(key=lambda w: (round(w[1], 0), w[0]))
        por_linea = {}
        for w in pal:
            por_linea.setdefault(round(w[1], 0), []).append((w[0], w[4]))
        for k in sorted(por_linea):
            out.append(por_linea[k])
    return out


def pagina_subir(doc, idx, dy):
    """Quita las 2 lineas que continuaban el parrafo y sube el resto del contenido."""
    p = doc[idx]
    p.add_redact_annot(pymupdf.Rect(60, 50, 552, 82), fill=False)
    p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                       graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
                       text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    datos = p.read_contents()
    xref = p.get_contents()[0]
    doc.update_stream(xref, b"q 1 0 0 1 0 %.2f cm" % dy + chr(10).encode() + datos + chr(10).encode() + b"Q" + chr(10).encode())
    doc.xref_set_key(p.xref, "Contents", "%d 0 R" % xref)


def pagina_final(doc, fuentes, idx):
    p = doc[idx]
    ult = max(b["bbox"][3] for b in p.get_text("dict")["blocks"] if b["type"] == 0)
    top = ult + 12.1
    items = [(IZQ, top + 11.8, "Decisiones de modelado", 13, "bold")]
    top += 20.9
    textos = [
        "Los métodos cancelarOrden() y cerrarOrden() de OrdenDeCompra no vienen de una tarjeta "
        "CRC ni de una secuencia: cubren el paso a los estados Cancelada y Cerrada.",
        "Los estados de la orden son Pendiente, Emitida, Parcialmente recibida, Recibida, "
        "Cerrada y Cancelada. Los cuatro primeros son los nombres de CU5 y CU6, en lugar de "
        "Abierta y Parcial del diccionario de datos de la ERS; Cerrada y Cancelada coinciden.",
        "Las subclases de las tarjetas CRC Usuario e Inventario físico se modelan con los "
        "atributos rol y tipoConteo.",
        "El rol Vendedor de la ERS no se incluye porque no participa en CU1–CU8, y el catálogo "
        "de clientes de CU4 no se modela porque ninguna tarjeta CRC lo incluye.",
    ]
    for t in textos:
        items.append((90.1, top + 9.95, "●", 11, "regular"))
        for k, lin in enumerate(partir(fuentes, t, DER - 108.1, 11)):
            items.append((108.1, top + 9.95 + 12.65 * k, lin, 11, "regular"))
            ultimo = top + 9.95 + 12.65 * k
        top = ultimo + 2.75 + 4.05
    escribir(p, fuentes, items)
    return top


def _gids_de_cmap(texto):
    """Glifos que declara un CMap ToUnicode (bloques bfchar y bfrange)."""
    gids = set()
    for bloque in re.findall(r"beginbfchar(.*?)endbfchar", texto, re.S):
        gids.update(int(g, 16) for g in re.findall(r"^\s*<([0-9A-Fa-f]+)>", bloque, re.M))
    for bloque in re.findall(r"beginbfrange(.*?)endbfrange", texto, re.S):
        for i, f in re.findall(r"^\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", bloque, re.M):
            gids.update(range(int(i, 16), int(f, 16) + 1))
    return gids


def _cmap(pares):
    cab = ("/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n"
           "/CIDSystemInfo <</Registry(Adobe)/Ordering(UCS)/Supplement 0>> def\n"
           "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n"
           "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n")
    cuerpo = ""
    for i in range(0, len(pares), 100):
        trozo = pares[i:i + 100]
        lineas = "".join("<%04X> <%04X>\n" % p for p in trozo)
        cuerpo += "%d beginbfchar\n%sendbfchar\n" % (len(trozo), lineas)
    return cab + cuerpo + "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n"


def arreglar_tounicode(doc):
    """El ToUnicode que escribe MuPDF para las fuentes insertadas tiene entradas falsas (en Arial:
    '=' como U+00E6, 'J' como U+00C3, espacio como U+00A0, guion como U+00AD). Se reescribe desde
    el cmap real de cada fuente, tomando el codigo mas bajo de cada glifo. No toca las fuentes
    subconjunto que trae el PDF base (BaseFont con prefijo ABCDEF+)."""
    n = 0
    tablas = {}
    for xref in range(1, doc.xref_length()):
        obj = doc.xref_object(xref, compressed=True)
        m = re.search(r"/BaseFont\s*/([^/\s]+).*?/ToUnicode (\d+) 0 R", obj, re.S)
        if not m or "/Type0" not in obj or "+" in m.group(1):
            continue
        negrita, cursiva = "Bold" in m.group(1), "Italic" in m.group(1)
        estilo = ("bolditalic" if negrita and cursiva else "bold" if negrita
                  else "italic" if cursiva else "regular")
        if estilo not in tablas:
            fuente, tabla = pymupdf.Font(fontfile=ruta_fuente(estilo)), {}
            for cp in fuente.valid_codepoints():
                g = fuente.has_glyph(cp)
                if g and cp <= 0xFFFF:
                    tabla[g] = min(cp, tabla.get(g, cp))
            tablas[estilo] = tabla
        tu = int(m.group(2))
        gids = _gids_de_cmap(doc.xref_stream(tu).decode("latin-1"))
        pares = sorted((g, tablas[estilo][g]) for g in gids if g in tablas[estilo])
        doc.update_stream(tu, _cmap(pares).encode("latin-1"))
        n += 1
    return n


def quitar_imagenes_sin_uso(doc):
    """Saca de los recursos las imagenes que ninguna pagina dibuja (la figura raster vieja)."""
    todas, usadas = set(), set()
    for p in doc:
        for im in p.get_images(full=True):
            todas.add(im[0])
            if p.get_image_rects(im[0]):
                usadas.add(im[0])
    sobran = todas - usadas
    for xref in range(1, doc.xref_length()):
        if doc.xref_is_stream(xref):
            continue
        obj = doc.xref_object(xref, compressed=True)
        nuevo = obj
        for s in sobran:
            nuevo = re.sub(r"/[A-Za-z]+\d+ %d 0 R" % s, "", nuevo)
        if nuevo != obj:
            doc.update_object(xref, nuevo)
    return sobran


def main(base, drawio, salida):
    fuentes = Fuentes()
    paginas = cargar(drawio)
    doc = pymupdf.open(base)
    pagina_figura1(doc, fuentes, paginas[0])
    fin_tabla, fin_par = pagina_tabla(doc, fuentes, 3)
    pagina_subir(doc, 4, 37.4)
    fin_final = pagina_final(doc, fuentes, 6)
    info = paginas_vistas(doc, fuentes, paginas, 2)
    print("ToUnicode reescritos:", arreglar_tounicode(doc))
    print("imagenes sin uso quitadas:", quitar_imagenes_sin_uso(doc))
    doc.save(salida, garbage=4, deflate=True)
    print("tabla termina en y=%.1f; parrafo termina en y=%.1f; decisiones en y=%.1f" %
          (fin_tabla, fin_par, fin_final))
    for k, v in info.items():
        print("Figura %d: pagina %dx%d, escala %.3f" % ((k,) + v))


if __name__ == "__main__":
    main(*sys.argv[1:4])
