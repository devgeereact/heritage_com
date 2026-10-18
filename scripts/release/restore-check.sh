#!/usr/bin/env bash
# HeritOS restore check (A20): proves a backup from backup.sh can be restored.
# Restores the dump into a NEW, empty scratch database, compares the row count
# of every table with the counts taken at backup time (the .counts file beside
# the dump) or with the live source database, prints a report, and drops the
# scratch database only when told to.
#
#   bash restore-check.sh --config ~/public_html/config.php --scratch PREFIX_restorecheck heritos-....sql.gz
#   bash restore-check.sh --config ~/public_html/config.php --scratch PREFIX_restorecheck --drop-only
#
# Options:
#   --config FILE    config.php: its DB_NAME is the source (never written) and,
#                    without HERITOS_DB_ADMIN, its user connects
#   --scratch NAME   the scratch database; the name must contain "restore" and
#                    differ from the source
#   --create         create the scratch database first (needs CREATE rights; on
#                    cPanel create it in MySQL Databases instead and give the
#                    config user ALL PRIVILEGES on it)
#   --drop           drop the scratch database after the report
#   --drop-only      only drop the scratch database (after an earlier check)
#   --against-live   compare with the live source database, not the .counts file
#   --uploads FILE   also list the uploads archive and count its files
#
# HERITOS_DB_ADMIN, when set, is the client command used instead of the config
# user, for example HERITOS_DB_ADMIN=mariadb on a laptop. The source database
# is only ever read (COUNT(*) with --against-live). Exit 0 when every table
# matches, 1 on any difference or error, 2 on bad usage. Bash 3.2 compatible.
set -euo pipefail

die() { echo "restore-check: $*" >&2; exit 1; }
usage() { sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

CONFIG="" SCRATCH="" DUMP="" CREATE=0 DROP=0 DROP_ONLY=0 LIVE=0 UPLOADS_TAR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --config) CONFIG="${2:-}"; shift ;;
    --scratch) SCRATCH="${2:-}"; shift ;;
    --create) CREATE=1 ;;
    --drop) DROP=1 ;;
    --drop-only) DROP_ONLY=1 ;;
    --against-live) LIVE=1 ;;
    --uploads) UPLOADS_TAR="${2:-}"; shift ;;
    -h|--help) usage ;;
    -*) echo "Unknown option: $1" >&2; usage ;;
    *) [ -z "$DUMP" ] || usage; DUMP="$1" ;;
  esac
  shift
done
[ -n "$CONFIG" ] && [ -n "$SCRATCH" ] || usage
[ -f "$CONFIG" ] || die "no such file: $CONFIG"
[ "$DROP_ONLY" = 1 ] || [ -n "$DUMP" ] || usage
case "$SCRATCH" in *[!A-Za-z0-9_]*|'') die "--scratch may hold only letters, digits and _" ;; esac
case "$(printf '%s' "$SCRATCH" | tr '[:upper:]' '[:lower:]')" in *restore*) ;; *) die "--scratch must contain 'restore' (for example yourprefix_restorecheck), so a real database is never named by mistake" ;; esac
command -v php >/dev/null 2>&1 || die "php is required"

umask 077
CNF="$(mktemp "${TMPDIR:-/tmp}/heritos-restore.XXXXXX")"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/heritos-restore-work.XXXXXX")"
trap 'rm -f "$CNF"; rm -rf "$WORK"' EXIT
chmod 600 "$CNF"

# Same reader as backup.sh: config output discarded, password written only to
# the 600 option file, only DB_NAME printed.
SOURCE="$(php -d display_errors=0 -r '
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
  echo DB_NAME, "\n";
' "$CONFIG" "$CNF")" || die "could not read $CONFIG"
case "$SOURCE" in ''|*[!A-Za-z0-9_]*) die "config.php gave no usable DB_NAME" ;; esac
[ "$SCRATCH" != "$SOURCE" ] || die "--scratch is the source database $SOURCE; refusing"

if [ -n "${HERITOS_DB_ADMIN:-}" ]; then
  read -r -a SQLC <<< "$HERITOS_DB_ADMIN"
else
  CLIENT_BIN="${HERITOS_MYSQL:-$(command -v mysql || command -v mariadb || true)}"
  [ -n "$CLIENT_BIN" ] || die "mysql (or mariadb) is required"
  SQLC=("$CLIENT_BIN" --defaults-extra-file="$CNF")
fi
q() { "${SQLC[@]}" -N -B "$@"; }

