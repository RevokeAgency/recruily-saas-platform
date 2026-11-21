#!/usr/bin/env bash
# Baut eine frische lokale Testdatenbank: Supabase-Nachbildung, dann alle
# Migrationen in Reihenfolge. Aufruf: tests/db/setup-db.sh <psql-verbindung>
# Beispiel: tests/db/setup-db.sh "host=/home/pgtest port=55432 user=postgres"
set -euo pipefail
CONN="${1:?psql-Verbindung angeben}"
DB="${REVY_TEST_DB:-revetly_test}"
psql "$CONN dbname=postgres" -qc "drop database if exists $DB" -qc "create database $DB" >/dev/null
psql "$CONN dbname=$DB" -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/supabase-stub.sql" >/dev/null
for f in $(ls "$(dirname "$0")"/../../scripts/[0-9][0-9][0-9]_*.sql | sort); do
  n=$(basename "$f" | cut -c1-3)
  # Nachbildung von Schritten, die in Produktion außerhalb der Skripte liefen.
  if [ -f "$(dirname "$0")/before-$n.sql" ]; then
    psql "$CONN dbname=$DB" -q -v ON_ERROR_STOP=1 -f "$(dirname "$0")/before-$n.sql" >/dev/null
  fi
  if ! out=$(psql "$CONN dbname=$DB" -q -v ON_ERROR_STOP=1 -f "$f" 2>&1); then
    echo "FEHLER in $(basename "$f"):"; echo "$out" | grep -E "ERROR|LINE" | head -5; exit 1
  fi
done
echo "ok: $DB"
