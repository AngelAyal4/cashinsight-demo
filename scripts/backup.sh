#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-cashinsight-mongo}"
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
RETENTION_DAYS=14

# URI objetivo: entorno primero; si no, ./.env local (nunca versionado); si sigue vacia, error.
DB_URI="${MONGODB_URI:-}"
if [[ -z "$DB_URI" && -f ./.env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  DB_URI="${MONGODB_URI:-}"
fi

if [[ -z "$DB_URI" ]]; then
  echo "ERROR: no hay MONGODB_URI definida (exportala o agregala a ./.env)" >&2
  exit 1
fi

FILE="$BACKUP_DIR/atlas-cashinsight-$(date +%Y%m%d-%H%M%S).gz"
mkdir -p "$BACKUP_DIR"

# URI local (red docker): usa el contenedor mongo de dev.
# URI remota (Atlas): contenedor descartable mongo:7 — NO depende del stack de dev
# (el backup de producción debe funcionar aunque docker compose esté apagado).
if [[ "$DB_URI" == mongodb://127.0.0.1* || "$DB_URI" == mongodb://localhost* || "$DB_URI" == mongodb://mongo* ]]; then
  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "ERROR: el contenedor $CONTAINER no esta corriendo" >&2
    exit 1
  fi
  MONGODUMP_CMD=(docker exec "$CONTAINER" mongodump)
else
  MONGODUMP_CMD=(docker run --rm mongo:7 mongodump)
fi

echo "-> Generando backup en $FILE ..."
"${MONGODUMP_CMD[@]}" --uri "$DB_URI" --archive | gzip > "$FILE"

if [[ ! -s "$FILE" ]]; then
  echo "ERROR: el backup quedo vacio" >&2
  rm -f "$FILE"
  exit 1
fi

echo "OK ($(du -h "$FILE" | cut -f1))"

echo "-> Limpiando backups con mas de $RETENTION_DAYS dias ..."
find "$BACKUP_DIR" -name 'atlas-cashinsight-*.gz' -mtime +$RETENTION_DAYS -print -delete

echo "-> Listo"
