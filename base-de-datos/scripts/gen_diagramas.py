# Genera los diagramas del proyecto de BD (MER, UML y lógico) con Graphviz.
# Uso: python3 gen_diagramas.py   (requiere el comando "dot" de Graphviz)
# Salida en ../diagramas/: *.dot (fuente editable), *.svg y *.png
#
# El UML y el diagrama lógico no caben legibles en una hoja carta, así que se
# generan en una vista general (solo nombres y relaciones) y un diagrama
# detallado por catálogo; las tablas/clases de otros catálogos aparecen como
# referencia (borde punteado, solo nombre y llave).
import json
import os
import re
import subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'diagramas')
META = json.load(open(os.path.join(AQUI, 'metadatos_columnas.json'), encoding='utf8'))
FONT = 'Liberation Sans'  # métricamente idéntica a Arial
GRIS = '#E6E6E6'

CATALOGOS = [
    (1, 'Productos y ubicaciones', ['FAMILIA', 'UBICACION', 'PRODUCTO']),
    (2, 'Proveedores y compras', ['PROVEEDOR', 'PRODUCTO_PROVEEDOR', 'ORDEN_COMPRA', 'DETALLE_ORDEN']),
    (3, 'Usuarios y seguridad', ['ROL', 'USUARIO', 'BITACORA_AUDITORIA']),
    (4, 'Movimientos de almacén', ['RECEPCION', 'INVENTARIO_FISICO', 'DETALLE_CONTEO', 'MOVIMIENTO']),
]
TODAS = [t for _, _, ts in CATALOGOS for t in ts]


def cols(t):
    return sorted([m for m in META if m['tabla'] == t], key=lambda m: m['orden'])


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def render(nombre, dot):
    ruta = os.path.join(SALIDA, nombre)
    open(ruta + '.dot', 'w', encoding='utf8').write(dot)
    subprocess.run(['dot', '-Tsvg', ruta + '.dot', '-o', ruta + '.svg'], check=True)
    subprocess.run(['dot', '-Tpng', '-Gdpi=200', ruta + '.dot', '-o', ruta + '.png'], check=True)
    svg = open(ruta + '.svg', encoding='utf8').read()
    w, h = map(float, re.search(r'width="([\d.]+)pt" height="([\d.]+)pt"', svg).groups())
    k = min(9.3 * 72 / w, 6.3 * 72 / h, 1.0)
    print(f'{nombre}: {w:.0f}x{h:.0f} pt, letra en la hoja = {11 * k:.1f} pt')


ENC = f'''  graph [fontname="{FONT}", fontsize=13, bgcolor="white", color="black", fontcolor="black", pad=0.2];
  node  [fontname="{FONT}", fontsize=11, color="black", fontcolor="black"];
  edge  [fontname="{FONT}", fontsize=10, color="black", fontcolor="black"];
'''

# ======================================================================
# Diagrama lógico (tablas, notación pata de gallo)
# ======================================================================


def nodo_tabla(t, modo):
    """modo: 'detalle' | 'ref' (nombre + PK, borde punteado) | 'nombre'."""
    if modo == 'nombre':
        return f'  {t} [shape=box, style=filled, fillcolor="{GRIS}", label=<<B>{t}</B>>, margin="0.15,0.1"];'
    filas = []
    for c in cols(t):
        if modo == 'ref' and not c['pk']:
            continue
        marca = []
        if c['pk']:
            marca.append('PK')
        if c.get('fk') and modo == 'detalle':
            marca.append('FK')
        if c['uq']:
            marca.append('UQ')
        nombre = esc(c['columna'])
        if not c['nulo'] and not c['calc']:
            nombre = f'<B>{nombre}</B>'
        tipo = c['tipo'] + (' calc.' if c['calc'] else '')
        filas.append(f'<TR><TD ALIGN="LEFT">{",".join(marca)}</TD><TD ALIGN="LEFT">{nombre}</TD>'
                     f'<TD ALIGN="LEFT">{tipo}</TD></TR>')
    estilo = ' STYLE="dashed"' if modo == 'ref' else ''
    html = (f'<<TABLE BORDER="1"{estilo} CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">'
            f'<TR><TD COLSPAN="3" BGCOLOR="{GRIS}" BORDER="1" SIDES="B"><B>{t}</B></TD></TR>'
            + ''.join(filas) + '</TABLE>>')
    return f'  {t} [shape=plaintext, label={html}];'


