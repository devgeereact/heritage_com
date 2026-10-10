#!/usr/bin/env bash
# HeritOS local staging: build a throwaway MariaDB/MySQL database with synthetic
# records so local work never touches production.
#
#   npm run staging:setup            # drop and rebuild heritos_staging (default)
#   npm run staging:setup -- --keep  # re-import over the existing database, no drop
#
# What it does:
#   1. Creates database heritos_staging and local user heritos_local with a new
#      random password (local only, written to php-api/config.local.php).
#   2. Imports schema.sql, schema_modules.sql, then schema_phase2..N.sql in numeric
#      order, and reports any file that raised an error (import carries on).
#   3. Runs scripts/staging/seed.php: synthetic staff, clients, jobs, orders,
#      enquiries and blog posts. It prints the staging admin password once.
#   4. Replays the Phase 2 and Phase 3 migrations (schema_phase18.sql onwards)
#      over the seeded legacy-shaped records. This exercises their backfills
#      (stage mapping, imported measurements, opening ledger entries, fitting
#      dates to appointments) and proves a second run is harmless, as the release
#      checklist requires. Then seed.php adds the Phase 2 and Phase 3 extras
#      (Phase 3: staging-only availability, a few appointments and messages).
#
# The admin connection defaults to `mariadb` as the current OS user (unix socket).
# Override with HERITOS_DB_ADMIN, for example: HERITOS_DB_ADMIN="mysql -u root -p".
# Nothing here reads or writes the production database or php-api/config.php.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="$ROOT/php-api"
DB_NAME="heritos_staging"
DB_USER="heritos_local"
CONFIG="$API/config.local.php"
LOG_DIR="$ROOT/scripts/staging/.logs"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

if [ -n "${HERITOS_DB_ADMIN:-}" ]; then
  read -r -a ADMIN <<< "$HERITOS_DB_ADMIN"
elif command -v mariadb >/dev/null 2>&1; then
  ADMIN=(mariadb)
else
  ADMIN=(mysql)
fi

command -v php >/dev/null 2>&1 || { echo "php is not installed" >&2; exit 1; }
"${ADMIN[@]}" -e "SELECT 1" >/dev/null 2>&1 || {
  echo "Cannot connect with: ${ADMIN[*]}" >&2
  echo "Start MariaDB, or set HERITOS_DB_ADMIN to a client command with admin rights." >&2
  exit 1
}

mkdir -p "$LOG_DIR"
DB_PASS="$(php -r 'echo bin2hex(random_bytes(16));')"
TOKEN_SECRET="$(php -r 'echo bin2hex(random_bytes(24));')"

echo "== Database $DB_NAME"
if [ "$KEEP" -eq 0 ]; then
  "${ADMIN[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`"
fi
"${ADMIN[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
for HOST in localhost 127.0.0.1; do
  "${ADMIN[@]}" -e "CREATE USER IF NOT EXISTS '$DB_USER'@'$HOST' IDENTIFIED BY '$DB_PASS';
    ALTER USER '$DB_USER'@'$HOST' IDENTIFIED BY '$DB_PASS';
    GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'$HOST';"
done

echo "== Writing php-api/config.local.php (gitignored, local only)"
umask 077
cat > "$CONFIG" <<PHP
<?php
// HeritOS LOCAL STAGING config, written by scripts/staging/setup.sh. Gitignored.
// Loaded only when scripts/staging/router.php defines HERITOS_STAGING.
// Synthetic data only. No mail, WhatsApp, payment or AI credentials on purpose.
define('HERITOS_ENV', 'staging');
define('GK_DEBUG', true);
ini_set('display_errors', '0');   // errors go to the JSON 'detail' field and the log, never mid-JSON
ini_set('log_errors', '1');
error_reporting(E_ALL);

define('DB_HOST', '127.0.0.1');
define('DB_NAME', '$DB_NAME');
define('DB_USER', '$DB_USER');
define('DB_PASS', '$DB_PASS');

define('TOKEN_SECRET', '$TOKEN_SECRET');
define('TOKEN_TTL_DAYS', 14);

define('CORS_ORIGIN', 'http://localhost:5112');
define('ALLOW_LOCALHOST_CORS', true);
define('ALLOW_LEGACY_ORDER_CODE_LOOKUP', true);
define('SITE_URL', 'http://localhost:5112');

// Staging only: access.php also writes each sign-in code to this local file so
// scripts/staging/e2e-phase3.sh can read it. access.php ignores it unless the
// staging router defined HERITOS_STAGING and HERITOS_ENV is 'staging'; the
// production config.php never sets it.
define('STAGING_ACCESS_CODE_LOG', '$LOG_DIR/access-codes.log');

// Left blank so staging can never send real messages or take payments:
// WhatsApp falls back to logged wa.me links, payments to manual mode, AI to
// "not configured". serve.sh points PHP mail() at a local log file.
define('OPENROUTER_KEY', '');
define('WHATSAPP_TOKEN', '');
define('PAYMENT_PROVIDER', '');
\$SMTP_HOST = '';
\$IMAP_HOST = '';

mysqli_report(MYSQLI_REPORT_OFF);
\$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (\$conn->connect_errno) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Staging database connection failed', 'detail' => \$conn->connect_error]);
  exit;
}
\$conn->set_charset('utf8mb4');
PHP

echo "== Importing schema files"
FILES=("$API/schema.sql" "$API/schema_modules.sql")
for N in $(seq 2 99); do
  [ -f "$API/schema_phase$N.sql" ] && FILES+=("$API/schema_phase$N.sql")
done
FAILED=()
for F in "${FILES[@]}"; do
  NAME="$(basename "$F")"
  if "${ADMIN[@]}" --force "$DB_NAME" < "$F" 2> "$LOG_DIR/$NAME.err"; then
    if [ -s "$LOG_DIR/$NAME.err" ]; then
      FAILED+=("$NAME"); echo "  ERROR $NAME"; sed 's/^/        /' "$LOG_DIR/$NAME.err" | head -5
    else
      echo "  ok    $NAME"; rm -f "$LOG_DIR/$NAME.err"
    fi
  else
    FAILED+=("$NAME"); echo "  ERROR $NAME"; sed 's/^/        /' "$LOG_DIR/$NAME.err" | head -5
  fi
done

echo "== Seeding synthetic records"
php "$ROOT/scripts/staging/seed.php"

echo "== Replaying Phase 2 and 3 migrations over the seeded records (idempotency check)"
for N in $(seq 18 99); do
  F="$API/schema_phase$N.sql"
  [ -f "$F" ] || continue
  NAME="replay-$(basename "$F")"
  if "${ADMIN[@]}" "$DB_NAME" < "$F" 2> "$LOG_DIR/$NAME.err" && [ ! -s "$LOG_DIR/$NAME.err" ]; then
    echo "  ok    $NAME"; rm -f "$LOG_DIR/$NAME.err"
  else
    FAILED+=("$NAME"); echo "  ERROR $NAME"; sed 's/^/        /' "$LOG_DIR/$NAME.err" | head -5
  fi
done
php "$ROOT/scripts/staging/seed.php" --phase2
php "$ROOT/scripts/staging/seed.php" --phase3

echo
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "Schema files with errors (details in scripts/staging/.logs/): ${FAILED[*]}"
else
  echo "All ${#FILES[@]} schema files imported without errors."
fi
echo "Next: npm run staging:serve, then in another terminal npm run dev."
