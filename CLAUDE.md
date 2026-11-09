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
Los 6 tienen .docx y .pdf. Cada .docx sale de su generador `scripts/docx/0N_*.js` (Node + `docx`, con la portada y los estilos comunes de `scripts/docx/comun.js`); el .pdf se obtiene con `python scripts/docx/a_pdf.py archivo.docx`. **Para corregir texto se edita el generador y se regenera; ya no se parchea el PDF.** Portada unificada (salvo CRC): Materia:, Trabajo:, Profesora:, Grupo:, Integrantes: y fecha 9 nov 2026.

| # | Entregable | Estado |
|---|---|---|
| 1 | Casos de uso y escenarios (CU1–CU8) | Corregido el 9 nov 2026: contradicciones de CU2, CU3, CU5 y CU8; CU1 y CU6 ahora confirman y después validan (como SD1/SD2), lo que renumeró sus alternos (CU1: 7a cancelar, 8a salida > existencia, 8b falta campo; CU6: 6a defectos, 7a excedente). Flujos finales resumidos en `scripts/docx/NOTAS_01.md`. |
| 2 | Diagramas de actividad | Rehechos el 9 nov 2026 desde los CU corregidos, con flujos alternos. Fuente: `scripts/actividades/definiciones.py` → `diagramas_actividad.py` genera el `.drawio` (8 páginas) y `figuras/CU*.png`. |
| 3 | Tarjetas CRC (14) | Entregado — NO modificar. El PDF es el original; el .docx (`03_crc.js`) lo replica. |
| 4 | Diagramas de secuencia CU1 y CU6 | SD1 = CU6, SD2 = CU1. El 9 nov 2026: el mensaje 6 de las figuras ya lleva los parámetros de la tabla, los alternos citados siguen la numeración nueva de los CU y la tabla de la sección 1 está corregida. Las figuras son PNG de 300 dpi en `figuras/`, recortados del PDF vectorial anterior: para cambiar una figura hay que editar ese PDF (`git show f6827ff:...`) o redibujarla. |
| 5 | Diagrama de clases | .drawio (5 páginas) generado con `scripts/`. El PDF de 13 págs. junta las págs. de Word (portada, intro y tablas) con las figuras vectoriales (págs. 3–7) del PDF de scripts. Se agregaron DashboardEjecutivo a "Tipos de clases" y una tabla de los 5 métodos que no salen de una responsabilidad CRC. `verificar_clases.py` da TODO OK. |
| 6 | Diagrama de estados (OrdenDeCompra) | Hecho el 9 nov 2026: Pendiente → Emitida → Parcialmente recibida (con autotransición) → Recibida → Cerrada; Cancelada desde Pendiente o Emitida. Fuente: `scripts/estados/diagrama_estados.py` (genera .drawio, `_figura.pdf` y .png). **Entregado el 9 nov 2026 tal cual (la imagen PNG generada por script). La consigna pedía dibujarlo en StarUML; se envió así. NO modificar.** |

Las CRC ya están entregadas: si algo no cuadra, se corrige en el diagrama, no en las tarjetas.

