"""Modelo del diagrama de clases del SIA-NP (clases, relaciones y notas).

Lo comparten construir_drawio.py (genera el .drawio), render_drawio.py (dibuja
el PDF) y verificar_clases.py. Funciona en Windows y en Ubuntu.
"""
import math
import os

import pymupdf

# ---------------------------------------------------------------- fuentes
_CANDIDATAS = {
    "regular": ["C:/Windows/Fonts/arial.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf"],
    "bold": ["C:/Windows/Fonts/arialbd.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
             "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
             "/usr/share/fonts/liberation-sans/LiberationSans-Bold.ttf"],
    "italic": ["C:/Windows/Fonts/ariali.ttf",
               "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
               "/usr/share/fonts/liberation/LiberationSans-Italic.ttf",
               "/usr/share/fonts/liberation-sans/LiberationSans-Italic.ttf"],
    "bolditalic": ["C:/Windows/Fonts/arialbi.ttf",
                   "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
                   "/usr/share/fonts/liberation/LiberationSans-BoldItalic.ttf",
                   "/usr/share/fonts/liberation-sans/LiberationSans-BoldItalic.ttf"],
}


def ruta_fuente(estilo="regular"):
    for ruta in _CANDIDATAS[estilo]:
        if os.path.exists(ruta):
            return ruta
    raise FileNotFoundError("No se encontro Arial ni Liberation Sans (%s)" % estilo)


_fonts = {}


def ancho(texto, size, estilo="regular"):
    """Ancho en px de un texto en Arial/Liberation Sans."""
    f = _fonts.get(estilo)
    if f is None:
        f = _fonts[estilo] = pymupdf.Font(fontfile=ruta_fuente(estilo))
    return f.text_length(texto, fontsize=size)


# ------------------------------------------------------------ constantes
F_CUERPO = 11      # fuente de atributos y metodos
F_NOMBRE = 12      # fuente del encabezado
F_ETIQ = 10        # multiplicidades
F_NOTA = 10
PASO = 14          # alto por linea de atributos/metodos
PAD = 10           # relleno vertical de cada compartimento
SEP = 8            # alto del separador
HDR1 = 26          # encabezado sin estereotipo
HDR2 = 40          # encabezado con estereotipo

