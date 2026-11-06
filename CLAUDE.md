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
- Casos de uso: CU1–CU8. Los críticos son:
  - CU1 Registrar movimientos (RF3, RF8, RF9)
  - CU6 Recibir mercancía contra orden de compra (RF13)
- Roles de Usuario: Encargado de Almacén, Auxiliar de Almacén, Encargada de Compras, Dirección General, Administrador.

## Clases (22 en el diagrama, 14 tarjetas CRC)
- Interfaz: Interfaz → InterfazRegistroMovimientos, InterfazRecepcion
- Control: ControladorMovimientos (CU1), ControladorRecepcion (CU6)
- Entidad: Usuario, Producto, Ubicacion, Movimiento (abstracta) → Entrada, Salida, Ajuste, Devolucion; Kardex, InventarioFisico, Proveedor, OrdenDeCompra, DetalleOrden (clase de asociación OrdenDeCompra–Producto), Recepcion, Reporte → DashboardEjecutivo, BitacoraDeAuditoria
- Regla de capas: la interfaz solo habla con su controlador; el controlador habla con las entidades. Nunca interfaz → entidad.
- DetalleOrden no tiene tarjeta CRC: es la propiedad "Detalle de productos" de la tarjeta Orden de compra (hay una nota en el diagrama).

## Estado de los entregables (al 6 nov 2026)
| # | Entregable | Estado |
|---|---|---|
| 1 | Casos de uso y escenarios (CU1–CU8) | Entregado |
| 2 | Diagramas de actividad | Entregado |
| 3 | Tarjetas CRC (14) | Entregado — NO modificar |
| 4 | Diagramas de secuencia CU1 y CU6 | Hecho, falta subir. Agregar párrafo que justifique por qué CU1 y CU6 |
| 5 | Diagrama de clases | Corregido el 6 nov para coincidir con las CRC; falta subir |
| 6 | Diagrama de estados | PENDIENTE. Propuesta: OrdenDeCompra (Pendiente → Emitida → Recibida parcial → Recibida total → Cerrada; Cancelada desde Pendiente o Emitida) |

Las CRC ya están entregadas: si algo no cuadra, se corrige en el diagrama, no en las tarjetas.

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
- Debe funcionar en Windows y en Ubuntu.

## Estructura de carpetas
```
sia-np/
  CLAUDE.md
  assets/              logo_tecnm.png, logo_ith.png
  fuentes/             ERS, PDF del libro, entrevistas, Excel del cliente
  entregables/
    01-casos-uso/      Escenarios_Casos_de_Uso_SIA-NP_v2 (.docx/.pdf)
    02-actividades/
    03-crc/            Tarjetas_CRC_SIA-NP (.docx/.pdf)
    04-secuencia/
    05-clases/         Diagrama_de_Clases_SIA-NP (.docx/.pdf/.drawio/.png)
    06-estados/
  scripts/             generadores (gen.js, etc.)
```
