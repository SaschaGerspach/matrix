#!/bin/bash
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="matrix_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Backup created: ${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "matrix_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Backup complete. Current backups:"
ls -lh "$BACKUP_DIR"/matrix_*.sql.gz 2>/dev/null || echo "  (none)"