# nombre, id, estereotipo, atributos, metodos
CLASES = [
    ("Interfaz", "c3", "interfaz",
     ["-nombrePantalla: String", "-usuarioEnSesion: String", "-datosCapturados: String",
      "-mensaje: String", "-opcionesHabilitadas: String"],
     ["+mostrarPantalla()", "+capturarDatos()", "+validarCampos(): Boolean", "+enviarSolicitud()",
      "+mostrarMensaje(mensaje: String)", "+habilitarOpciones(rol: char)"]),
    ("InterfazRegistroMovimientos", "c7", "interfaz",
     ["-campoCodigo: String", "-campoCantidad: Integer", "-campoUbicacion: String",
      "-campoTipo: char{E,S,A,D}", "-campoDocumento: String"],
     ["+escanearCodigo(codigo: String)", "+mostrarNotaDeSalida()"]),
    ("InterfazRecepcion", "c11", "interfaz",
     ["-campoFolioOC: String", "-campoFactura: String", "-campoCantidades: String",
      "-campoUbicacion: String"],
     ["+seleccionarOrden(folioOC: String)", "+mostrarComprobante()"]),
    ("ControladorMovimientos", "c15", "control",
     ["-movimientoActual: Movimiento", "-productoActual: Producto", "-usuarioSolicitante: String",
      "-resultadoValidacion: Boolean"],
     ["+buscarProducto(codigo: String)",
      "+registrarMovimiento(tipo, cantidad, ubicacion, documento)",
      "+validarDatos(): Boolean", "+notificarReorden()", "+recibirSolicitud()",
      "+registrarEnBitacora(accion: String)"]),
    ("ControladorRecepcion", "c19", "control",
     ["-ordenActual: OrdenDeCompra", "-recepcionActual: Recepcion", "-diferencias: String",
      "-usuarioSolicitante: String"],
     ["+buscarOrden(folioOC: String)",
      "+registrarRecepcion(folioOC, cantidades, ubicacion, factura)",
      "+generarEntradas()", "+notificarDiferencias()", "+recibirSolicitud()",
      "+compararCantidades(): Boolean", "+actualizarEstadoOrden()"]),
    ("Usuario", "c23", None,
     ["-nombreUsuario: String", "-contrasena: String", "-nombreCompleto: String",
      "-rol: char{E,A,C,D,X}", "-activo: Boolean=Y", "-intentosFallidos: Integer=0"],
     ["+agregarUsuario()", "+cambiarUsuario()", "+iniciarSesion(usuario, contrasena): Boolean",
      "+bloquearCuenta()", "+cerrarSesion()", "+validarCredenciales(): Boolean"]),
    ("Producto", "c27", None,
     ["-codigo: String", "-descripcion: String", "-familia: String", "-unidadMedida: String",
      "-existencia: Decimal=0.0", "-puntoReorden: Decimal", "-costoUnitario: Decimal"],
     ["+agregarProducto()", "+cambiarProducto()", "+obtenerProducto(codigo: String)",
      "+verificarExistencia(cantidad): Boolean", "+actualizarExistencia(tipo, cantidad)",
      "+verificarPuntoDeReorden(): Boolean", "+darDeBaja()"]),
    ("Ubicacion", "c31", None,
     ["-claveUbicacion: String", "-pasillo: String", "-anaquel: String", "-nivel: Integer",
      "-disponible: Boolean=Y"],
     ["+agregarUbicacion()", "+cambiarUbicacion()", "+validarUbicacion(clave): Boolean",
      "+verProductos()"]),
    ("Movimiento", "c35", None,
     ["-folio: String", "-tipoMovimiento: char{E,S,A,D}", "-fecha: Fecha", "-cantidad: Decimal",
      "-documentoReferencia: String", "-usuarioResponsable: Usuario"],
     ["+crearMovimiento(tipo, cantidad, ubicacion, documento): String",
      "+validarCantidad(): Boolean", "+generarFolio(): String", "+verMovimiento()",
      "+actualizarExistenciaProducto()"]),
    ("Entrada", "c39", None, [], []),
    ("Salida", "c43", None, [], []),
    ("Ajuste", "c47", None, [], []),
    ("Devolucion", "c51", None, [], []),
    ("Kardex", "c55", None,
     ["-producto: Producto", "-fecha: Fecha", "-tipoMovimiento: char", "-cantidad: Decimal",
      "-saldo: Decimal"],
     ["+agregarRegistro(movimiento)", "+verHistorial(producto)",
      "+filtrar(fechaInicio, fechaFin, tipo)", "+exportar(formato: String)"]),
    ("InventarioFisico", "c59", None,
     ["-folioConteo: String", "-tipoConteo: char{C,T}", "-fecha: Fecha",
      "-cantidadContada: Decimal", "-diferencia: Decimal", "-estado: String"],
     ["+generarHojaDeConteo()", "+registrarConteo(producto, cantidad)", "+compararExistencia()",
      "+generarReporteDiferencias()", "+aplicarAjustes()"]),
    ("Proveedor", "c63", None,
     ["-rfc: String", "-razonSocial: String", "-nombreContacto: String", "-telefono: String",
      "-correo: String", "-activo: Boolean=Y"],
     ["+agregarProveedor()", "+cambiarProveedor()", "+buscarProveedor()",
      "+desactivarProveedor()", "+verProductosSurtidos()"]),
    ("OrdenDeCompra", "c67", None,
     ["-folio: String", "-fechaEmision: Fecha", "-proveedor: Proveedor", "-total: Decimal=0.0",
      "-estado: String{Pendiente, Emitida,",
      "Parcialmente recibida, Recibida, Cerrada, Cancelada}"],
     ["+crearOrden()", "+agregarProducto(producto, cantidad)", "+emitirOrden()",
      "+buscarOrdenPendiente(folio)", "+compararCantidades(cantidades)",
      "+actualizarEstado(diferencias)", "+guardarBorrador()", "+generarDocumento()",
      "+cancelarOrden()", "+cerrarOrden()"]),
    ("DetalleOrden", "c71", None,
     ["-folioOC: String", "-codigoProducto: String", "-cantidadSolicitada: Decimal",
      "-cantidadRecibida: Decimal=0.0", "-costoUnitario: Decimal"],
     ["+agregarDetalle()", "+cambiarCantidad()", "+calcularSaldoPendiente(): Decimal"]),
    ("Recepcion", "c75", None,
     ["-folioRecepcion: String", "-fechaRecepcion: Fecha", "-ordenDeCompra: OrdenDeCompra",
      "-numeroFactura: String", "-cantidadRecibida: Decimal", "-saldoPendiente: Decimal"],
     ["+crearRecepcion(folioOC, factura): String", "+validarCantidades()",
      "+solicitarAutorizacion()", "+generarEntrada(cantidades, ubicacion)",
      "+actualizarEstadoOrden()"]),
    ("Reporte", "c79", None,
     ["-tipoReporte: String", "-periodo: String", "-fechaGeneracion: Fecha",
      "-valorInventario: Decimal", "-rotacion: Decimal", "-formato: char{X,C}"],
     ["+calcularIndicadores()", "+verDesglose()", "+exportar(formato)", "+verValorYRotacion()",
      "+verProductosBajoReorden()"]),
    ("DashboardEjecutivo", "c83", None,
     ["-periodoAnalisis: char{S,M}"], ["+actualizarGraficas()"]),
    ("BitacoraDeAuditoria", "c87", None,
     ["-idRegistro: Integer", "-fechaHora: Fecha", "-usuario: Usuario", "-accion: String",
      "-modulo: String"],
     ["+registrarEvento(usuario, accion)", "+verRegistros(usuario, fecha)",
      "+registrarAcceso(usuario)"]),
]