def fks():
    vistos, res = set(), []
    for c in META:
        if c.get('fk') and (c['tabla'], c['columna']) not in vistos:
            vistos.add((c['tabla'], c['columna']))
            res.append((c['tabla'], c['columna'], c['fk'], c['nulo']))
    return res


def logico(nombre, subconjunto, general=False):
    out = ['digraph logico {', ENC,
           '  graph [rankdir=LR, splines=polyline, nodesep=0.35, ranksep=0.9];']
    rel = [f for f in fks() if f[0] in subconjunto]
    usadas = list(subconjunto) + [f[2] for f in rel if f[2] not in subconjunto]
    for t in dict.fromkeys(usadas):
        out.append(nodo_tabla(t, 'nombre' if general else ('detalle' if t in subconjunto else 'ref')))
    for hija, col, padre, nulo in rel:
        uno = 'teeodot' if nulo else 'teetee'
        etiqueta = '' if general else f', label=" {col} ", fontsize=9'
        # padre -> hija: el padre queda a la izquierda; pata de gallo (0..*) en la hija
        out.append(f'  {padre} -> {hija} [dir=both, arrowhead=crowodot, arrowtail={uno}, arrowsize=1.0{etiqueta}];')
    out.append('}')
    render(nombre, '\n'.join(out))

# ======================================================================
# UML (clases de persistencia)
# ======================================================================


CLASES = {
    'ROL': 'Rol', 'USUARIO': 'Usuario', 'BITACORA_AUDITORIA': 'BitacoraAuditoria',
    'FAMILIA': 'Familia', 'UBICACION': 'Ubicacion', 'PRODUCTO': 'Producto',
    'PROVEEDOR': 'Proveedor', 'PRODUCTO_PROVEEDOR': 'ProductoProveedor',
    'ORDEN_COMPRA': 'OrdenDeCompra', 'DETALLE_ORDEN': 'DetalleOrden',
    'RECEPCION': 'Recepcion', 'INVENTARIO_FISICO': 'InventarioFisico',
    'DETALLE_CONTEO': 'DetalleConteo', 'MOVIMIENTO': 'Movimiento',
}
SUBCLASES = ['Entrada', 'Salida', 'Ajuste', 'Devolucion']
TIPOS = {'INT': 'Integer', 'BIGINT': 'Integer', 'SMALLINT': 'Integer', 'TINYINT': 'Integer',
         'BIT': 'Boolean', 'DATE': 'Fecha'}
DOMINIOS = {
    'ROL.clave': 'char{E,A,C,D,X}',
    'UBICACION.pasillo': 'char{A,B,C,P}',
    'PRODUCTO.unidad_medida': 'String{PZA,M,KG,LT,JGO,ROLLO}',
    'PROVEEDOR.clasificacion': 'String{LOCAL,NACIONAL,IMPORTACION}',
    'PRODUCTO_PROVEEDOR.moneda': 'String{MXN,USD}',
    'RECEPCION.tipo_recepcion': 'char{T,P}',
    'INVENTARIO_FISICO.tipo_conteo': 'char{C,T}',
    'INVENTARIO_FISICO.estado': 'String{ABIERTO,CAPTURADO,AJUSTADO,CANCELADO}',
    'MOVIMIENTO.tipo': 'char{E,S,A,D}',
    'BITACORA_AUDITORIA.modulo': 'String{SEGURIDAD,CATALOGOS,ALMACEN,COMPRAS,DIRECCION}',
    'BITACORA_AUDITORIA.accion': 'String{ALTA,MODIFICACION,BAJA,MOVIMIENTO,ACCESO,CIERRE_SESION}',
    'ORDEN_COMPRA.estado': 'String{PENDIENTE,EMITIDA,RECIBIDA_PARCIAL,RECIBIDA_TOTAL,CERRADA,CANCELADA}',
}
# (claseA, claseB, multA, multB, nombre, extra)
ASOCIACIONES = [
    ('Rol', 'Usuario', '1', '0..*', 'asigna', ''),
    ('Usuario', 'BitacoraAuditoria', '1', '0..*', 'genera', ''),
    ('Usuario', 'Movimiento', '1', '0..*', 'registra', ''),
    ('Usuario', 'OrdenDeCompra', '1', '0..*', 'elabora', ''),
    ('Usuario', 'Recepcion', '1', '0..*', 'captura', ''),
    ('Usuario', 'InventarioFisico', '1', '0..*', 'realiza', ''),
    ('Familia', 'Producto', '1', '0..*', 'clasifica', ''),
    ('Familia', 'InventarioFisico', '0..1', '0..*', 'abarca', ''),
    ('Ubicacion', 'Producto', '0..1', '0..*', 'contiene', ', dir=back, arrowtail=odiamond, arrowsize=1.4'),
    ('Ubicacion', 'Movimiento', '1', '0..*', 'ocurre en', ''),
    ('Producto', 'Movimiento', '1', '0..*', 'afecta', ''),
    ('Proveedor', 'OrdenDeCompra', '1', '0..*', 'recibe', ''),
    ('OrdenDeCompra', 'Recepcion', '1', '0..*', 'se surte con', ''),
    ('Recepcion', 'Entrada', '0..1', '0..*', 'genera', ''),
    ('InventarioFisico', 'Ajuste', '0..1', '0..*', 'origina', ''),
    ('DetalleConteo', 'Ubicacion', '0..*', '1', 'se verifica en', ''),
]
# (claseA, claseB, multA, multB, nombre, clase de asociación)
ASOC_CLASE = [
    ('Proveedor', 'Producto', '1..*', '1..*', 'surte', 'ProductoProveedor'),
    ('OrdenDeCompra', 'Producto', '0..*', '1..*', 'solicita', 'DetalleOrden'),
    ('InventarioFisico', 'Producto', '0..*', '1..*', 'cuenta', 'DetalleConteo'),
]


