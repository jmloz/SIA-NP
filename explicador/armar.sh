#!/usr/bin/env bash
# Inserta explicador/secciones/*.html en marco.html (marcador <!--SECCIONES-->) y escribe index.html.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp)
for f in secciones/0*.html; do
  printf '\n<!-- ===== %s ===== -->\n' "$f" >> "$tmp"
  cat "$f" >> "$tmp"
done
awk -v archivo="$tmp" '
  /<!--SECCIONES-->/ { while ((getline linea < archivo) > 0) print linea; next }
  { print }
' marco.html > index.html
rm -f "$tmp"
echo "index.html: $(wc -c < index.html) bytes, secciones: $(ls secciones/0*.html | wc -l)"
