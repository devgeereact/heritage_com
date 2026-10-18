#!/usr/bin/env bash
# HeritOS backup (A20): a gzipped mysqldump of the database named in config.php,
# a tar of the website uploads, a SHA-256 for each and the row count of every
# table, kept outside the document root; only the newest N sets are kept.
#
#   bash backup.sh --config ~/public_html/config.php
#   bash backup.sh --config ~/public_html/config.php --out ~/heritos-backups --keep 14
#
# Options:
#   --config FILE   the server config.php (required; read by PHP, never printed)
#   --out DIR       where backups go (default ~/heritos-backups); must be outside
#                   the folder that holds config.php, so a backup is never public
#   --keep N        sets to keep (default 14); older ones are deleted
#   --uploads DIR   uploads folder (default PUBLIC_UPLOAD_DIR from config.php,
#                   else <config folder>/uploads/site)
#   --no-uploads    database only
#
# The password never appears on the command line, in the environment or in the
# output: PHP writes it straight into a temporary option file with 600
# permissions, passed to mysqldump with --defaults-extra-file and removed on exit.
# Read-only on the database (mysqldump --single-transaction). Run it in cPanel
# Terminal; locally: bash scripts/release/backup.sh --config php-api/config.local.php
# --out <dir outside the repo>. Bash 3.2 compatible.
set -euo pipefail

die() { echo "backup: $*" >&2; exit 1; }
usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

CONFIG="" OUT="${HOME}/heritos-backups" KEEP=14 UPLOADS="" NO_UPLOADS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --config) CONFIG="${2:-}"; shift ;;
    --out) OUT="${2:-}"; shift ;;
    --keep) KEEP="${2:-}"; shift ;;
    --uploads) UPLOADS="${2:-}"; shift ;;
    --no-uploads) NO_UPLOADS=1 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
  shift
done
[ -n "$CONFIG" ] || usage
[ -f "$CONFIG" ] || die "no such file: $CONFIG"
case "$KEEP" in ''|*[!0-9]*) die "--keep needs a whole number" ;; esac
[ "$KEEP" -ge 1 ] || die "--keep must be at least 1"
command -v php >/dev/null 2>&1 || die "php is required"
DUMP_BIN="${HERITOS_MYSQLDUMP:-$(command -v mysqldump || command -v mariadb-dump || true)}"
CLIENT_BIN="${HERITOS_MYSQL:-$(command -v mysql || command -v mariadb || true)}"
[ -n "$DUMP_BIN" ] || die "mysqldump (or mariadb-dump) is required"
[ -n "$CLIENT_BIN" ] || die "mysql (or mariadb) is required"
if command -v sha256sum >/dev/null 2>&1; then SHA=(sha256sum); else SHA=(shasum -a 256); fi