Pendientes:
- Ningún `.drawio` (actividades, clases, estados) se ha abierto en draw.io: hay que abrirlos una vez para confirmar que se ven igual que los PNG/PDF.
- Diagrama de estados ya entregado; notas por si se pregunta: T4 (cancelar una orden Emitida) y T9 (cerrar) no tienen CU propio; el diccionario de datos de la ERS usa otros estatus (Abierta/Parcial/Cerrada/Cancelada).
- Sin corregir (menores): en CU1, CU4 y CU5 la precondición dice que el producto, cliente o proveedor existe, pero un alterno trata el caso de que no exista; CU2 y CU7 registran la consulta en la bitácora, cosa que la ERS no pide; en SD1/SD2, `validarUbicacion(clave)` recibe "clave" aunque los mensajes anteriores pasan `ubicacion`; en la tabla de clases, el origen de `actualizarGraficas()` (CU7) no se comparó con el Apéndice C.

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
- PDF: `python scripts/docx/a_pdf.py archivo.docx [salida.pdf]` (Windows: Word por COM con `docx2pdf`, serializado con candado; Ubuntu: `soffice --headless --convert-to pdf`). `npm install` en `scripts/docx` antes de correr los generadores.
- PlantUML no está disponible y no se pudo descargar: los diagramas de actividad y de estados se generan con sus propios scripts en Python, que producen el `.drawio` y el PNG/PDF.
- Cuando solo existe el PDF final (no el .docx fuente) y hay que corregir texto o tablas: `pip install pymupdf --user`, editar con `pymupdf` (redactar la región y reinsertar el texto; en Ubuntu con `/usr/share/fonts/liberation/LiberationSans-Regular.ttf`, la fuente con la que LibreOffice exportó estos PDF, y en Windows con `C:/Windows/Fonts/arial.ttf`, de métricas idénticas). Obtener las coordenadas de cada página, nunca reutilizarlas de otra, y comparar el texto contra la versión anterior. Para figuras de diagramas de secuencia sin StarUML/PlantUML disponibles: armar el diagrama a mano como SVG y convertir con `rsvg-convert`. Siempre revisar el resultado renderizando con `pdftoppm -png` antes de dar por bueno un cambio.
- Diagrama de clases: no editar a mano. `scripts/modelo_clases.py` es la fuente; `construir_drawio.py` genera el `.drawio`, `render_drawio.py` lo pasa a PDF/PNG, `actualizar_pdf_clases.py base.pdf archivo.drawio salida.pdf` arma el PDF y `verificar_clases.py archivo.drawio archivo.pdf` lo comprueba. `base.pdf` es el PDF de 7 páginas de git, no el ya generado: `git show ca4374b:entregables/05-clases/Diagrama_de_Clases_SIA-NP.pdf > base.pdf`. Solo se han probado en Windows.
- Al insertar texto con Arial en PyMuPDF, el ToUnicode sale mal (espacio como U+00A0, `=` como `æ`, `J` como `Ã`): el texto se ve bien, pero no se busca ni se copia bien. `arreglar_tounicode` en `actualizar_pdf_clases.py` lo corrige. Casos de uso y la pág. 2 de secuencias aún tienen U+00A0.
- Debe funcionar en Windows y en Ubuntu. En Windows, `soffice`, `rsvg-convert` y draw.io no vienen instalados: verificar antes de contar con ellos.

## Estructura de carpetas
Solo lo que existe hoy en `main`.
```
sia-np/
  CLAUDE.md
  assets/              logo_tecnm.png, logo_ith.png
  fuentes/             ERS_SIA-NP.pdf, Analisis Orientado a Objetos.pdf
  entregables/
    01-casos-uso/      Escenarios_Casos_de_Uso_SIA-NP_v2.docx/.pdf
    02-actividades/    Diagramas_de_Actividad_con_Carriles_SIA-NP.docx/.pdf, Diagramas_de_Actividad_SIA-NP.drawio, figuras/CU1-8.png
    03-crc/            Tarjetas_CRC_SIA-NP.docx/.pdf
    04-secuencia/      SIA-NP_Diagramas_de_Secuencia.docx/.pdf, figuras/
    05-clases/         Diagrama_de_Clases_SIA-NP.docx/.pdf, .drawio, .png
    06-estados/        Diagrama_de_Estados_SIA-NP.docx/.pdf, .drawio, .png, _figura.pdf
  scripts/             generadores y verificadores del diagrama de clases (Python + PyMuPDF)
    docx/              generadores .docx (01..06_*.js), comun.js, a_pdf.py, NOTAS_01.md (node_modules ignorado en .git/info/exclude)
    actividades/       definiciones.py + diagramas_actividad.py
    estados/           diagrama_estados.py
```
Las entrevistas y las capturas del Excel del cliente solo están resumidas en los apéndices A y B de la ERS.
