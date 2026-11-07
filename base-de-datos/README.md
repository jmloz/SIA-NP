# Taller de Base de Datos — Proyecto Parte I (SIA-NP)

Base de datos del Sistema de Inventario y Almacén de Neumática del Pacífico, en SQL Server.

Integrantes: Hernández Castro José Martín, Moreno Ramos Adolfo, Peñuñuri Fernández Sara Alejandra, Rivera Torres Edgardo.

| Archivo | Contenido |
|---|---|
| `Proyecto_BD_Parte_I_SIA-NP.docx` / `.pdf` | Documento entregable (secciones 1–6 del taller) |
| `sql/01_creacion_SIA_NP.sql` | Crea la BD, 14 tablas, índices y 3 vistas |
| `sql/02_datos_prueba.sql` | Datos de ejemplo por catálogo |
| `sql/03_pruebas_integridad.sql` | 28 operaciones inválidas que las restricciones deben rechazar |
| `diagramas/` | MER (Chen), UML y diagrama lógico (.svg y .png) |
| `scripts/` | Generadores del documento y de los diagramas |

## Ejecutar los scripts

- Windows: abrir cada `.sql` en SQL Server Management Studio y ejecutar (F5), en orden 01, 02, 03.
- Ubuntu: `sqlcmd -S localhost -U sa -P <contraseña> -C -f 65001 -i sql/01_creacion_SIA_NP.sql` (y luego 02 y 03).

## Regenerar el documento

```
cd base-de-datos/scripts
node gen_diagramas.js        # requiere playwright
node gen_documento.js        # requiere docx
cd .. && soffice --headless --convert-to pdf Proyecto_BD_Parte_I_SIA-NP.docx
```

`scripts/metadatos_columnas.json` se extrajo de `sys.columns` después de ejecutar el script 01; si cambia el script, hay que volver a extraerlo para que el diccionario de datos coincida.