def camel(s):
    p = s.split('_')
    return p[0] + ''.join(x.capitalize() for x in p[1:])


def tipo_uml(c):
    clave = f'{c["tabla"]}.{c["columna"]}'
    if clave in DOMINIOS:
        return DOMINIOS[clave]
    t = c['tipo']
    if t.startswith('DECIMAL'):
        return 'Decimal'
    if t.startswith('DATETIME'):
        return 'Fecha'
    if t == 'CHAR(1)':
        return 'char'
    if t.startswith('VARCHAR') or t.startswith('CHAR'):
        return 'String'
    return TIPOS.get(t, t)


def valor_inicial(c):
    d = c.get('def')
    if not d or 'date' in d.lower():
        return ''
    v = d.strip('()')
    if v.startswith("'"):
        return f'="{v.strip(chr(39))}"'
    return '=' + v


def atributos(t):
    res = []
    for c in cols(t):
        if c.get('fk'):
            continue  # la llave foránea la reemplaza la asociación
        deriv = '/' if c['calc'] else ''
        res.append(f'-{deriv}{camel(c["columna"])}: {tipo_uml(c)}{valor_inicial(c)}')
    return res


def nodo_clase(nombre, modo):
    """modo: 'detalle' | 'ref' (solo nombre, borde punteado) | 'nombre'."""
    t = {v: k for k, v in CLASES.items()}.get(nombre)
    n = f'<I>{nombre}</I>' if nombre == 'Movimiento' else nombre
    if modo != 'detalle':
        estilo = ' STYLE="dashed"' if modo == 'ref' else ''
        return (f'  {nombre} [shape=plaintext, label=<<TABLE BORDER="1"{estilo} CELLBORDER="0" CELLSPACING="0" CELLPADDING="5">'
                f'<TR><TD BGCOLOR="{GRIS}"><B>{n}</B></TD></TR></TABLE>>];')
    attrs = atributos(t) if t else []
    filas = ''.join(f'<TR><TD ALIGN="LEFT">{esc(a)}</TD></TR>' for a in attrs) or '<TR><TD> </TD></TR>'
    return (f'  {nombre} [shape=plaintext, label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">'
            f'<TR><TD BGCOLOR="{GRIS}"><B>{n}</B></TD></TR>'
            f'<TR><TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1">{filas}</TABLE></TD></TR>'
            f'<TR><TD HEIGHT="12"> </TD></TR></TABLE>>];')


