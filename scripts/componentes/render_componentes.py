"""Renderiza el diagrama de componentes .drawio a PNG usando PyMuPDF.

Uso:
    python scripts/componentes/render_componentes.py [--dpi 300]

Lee entregables/10-componentes/Diagrama_Componentes_SIA-NP.drawio y genera
entregables/10-componentes/figuras/componentes.png a 300 dpi por defecto.
"""
import argparse
import base64
import html
import math
import os
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.dirname(AQUI))  # scripts/ para modelo_clases

from modelo_clases import ancho, ruta_fuente

SALIDA_DIR = os.path.join(RAIZ, "entregables", "10-componentes")
DRAWIO = os.path.join(SALIDA_DIR, "Diagrama_Componentes_SIA-NP.drawio")
FIG_DIR = os.path.join(SALIDA_DIR, "figuras")

NEGRO = (0, 0, 0)
BLANCO = (1, 1, 1)
GRIS = (0xE6 / 255.0, 0xE6 / 255.0, 0xE6 / 255.0)
AMARILLO_NOTA = (1.0, 1.0, 0.8)


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


def _texto_plano(valor):
    """Limpia HTML y devuelve texto plano con saltos de línea."""
    if not valor:
        return ""
    t = re.sub(r"<br\s*/?>", "\n", valor)
    t = re.sub(r"&#xa;", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    return html.unescape(t)


def _xml_diagrama(d):
    m = d.find("mxGraphModel")
    if m is not None:
        return m
    datos = (d.text or "").strip()
    raw = zlib.decompress(base64.b64decode(datos), -15)
    return ET.fromstring(urllib.parse.unquote(raw.decode("utf-8")))


def cargar_drawio(ruta):
    """Lee el .drawio y devuelve lista de celdas con geometría."""
    tree = ET.parse(ruta)
    root = tree.getroot()
    diag = root.find("diagram")
    modelo = _xml_diagrama(diag)
    
    # Obtener página completa
    page_w = float(modelo.get("pageWidth", 1100))
    page_h = float(modelo.get("pageHeight", 850))
    
    celdas = []
    raiz = modelo.find("root")
    
    for c in raiz.findall("mxCell"):
        est = _estilo(c.get("style", ""))
        valor = c.get("value", "")
        g = c.find("mxGeometry")
        
        if g is not None:
            x = float(g.get("x", 0))
            y = float(g.get("y", 0))
            w = float(g.get("width", 0))
            h = float(g.get("height", 0))
            
            celda = {
                "id": c.get("id"),
                "value": valor,
                "style": est,
                "x": x, "y": y, "w": w, "h": h,
                "source": c.get("source"),
                "target": c.get("target"),
                "edge": c.get("edge") == "1",
                "points": []
            }
            
            # Obtener puntos intermedios de aristas
            if celda["edge"]:
                arr = g.find("Array")
                if arr is not None:
                    for pt in arr.findall("mxPoint"):
                        px = float(pt.get("x", 0))
                        py = float(pt.get("y", 0))
                        celda["points"].append((px, py))
            
            celdas.append(celda)
    
    return celdas, page_w, page_h


def dibujar_componentes(doc, celdas, page_w, page_h, dpi):
    """Dibuja el diagrama de componentes usando PyMuPDF."""
    # Dibujamos a 72 dpi (1:1 con coordenadas) y luego exportamos al DPI deseado
    escala = 1.0  # Coordenadas 1:1 con la página
    ancho_px = int(page_w)
    alto_px = int(page_h)
    
    # Crear página
    pag = doc.new_page(width=ancho_px, height=alto_px)
    
    # Fondo blanco
    pag.draw_rect(pymupdf.Rect(0, 0, ancho_px, alto_px), color=None, fill=BLANCO)
    
    # Diccionario de celdas por ID para resolver conexiones
    por_id = {c["id"]: c for c in celdas if not c["edge"]}
    
    # Fuente
    fuente = ruta_fuente()
    
    # Primero dibujar rectángulos y texto
    for c in celdas:
        if c["edge"]:
            continue
        
        est = c["style"]
        x, y, w, h = c["x"] * escala, c["y"] * escala, c["w"] * escala, c["h"] * escala
        valor = _texto_plano(c["value"])
        
        # Rectángulo de componente
        if "rounded=0" in str(est) or est.get("rounded") == "0":
            stroke_w = float(est.get("strokeWidth", 1)) * escala
            stroke_color = NEGRO if est.get("strokeColor") != "none" else None
            fill_color = None
            
            if est.get("fillColor") == "#E6E6E6":
                fill_color = GRIS
            elif est.get("fillColor") == "#FFFFCC":
                fill_color = AMARILLO_NOTA
            elif est.get("fillColor") == "#FFFFFF":
                fill_color = BLANCO
            
            if stroke_color or fill_color:
                rect = pymupdf.Rect(x, y, x + w, y + h)
                pag.draw_rect(rect, color=stroke_color, fill=fill_color, width=stroke_w)
        
        # Círculo (interface lollipop)
        if "ellipse" in str(est):
            cx = x + w / 2
            cy = y + h / 2
            r = w / 2
            pag.draw_circle(pymupdf.Point(cx, cy), r, color=NEGRO, fill=BLANCO, width=2 * escala)
        
        # Nota con texto
        if est.get("shape") == "note":
            rect = pymupdf.Rect(x, y, x + w, y + h)
            pag.draw_rect(rect, color=NEGRO, fill=AMARILLO_NOTA, width=1 * escala)
            # Doblez de la nota
            doblez = 10 * escala
            pag.draw_line(pymupdf.Point(x + w - doblez, y), pymupdf.Point(x + w - doblez, y + doblez), color=NEGRO, width=0.5 * escala)
            pag.draw_line(pymupdf.Point(x + w - doblez, y + doblez), pymupdf.Point(x + w, y + doblez), color=NEGRO, width=0.5 * escala)
            # Texto de la nota
            if valor:
                lineas_nota = valor.split("\n")
                font_size_nota = 9 * escala * 0.75
                line_height_nota = font_size_nota * 1.4
                for i, linea in enumerate(lineas_nota):
                    if not linea.strip():
                        continue
                    ly = y + 8 * escala + i * line_height_nota
                    lx = x + 5 * escala
                    pag.insert_text(
                        pymupdf.Point(lx, ly + font_size_nota),
                        linea,
                        fontfile=fuente,
                        fontsize=font_size_nota,
                        color=NEGRO
                    )
        
        # Texto (celdas de texto puro)
        if valor and "text" in str(est) and est.get("shape") != "note":
            lineas = valor.split("\n")
            font_size = 11
            if est.get("fontSize"):
                font_size = int(est.get("fontSize"))
            font_size *= escala * 0.75  # Ajuste para PyMuPDF
            
            # Estilo de texto
            bold = est.get("fontStyle") == "1"
            
            # Alineación
            align = est.get("align", "center")
            
            # Calcular posición vertical centrada
            line_height = font_size * 1.3
            total_h = line_height * len(lineas)
            start_y = y + (h - total_h) / 2 + font_size
            
            for i, linea in enumerate(lineas):
                if not linea.strip():
                    continue
                ly = start_y + i * line_height
                
                # Calcular posición horizontal
                tw = ancho(linea, font_size / escala / 0.75)
                if align == "center":
                    lx = x + (w - tw * escala) / 2
                elif align == "left":
                    lx = x + 5 * escala
                else:  # right
                    lx = x + w - tw * escala - 5 * escala
                
                pag.insert_text(
                    pymupdf.Point(lx, ly),
                    linea,
                    fontfile=fuente,
                    fontsize=font_size,
                    color=NEGRO
                )
    
    # Dibujar aristas (dependencias)
    for c in celdas:
        if not c["edge"]:
            continue
        
        est = c["style"]
        source_id = c["source"]
        target_id = c["target"]
        
        # Obtener puntos de origen y destino
        source = por_id.get(source_id)
        target = por_id.get(target_id)
        
        if not source or not target:
            continue
        
        # Calcular puntos de conexión
        # Usar exitX/exitY si están definidos
        exit_x = float(est.get("exitX", 0.5))
        exit_y = float(est.get("exitY", 1))
        entry_x = float(est.get("entryX", 0.5))
        entry_y = float(est.get("entryY", 0))
        
        sx = (source["x"] + source["w"] * exit_x) * escala
        sy = (source["y"] + source["h"] * exit_y) * escala
        tx = (target["x"] + target["w"] * entry_x) * escala
        ty = (target["y"] + target["h"] * entry_y) * escala
        
        # Estilo de línea
        dashed = "dashed=1" in str(est) or est.get("dashed") == "1"
        stroke_w = float(est.get("strokeWidth", 1)) * escala
        
        # Construir lista de puntos
        puntos = [(sx, sy)]
        for px, py in c["points"]:
            puntos.append((px * escala, py * escala))
        puntos.append((tx, ty))
        
        # Dibujar segmentos
        for i in range(len(puntos) - 1):
            p1 = pymupdf.Point(puntos[i][0], puntos[i][1])
            p2 = pymupdf.Point(puntos[i + 1][0], puntos[i + 1][1])
            
            if dashed:
                pag.draw_line(p1, p2, color=NEGRO, width=stroke_w, dashes="[4 2]")
            else:
                pag.draw_line(p1, p2, color=NEGRO, width=stroke_w)
        
        # Dibujar flecha abierta al final
        if "endArrow=open" in str(est):
            # Flecha abierta (>)
            lx, ly = puntos[-2]
            ex, ey = puntos[-1]
            
            # Ángulo de la flecha
            ang = math.atan2(ey - ly, ex - lx)
            arrow_len = 10 * escala
            arrow_ang = math.pi / 6  # 30 grados
            
            # Puntos de la flecha
            ax1 = ex - arrow_len * math.cos(ang - arrow_ang)
            ay1 = ey - arrow_len * math.sin(ang - arrow_ang)
            ax2 = ex - arrow_len * math.cos(ang + arrow_ang)
            ay2 = ey - arrow_len * math.sin(ang + arrow_ang)
            
            pag.draw_line(pymupdf.Point(ax1, ay1), pymupdf.Point(ex, ey), color=NEGRO, width=stroke_w)
            pag.draw_line(pymupdf.Point(ax2, ay2), pymupdf.Point(ex, ey), color=NEGRO, width=stroke_w)
    
    return pag


def main():
    parser = argparse.ArgumentParser(description="Renderizar diagrama de componentes a PNG")
    parser.add_argument("--dpi", type=int, default=300, help="DPI de salida (default: 300)")
    args = parser.parse_args()
    
    os.makedirs(FIG_DIR, exist_ok=True)
    
    print(f"Cargando {DRAWIO}...")
    celdas, page_w, page_h = cargar_drawio(DRAWIO)
    print(f"  {len(celdas)} celdas, página {page_w}x{page_h}")
    
    doc = pymupdf.Document()
    dibujar_componentes(doc, celdas, page_w, page_h, args.dpi)
    
    # Guardar como PNG
    png_path = os.path.join(FIG_DIR, "componentes.png")
    pag = doc[0]
    pix = pag.get_pixmap(dpi=args.dpi)
    pix.save(png_path)
    print(f"PNG guardado: {png_path}")
    
    doc.close()
    print("¡Listo!")


if __name__ == "__main__":
    main()