ABSTRACTAS = {"Movimiento"}
ID_DE = {c[0]: c[1] for c in CLASES}
CLASE_DE = {c[0]: c for c in CLASES}

# Relaciones: (id, tipo, origen, destino, nombre, mult_origen, mult_destino)
# tipo: gen (triangulo vacio en el destino), assoc, agg (diamante vacio en el
# origen), comp (diamante relleno en el origen), dep (flecha abierta punteada
# en el destino), assocclass (punteada sin puntas, a un punto del enlace)
RELACIONES = [
    ("c91", "gen", "InterfazRegistroMovimientos", "Interfaz", "", "", ""),
    ("c92", "gen", "InterfazRecepcion", "Interfaz", "", "", ""),
    ("c93", "assoc", "InterfazRegistroMovimientos", "ControladorMovimientos", "envía solicitudes a", "1", "1"),
    ("c96", "assoc", "InterfazRecepcion", "ControladorRecepcion", "envía solicitudes a", "1", "1"),
    ("c99", "dep", "ControladorMovimientos", "Producto", "coordina", "", ""),
    ("c100", "dep", "ControladorMovimientos", "Ubicacion", "valida", "", ""),
    ("c101", "dep", "ControladorMovimientos", "Movimiento", "crea", "", ""),
    ("c102", "dep", "ControladorMovimientos", "BitacoraDeAuditoria", "registra en", "", ""),
    ("c103", "dep", "ControladorRecepcion", "OrdenDeCompra", "coordina", "", ""),
    ("c104", "dep", "ControladorRecepcion", "Recepcion", "crea", "", ""),
    ("c105", "dep", "ControladorRecepcion", "Entrada", "genera", "", ""),
    ("c106", "dep", "ControladorRecepcion", "BitacoraDeAuditoria", "registra en", "", ""),
    ("c107", "gen", "Entrada", "Movimiento", "", "", ""),
    ("c108", "gen", "Salida", "Movimiento", "", "", ""),
    ("c109", "gen", "Ajuste", "Movimiento", "", "", ""),
    ("c110", "gen", "Devolucion", "Movimiento", "", "", ""),
    ("c111", "gen", "DashboardEjecutivo", "Reporte", "", "", ""),
    ("c112", "assoc", "Usuario", "Movimiento", "registra", "1", "0..*"),
    ("c115", "assoc", "Usuario", "OrdenDeCompra", "elabora", "1", "0..*"),
    ("c118", "assoc", "Usuario", "BitacoraDeAuditoria", "genera", "1", "0..*"),
    ("c121", "assoc", "Producto", "Movimiento", "afecta", "1", "0..*"),
    ("c124", "agg", "Ubicacion", "Producto", "contiene", "1", "0..*"),
    ("c127", "assoc", "Producto", "Kardex", "tiene", "1", "1"),
    ("c130", "comp", "Kardex", "Movimiento", "consiste de", "1", "0..*"),
    ("c133", "assoc", "Proveedor", "OrdenDeCompra", "recibe", "1", "0..*"),
    ("c136", "assoc", "OrdenDeCompra", "Producto", "solicita", "0..*", "1..*"),
    ("c139", "assoc", "OrdenDeCompra", "Recepcion", "se surte con", "1", "0..*"),
    ("c142", "assoc", "Recepcion", "Entrada", "genera", "0..1", "1..*"),
    ("c145", "assoc", "InventarioFisico", "Producto", "cuenta", "0..*", "1..*"),
    ("c148", "assoc", "InventarioFisico", "Ajuste", "genera", "1", "0..*"),
    ("c151", "assoc", "Reporte", "Kardex", "consulta", "0..*", "1..*"),
    ("n1", "assoc", "Proveedor", "Producto", "surte", "1..*", "1..*"),
    ("n2", "assoc", "InventarioFisico", "Ubicacion", "se realiza en", "0..*", "1..*"),
    ("n3", "assoc", "Usuario", "InventarioFisico", "realiza", "1", "0..*"),
    ("n4", "dep", "Recepcion", "Producto", "actualiza", "", ""),
    ("n5", "dep", "Recepcion", "Ubicacion", "asigna", "", ""),
    ("n6", "dep", "Recepcion", "BitacoraDeAuditoria", "registra en", "", ""),
    ("n7", "dep", "Reporte", "Producto", "consulta", "", ""),
    ("n8", "dep", "Reporte", "Movimiento", "consulta", "", ""),
    ("n9", "dep", "Reporte", "OrdenDeCompra", "consulta", "", ""),
    ("n10", "dep", "BitacoraDeAuditoria", "Movimiento", "registra", "", ""),
    ("n11", "dep", "BitacoraDeAuditoria", "OrdenDeCompra", "registra", "", ""),
    ("n20", "assoc", "Ubicacion", "Movimiento", "ubica", "1", "0..*"),
]
# clase de asociacion: DetalleOrden unida al enlace OrdenDeCompra-Producto (c136)
ASOCCLASE = ("c154", "DetalleOrden", "c136")