def uml(nombre, subconjunto, general=False):
    """subconjunto: nombres de clase que se dibujan con detalle."""
    sub = set(subconjunto)
    out = ['graph uml {', ENC,
           '  graph [rankdir=TB, splines=polyline, nodesep=0.3, ranksep=0.5];']
    nodos, aristas = [], []

    def usar(c):
        if c not in nodos:
            nodos.append(c)

    def ml(a, b, ma, mb, nom, extra=''):
        aristas.append(f'  {a} -- {b} [label=" {nom} ", taillabel="{ma}", headlabel="{mb}", '
                       f'labeldistance=1.8, labelangle=30{extra}];')

    for c in subconjunto:
        usar(c)
    if general or sub & set(SUBCLASES + ['Movimiento']):
        usar('Movimiento')
        for s in SUBCLASES:
            usar(s)
            aristas.append(f'  Movimiento -- {s} [dir=back, arrowtail=empty, arrowsize=1.5, sametail=gen];')
    for a, b, ma, mb, nom, extra in ASOCIACIONES:
        if general or a in sub or b in sub:
            usar(a)
            usar(b)
            ml(a, b, ma, mb, nom, extra)
    for i, (a, b, ma, mb, nom, ca) in enumerate(ASOC_CLASE):
        if general or sub & {a, b, ca}:
            for c in (a, b, ca):
                usar(c)
            pt = f'p{i}'
            aristas.append(f'  {pt} [shape=point, width=0.01, label=""];')
            aristas.append(f'  {a} -- {pt} [taillabel="{ma}", labeldistance=1.8, labelangle=30, label=" {nom} "];')
            aristas.append(f'  {pt} -- {b} [headlabel="{mb}", labeldistance=1.8, labelangle=30];')
            aristas.append(f'  {ca} -- {pt} [style=dashed];')
    for c in nodos:
        out.append(nodo_clase(c, 'nombre' if general else ('detalle' if c in sub else 'ref')))
    out += aristas
    if all(s in nodos for s in SUBCLASES):
        out.append('  { rank=same; ' + '; '.join(SUBCLASES) + '; }')
    out.append('}')
    render(nombre, '\n'.join(out))

# ======================================================================
# Modelo entidad-relación (Chen extendido)
# ======================================================================


ATRS_ER = {
    'ROL': ['id_rol', 'clave', 'nombre'],
    'USUARIO': ['id_usuario', 'nombre_usuario', 'nombre_completo'],
    'BITACORA_AUDITORIA': ['id_registro', 'fecha_hora', 'accion'],
    'FAMILIA': ['id_familia', 'nombre'],
    'UBICACION': ['id_ubicacion', 'pasillo', 'anaquel', 'nivel'],
    'PRODUCTO': ['id_producto', 'codigo_interno', 'descripcion', 'existencia'],
    'PROVEEDOR': ['id_proveedor', 'rfc', 'razon_social'],
    'ORDEN_COMPRA': ['id_oc', 'folio', 'estado', 'total'],
    'RECEPCION': ['id_recepcion', 'folio', 'numero_factura'],
    'INVENTARIO_FISICO': ['id_conteo', 'folio', 'tipo_conteo'],
    'DETALLE_CONTEO': ['cantidad_contada', 'diferencia'],
    'MOVIMIENTO': ['id_movimiento', 'tipo', 'cantidad', 'fecha'],
}
DERIVADOS = {('ORDEN_COMPRA', 'total'), ('DETALLE_CONTEO', 'diferencia')}


