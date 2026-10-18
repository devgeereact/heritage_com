#!/usr/bin/env bash
# HeritOS staff password reset end-to-end checks (K-04, schema_phase29.sql)
# against LOCAL STAGING only.
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-reset.sh
#
# Uses curl, jq, php and the mariadb client against $STAGING_API (default
# http://127.0.0.1:8088) and refuses any other host. Reads the reset link from
# scripts/staging/.logs/mail.log, where staging writes every email. Creates a
# synthetic @example.test user, and clears this machine's reset throttle rows
# in the local audit_log first so the run can repeat. Exit 0 only when every
# check passes.
set -uo pipefail

API="${STAGING_API:-http://127.0.0.1:8088}"
case "$API" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: STAGING_API must be http://127.0.0.1:<port> or http://localhost:<port>" >&2; exit 2 ;;
esac
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MAIL_LOG="$ROOT/scripts/staging/.logs/mail.log"
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
RUN="$(date +%s)$RANDOM"
PASS=0; FAIL=0

sql() { "${DB[@]}" -e "$1"; }
req() {       # req METHOD PATH [JSON] [TOKEN] -> CODE, BODY
  local auth=() out
  [ -n "${4:-}" ] && auth=(-H "Authorization: Bearer $4")
  if [ "$1" = GET ]; then out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} "$API/$2")"
  else out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -H 'Content-Type: application/json' -X POST "$API/$2" -d "${3:-{\}}")"; fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
j() { echo "$BODY" | jq -r "$1"; }
check() {
  local id="$1" name="$2"; shift 2
  if "$@"; then PASS=$((PASS+1)); echo "PASS  $id  $name"
  else FAIL=$((FAIL+1)); echo "FAIL  $id  $name"; echo "      code=$CODE body=$(echo "$BODY" | head -c 300)"; fi
}
eq() { [ "$1" = "$2" ]; }
last_token() { grep -oE 'token=[a-f0-9]{64}' "$MAIL_LOG" 2>/dev/null | tail -1 | cut -d= -f2; }
count() { sql "$1"; }

# ---- Setup -------------------------------------------------------------------------
[ "$(sql "SHOW TABLES LIKE 'password_resets'")" = password_resets ] || { echo "Import php-api/schema_phase29.sql into heritos_staging first" >&2; exit 2; }
EMAIL="reset-$RUN@example.test"
OLD_PW="old-pass-$RUN"; NEW_PW="new-pass-$RUN"
OLD_HASH="$(php -r 'echo password_hash($argv[1], PASSWORD_BCRYPT);' "$OLD_PW")"
sql "INSERT INTO users (name, email, password_hash, role, status) VALUES ('Reset Tester', '$EMAIL', '$OLD_HASH', 'manager', 'active')"
UID_="$(sql "SELECT id FROM users WHERE email = '$EMAIL'")"
sql "DELETE FROM audit_log WHERE action IN ('reset_req_ip','reset_fail_ip') AND entity IN ('ip:127.0.0.1','ip:::1')"
req POST "auth.php?action=login" "{\"email\":\"$EMAIL\",\"password\":\"$OLD_PW\"}"
SESSION="$(j .token)"
check S1 "test user signs in with the old password" eq "$CODE" 200

# ---- Request ------------------------------------------------------------------------
req POST "auth.php?action=reset_request" "{\"email\":\"nobody-$RUN@example.test\"}"
MSG_UNKNOWN="$(j .message)"
check R1 "unknown address: 200 with the generic answer" eq "$CODE" 200
BEFORE="$(last_token)"
req POST "auth.php?action=reset_request" "{\"email\":\"$EMAIL\"}"
check R2 "known address: same status and wording as an unknown one" bash -c "[ '$CODE' = 200 ] && [ '$(j .message)' = '$MSG_UNKNOWN' ]"
T1="$(last_token)"
check R3 "email written with a fresh 64-hex link" bash -c "[ -n '$T1' ] && [ '$T1' != '$BEFORE' ]"
check R3b "only the SHA-256 hash is stored" eq "$(count "SELECT COUNT(*) FROM password_resets WHERE user_id = $UID_ AND token_hash = SHA2('$T1', 256)")" 1
check R3c "the raw token is not stored" eq "$(count "SELECT COUNT(*) FROM password_resets WHERE token_hash = '$T1'")" 0
MINS="$(count "SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), expires_at) FROM password_resets WHERE token_hash = SHA2('$T1', 256)")"
check R3d "link expires in about 30 minutes ($MINS)" bash -c "[ '$MINS' -ge 28 ] && [ '$MINS' -le 30 ]"

secs() { curl -s -o /dev/null -w '%{time_total}' -H 'Content-Type: application/json' -X POST "$API/auth.php?action=reset_request" -d "{\"email\":\"$1\"}"; }
TU="$(secs "nobody2-$RUN@example.test")"
TK="$(secs "$EMAIL")"
CODE="unknown=${TU}s known=${TK}s"; BODY=""
check R5 "known and unknown address both take the 600 ms floor, within 150 ms of each other ($CODE)" \
  php -r '$u = (float)$argv[1]; $k = (float)$argv[2]; exit($u >= 0.6 && $k >= 0.6 && abs($u - $k) < 0.15 ? 0 : 1);' "$TU" "$TK"
T2="$(last_token)"
check R4 "a second request sends a new link" bash -c "[ -n '$T2' ] && [ '$T2' != '$T1' ]"
req POST "auth.php?action=reset_confirm" "{\"token\":\"$T1\",\"password\":\"$NEW_PW\"}"
check R4b "the earlier link is retired" eq "$CODE" 400

# ---- Confirm ------------------------------------------------------------------------
req POST "auth.php?action=reset_confirm" "{\"token\":\"$T2\",\"password\":\"short\"}"
check C1 "password under 8 characters refused" eq "$CODE" 400
req POST "auth.php?action=reset_confirm" "{\"token\":\"not-a-token\",\"password\":\"$NEW_PW\"}"
check C2 "malformed token refused" eq "$CODE" 400
req POST "auth.php?action=reset_confirm" "{\"token\":\"$T2\",\"password\":\"$NEW_PW\"}"
check C3 "valid link changes the password" eq "$CODE" 200
req GET "auth.php?action=me" '' "$SESSION"
check C4 "existing sessions are signed out" eq "$CODE" 401
req POST "auth.php?action=login" "{\"email\":\"$EMAIL\",\"password\":\"$OLD_PW\"}"
check C5 "old password no longer works" eq "$CODE" 401
req POST "auth.php?action=login" "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PW\"}"
check C6 "new password signs in" eq "$CODE" 200
req POST "auth.php?action=reset_confirm" "{\"token\":\"$T2\",\"password\":\"another-$RUN\"}"
check C7 "a used link cannot be used again" eq "$CODE" 400

EXP="$(php -r 'echo bin2hex(random_bytes(32));')"
sql "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($UID_, SHA2('$EXP', 256), UTC_TIMESTAMP() - INTERVAL 1 MINUTE)"
req POST "auth.php?action=reset_confirm" "{\"token\":\"$EXP\",\"password\":\"another-$RUN\"}"
check C8 "an expired link is refused" eq "$CODE" 400

# ---- Throttle -----------------------------------------------------------------------
req POST "auth.php?action=reset_request" "{\"email\":\"$EMAIL\"}"
check T1 "third request for one address in the window still answers" eq "$CODE" 200
req POST "auth.php?action=reset_request" "{\"email\":\"$EMAIL\"}"
check T2 "fourth request for one address is throttled" eq "$CODE" 429

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