db_exists() { [ "$(q -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$1'")" = 1 ]; }
table_count() { q -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$1'"; }

drop_scratch() {
  [ "$SCRATCH" != "$SOURCE" ] || die "refusing to drop the source database"
  if ! db_exists "$SCRATCH"; then echo "Scratch database $SCRATCH does not exist; nothing to drop."; return 0; fi
  if q -e "DROP DATABASE \`$SCRATCH\`"; then echo "Dropped scratch database $SCRATCH."
  else echo "Could not drop $SCRATCH with this user. Delete it in cPanel > MySQL Databases." >&2; return 1; fi
}

if [ "$DROP_ONLY" = 1 ]; then drop_scratch; exit $?; fi

[ -f "$DUMP" ] || die "no such dump: $DUMP"
gzip -t "$DUMP" || die "$DUMP did not pass gzip -t"
# A dump made with --databases or --all-databases switches database itself; it
# would restore over the source, so it is refused.
if gzip -dc "$DUMP" | grep -qE '^(USE |CREATE DATABASE)'; then die "$DUMP contains USE or CREATE DATABASE; use a dump from backup.sh"; fi

COUNTS="${DUMP%.sql.gz}.counts"
if [ "$LIVE" = 1 ]; then REF="live database $SOURCE"
elif [ -f "$COUNTS" ]; then REF="counts at backup time ($(basename "$COUNTS"))"
else REF="live database $SOURCE (no .counts file beside the dump)"; LIVE=1; fi

if db_exists "$SCRATCH"; then
  [ "$CREATE" = 0 ] || die "$SCRATCH already exists; drop it first (--drop-only) or leave out --create"
  [ "$(table_count "$SCRATCH")" = 0 ] || die "$SCRATCH is not empty; refusing to restore into it"
else
  [ "$CREATE" = 1 ] || die "$SCRATCH does not exist; create it (cPanel > MySQL Databases) or pass --create"
  q -e "CREATE DATABASE \`$SCRATCH\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" || die "could not create $SCRATCH"
  echo "Created scratch database $SCRATCH."
fi

echo "Restoring $(basename "$DUMP") into $SCRATCH (source $SOURCE is not touched)"
START=$(date +%s)
gzip -dc "$DUMP" | "${SQLC[@]}" "$SCRATCH" || die "the restore failed; $SCRATCH is left for inspection (drop it with --drop-only)"
ELAPSED=$(( $(date +%s) - START ))

# Exact counts in the scratch database, and the reference counts.
count_tables() { # db -> "table<TAB>count" lines
  local db="$1" tables sql="" t
  tables="$(q -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$db' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")"
  [ -n "$tables" ] || return 0
  for t in $tables; do
    case "$t" in *[!A-Za-z0-9_]*) die "unexpected table name: $t" ;; esac
    sql="${sql:+$sql UNION ALL }SELECT '$t', COUNT(*) FROM \`$t\`"
  done
  q "$db" -e "$sql"
}
count_tables "$SCRATCH" | sort > "$WORK/restored"
if [ "$LIVE" = 1 ]; then count_tables "$SOURCE" | sort > "$WORK/expected"; else sort "$COUNTS" > "$WORK/expected"; fi

echo
echo "Row counts: restored $SCRATCH against $REF"
printf '  %-8s %-34s %10s %10s\n' STATUS TABLE EXPECTED RESTORED
BAD=0 OK=0
cut -f1 "$WORK/expected" "$WORK/restored" | sort -u > "$WORK/names"
while read -r t; do
  e="$(awk -F'\t' -v t="$t" '$1 == t { print $2 }' "$WORK/expected")"
  r="$(awk -F'\t' -v t="$t" '$1 == t { print $2 }' "$WORK/restored")"
  if [ -z "$e" ]; then st=EXTRA; BAD=$((BAD + 1))
  elif [ -z "$r" ]; then st=MISSING; BAD=$((BAD + 1))
  elif [ "$e" = "$r" ]; then st=MATCH; OK=$((OK + 1))
  else st=DIFF; BAD=$((BAD + 1)); fi
  printf '  %-8s %-34s %10s %10s\n' "$st" "$t" "${e:--}" "${r:--}"
done < "$WORK/names"

if [ -n "$UPLOADS_TAR" ]; then
  echo
  if tar -tzf "$UPLOADS_TAR" > "$WORK/uploads"; then
    echo "Uploads archive $(basename "$UPLOADS_TAR"): lists cleanly, $(grep -vc '/$' "$WORK/uploads" | tr -d ' ') files"
  else
    echo "Uploads archive $(basename "$UPLOADS_TAR"): FAILED to list"; BAD=$((BAD + 1))
  fi
fi

echo
echo "Restore took ${ELAPSED}s. $OK tables match, $BAD differ."
[ "$LIVE" = 1 ] && [ "$BAD" -gt 0 ] && echo "Compared with the live database: rows written since the backup also show as DIFF."
if [ "$DROP" = 1 ]; then drop_scratch || BAD=$((BAD + 1))
else echo "Scratch database $SCRATCH kept for inspection. Drop it with: bash restore-check.sh --config $CONFIG --scratch $SCRATCH --drop-only"; fi
[ "$BAD" -eq 0 ] && echo "Result: PASS" || echo "Result: FAIL"
[ "$BAD" -eq 0 ]