def mer(nombre, detalle, general=False):
    """detalle: entidades que se dibujan con sus atributos."""
    out = ['graph mer {', ENC,
           f'  graph [rankdir=TB, splines=true, nodesep={0.3 if general else 0.1}, ranksep={0.45 if general else 0.3}];',
           '  node [fontsize=12];']
    n = [0]
    usadas = set(detalle)

    def nid():
        n[0] += 1
        return f'a{n[0]}'

    cuerpo = []
    for e, attrs in ATRS_ER.items():
        if e not in detalle:
            continue
        pks = {c['columna'] for c in cols(e) if c['pk']}
        for a in ([] if general else attrs):
            i = nid()
            lab = f'<U>{a}</U>' if a in pks else a
            st = ', style=dashed' if (e, a) in DERIVADOS else ''
            cuerpo.append(f'  {i} [shape=ellipse, label=<{lab}>, margin="0.01,0.0", height=0.28{st}];')
            cuerpo.append(f'  {e} -- {i};')

    def rel(a, verbo, b, ca, cb, attrs=(), ident=False):
        if a not in detalle and b not in detalle:
            return
        usadas.update((a, b))
        r = nid()
        per = ', peripheries=2' if ident else ''
        cuerpo.append(f'  {r} [shape=diamond, label="{verbo}", margin="0.0,0.0", height=0.45{per}];')
        cuerpo.append(f'  {a} -- {r} [label="{ca}", fontsize=12];')
        cuerpo.append(f'  {r} -- {b} [label="{cb}", fontsize=12];')
        for at in ([] if general else attrs):
            i = nid()
            cuerpo.append(f'  {i} [shape=ellipse, label="{at}", margin="0.01,0.0", height=0.28];')
            cuerpo.append(f'  {r} -- {i};')

    rel('ROL', 'asigna', 'USUARIO', '1', 'N')
    rel('USUARIO', 'genera', 'BITACORA_AUDITORIA', '1', 'N')
    rel('USUARIO', 'registra', 'MOVIMIENTO', '1', 'N')
    rel('USUARIO', 'elabora', 'ORDEN_COMPRA', '1', 'N')
    rel('USUARIO', 'captura', 'RECEPCION', '1', 'N')
    rel('USUARIO', 'realiza', 'INVENTARIO_FISICO', '1', 'N')
    rel('FAMILIA', 'clasifica', 'PRODUCTO', '1', 'N')
    rel('FAMILIA', 'abarca', 'INVENTARIO_FISICO', '1', 'N')
    rel('UBICACION', 'contiene', 'PRODUCTO', '1', 'N')
    rel('UBICACION', 'ocurre en', 'MOVIMIENTO', '1', 'N')
    rel('PRODUCTO', 'afecta', 'MOVIMIENTO', '1', 'N')
    rel('PROVEEDOR', 'surte', 'PRODUCTO', 'M', 'N', ['codigo_proveedor', 'precio_compra', 'moneda'])
    rel('PROVEEDOR', 'recibe', 'ORDEN_COMPRA', '1', 'N')
    rel('ORDEN_COMPRA', 'solicita', 'PRODUCTO', 'M', 'N', ['cantidad_solicitada', 'cantidad_recibida', 'costo_unitario'])
    rel('ORDEN_COMPRA', 'se surte con', 'RECEPCION', '1', 'N')
    rel('RECEPCION', 'genera', 'MOVIMIENTO', '1', 'N')
    rel('INVENTARIO_FISICO', 'origina', 'MOVIMIENTO', '1', 'N')
    rel('INVENTARIO_FISICO', 'incluye', 'DETALLE_CONTEO', '1', 'N', ident=True)
    rel('PRODUCTO', 'se cuenta en', 'DETALLE_CONTEO', '1', 'N', ident=True)
    rel('UBICACION', 'se verifica en', 'DETALLE_CONTEO', '1', 'N')
    # especialización disjunta (d) y total (doble línea) de MOVIMIENTO
    if 'MOVIMIENTO' in detalle:
        cuerpo.append('  esp [shape=circle, label="d", width=0.35, fixedsize=true];')
        cuerpo.append('  MOVIMIENTO -- esp [color="black:white:black", label="tipo"];')
        for s in ['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION']:
            cuerpo.append(f'  {s} [shape=box, style=filled, fillcolor="{GRIS}", label=<<B>{s}</B>>];')
            cuerpo.append(f'  esp -- {s};')
    for e in ATRS_ER:
        if e in usadas:
            extra = ', peripheries=2' if e == 'DETALLE_CONTEO' else ''
            estilo = 'filled' if (general or e in detalle) else '"filled,dashed"'
            out.append(f'  {e} [shape=box, style={estilo}, fillcolor="{GRIS}", label=<<B>{e}</B>>, margin="0.1,0.06"{extra}];')
    out += cuerpo
    out.append('}')
    render(nombre, '\n'.join(out))


if __name__ == '__main__':
    os.makedirs(SALIDA, exist_ok=True)
    for f in os.listdir(SALIDA):
        if f.startswith(('01_', '02_', '03_')):
            os.remove(os.path.join(SALIDA, f))
    mer('01_modelo_entidad_relacion_0_general', list(ATRS_ER), general=True)
    for num, _, ts in CATALOGOS:
        mer(f'01_modelo_entidad_relacion_{num}_catalogo', [t for t in ts if t in ATRS_ER])
    for num, _, ts in CATALOGOS:
        clases = [CLASES[t] for t in ts] + (SUBCLASES if 'MOVIMIENTO' in ts else [])
        uml(f'02_modelo_uml_{num}_catalogo', clases)
        logico(f'03_diagrama_logico_{num}_catalogo', ts)