NOTAS = [
    ("nota1", "DetalleOrden",
     "DetalleOrden es la propiedad «Detalle de productos» de la tarjeta CRC Orden de compra, "
     "separada como clase de asociación."),
    ("nota2", "Usuario",
     "Las subclases de la tarjeta CRC Usuario (roles) se modelan con el atributo rol: solo "
     "cambian los permisos. El rol Vendedor de la ERS no se incluye porque no participa en "
     "CU1–CU8."),
    ("nota3", "InventarioFisico",
     "Las subclases de la tarjeta CRC Inventario físico (conteo cíclico y completo) se modelan con el atributo "
     "tipoConteo."),
    ("nota4", "Devolucion",
     "El catálogo de clientes de CU4 no se modela: ninguna tarjeta CRC lo incluye."),
]


# ------------------------------------------------------------- tamanos
def _lineas_nota(texto, w, size=F_NOTA):
    """Corta el texto de una nota en lineas de a lo mas w px."""
    palabras, lineas, act = texto.split(), [], ""
    for p in palabras:
        prueba = (act + " " + p).strip()
        if ancho(prueba, size) <= w or not act:
            act = prueba
        else:
            lineas.append(act)
            act = p
    if act:
        lineas.append(act)
    return lineas


def tam_clase(nombre):
    _, _, estereo, attrs, mets = CLASE_DE[nombre]
    hdr = HDR2 if estereo else HDR1
    anchos = [ancho(nombre, F_NOMBRE, "bold") + 20]
    if estereo:
        anchos.append(ancho("«%s»" % estereo, F_NOMBRE, "italic") + 20)
    for t in attrs + mets:
        anchos.append(ancho(t, F_CUERPO) + 18)
    w = int(math.ceil(max(max(anchos), 66) / 2.0) * 2)
    ha = PASO * max(len(attrs), 0) + PAD if attrs else PAD
    hm = PASO * len(mets) + PAD if mets else PAD
    return w, hdr + ha + SEP + hm


def tam_stub(nombre):
    """Caja solo con el nombre (vistas por area)."""
    w = int(math.ceil((ancho(nombre, F_NOMBRE, "bold") + 24) / 2.0) * 2)
    return max(w, 66), 30


def tam_nota(texto, ancho_max):
    lineas = _lineas_nota(texto, ancho_max - 14)
    w = int(math.ceil((max(ancho(l, F_NOTA) for l in lineas) + 22) / 2.0) * 2)
    return w, 13 * len(lineas) + 14, lineas


if __name__ == "__main__":
    for c in CLASES:
        print(c[0], tam_clase(c[0]))
