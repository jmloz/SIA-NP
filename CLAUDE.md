# SIA-NP — Proyecto de Fundamentos de Ingeniería de Software

Responde siempre en español.

## Contexto del curso
- Institución: Tecnológico Nacional de México (TecNM), Instituto Tecnológico de Hermosillo (ITH)
- Carrera: Ingeniería en Sistemas Computacionales
- Materia: Fundamentos de Ingeniería de Software
- Profesora: Bettina Elisa Santa Cruz Welsh
- Grupo: S5A
- Integrantes (en este orden, en las portadas):
  - Hernández Castro José Martín
  - Moreno Ramos Adolfo
  - Olivas Villareal Andrea
  - Rivera Torres Edgardo
- Libro base: Kendall & Kendall, cap. 10 "Análisis y diseño de sistemas orientados a objetos mediante el uso de UML" (`fuentes/Analisis Orientado a Objetos.pdf`). Las páginas del libro son 281–327.

## El sistema
SIA-NP = Sistema de Inventario y Almacén para el cliente real Neumática del Pacífico.

- Stakeholders: Paulina Pérez Estrada (CEO), Lodevar Pablovich (Encargado de Almacén), Ricardo Mendoza Quintero (Auxiliar de Almacén), Karla Patricia Domínguez Rivera (Encargada de Compras).
- Requerimientos: RF1–RF20 y RNF1–RNF9 (ver ERS IEEE 830 en `fuentes/`).
- Numeración de RF: la ERS tiene dos incompatibles. En los entregables se cita la del **Apéndice C** (RF3 Movimientos, RF8 Nota de salida, RF9 Código de barras, RF13 Recepción). La de §3.2 y la Figura 2 de la ERS es distinta (RF01 Movimientos, RF12 Recepción, RF13 Reorden).
- Casos de uso: CU1–CU8. Los críticos son:
  - CU1 Registrar movimientos (RF3, RF8, RF9)
  - CU6 Recibir mercancía contra orden de compra (RF13)
  - "Críticos" es criterio del equipo; la ERS no los marca así.
- Roles de Usuario: Encargado de Almacén, Auxiliar de Almacén, Encargada de Compras, Dirección General, Administrador.

## Clases (22 en el diagrama, 14 tarjetas CRC)
- Interfaz: Interfaz → InterfazRegistroMovimientos, InterfazRecepcion
- Control: ControladorMovimientos (CU1), ControladorRecepcion (CU6)
- Entidad: Usuario, Producto, Ubicacion, Movimiento (abstracta) → Entrada, Salida, Ajuste, Devolucion; Kardex, InventarioFisico, Proveedor, OrdenDeCompra, DetalleOrden (clase de asociación OrdenDeCompra–Producto), Recepcion, Reporte → DashboardEjecutivo, BitacoraDeAuditoria
- Regla de capas: la interfaz solo habla con su controlador; el controlador habla con las entidades. Nunca interfaz → entidad.
- DetalleOrden no tiene tarjeta CRC: es la propiedad "Detalle de productos" de la tarjeta Orden de compra (hay una nota en el diagrama).

## Estado de los entregables (al 9 nov 2026)
| # | Entregable | Estado |
|---|---|---|
| 1 | Casos de uso y escenarios (CU1–CU8) | Entregado. Rehecho el 9 nov 2026 desde la versión `9591686`: la corrección de `c532d00` había dañado las descripciones de CU2–CU8. Autor = Equipo Grupo S5A y Materia correcta. Falta .docx. |
| 2 | Diagramas de actividad | Entregado. La portada dice la materia, pero sin la etiqueta "Materia:". Falta .docx. |
| 3 | Tarjetas CRC (14) | Entregado — NO modificar. Falta .docx. |
| 4 | Diagramas de secuencia CU1 y CU6 | Reescrito completo el 6 nov 2026: SD1 = CU6 (actor Encargada de Compras, vía InterfazRecepcion/ControladorRecepcion), SD2 = CU1 (actor Encargado de Almacén, vía InterfazRegistroMovimientos/ControladorMovimientos, ejemplo con Salida). Clases, tablas y figuras ahora reales; notación `objeto::Clase` consistente. Sección 1 reescrita el 9 nov 2026; ese día los mensajes también pasaron `ubicacion` (SD1) y `documento` (SD2). La portada sigue con fecha 9 oct. Falta .docx. |
| 5 | Diagrama de clases | .drawio de 5 páginas (Figura 1 completa y Figuras 2–5 por área), .pdf de 11 páginas y .png, regenerados el 9 nov 2026 con `scripts/`, no con draw.io: falta abrir el `.drawio` en draw.io una vez para confirmar que se ve igual. La Figura 1 es vectorial con letra de 3.5 pt (se lee con zoom); las vistas tienen ≥6.5 pt. Falta .docx. |
| 6 | Diagrama de estados | PENDIENTE. OrdenDeCompra: Pendiente → Emitida → Parcialmente recibida → Recibida → Cerrada; Cancelada desde Pendiente o Emitida (propuesta aún sin aprobar por el equipo; así está ya el atributo `estado` del diagrama de clases) |

Las CRC ya están entregadas: si algo no cuadra, se corrige en el diagrama, no en las tarjetas.

