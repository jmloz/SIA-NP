#!/usr/bin/env bash
# Crea la BD SIA_NP en el contenedor de SQL Server: scripts 01, 02 y 04 (y 03 para comprobar).
# Uso: bash app/db/init-docker.sh   (desde la raíz del repo; requiere `docker compose up -d` en app/)
set -euo pipefail
# Toma la contraseña de app/.env (la misma que usan docker compose y la app)
ENV="$(dirname "$0")/../.env"
[ -f "$ENV" ] && DB_PASSWORD="${DB_PASSWORD:-$(grep -E '^DB_PASSWORD=' "$ENV" | cut -d= -f2-)}"
PASS="${DB_PASSWORD:-SiaNp_2026!}"
SQLCMD=(docker exec sianp-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$PASS" -C -f 65001 -b)
until "${SQLCMD[@]}" -Q "SELECT 1" >/dev/null 2>&1; do echo "Esperando a SQL Server..."; sleep 3; done
# Si quedaron archivos de una BD que ya no está registrada (p. ej. tras recrear el contenedor), se borran
if [ -z "$("${SQLCMD[@]}" -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE name='SIA_NP'" | tr -d '[:space:]')" ]; then
  docker exec -u 0 sianp-sql rm -f /var/opt/mssql/data/SIA_NP.mdf /var/opt/mssql/data/SIA_NP_log.ldf
fi
for s in 01_creacion_SIA_NP 02_datos_prueba 04_ajustes_app; do
  echo "== $s"; "${SQLCMD[@]}" -i "/sql/$s.sql" >/dev/null
done
echo "== 03_pruebas_integridad (deben fallar las 28 operaciones)"
docker exec sianp-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$PASS" -C -f 65001 -i /sql/03_pruebas_integridad.sql | grep -E "^(OK  |FALLÓ)" | cut -c1-5 | sort | uniq -c
echo "Listo."
