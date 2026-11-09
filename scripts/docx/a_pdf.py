"""Convierte .docx a .pdf.

Uso: python a_pdf.py archivo.docx [salida.pdf]

En Windows usa Microsoft Word (COM, vía docx2pdf). En Ubuntu usa
`soffice --headless --convert-to pdf`.
"""
import os
import shutil
import subprocess
import sys


def convertir(docx, pdf=None):
    docx = os.path.abspath(docx)
    pdf = os.path.abspath(pdf or os.path.splitext(docx)[0] + ".pdf")
    if sys.platform == "win32":
        # Word es una sola instancia COM: serializar conversiones simultáneas.
        import tempfile
        import time
        candado = os.path.join(tempfile.gettempdir(), "sia_np_word.lock")
        inicio = time.time()
        while True:
            try:
                fd = os.open(candado, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                break
            except FileExistsError:
                if time.time() - os.path.getmtime(candado) > 300:
                    os.remove(candado)  # candado abandonado
                elif time.time() - inicio > 600:
                    sys.exit("Word ocupado demasiado tiempo")
                time.sleep(2)
        try:
            from docx2pdf import convert
            convert(docx, pdf)
        finally:
            os.close(fd)
            os.remove(candado)
    else:
        soffice = shutil.which("soffice") or shutil.which("libreoffice")
        if not soffice:
            sys.exit("No se encontró soffice")
        outdir = os.path.dirname(pdf)
        subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", outdir, docx], check=True)
        generado = os.path.join(outdir, os.path.splitext(os.path.basename(docx))[0] + ".pdf")
        if generado != pdf:
            shutil.move(generado, pdf)
    print("PDF:", pdf)
    return pdf


if __name__ == "__main__":
    convertir(*sys.argv[1:3])
