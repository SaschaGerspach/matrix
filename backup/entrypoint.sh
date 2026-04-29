#!/bin/bash
set -e

CRON_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"

echo "Setting up backup cron: ${CRON_SCHEDULE}"

env | grep -E '^(PG|BACKUP_)' > /etc/environment

echo "${CRON_SCHEDULE} . /etc/environment; /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab -

touch /var/log/backup.log

echo "Running initial backup..."
/usr/local/bin/backup.sh

echo "Starting cron daemon..."
crond -f -l 2 & tail -f /var/log/backup.log
