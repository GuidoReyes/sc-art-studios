#!/usr/bin/env bash
# Capa 7: respaldo cifrado de MySQL. Correr como cron diario en Railway o en la Mac.
# Requiere: mysqldump, age (cifrado) y rclone configurado con un remoto de Google Drive (Service Account) y/o R2.
set -euo pipefail
: "${DATABASE_URL:?falta DATABASE_URL}"; : "${AGE_RECIPIENT:?falta AGE_RECIPIENT (llave pública de age)}"
: "${RCLONE_REMOTE:=gdrive:respaldos/sc-art-studio}"
STAMP=$(date -u +%Y%m%d-%H%M%S)
FILE="/tmp/sc-art-studio-$STAMP.sql.gz.age"
# Extraer credenciales de mysql://user:pass@host:port/db
proto_removed="${DATABASE_URL#mysql://}"; creds="${proto_removed%%@*}"; hostdb="${proto_removed#*@}"
USER="${creds%%:*}"; PASS="${creds#*:}"; HOSTPORT="${hostdb%%/*}"; DB="${hostdb#*/}"; DB="${DB%%\?*}"
HOST="${HOSTPORT%%:*}"; PORT="${HOSTPORT#*:}"
MYSQL_PWD="$PASS" mysqldump -h "$HOST" -P "$PORT" -u "$USER" --single-transaction --routines "$DB" \
  | gzip | age -r "$AGE_RECIPIENT" > "$FILE"
rclone copy "$FILE" "$RCLONE_REMOTE"
rm -f "$FILE"
echo "Respaldo $STAMP subido a $RCLONE_REMOTE"
# Retención (7 diarios) se maneja con: rclone delete --min-age 7d "$RCLONE_REMOTE"
