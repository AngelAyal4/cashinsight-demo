#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-cashinsight-mongo}"
DB_URI="mongodb://127.0.0.1:27017/cashinsightapp"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
RETENTION_DAYS=14
FILE="$BACKUP_DIR/cashinsight-$(date +%Y%m%d-%H%M%S).gz"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: el contenedor $CONTAINER no esta corriendo" >&2
  exit 1
fi

echo "-> Generando backup en $FILE ..."
docker exec "$CONTAINER" mongodump --uri "$DB_URI" --archive | gzip > "$FILE"

if [[ ! -s "$FILE" ]]; then
  echo "ERROR: el backup quedo vacio" >&2
  rm -f "$FILE"
  exit 1
fi

echo "OK ($(du -h "$FILE" | cut -f1))"

echo "-> Limpiando backups con mas de $RETENTION_DAYS dias ..."
find "$BACKUP_DIR" -name 'cashinsight-*.gz' -mtime +$RETENTION_DAYS -print -delete

echo "-> Listo"
