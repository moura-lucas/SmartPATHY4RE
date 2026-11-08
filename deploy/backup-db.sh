#!/usr/bin/env bash
# Daily MySQL dump, keeping the last 7 days. Scheduled in the server's crontab.
set -euo pipefail
cd "$(dirname "$0")/.."

backup_dir="${BACKUP_DIR:-$HOME/backups/smartpathy}"
file="$backup_dir/smartpathy-$(date +%F-%H%M).sql.gz"
umask 077
mkdir -p "$backup_dir"
trap 'rm -f "$file.tmp"' EXIT

docker compose -f docker-compose.prod.yml exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --single-transaction --no-tablespaces -uroot "$MYSQL_DATABASE"' \
  | gzip > "$file.tmp"
mv "$file.tmp" "$file"

find "$backup_dir" -name 'smartpathy-*.sql.gz' -mtime +6 -delete
