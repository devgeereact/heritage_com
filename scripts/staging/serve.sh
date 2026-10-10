#!/usr/bin/env bash
# HeritOS local staging API on http://127.0.0.1:8088 (run setup.sh first).
#
#   npm run staging:serve
#
# Serves php-api/ through scripts/staging/router.php, which makes _lib.php load
# php-api/config.local.php (the local heritos_staging database). PHP mail() is
# redirected to scripts/staging/.logs/mail.log, so no email ever leaves the laptop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$ROOT/scripts/staging/.logs"
HOST="${HERITOS_STAGING_HOST:-127.0.0.1}"
PORT="${HERITOS_STAGING_PORT:-8088}"

[ -f "$ROOT/php-api/config.local.php" ] || {
  echo "php-api/config.local.php is missing. Run: npm run staging:setup" >&2
  exit 1
}
mkdir -p "$LOG_DIR"

echo "HeritOS LOCAL STAGING API: http://$HOST:$PORT (database heritos_staging, synthetic data)"
echo "Mail is written to scripts/staging/.logs/mail.log. Ctrl+C to stop."
exec php \
  -d "sendmail_path=cat >> '$LOG_DIR/mail.log'" \
  -d display_errors=0 \
  -S "$HOST:$PORT" -t "$ROOT/php-api" "$ROOT/scripts/staging/router.php"