CONFIG_DIR="$(cd "$(dirname "$CONFIG")" && pwd -P)"
CONFIG="$CONFIG_DIR/$(basename "$CONFIG")"
mkdir -p "$OUT"
chmod 700 "$OUT"
OUT="$(cd "$OUT" && pwd -P)"
case "$OUT/" in "$CONFIG_DIR"/*) die "--out $OUT is inside $CONFIG_DIR (the document root); choose a folder outside it" ;; esac

umask 077
CNF="$(mktemp "${TMPDIR:-/tmp}/heritos-backup.XXXXXX")"
trap 'rm -f "$CNF"; rm -f "$OUT"/*.part' EXIT
chmod 600 "$CNF"

# PHP loads config.php (any output it makes is discarded), writes the client
# option file and prints only the database name and the uploads folder.
read_config() {
  php -d display_errors=0 -r '
    $cfg = $argv[1]; $cnf = $argv[2];
    ob_start(function () { return ""; });
    require $cfg;
    ob_end_clean();
    foreach (["DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"] as $k) if (!defined($k)) { fwrite(STDERR, "config has no $k\n"); exit(1); }
    $q = function ($v) { return "\"" . str_replace(["\\", "\""], ["\\\\", "\\\""], (string)$v) . "\""; };
    $host = (string)DB_HOST; $port = null;
    if (preg_match("/^(.+):(\\d+)$/", $host, $m)) { $host = $m[1]; $port = $m[2]; }
    $lines = ["[client]", "user=" . $q(DB_USER), "password=" . $q(DB_PASS), "host=" . $q($host)];
    if ($port !== null) $lines[] = "port=" . $port;
    if (file_put_contents($cnf, implode("\n", $lines) . "\n") === false) { fwrite(STDERR, "cannot write the option file\n"); exit(1); }
    echo DB_NAME, "\n", defined("PUBLIC_UPLOAD_DIR") ? PUBLIC_UPLOAD_DIR : "", "\n";
  ' "$CONFIG" "$CNF"
}
CFG_OUT="$(read_config)" || die "could not read $CONFIG"
DB_NAME="$(printf '%s\n' "$CFG_OUT" | sed -n 1p)"
CFG_UPLOADS="$(printf '%s\n' "$CFG_OUT" | sed -n 2p)"
[ -n "$DB_NAME" ] || die "config.php gave no DB_NAME (it may have stopped on a connection error)"
case "$DB_NAME" in *[!A-Za-z0-9_]*) die "unexpected characters in DB_NAME" ;; esac
[ -n "$UPLOADS" ] || UPLOADS="${CFG_UPLOADS:-$CONFIG_DIR/uploads/site}"

STAMP="$(date -u +%Y%m%d-%H%M%SZ)"
BASE="heritos-$DB_NAME-$STAMP"
START=$(date +%s)
echo "HeritOS backup of database $DB_NAME into $OUT"

# Row counts first (exact COUNT(*) per base table), so restore-check.sh can
# compare a restore with the database as it was at backup time.
TABLES="$("$CLIENT_BIN" --defaults-extra-file="$CNF" -N -B -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")" || die "cannot list tables in $DB_NAME"
[ -n "$TABLES" ] || die "database $DB_NAME has no tables"
SQL=""
for t in $TABLES; do
  case "$t" in *[!A-Za-z0-9_]*) die "unexpected table name: $t" ;; esac
  SQL="${SQL:+$SQL UNION ALL }SELECT '$t', COUNT(*) FROM \`$t\`"
done
"$CLIENT_BIN" --defaults-extra-file="$CNF" -N -B "$DB_NAME" -e "$SQL" > "$OUT/$BASE.counts.part" || die "row count failed"

# The dump: one consistent snapshot, routines and triggers, no CREATE DATABASE
# or USE line (so it can be restored under another name).
"$DUMP_BIN" --defaults-extra-file="$CNF" --single-transaction --quick --routines --triggers \
  --no-tablespaces --hex-blob --default-character-set=utf8mb4 "$DB_NAME" | gzip -9 > "$OUT/$BASE.sql.gz.part" \
  || die "mysqldump failed; nothing was kept"
gzip -t "$OUT/$BASE.sql.gz.part" || die "the dump did not pass gzip -t"
gzip -dc "$OUT/$BASE.sql.gz.part" | tail -n 1 | grep -q 'Dump completed' || die "the dump has no 'Dump completed' line; it may be cut short"
mv "$OUT/$BASE.sql.gz.part" "$OUT/$BASE.sql.gz"
mv "$OUT/$BASE.counts.part" "$OUT/$BASE.counts"
(cd "$OUT" && "${SHA[@]}" "$BASE.sql.gz" > "$BASE.sql.gz.sha256")
echo "  database  $BASE.sql.gz ($(wc -c < "$OUT/$BASE.sql.gz" | tr -d ' ') bytes, $(wc -l < "$OUT/$BASE.counts" | tr -d ' ') tables)"

if [ "$NO_UPLOADS" = 1 ]; then
  echo "  uploads   skipped (--no-uploads)"
elif [ -d "$UPLOADS" ]; then
  UP_PARENT="$(cd "$(dirname "$UPLOADS")" && pwd -P)"
  tar -czf "$OUT/$BASE.uploads.tar.gz.part" -C "$UP_PARENT" "$(basename "$UPLOADS")" || die "tar of $UPLOADS failed"
  tar -tzf "$OUT/$BASE.uploads.tar.gz.part" > /dev/null || die "the uploads archive did not list"
  mv "$OUT/$BASE.uploads.tar.gz.part" "$OUT/$BASE.uploads.tar.gz"
  (cd "$OUT" && "${SHA[@]}" "$BASE.uploads.tar.gz" > "$BASE.uploads.tar.gz.sha256")
  echo "  uploads   $BASE.uploads.tar.gz ($(tar -tzf "$OUT/$BASE.uploads.tar.gz" | grep -vc '/$' | tr -d ' ') files from $UPLOADS)"
else
  echo "  uploads   none found at $UPLOADS (nothing to archive)"
fi

# Keep the newest $KEEP sets. Names sort by time because the stamp is UTC and fixed width.
SETS="$(cd "$OUT" && ls -1 heritos-"$DB_NAME"-*.sql.gz 2>/dev/null | sort || true)"
COUNT="$(printf '%s\n' "$SETS" | grep -c . || true)"
if [ "$COUNT" -gt "$KEEP" ]; then
  printf '%s\n' "$SETS" | sed -n "1,$((COUNT - KEEP))p" | while read -r old; do
    stem="${old%.sql.gz}"
    rm -f "$OUT/$stem.sql.gz" "$OUT/$stem.sql.gz.sha256" "$OUT/$stem.counts" "$OUT/$stem.uploads.tar.gz" "$OUT/$stem.uploads.tar.gz.sha256"
    echo "  removed   $stem (older than the newest $KEEP)"
  done
fi

echo "Done in $(( $(date +%s) - START ))s. Copy the newest set off the server too (cPanel File Manager > Download), then prove it with restore-check.sh."