Auditoría del 9 nov 2026: clases (22 vs 14 CRC) y CU1–CU8 concuerdan entre los documentos; los RF citados concuerdan solo con el Apéndice C de la ERS.

Pendientes de esa auditoría:
- Revisión cruzada del 9 nov 2026, sin corregir: en SD1 y SD2 el mensaje 6 es `capturarDatos()` en la figura pero la tabla le da parámetros; "Tipos de clases" omite DashboardEjecutivo; la frase de la tabla de correspondencia sobre "los métodos que no aparecen" es falsa para `notificarDiferencias()`, `agregarDetalle()`, `cambiarCantidad()`, `calcularSaldoPendiente()` y `actualizarGraficas()`; CU1/CU6 validan antes de confirmar y SD2/SD1 después.
- Cierre: contradicciones en escenarios (CU2, CU3, CU5, CU8); flujos alternos en actividades (CU1, CU3, CU5, CU6); generar los .docx; unificar formato de portadas y rellenos (excepto CRC).

## Reglas de formato (obligatorias)
- Todo en negro: texto, líneas y bordes. Nada de azul ni encabezados de color. Relleno gris claro (#E6E6E6) solo en encabezados de clase y de tabla.
- Fuente Arial. Tamaño carta.
- Portada: logos TecNM (izquierda) e ITH (derecha), nombre de la institución, carrera, materia, trabajo, profesora, grupo, integrantes, "Hermosillo, Sonora, <fecha>".
- Sin número de página ("Página X de Y") en ningún documento.
- Complejidad de proyecto escolar, no de especificación profesional.
- Notación del libro: `objeto::Clase` en secuencias, `-` privado, `+` público, tipos y valores iniciales (`existencia: Decimal=0.0`), valores finitos entre llaves (`char{E,S,A,D}`), multiplicidades 1, 0..*, 1..*.
- Entregar en .docx y .pdf.

## Herramientas
- Diagramas: draw.io (`.drawio`) editable; PlantUML con `skinparam monochrome true` si se generan por código.
- Word: Node.js + librería `docx`.
- PDF: `soffice --headless --convert-to pdf archivo.docx`
- Cuando solo existe el PDF final (no el .docx fuente) y hay que corregir texto o tablas: `pip install pymupdf --user`, editar con `pymupdf` (redactar la región y reinsertar el texto; en Ubuntu con `/usr/share/fonts/liberation/LiberationSans-Regular.ttf`, la fuente con la que LibreOffice exportó estos PDF, y en Windows con `C:/Windows/Fonts/arial.ttf`, de métricas idénticas). Obtener las coordenadas de cada página, nunca reutilizarlas de otra, y comparar el texto contra la versión anterior. Para figuras de diagramas de secuencia sin StarUML/PlantUML disponibles: armar el diagrama a mano como SVG y convertir con `rsvg-convert`. Siempre revisar el resultado renderizando con `pdftoppm -png` antes de dar por bueno un cambio.
- Diagrama de clases: no editar a mano. `scripts/modelo_clases.py` es la fuente; `construir_drawio.py` genera el `.drawio`, `render_drawio.py` lo pasa a PDF/PNG, `actualizar_pdf_clases.py base.pdf archivo.drawio salida.pdf` arma el PDF y `verificar_clases.py archivo.drawio archivo.pdf` lo comprueba. `base.pdf` es el PDF de 7 páginas de git, no el ya generado: `git show ca4374b:entregables/05-clases/Diagrama_de_Clases_SIA-NP.pdf > base.pdf`. Solo se han probado en Windows.
- Al insertar texto con Arial en PyMuPDF, el ToUnicode sale mal (espacio como U+00A0, `=` como `æ`, `J` como `Ã`): el texto se ve bien, pero no se busca ni se copia bien. `arreglar_tounicode` en `actualizar_pdf_clases.py` lo corrige. Casos de uso y la pág. 2 de secuencias aún tienen U+00A0.
- Debe funcionar en Windows y en Ubuntu. En Windows, `soffice`, `rsvg-convert` y draw.io no vienen instalados: verificar antes de contar con ellos.

## Estructura de carpetas
Solo lo que existe hoy en `main`. Cada entregable debe tener además su .docx (ninguno lo tiene).
```
sia-np/
  CLAUDE.md
  assets/              logo_tecnm.png, logo_ith.png
  fuentes/             ERS_SIA-NP.pdf, Analisis Orientado a Objetos.pdf
  entregables/
    01-casos-uso/      Escenarios_Casos_de_Uso_SIA-NP_v2.pdf
    02-actividades/    Diagramas_de_Actividad_con_Carriles_SIA-NP.pdf
    03-crc/            Tarjetas_CRC_SIA-NP.pdf
    04-secuencia/      SIA-NP_Diagramas_de_Secuencia.pdf
    05-clases/         Diagrama_de_Clases_SIA-NP.pdf, .drawio, .png
    06-estados/        (vacío)
  scripts/             generadores y verificadores del diagrama de clases (Python + PyMuPDF)
```
Las entrevistas y las capturas del Excel del cliente solo están resumidas en los apéndices A y B de la ERS.
