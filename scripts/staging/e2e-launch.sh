#!/usr/bin/env bash
# HeritOS launch verification matrix checks (qa/LAUNCH-CHECKLIST.md) against
# LOCAL STAGING only.
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-launch.sh
#
# One section per matrix row that can be proved without production: client
# isolation, company isolation, booking integrity, session recovery, payment
# integrity, publication and failure handling. Every fixture is created here,
# with synthetic @example.test data and the run id in names, keys and slugs, so
# the run never depends on rows left by another script. Customer portal
# sessions for the client isolation checks are verified the real way (access
# start and verify, the code read from the staging-only STAGING_ACCESS_CODE_LOG);
# the reset link comes from scripts/staging/.logs/mail.log.
#
# Writes straight to the local heritos_staging database only to mint staff
# tokens and synthetic users, insert expired sessions, expire a hold, insert a
# synthetic retail order, clear this machine's throttle rows and clean up.
# Settings it switches for the run (availability, public booking, company
# portal, portal measurements, portal quote acceptance) are put back on exit.
# KEEP=1 skips the clean-up so the rows can be inspected.
#
# Uses curl, jq, php and the mariadb client against $STAGING_API (default
# http://127.0.0.1:8088) and refuses any other host. Exit 0 only when every
# check passes. A check marked "defect" names a known bug; it stays a FAIL until
# the code is fixed.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="${STAGING_API:-http://127.0.0.1:8088}"
# Exact match: a glob would also accept http://localhost:1@evil.example, which curl
# sends to evil.example (the part before @ is a user name).
[[ "$API" =~ ^http://(127\.0\.0\.1|localhost):[0-9]+$ ]] && API_OK=1 || API_OK=0
case "$API_OK" in
  1) ;;
  *) echo "Refusing: STAGING_API must be http://127.0.0.1:<port> or http://localhost:<port>" >&2; exit 2 ;;
esac
for tool in curl jq php; do command -v "$tool" >/dev/null 2>&1 || { echo "Needs $tool" >&2; exit 2; }; done
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
CODE_LOG="$ROOT/scripts/staging/.logs/access-codes.log"
MAIL_LOG="$ROOT/scripts/staging/.logs/mail.log"
RUN="$(date +%s)$RANDOM"
TAIL7="${RUN: -7}"
TMP="$(mktemp -d)"
PASS=0; FAIL=0
CODE=""; BODY=""

# ---- Helpers -------------------------------------------------------------------------
sql() { "${DB[@]}" -e "$1"; }
key() { echo "e2eL-$RUN-$1"; }
hex64() { php -r 'echo bin2hex(random_bytes(32));'; }
staff_token() {   # staff_token EMAIL [EXPIRY_SQL] -> token (synthetic @example.test users only)
  local tok; tok="$(hex64)"
  sql "INSERT INTO auth_tokens (user_id, token, expires_at)
       SELECT id, SHA2('$tok', 256), ${2:-NOW() + INTERVAL 1 DAY} FROM users WHERE email = '$1' AND email LIKE '%@example.test'" || return 1
  echo "$tok"
}
synthetic_user() { # synthetic_user EMAIL ROLE [PASSWORD] -> id
  local hash='!'
  [ -n "${3:-}" ] && hash="$(php -r 'echo password_hash($argv[1], PASSWORD_BCRYPT);' "$3")"
  sql "INSERT INTO users (name, email, password_hash, role, status) VALUES ('E2E Launch $2 $RUN', '$1', '$hash', '$2', 'active');
       SELECT LAST_INSERT_ID();"
}
# send METHOD PATH [BODY] [TOKEN|-] [CONTENT_TYPE] -> CODE, BODY.  "-" sends no Authorization.
send() {
  local tok="${4:-$ADMIN}" ctype="${5:-application/json}" out auth=()
  [ "$tok" != "-" ] && auth=(-H "Authorization: Bearer $tok")
  if [ "$1" = GET ]; then out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} "$API/$2")"
  else out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -H "Content-Type: $ctype" -X "$1" "$API/$2" --data-binary "${3:-{\}}")"; fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
v() { printf '%s' "$BODY" | jq -r "$1" 2>/dev/null; }
check() {        # check ID NAME CONDITION (evaluated in this shell)
  if eval "$3"; then PASS=$((PASS+1)); echo "PASS  $1  $2"
  else FAIL=$((FAIL+1)); echo "FAIL  $1  $2"; echo "      code=$CODE body=$(printf '%s' "$BODY" | head -c 300)"; fi
}
# free_of TEXT NEEDLE... : true when none of the needles occurs in TEXT
free_of() { local t="$1" n; shift; for n in "$@"; do case "$t" in *"$n"*) return 1 ;; esac; done; return 0; }
# fire TAG TOKEN|- PATH JSON : one POST in the background-friendly form; code and body to $TMP/TAG.*
fire() {
  local auth=()
  [ "$2" != "-" ] && auth=(-H "Authorization: Bearer $2")
  curl -s -o "$TMP/$1.body" -w '%{http_code}' ${auth[@]+"${auth[@]}"} -H 'Content-Type: application/json' -X POST "$API/$3" -d "$4" > "$TMP/$1.code"
}
codes_of() { local t; for t in "$@"; do cat "$TMP/$t.code"; echo; done | sort | tr '\n' ' ' | sed 's/ $//'; }
# hold TABLE ID SECONDS: lock one row (a job, or the single booking_lock row)
# from a separate database session, in the background, so the requests fired
# next all queue on that lock and are released together. That makes each race
# real on every run instead of depending on timing.
hold() {
  sql "START TRANSACTION; SELECT id FROM $1 WHERE id = $2 FOR UPDATE; SELECT SLEEP($3); COMMIT;" >/dev/null &
  sleep 0.5
}
lagos_day() { php -r '$d = new DateTime("+'"$1"' days", new DateTimeZone("Africa/Lagos")); echo $d->format("Y-m-d");'; }
clear_throttles() {
  sql "DELETE FROM audit_log WHERE action IN ('booking_request_ip','booking_slots_ip','access_start_ip','access_verify_fail_ip','reset_req_ip','reset_fail_ip','login_fail_ip')
         AND entity IN ('ip:127.0.0.1','ip:::1')"
}
public_ref() { php -r '$a="23456789ABCDEFGHJKMNPQRSTUVWXYZ"; $s=""; for($i=0;$i<10;$i++) $s.=$a[random_int(0,30)]; echo $s;'; }
# A generic "error" answer: JSON with only error (and errors), no debug detail, no stack or SQL text.
plain_error() {
  [ "$(printf '%s' "$BODY" | jq -r 'type' 2>/dev/null)" = object ] || return 1
  [ "$(printf '%s' "$BODY" | jq -r '.error | type' 2>/dev/null)" = string ] || return 1
  [ -n "$(v .error)" ] || return 1
  [ "$(printf '%s' "$BODY" | jq -r 'keys - ["error","errors","code","reason"] | length')" = 0 ] || return 1
  ! printf '%s' "$BODY" | grep -Eqi 'stack|trace|#[0-9]+ /|\.php|mysqli|SQLSTATE|syntax error|SELECT |INSERT |Uncaught|Fatal|Warning:|Notice:'
}

# ---- Settings snapshot and clean-up -------------------------------------------------------
SWITCHED="availability public_booking_enabled company_portal_enabled portal_show_measurements portal_quote_accept_enabled"
for k in $SWITCHED; do
  if [ "$(sql "SELECT COUNT(*) FROM settings WHERE skey = '$k'")" = 1 ]; then sql "SELECT HEX(svalue) FROM settings WHERE skey = '$k'" > "$TMP/setting.$k"
  else echo "__absent__" > "$TMP/setting.$k"; fi
done
finish() {
  for k in $SWITCHED; do
    local h; h="$(cat "$TMP/setting.$k")"
    if [ "$h" = "__absent__" ]; then sql "DELETE FROM settings WHERE skey = '$k'"
    else sql "UPDATE settings SET svalue = UNHEX('$h') WHERE skey = '$k'"; fi
  done
  if [ "${KEEP:-0}" != 1 ]; then
    sql "UPDATE appointments SET status = 'cancelled', hold_expires_at = NULL
          WHERE status IN ('requested','confirmed') AND (request_key LIKE 'e2eL-$RUN-%' OR contact_name LIKE '%$RUN%')"
    sql "DELETE FROM cms_items WHERE slug LIKE 'e2e-launch-$RUN%' OR JSON_UNQUOTE(JSON_EXTRACT(COALESCE(draft, live), '\$.headline')) LIKE '%$RUN%'"
    sql "UPDATE customer_sessions SET revoked_at = UTC_TIMESTAMP() WHERE revoked_at IS NULL AND customer_id IN (SELECT id FROM customers WHERE name LIKE '%$RUN%')"
    sql "UPDATE tailoring_orders SET deleted_at = NOW() WHERE deleted_at IS NULL AND customer_id IN (SELECT id FROM customers WHERE name LIKE '%$RUN%')"
    sql "UPDATE orders SET deleted_at = NOW() WHERE deleted_at IS NULL AND code LIKE 'L$TAIL7%'"
    sql "UPDATE customers SET deleted_at = NOW() WHERE deleted_at IS NULL AND name LIKE '%$RUN%'"
    sql "UPDATE companies SET deleted_at = NOW() WHERE deleted_at IS NULL AND name LIKE '%$RUN%'"
    sql "DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%-$RUN@example.test')"
    sql "UPDATE users SET status = 'suspended', deleted_at = NOW() WHERE email LIKE '%-$RUN@example.test'"
    [ -n "${ADMIN:-}" ] && sql "DELETE FROM auth_tokens WHERE token = SHA2('$ADMIN', 256)"
    clear_throttles
  fi
  rm -rf "$TMP"
}
trap finish EXIT

# ---- Fixtures: staff, two verified clients, jobs, a retail order -------------------------
ADMIN="$(staff_token staging-admin@example.test)"
send GET "auth.php?action=me"
[ "$CODE" = 200 ] || { echo "Cannot mint a staff token for staging-admin@example.test (run npm run staging:setup)" >&2; exit 2; }
clear_throttles

client() {      # client LABEL PHONE -> CID, JID, REF (job priced 50,000)
  send POST "customers.php?action=create" "{\"name\":\"E2E Launch $1 $RUN\",\"phone\":\"$2\",\"email\":\"launch-$1-$RUN@example.test\",\"confirm_new\":true}"
  CID="$(v .id)"
  send POST "tailoring.php?action=create" "{\"customer_id\":$CID,\"garment_type\":\"agbada\",\"description\":\"LAUNCH-$1-$RUN\",\"price\":\"50000\"}"
  JID="$(v .id)"; REF="$(v .public_ref)"
}
verified_session() { # verified_session REF EMAIL -> prints token (access start, code from the staging log, verify)
  local ch code
  send POST "access.php?action=start" "{\"reference\":\"$1\",\"contact\":\"$2\"}" -
  ch="$(v .challenge)"
  code="$(grep -F "\"challenge\":\"$ch\"" "$CODE_LOG" 2>/dev/null | tail -1 | jq -r .code)"
  send POST "access.php?action=verify" "{\"challenge\":\"$ch\",\"code\":\"$code\"}" -
  v .token
}
client Alpha "0811$TAIL7"; A_CID=$CID; A_JID=$JID; A_REF=$REF
client Bravo "0812$TAIL7"; B_CID=$CID; B_JID=$JID; B_REF=$REF
A_TOK="$(verified_session "$A_REF" "launch-Alpha-$RUN@example.test")"
B_TOK="$(verified_session "$B_REF" "launch-Bravo-$RUN@example.test")"
check X0 "fixtures: two clients with priced jobs and verified portal sessions" \
  '[[ "$A_TOK" =~ ^[0-9a-f]{48}$ ]] && [[ "$B_TOK" =~ ^[0-9a-f]{48}$ ]] && [ "$A_TOK" != "$B_TOK" ] && [ -n "$A_REF" ] && [ "$A_REF" != "$B_REF" ]'

# =========================================================================================
# Payment integrity: retries, concurrency, reversal, overpayment, receipts (on A's job)
# =========================================================================================
money() { send GET "ledger.php?action=list&job_id=$A_JID"; }
PK="$(key pay-same)"
hold tailoring_orders "$A_JID" 2
for n in 1 2 3 4 5; do fire "same$n" "$ADMIN" "ledger.php?action=record" "{\"job_id\":$A_JID,\"amount\":\"10,000\",\"method\":\"cash\",\"request_key\":\"$PK\"}" & done
wait
SAME="$(codes_of same1 same2 same3 same4 same5)"; CODE="$SAME"; BODY="$(cat "$TMP/same1.body")"
check P1 "five simultaneous posts with one request key: one 201, four 200" '[ "$SAME" = "200 200 200 200 201" ]'
check P1b "one ledger row for that key, and every answer names the same entry" \
  '[ "$(sql "SELECT COUNT(*) FROM job_payments WHERE request_key = '"'$PK'"'")" = 1 ] && [ "$(for n in 1 2 3 4 5; do jq -r .entry.id "$TMP/same$n.body"; done | sort -u | wc -l | tr -d " ")" = 1 ]'
hold tailoring_orders "$A_JID" 2
for n in 1 2 3 4 5; do fire "diff$n" "$ADMIN" "ledger.php?action=record" "{\"job_id\":$A_JID,\"amount\":\"7000\",\"method\":\"cash\",\"request_key\":\"$(key pay-diff-$n)\"}" & done
wait
DIFF="$(codes_of diff1 diff2 diff3 diff4 diff5)"; CODE="$DIFF"; BODY=""
check P2 "five simultaneous posts with different keys: all five recorded" \
  '[ "$DIFF" = "201 201 201 201 201" ] && [ "$(sql "SELECT COUNT(*) FROM job_payments WHERE request_key LIKE '"'$(key pay-diff-)%'"'")" = 5 ]'
money
check P2b "totals after the burst: paid 45,000, balance 5,000, part paid" \
  '[ "$(v .money.paid_verified)/$(v .money.balance)/$(v .money.credit)/$(v .money.payment_state)" = "45000.00/5000.00/0.00/part_paid" ]'
check P2c "cached paid_total equals the ledger sum (no lost update)" \
  '[ "$(sql "SELECT paid_total FROM tailoring_orders WHERE id = $A_JID")" = "$(sql "SELECT SUM(amount) FROM job_payments WHERE job_id = $A_JID")" ]'
REV="$(jq -r .entry.id "$TMP/diff1.body")"
hold tailoring_orders "$A_JID" 2
fire rev1 "$ADMIN" "ledger.php?action=reverse&id=$REV" "{\"reason\":\"E2E keyed twice\",\"request_key\":\"$(key rev-1)\"}" &
fire rev2 "$ADMIN" "ledger.php?action=reverse&id=$REV" "{\"reason\":\"E2E keyed twice\",\"request_key\":\"$(key rev-2)\"}" &
wait
REVC="$(codes_of rev1 rev2)"; CODE="$REVC"; BODY="$(cat "$TMP/rev2.body")"
check P3 "two simultaneous reversals of one entry: one 201, one plain 409 (defect: php-api/ledger.php:139 reads the entry before job_lock(), so the loser can get a 500)" '[ "$REVC" = "201 409" ]'
check P3b "exactly one reversal row; paid falls to 38,000" \
  '[ "$(sql "SELECT COUNT(*) FROM job_payments WHERE reverses_id = $REV")" = 1 ] && money && [ "$(v .money.paid_verified)" = 38000.00 ]'
send POST "ledger.php?action=record" "{\"job_id\":$A_JID,\"amount\":\"20000\",\"method\":\"cash\",\"request_key\":\"$(key pay-over)\"}"
check P4 "overpayment becomes credit: paid 58,000, balance 0, credit 8,000" \
  '[ "$CODE" = 201 ] && [ "$(v .money.paid_verified)/$(v .money.balance)/$(v .money.credit)/$(v .money.payment_state)" = "58000.00/0.00/8000.00/credit" ]'
send GET "ledger.php?action=credits"
check P4b "the job is listed under credits with 8,000" '[ "$(v "[.items[] | select(.id == $A_JID) | .credit] | first")" = 8000.00 ]'
send POST "ledger.php?action=refund" "{\"job_id\":$A_JID,\"amount\":\"9000\",\"method\":\"cash\",\"request_key\":\"$(key refund-big)\"}"
check P5 "refund above the credit refused without force (409), nothing written" \
  '[ "$CODE" = 409 ] && [ "$(sql "SELECT COUNT(*) FROM job_payments WHERE request_key = '"'$(key refund-big)'"'")" = 0 ]'
send POST "ledger.php?action=refund" "{\"job_id\":$A_JID,\"amount\":\"8000\",\"method\":\"cash\",\"request_key\":\"$(key refund-ok)\"}"
check P5b "refunding the credit settles the job: paid 50,000, credit 0, paid state" \
  '[ "$CODE" = 201 ] && [ "$(v .money.paid_verified)/$(v .money.credit)/$(v .money.payment_state)" = "50000.00/0.00/paid" ]'
send GET "tailoring.php?action=document&id=$A_JID&doc=receipt&ref=$REV"
check P6 "receipt for the reversed entry says reversed" '[ "$CODE" = 200 ] && [ "$(v .number)" = "RCT-$REV" ] && [ "$(v .entry.reversed)" = true ]'
SAME_ID="$(jq -r .entry.id "$TMP/same1.body")"
send GET "tailoring.php?action=document&id=$A_JID&doc=receipt&ref=$SAME_ID"
check P6b "receipt for the retried payment shows 10,000 once and the job totals" \
  '[ "$(v .entry.amount)" = 10000.00 ] && [ "$(v .totals.paid_verified)" = 50000.00 ]'
send GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
check P7 "client view agrees with the ledger: paid 50,000, balance 0, credit 0" \
  '[ "$(v .payment.paid_verified)/$(v .payment.balance)/$(v .payment.credit)" = "50000.00/0.00/0.00" ]'
check P7b "client receipts: payments minus refunds equal paid; the reversed one is left out" \
  '[ "$(v "[.payment.receipts[] | (if .kind == \"refund\" then -1 else 1 end) * (.amount|tonumber)] | add")" = 50000 ] && [ "$(v "[.payment.receipts[] | select(.receipt_no == \"RCT-$REV\")] | length")" = 0 ] && [ "$(v ".payment.receipts | length")" = 7 ]'

# =========================================================================================
# Client isolation: B swaps in every reference of A
# =========================================================================================
send POST "portal.php?action=message" "{\"ref\":\"$A_REF\",\"body\":\"A-SECRET-$RUN\",\"request_key\":\"$(key a-msg)\"}" "$A_TOK"
send POST "portal.php?action=change_request" "{\"ref\":\"$A_REF\",\"kind\":\"other\",\"details\":\"A-CHANGE-$RUN\",\"request_key\":\"$(key a-cr)\"}" "$A_TOK"
send POST "measurements.php?action=create" "{\"customer_id\":$A_CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"39.7\",\"chest\":\"101.3\"},\"request_key\":\"$(key a-set)\"}"
A_SET="$(v .set.id)"
send POST "quotes.php?action=create" "{\"job_id\":$A_JID,\"items\":[{\"description\":\"A-QUOTE-$RUN\",\"qty\":1,\"unit_price\":\"50000\"}],\"request_key\":\"$(key a-quote)\"}"
A_QUOTE="$(v .id)"
send POST "quotes.php?action=send&id=$A_QUOTE" '{"channel":"whatsapp"}'
ADAY="$(lagos_day 13)"
send POST "appointments.php?action=availability_save" '{"availability":{"weekly":{"mon":[["09:00","13:00"],["14:00","18:00"]],"tue":[["09:00","13:00"],["14:00","18:00"]],"wed":[["09:00","13:00"],["14:00","18:00"]],"thu":[["09:00","13:00"],["14:00","18:00"]],"fri":[["09:00","13:00"],["14:00","18:00"]],"sat":[["09:00","13:00"],["14:00","18:00"]],"sun":[["09:00","13:00"],["14:00","18:00"]]},"buffer_min":15,"min_notice_hours":2,"horizon_days":30,"step_min":15,"durations":{"consultation":45,"fitting":30,"collection":30},"request_hold_hours":48},"public_booking_enabled":true}'
sql "UPDATE appointments SET status = 'cancelled' WHERE all_day = 0 AND status IN ('requested','confirmed')
       AND starts_at >= '$ADAY 00:00:00' - INTERVAL 1 HOUR AND starts_at < '$ADAY 00:00:00' + INTERVAL 23 HOUR"
send POST "portal.php?action=appointment_request" "{\"ref\":\"$A_REF\",\"type\":\"fitting\",\"start\":\"${ADAY}T10:00\",\"request_key\":\"$(key a-appt)\"}" "$A_TOK"
A_APPT="$(v .id)"
A_ORDER="L${TAIL7}A"; A_OREF="$(public_ref)"
sql "INSERT INTO orders (code, public_ref, customer_id, customer_name, customer_phone, status, total, paid, payment_method)
     VALUES ('$A_ORDER', '$A_OREF', $A_CID, 'E2E Launch Alpha $RUN', '0811$TAIL7', 'paid', 15000, 15000, 'transfer');
     INSERT INTO order_items (order_id, label, sku, qty, unit_price) VALUES (LAST_INSERT_ID(), 'A-ITEM-$RUN', 'e2e-launch-m', 1, 15000)"
check I0 "A's own records are all readable by A (positive control)" \
  '[ -n "$A_SET" ] && [ -n "$A_QUOTE" ] && [ -n "$A_APPT" ] && [ "$A_APPT" != null ] && send GET "portal.php?action=messages&ref=$A_REF" "" "$A_TOK" && [ "$CODE" = 200 ] && ! free_of "$BODY" "A-SECRET-$RUN"'
send GET "account.php?action=order&code=$A_ORDER" "" "$A_TOK"
check I0b "A reads A's retail order (positive control)" '[ "$CODE" = 200 ] && [ "$(v .public_ref)" = "$A_OREF" ]'
send GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
A_VIEW="$BODY"
A_MARKS=("E2E Launch Alpha $RUN" "LAUNCH-Alpha-$RUN" "A-SECRET-$RUN" "A-CHANGE-$RUN" "A-QUOTE-$RUN" "A-ITEM-$RUN" "39.7" "101.3" "$A_OREF" "RCT-$SAME_ID")
NOTFOUND='404 {"error":"Not found"}'
swap() {         # swap ID NAME METHOD PATH [BODY]: B with A's reference gets exactly the missing-job answer and no A data
  send "$3" "$4" "${5:-}" "$B_TOK"
  check "$1" "$2" '[ "$CODE $BODY" = "$NOTFOUND" ] && free_of "$BODY" "${A_MARKS[@]}" "$A_REF"'
}
swap I1 "B reads A's job by reference" GET "portal.php?action=job&ref=$A_REF"
swap I1b "B reads A's job by reference in lower case with spaces" GET "portal.php?action=job&ref=%20$(echo "$A_REF" | tr 'A-Z' 'a-z')%20"
swap I2 "B reads A's thread" GET "portal.php?action=messages&ref=$A_REF"
swap I3 "B posts into A's thread" POST "portal.php?action=message" "{\"ref\":\"$A_REF\",\"body\":\"from B\",\"request_key\":\"$(key b-into-a)\"}"
swap I4 "B lists A's change requests" GET "portal.php?action=change_requests&ref=$A_REF"
swap I5 "B files a change request on A's job" POST "portal.php?action=change_request" "{\"ref\":\"$A_REF\",\"kind\":\"other\",\"details\":\"x\",\"request_key\":\"$(key b-cr-a)\"}"
swap I6 "B books a fitting on A's job" POST "portal.php?action=appointment_request" "{\"ref\":\"$A_REF\",\"type\":\"fitting\",\"start\":\"${ADAY}T15:00\",\"request_key\":\"$(key b-appt-a)\"}"
swap I7 "B moves A's appointment through A's job" POST "portal.php?action=appointment_reschedule_request" "{\"ref\":\"$A_REF\",\"appointment_id\":$A_APPT,\"start\":\"${ADAY}T16:00\",\"request_key\":\"$(key b-rs-a)\"}"
swap I8 "B moves A's appointment through B's own job" POST "portal.php?action=appointment_reschedule_request" "{\"ref\":\"$B_REF\",\"appointment_id\":$A_APPT,\"start\":\"${ADAY}T16:00\",\"request_key\":\"$(key b-rs-b)\"}"
swap I9 "B proposes measurements against A's job" POST "portal.php?action=propose_measurements" "{\"ref\":\"$A_REF\",\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"40\"},\"request_key\":\"$(key b-ms-a)\"}"
swap I10 "B gives feedback on A's job" POST "portal.php?action=feedback" "{\"ref\":\"$A_REF\",\"rating\":5,\"request_key\":\"$(key b-fb-a)\"}"
swap I11 "B decides a sample on A's job" POST "portal.php?action=sample_decide" "{\"ref\":\"$A_REF\",\"sample_id\":1,\"decision\":\"approve\",\"request_key\":\"$(key b-sd-a)\"}"
sql "INSERT INTO settings (skey, svalue) VALUES ('portal_quote_accept_enabled', '1') ON DUPLICATE KEY UPDATE svalue = '1'"
swap I12 "B accepts A's quote on A's job (acceptance switched on)" POST "portal.php?action=quote_accept" "{\"ref\":\"$A_REF\",\"quote_id\":$A_QUOTE,\"content_hash\":\"x\",\"confirm\":true}"
swap I12b "B accepts A's quote through B's own job" POST "portal.php?action=quote_accept" "{\"ref\":\"$B_REF\",\"quote_id\":$A_QUOTE,\"content_hash\":\"x\",\"confirm\":true}"
check I12c "A's quote is still only sent" '[ "$(sql "SELECT status FROM quotes WHERE id = $A_QUOTE")" = sent ]'
sql "UPDATE settings SET svalue = '0' WHERE skey = 'portal_quote_accept_enabled'"
check I13 "nothing was written for B's refused attempts" \
  '[ "$(sql "SELECT (SELECT COUNT(*) FROM job_messages WHERE request_key LIKE '"'$(key b-)%'"') + (SELECT COUNT(*) FROM job_change_requests WHERE request_key LIKE '"'$(key b-)%'"') + (SELECT COUNT(*) FROM appointments WHERE request_key LIKE '"'$(key b-)%'"') + (SELECT COUNT(*) FROM measurement_sets WHERE request_key LIKE '"'$(key b-)%'"') + (SELECT COUNT(*) FROM job_feedback WHERE request_key LIKE '"'$(key b-)%'"')")" = 0 ] && [ "$(sql "SELECT COUNT(*) FROM job_messages WHERE job_id = $A_JID AND customer_id = $B_CID")" = 0 ]'
send POST "portal.php?action=message" "{\"ref\":\"$B_REF\",\"body\":\"B reusing a key\",\"request_key\":\"$(key a-msg)\"}" "$B_TOK"
check I14 "B replaying A's message request key on B's own job: refused, A's message not returned" \
  '[ "$CODE" = 400 ] && [ "$(v .error)" = "Invalid request key" ] && free_of "$BODY" "${A_MARKS[@]}"'
send POST "portal.php?action=propose_measurements" "{\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"44\"},\"request_key\":\"$(key a-set)\"}" "$B_TOK"
check I15 "B replaying A's measurement-set request key: refused, A's set unchanged" \
  '[ "$CODE" = 400 ] && free_of "$BODY" "${A_MARKS[@]}" && [ "$(sql "SELECT CONCAT(customer_id, \":\", status) FROM measurement_sets WHERE id = $A_SET")" = "$A_CID:approved" ]'
sql "INSERT INTO settings (skey, svalue) VALUES ('portal_show_measurements', '1') ON DUPLICATE KEY UPDATE svalue = '1'"
send GET "portal.php?action=measurements" "" "$A_TOK"
check I16 "A sees A's measurement values (positive control)" '[ "$CODE" = 200 ] && ! free_of "$BODY" "39.7"'
send GET "portal.php?action=measurements" "" "$B_TOK"
check I16b "B's measurements carry none of A's values" '[ "$CODE" = 200 ] && free_of "$BODY" "${A_MARKS[@]}"'
sql "UPDATE settings SET svalue = '0' WHERE skey = 'portal_show_measurements'"
send GET "portal.php?action=jobs" "" "$B_TOK"
check I17 "B's lists hold only B's job and no order of A's" \
  '[ "$(v "[.jobs[].ref] | join(\",\")")" = "$B_REF" ] && free_of "$BODY" "${A_MARKS[@]}" "$A_REF"'
send GET "portal.php?action=job&ref=$B_REF" "" "$B_TOK"
check I18 "B's own job view has no receipt, message, quote or appointment of A's" \
  '[ "$CODE" = 200 ] && free_of "$BODY" "${A_MARKS[@]}" "RCT-$REV" && [ "$(v ".payment.receipts | length")" = 0 ]'
send GET "account.php?action=order&code=$A_ORDER" "" "$B_TOK"
check I19 "B reads A's retail order by code: 404, no A data" '[ "$CODE" = 404 ] && free_of "$BODY" "${A_MARKS[@]}"'
send POST "account.php?action=reorder&code=$A_ORDER" "{}" "$B_TOK"
check I19b "B re-orders A's retail order: 404" '[ "$CODE" = 404 ] && free_of "$BODY" "${A_MARKS[@]}"'
send POST "account.php?action=return" "{\"order_code\":\"$A_ORDER\",\"reason\":\"x\"}" "$B_TOK"
check I19c "B requests a return on A's order: 404 and nothing changes" \
  '[ "$CODE" = 404 ] && [ "$(sql "SELECT return_status FROM orders WHERE code = '"'$A_ORDER'"'")" = none ]'
send POST "store.php?action=track" "{\"code\":\"$A_OREF\",\"phone\":\"0812$TAIL7\"}" -
OTHER="$CODE $BODY"
send POST "store.php?action=track" "{\"code\":\"$(public_ref)\",\"phone\":\"0812$TAIL7\"}" -
check I20 "tracking A's order with B's phone answers exactly like an unknown reference" \
  '[ "$OTHER" = "$CODE $BODY" ] && [ "$CODE" = 404 ] && free_of "$OTHER" "${A_MARKS[@]}"'
send GET "tailoring.php?action=document&id=$A_JID&doc=receipt&ref=$SAME_ID" "" "$B_TOK"
check I21 "a customer session cannot open A's receipt through the staff document endpoint (401)" '[ "$CODE" = 401 ] && free_of "$BODY" "${A_MARKS[@]}"'
send GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
check I22 "A's job is unchanged by B's attempts (same view as before)" \
  '[ "$(printf "%s" "$BODY" | jq -S "del(.messages, .change_requests)")" = "$(printf "%s" "$A_VIEW" | jq -S "del(.messages, .change_requests)")" ]'

# =========================================================================================
# Company isolation
# =========================================================================================
sql "INSERT INTO settings (skey, svalue) VALUES ('company_portal_enabled', '1'), ('portal_show_measurements', '1') ON DUPLICATE KEY UPDATE svalue = '1'"
csession() {    # csession CUSTOMER_ID -> token (hash stored, as _portal.php does)
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(24));')"
  sql "INSERT INTO customer_sessions (token_hash, customer_id, created_via, expires_at) VALUES (SHA2('$tok', 256), $1, 'invite', UTC_TIMESTAMP() + INTERVAL 1 DAY)"
  echo "$tok"
}
company() {     # company LABEL PHONE_PREFIX -> CO, KID (contact id), KCID (contact customer id)
  send POST "companies.php?action=save" "{\"name\":\"E2E Launch Co $1 $RUN\",\"invoice_name\":\"E2E $1 Ltd\",\"confirm_new\":true}"
  CO="$(v .company.id)"
  send POST "companies.php?action=contact_save" "{\"company_id\":$CO,\"person\":{\"name\":\"E2E Launch Organiser $1 $RUN\",\"phone\":\"$2$TAIL7\",\"confirm_new\":true},\"can_approve_samples\":1,\"is_invoice_recipient\":1}"
  KID="$(v .contact.id)"; KCID="$(v .contact.customer_id)"
}
wearer() {      # wearer LABEL PHONE NECK -> WID, WSET (approved set)
  send POST "customers.php?action=create" "{\"name\":\"E2E Launch Wearer $1 $RUN\",\"phone\":\"$2\",\"confirm_new\":true}"
  WID="$(v .id)"
  send POST "measurements.php?action=create" "{\"customer_id\":$WID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"$3\",\"chest\":\"99.1\"},\"request_key\":\"$(key wset-$1)\"}"
  WSET="$(v .set.id)"
}
company X "0813"; X_CO=$CO; X_KID=$KID; X_ORG=$KCID
company Y "0814"; Y_CO=$CO; Y_KID=$KID; Y_ORG=$KCID
wearer X1 "0815$TAIL7" "61.3"; W1=$WID; W1_SET=$WSET
wearer X2 "0816$TAIL7" "58.9"; W2=$WID; W2_SET=$WSET
wearer Y1 "0817$TAIL7" "47.9"; W3=$WID
send POST "company_jobs.php?action=create" "{\"company_id\":$X_CO,\"contact_id\":$X_KID,\"po_number\":\"PO-X-$RUN\",\"measurement_method\":\"individual\",\"items\":[{\"description\":\"Kaftan, white\",\"qty\":1,\"wearer_customer_id\":$W1,\"wearer_label\":\"WLABEL-X1-$RUN\"},{\"description\":\"Kaftan, white\",\"qty\":1,\"wearer_customer_id\":$W2,\"wearer_label\":\"WLABEL-X2-$RUN\"}],\"request_key\":\"$(key cjx)\"}"
X_JOB="$(v .job.id)"; X_REF="$(v .job.ref)"; X_IT1="$(v '.items[0].id')"; X_IT2="$(v '.items[1].id')"
send POST "company_jobs.php?action=create" "{\"company_id\":$Y_CO,\"contact_id\":$Y_KID,\"po_number\":\"PO-Y-$RUN\",\"measurement_method\":\"individual\",\"items\":[{\"description\":\"Y-GARMENT-$RUN\",\"qty\":1,\"wearer_customer_id\":$W3}],\"request_key\":\"$(key cjy)\"}"
Y_REF="$(v .job.ref)"
send POST "company_jobs.php?action=item_attach_measurement&job_id=$X_JOB" "{\"item_id\":$X_IT1,\"measurement_set_id\":$W1_SET}"
send POST "company_jobs.php?action=item_attach_measurement&job_id=$X_JOB" "{\"item_id\":$X_IT2,\"measurement_set_id\":$W2_SET}"
check K0 "fixtures: two companies, a two-wearer job with measurements attached, another company's job" \
  '[ -n "$X_REF" ] && [ "$X_REF" != null ] && [ -n "$Y_REF" ] && [ "$Y_REF" != null ] && [ "$(sql "SELECT COUNT(*) FROM job_items WHERE job_id = $X_JOB AND measurement_set_id IS NOT NULL")" = 2 ]'
send POST "company_jobs.php?action=item_attach_measurement&job_id=$X_JOB" "{\"item_id\":$X_IT1,\"measurement_set_id\":$W2_SET}"
check K0b "staff cannot attach one wearer's set to another wearer's item (409)" '[ "$CODE" = 409 ] && [ "$(sql "SELECT measurement_set_id FROM job_items WHERE id = $X_IT1")" = "$W1_SET" ]'
ORG="$(csession "$X_ORG")"; ORG_Y="$(csession "$Y_ORG")"; W1_TOK="$(csession "$W1")"
WMARKS=("61.3" "58.9" "99.1" "E2E Launch Wearer" "WLABEL-X" "measurement_set" "wearer_customer_id")
send GET "portal.php?action=job&ref=$X_REF" "" "$ORG"
check K1 "organiser reads the company job: lines and totals, no wearer or measurement" \
  '[ "$CODE" = 200 ] && [ "$(v .kind)" = company ] && [ "$(v .quantity)" = 2 ] && free_of "$BODY" "${WMARKS[@]}" "Y-GARMENT-$RUN" "PO-Y-$RUN"'
send GET "portal.php?action=measurements" "" "$ORG"
check K2 "organiser's measurements (shown to clients) list no wearer's values" '[ "$CODE" = 200 ] && [ "$(v ".sets | length")" = 0 ] && free_of "$BODY" "${WMARKS[@]}"'
send GET "portal.php?action=measurements" "" "$W1_TOK"
check K2b "the wearer sees their own values (positive control), not the other wearer's" '[ "$CODE" = 200 ] && ! free_of "$BODY" "61.3" && free_of "$BODY" "58.9"'
send GET "portal.php?action=jobs" "" "$ORG"
check K3 "organiser's list has the company job only, no wearing entries, no other company" \
  '[ "$(v "[.company_jobs[].ref] | join(\",\")")" = "$X_REF" ] && [ "$(v ".wearing | length")" = 0 ] && free_of "$BODY" "$Y_REF" "${WMARKS[@]}"'
send POST "portal.php?action=propose_measurements" "{\"ref\":\"$X_REF\",\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"40\"},\"request_key\":\"$(key org-ms)\"}" "$ORG"
check K4 "organiser cannot act on measurements through the company job (404)" '[ "$CODE $BODY" = "$NOTFOUND" ] && [ "$(sql "SELECT COUNT(*) FROM measurement_sets WHERE request_key = '"'$(key org-ms)'"'")" = 0 ]'
send GET "portal.php?action=change_requests&ref=$X_REF" "" "$ORG"
check K4b "organiser gets the job-owner-only actions as 404" '[ "$CODE $BODY" = "$NOTFOUND" ]'
other_co() {    # other_co ID NAME METHOD PATH [BODY]: X's organiser on Y's job answers like a missing job
  send "$3" "$4" "${5:-}" "$ORG"
  check "$1" "$2" '[ "$CODE $BODY" = "$NOTFOUND" ] && free_of "$BODY" "Y-GARMENT-$RUN" "PO-Y-$RUN" "E2E Launch Co Y"'
}
other_co K5 "X's organiser reads Y's job" GET "portal.php?action=job&ref=$Y_REF"
other_co K5b "X's organiser reads Y's thread" GET "portal.php?action=messages&ref=$Y_REF"
other_co K5c "X's organiser posts into Y's thread" POST "portal.php?action=message" "{\"ref\":\"$Y_REF\",\"body\":\"x\",\"request_key\":\"$(key org-y-msg)\"}"
other_co K5d "X's organiser decides a sample on Y's job" POST "portal.php?action=sample_decide" "{\"ref\":\"$Y_REF\",\"sample_id\":1,\"decision\":\"approve\",\"request_key\":\"$(key org-y-sd)\"}"
send GET "portal.php?action=job&ref=$X_REF" "" "$ORG_Y"
check K6 "Y's organiser on X's job: missing-job answer, no X data" '[ "$CODE $BODY" = "$NOTFOUND" ] && free_of "$BODY" "PO-X-$RUN" "${WMARKS[@]}"'
send GET "portal.php?action=job&ref=$X_REF" "" "$W1_TOK"
check K7 "a wearer sees only their own garment: no other wearer, no measurement, no PO" \
  '[ "$CODE" = 200 ] && [ "$(v .kind)" = wearer ] && [ "$(v .item_id)" = "$X_IT1" ] && free_of "$BODY" "${WMARKS[@]}" "PO-X-$RUN"'
sql "UPDATE settings SET svalue = '0' WHERE skey = 'company_portal_enabled'"
send GET "portal.php?action=job&ref=$X_REF" "" "$ORG"
check K8 "switch off: the organiser gets the missing-job answer" '[ "$CODE $BODY" = "$NOTFOUND" ]'
sql "UPDATE settings SET svalue = '0' WHERE skey = 'portal_show_measurements'"

# =========================================================================================
# Booking integrity
# =========================================================================================
DAY="$(lagos_day 12)"
sql "UPDATE appointments SET status = 'cancelled' WHERE all_day = 0 AND status IN ('requested','confirmed')
       AND starts_at >= '$DAY 00:00:00' - INTERVAL 1 HOUR AND starts_at < '$DAY 00:00:00' + INTERVAL 23 HOUR"
has_slot() { send GET "appointments.php?action=slots&type=$1&from=$DAY&days=1"; printf '%s' "$BODY" | jq -e --arg s "${DAY}T$2:00+01:00" '[.slots[].start] | index($s) != null' >/dev/null; }
clear_throttles
hold booking_lock 1 2
for n in 1 2 3 4; do fire "pub$n" - "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T09:00\",\"name\":\"E2E Launch Visitor $n $RUN\",\"email\":\"visitor$n-$RUN@example.test\",\"request_key\":\"$(key pub-$n)\"}" & done
wait
PUB="$(codes_of pub1 pub2 pub3 pub4)"; CODE="$PUB"; BODY="$(cat "$TMP/pub4.body")"
check B1 "four simultaneous public requests for 09:00: one 201, three 409" '[ "$PUB" = "201 409 409 409" ]'
check B1b "exactly one active appointment at 09:00" \
  '[ "$(sql "SELECT COUNT(*) FROM appointments WHERE request_key LIKE '"'$(key pub-)%'"' AND status = '"'requested'"'")" = 1 ]'
check B1c "09:00 is no longer offered" '! has_slot consultation 09:00'
WIN="$(sql "SELECT id FROM appointments WHERE request_key LIKE '$(key pub-)%' AND status = 'requested'")"
hold booking_lock 1 2
fire por1 "$A_TOK" "portal.php?action=appointment_request" "{\"ref\":\"$A_REF\",\"type\":\"fitting\",\"start\":\"${DAY}T11:00\",\"request_key\":\"$(key por-a)\"}" &
fire por2 "$B_TOK" "portal.php?action=appointment_request" "{\"ref\":\"$B_REF\",\"type\":\"fitting\",\"start\":\"${DAY}T11:00\",\"request_key\":\"$(key por-b)\"}" &
wait
POR="$(codes_of por1 por2)"; CODE="$POR"; BODY=""
check B2 "two clients request 11:00 at the same moment in the portal: one 201, one 409" '[ "$POR" = "201 409" ]'
HOLD="$(sql "SELECT id FROM appointments WHERE request_key IN ('$(key por-a)','$(key por-b)') AND status = 'requested'")"
send POST "appointments.php?action=create" "{\"type\":\"consultation\",\"start\":\"${DAY}T14:00\",\"contact_name\":\"E2E Launch Owner One $RUN\",\"request_key\":\"$(key own-1)\"}"; O1="$(v .id)"
send POST "appointments.php?action=create" "{\"type\":\"consultation\",\"start\":\"${DAY}T15:00\",\"contact_name\":\"E2E Launch Owner Two $RUN\",\"request_key\":\"$(key own-2)\"}"; O2="$(v .id)"
hold booking_lock 1 2
fire mv1 "$ADMIN" "appointments.php?action=reschedule&id=$O1" "{\"start\":\"${DAY}T16:30\",\"reason\":\"E2E race\"}" &
fire mv2 "$ADMIN" "appointments.php?action=reschedule&id=$O2" "{\"start\":\"${DAY}T16:30\",\"reason\":\"E2E race\"}" &
wait
MV="$(codes_of mv1 mv2)"; CODE="$MV"; BODY=""
check B3 "two simultaneous reschedules into 16:30: one 200, one 409, one appointment there" \
  '[ "$MV" = "200 409" ] && [ "$(sql "SELECT COUNT(*) FROM appointments WHERE id IN ($O1, $O2) AND starts_at = '"'$DAY 15:30:00'"'")" = 1 ]'
check B3b "the loser keeps its old time" \
  '[ "$(sql "SELECT COUNT(*) FROM appointments WHERE id IN ($O1, $O2) AND starts_at IN ('"'$DAY 13:00:00'"', '"'$DAY 14:00:00'"')")" = 1 ]'
send POST "appointments.php?action=decline&id=$WIN" '{"reason":"E2E cancel"}'
check B4 "cancel: the 09:00 request is cancelled and 09:00 is offered again" '[ "$CODE" = 200 ] && [ "$(v .status)" = cancelled ] && has_slot consultation 09:00'
send POST "appointments.php?action=reschedule&id=$WIN" "{\"start\":\"${DAY}T10:00\",\"reason\":\"E2E\"}"
check B4b "a cancelled appointment cannot be rescheduled (409)" '[ "$CODE" = 409 ] && [ "$(sql "SELECT status FROM appointments WHERE id = $WIN")" = cancelled ]'
send POST "appointments.php?action=reschedule&id=$O1" "{\"start\":\"${DAY}T09:00\",\"reason\":\"E2E into the freed slot\"}"
check B4c "another appointment can be rescheduled into the freed 09:00" '[ "$CODE" = 200 ] && [ "$(v .starts_at_local)" = "${DAY}T09:00:00+01:00" ]'
check B4d "reschedule history records both times" \
  '[ "$(sql "SELECT COUNT(*) FROM appointment_events WHERE appointment_id = $O1 AND from_starts_at IS NOT NULL AND to_starts_at IS NOT NULL")" -ge 1 ]'
check B5 "11:00 is held while the request is unexpired" '! has_slot fitting 11:00'
sql "UPDATE appointments SET hold_expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = $HOLD"
check B5b "an expired hold frees 11:00" 'has_slot fitting 11:00'
send POST "appointments.php?action=confirm&id=$HOLD" '{}'
check B5c "confirming the expired request is refused (409), never confirmed" '[ "$CODE" = 409 ] && [ "$(sql "SELECT status FROM appointments WHERE id = $HOLD")" != confirmed ]'
send POST "portal.php?action=appointment_request" "{\"ref\":\"$B_REF\",\"type\":\"fitting\",\"start\":\"${DAY}T11:00\",\"request_key\":\"$(key por-b2)\"}" "$B_TOK"
check B5d "the freed 11:00 can be requested again" '[ "$CODE" = 201 ]'
check B5e "the old request is now marked expired, with history" \
  '[ "$(sql "SELECT status FROM appointments WHERE id = $HOLD")" = expired ] && [ "$(sql "SELECT COUNT(*) FROM appointment_events WHERE appointment_id = $HOLD AND to_status = '"'expired'"'")" = 1 ]'

# =========================================================================================
# Session recovery
# =========================================================================================
clear_throttles
STAFF_EMAIL="staff-$RUN@example.test"
synthetic_user "$STAFF_EMAIL" manager >/dev/null
OLD_TOK="$(staff_token "$STAFF_EMAIL" "NOW() - INTERVAL 1 MINUTE")"
send GET "auth.php?action=me" "" "$OLD_TOK"
check S1 "staff token past its expiry: 401" '[ "$CODE" = 401 ] && plain_error'
S_ONE="$(staff_token "$STAFF_EMAIL")"; S_TWO="$(staff_token "$STAFF_EMAIL")"
send POST "auth.php?action=logout" "{}" "$S_ONE"
send GET "today.php" "" "$S_ONE"
check S2 "after logout that token is refused: 401" '[ "$CODE" = 401 ]'
send GET "auth.php?action=me" "" "$S_TWO"
check S2b "logout ends only that session; the other device stays signed in" '[ "$CODE" = 200 ]'
send GET "auth.php?action=sessions" "" "$S_TWO"
S_TWO_ID="$(v '[.[] | select(.current)][0].id')"
S_THREE="$(staff_token "$STAFF_EMAIL")"
send POST "auth.php?action=revoke" "{\"id\":$S_TWO_ID}" "$S_THREE"
send GET "auth.php?action=me" "" "$S_TWO"
check S3 "a session revoked from another device: 401" '[ "$CODE" = 401 ]'
ADMIN_SESSION_ID="$(sql "SELECT id FROM auth_tokens WHERE token = SHA2('$ADMIN', 256)")"
send POST "auth.php?action=revoke" "{\"id\":$ADMIN_SESSION_ID}" "$S_THREE"
send GET "auth.php?action=me" "" "$ADMIN"
check S3b "one user cannot revoke another user's session" '[ "$CODE" = 200 ]'
SUS_EMAIL="suspended-$RUN@example.test"; SUS_PW="sus-pass-$RUN"
synthetic_user "$SUS_EMAIL" manager "$SUS_PW" >/dev/null
SUS_TOK="$(staff_token "$SUS_EMAIL")"
send GET "ledger.php?action=due" "" "$SUS_TOK"
SUS_BEFORE="$CODE"
sql "UPDATE users SET status = 'suspended' WHERE email = '$SUS_EMAIL'"
send GET "ledger.php?action=due" "" "$SUS_TOK"
check S4 "suspending a user ends their live session at once (200 before, 401 after)" '[ "$SUS_BEFORE" = 200 ] && [ "$CODE" = 401 ]'
send POST "auth.php?action=login" "{\"email\":\"$SUS_EMAIL\",\"password\":\"$SUS_PW\"}" -
check S4b "a suspended user cannot sign in with the right password" '[ "$CODE" = 401 ] && [ "$(v ".token // empty")" = "" ]'
MAIL_BEFORE="$(wc -l < "$MAIL_LOG" 2>/dev/null || echo 0)"
send POST "auth.php?action=reset_request" "{\"email\":\"$SUS_EMAIL\"}" -
check S4c "a suspended user gets the generic reset answer and no link" \
  '[ "$CODE" = 200 ] && [ "$(sql "SELECT COUNT(*) FROM password_resets r JOIN users u ON u.id = r.user_id WHERE u.email = '"'$SUS_EMAIL'"'")" = 0 ]'
# Owner recovery: a synthetic super_admin forgets the password with two devices signed in.
OWN_EMAIL="owner-$RUN@example.test"; OWN_OLD="owner-old-$RUN"; OWN_NEW="owner-new-$RUN"
synthetic_user "$OWN_EMAIL" super_admin "$OWN_OLD" >/dev/null
send POST "auth.php?action=login" "{\"email\":\"$OWN_EMAIL\",\"password\":\"$OWN_OLD\"}" -; DEV1="$(v .token)"
send POST "auth.php?action=login" "{\"email\":\"$OWN_EMAIL\",\"password\":\"$OWN_OLD\"}" -; DEV2="$(v .token)"
check S5 "owner signed in on two devices" '[ -n "$DEV1" ] && [ "$DEV1" != null ] && [ -n "$DEV2" ] && [ "$DEV2" != "$DEV1" ]'
send POST "auth.php?action=reset_request" "{\"email\":\"$OWN_EMAIL\"}" -
LINK="$(tail -n +"$((MAIL_BEFORE + 1))" "$MAIL_LOG" 2>/dev/null | grep -oE 'token=[a-f0-9]{64}' | tail -1 | cut -d= -f2)"
check S5b "owner asks for a reset; the link is written to the staging mail log" \
  '[ "$CODE" = 200 ] && [ -n "$LINK" ] && [ "$(sql "SELECT COUNT(*) FROM password_resets r JOIN users u ON u.id = r.user_id WHERE u.email = '"'$OWN_EMAIL'"' AND r.token_hash = SHA2('"'$LINK'"', 256)")" = 1 ]'
send POST "auth.php?action=reset_confirm" "{\"token\":\"$LINK\",\"password\":\"$OWN_NEW\"}" -
check S5c "owner sets a new password" '[ "$CODE" = 200 ]'
send GET "auth.php?action=me" "" "$DEV1"; D1="$CODE"
send GET "settings.php" "" "$DEV2"; D2="$CODE"
check S5d "the reset signs out every other session (401 on both devices)" '[ "$D1" = 401 ] && [ "$D2" = 401 ]'
send POST "auth.php?action=login" "{\"email\":\"$OWN_EMAIL\",\"password\":\"$OWN_OLD\"}" -
check S5e "the old password no longer works" '[ "$CODE" = 401 ]'
send POST "auth.php?action=login" "{\"email\":\"$OWN_EMAIL\",\"password\":\"$OWN_NEW\"}" -
check S5f "the owner is back in with the new password and the owner role" '[ "$CODE" = 200 ] && [ "$(v .user.role)" = super_admin ]'
NEW_DEV="$(v .token)"
send POST "auth.php?action=logout" "{}" "$NEW_DEV"
# Customer side.
CEXP="$(php -r 'echo bin2hex(random_bytes(24));')"
sql "INSERT INTO customer_sessions (token_hash, customer_id, created_via, expires_at) VALUES (SHA2('$CEXP', 256), $B_CID, 'invite', UTC_TIMESTAMP() - INTERVAL 1 MINUTE)"
send GET "portal.php?action=me" "" "$CEXP"
check S6 "customer session past its expiry: 401" '[ "$CODE" = 401 ] && plain_error'
send GET "portal.php?action=jobs" "" "$ADMIN"
check S6b "a staff token is not a customer session (401)" '[ "$CODE" = 401 ]'
B_SECOND="$(verified_session "$B_REF" "launch-Bravo-$RUN@example.test")"
send POST "access.php?action=logout_all" "{}" "$B_SECOND"
check S7 "sign out everywhere revokes the other sessions" '[ "$CODE" = 200 ] && [ "$(v .revoked)" -ge 2 ]'
send GET "portal.php?action=me" "" "$B_TOK"
check S7b "B's first session is now refused: 401" '[ "$CODE" = 401 ]'
A_SECOND="$(verified_session "$A_REF" "launch-Alpha-$RUN@example.test")"
sql "UPDATE customers SET deleted_at = NOW() WHERE id = $A_CID"
send GET "portal.php?action=me" "" "$A_SECOND"
check S8 "a deleted client's live session is refused: 401" '[ "$CODE" = 401 ]'
sql "UPDATE customers SET deleted_at = NULL WHERE id = $A_CID"

# =========================================================================================
# Publication
# =========================================================================================
SLUG="e2e-launch-$RUN"
UNSAFE='<p>Visit <a href="/contact">contact</a>, <a href="javascript:alert(1)">js</a>, <a href="//evil.example/x">proto</a>, <a href="/\evil.example">slash</a>, <a href="data:text/html,x">data</a>, <a href="java&#9;script:alert(2)">tab</a></p><script>alert(3)</script><img src=x onerror="alert(4)">'
DRAFT="$(jq -nc --arg t "E2E Launch Service $RUN" --arg b "$UNSAFE" --arg s "$SLUG" '{slug:$s, data:{title:$t, summary:"Synthetic launch check", body:$b}}')"
send POST "cms.php?action=save_draft&entity=service" "$DRAFT"
SID="$(v .item.id)"
check W0 "draft service saved" '[ "$CODE" = 201 ] && [ -n "$SID" ]'
send GET "site.php?action=service&slug=$SLUG" -
check W1 "a draft is not public (404 on its own address)" '[ "$CODE" = 404 ] && free_of "$BODY" "$RUN"'
send GET "site.php?action=services" -
check W1b "a draft is not in the public list or the sitemap" '[ "$CODE" = 200 ] && free_of "$BODY" "$SLUG" && free_of "$(curl -s "$API/sitemap.xml")" "$SLUG"'
send GET "cms.php?action=preview&entity=service&id=$SID" "" -
check W1c "the draft preview needs a staff session (401)" '[ "$CODE" = 401 ]'
send POST "cms.php?action=publish&entity=service&id=$SID" "{}"
send GET "site.php?action=service&slug=$SLUG" -
PUB_BODY_HTML="$(v .service.body)"
check W2 "publish: the service is public" '[ "$CODE" = 200 ] && [ "$(v .service.title)" = "E2E Launch Service $RUN" ]'
check W3 "unsafe URLs stripped: javascript:, //host, /\\host, data: and tab-split schemes" \
  'free_of "$PUB_BODY_HTML" "javascript" "evil.example" "data:" "<script" "onerror" && ! free_of "$PUB_BODY_HTML" "href=\"/contact\""'
check W3b "the sitemap now lists it" '! free_of "$(curl -s "$API/sitemap.xml")" "/services/$SLUG"'
DRAFT2="$(jq -nc --arg t "E2E Launch Service CHANGED $RUN" --argjson id "$SID" '{id:$id, data:{title:$t, summary:"Changed", body:"<p>Changed</p>"}}')"
send POST "cms.php?action=save_draft&entity=service" "$DRAFT2"
send GET "site.php?action=service&slug=$SLUG" -
check W4 "a new draft over a published item stays private" '[ "$(v .service.title)" = "E2E Launch Service $RUN" ] && free_of "$BODY" "CHANGED"'
send POST "cms.php?action=unpublish&entity=service&id=$SID" "{}"
send GET "site.php?action=service&slug=$SLUG" -
check W5 "unpublish: its address answers 404 at once" '[ "$CODE" = 404 ] && free_of "$BODY" "$RUN"'
send GET "site.php?action=services" -
check W5b "unpublish: gone from the list and the sitemap" 'free_of "$BODY" "$SLUG" && free_of "$(curl -s "$API/sitemap.xml")" "$SLUG"'
for bad in 'javascript:alert(1)' '//evil.example' '/\evil.example' 'https://evil.example/x' '/../admin'; do
  send POST "cms.php?action=save_draft&entity=slide" "$(jq -nc --arg h "E2E Launch slide $RUN" --arg p "$bad" '{data:{headline:$h, cta_label:"Go", cta_path:$p}}')"
  check "W6 ${bad}" "slide button link refused: $bad" '[ "$CODE" = 400 ] && [ "$(v ".errors.cta_path != null")" = true ]'
done
send POST "cms.php?action=save_draft&entity=slide" "$(jq -nc --arg h "E2E Launch slide $RUN" '{data:{headline:$h, cta_label:"Go", cta_path:"/services"}}')"
check W6b "an internal button link is accepted (positive control)" '[ "$CODE" = 201 ]'
send POST "cms.php?action=profile_save" '{"socials":{"x":"javascript:alert(1)"}}'
check W7 "a javascript: social link is refused on save" '[ "$CODE" = 400 ] && [ "$(v ".errors[\"socials.x\"] != null")" = true ]'

# =========================================================================================
# Failure handling
# =========================================================================================
clear_throttles
for p in "customers.php?action=create" "tailoring.php?action=create" "ledger.php?action=record" "quotes.php?action=create" \
         "enquiries.php?action=create" "appointments.php?action=create" "companies.php?action=save" "users.php?action=create" \
         "measurements.php?action=create" "messages.php?action=post"; do
  send POST "$p" '{}'
  check "F1 ${p%%\?*}" "missing required fields on ${p}: plain 400" '[ "$CODE" = 400 ] && plain_error'
done
for p in "contact.php" "access.php?action=start" "auth.php?action=reset_request"; do
  send POST "$p" '{}' -
  check "F1b ${p%%\?*}" "missing required fields on public ${p}: plain 400" '[ "$CODE" = 400 ] && plain_error'
done
for p in "customers.php?action=create" "ledger.php?action=record" "contact.php" "booking.php?action=request"; do
  send POST "$p" 'name=x&amount=1<?xml version="1.0"?>' "$ADMIN" "text/plain"
  check "F2 ${p%%\?*}" "a body that is not JSON on ${p}: refused with a plain 4xx" '[ "${CODE:0:1}" = 4 ] && plain_error'
done
send POST "ledger.php?action=record" "{\"job_id\":$A_JID,\"amount\":\"1000\",\"method\":\"cash\",\"request_key\":\"$(key trunc)\""
check F2b "truncated JSON on a payment is refused and records nothing" \
  '[ "$CODE" = 400 ] && plain_error && [ "$(sql "SELECT COUNT(*) FROM job_payments WHERE request_key = '"'$(key trunc)'"'")" = 0 ]'
send POST "auth.php?action=login" "email=a@example.test&password=x" - "application/x-www-form-urlencoded"
check F2c "a sign-in that is not JSON: plain 415" '[ "$CODE" = 415 ] && plain_error'
for p in customers.php ledger.php quotes.php cms.php site.php access.php auth.php appointments.php tailoring.php measurements.php company_jobs.php; do
  send GET "$p?action=zz_unknown_$RUN"
  check "F3 $p" "unknown action on $p: plain 404" '[ "$CODE" = 404 ] && [ "$BODY" = "{\"error\":\"Unknown action\"}" ]'
done
send GET "portal.php?action=zz_unknown_$RUN" "" "$A_TOK"
check "F3 portal.php" "unknown action on portal.php (signed in): plain 404" '[ "$CODE" = 404 ] && [ "$BODY" = "{\"error\":\"Unknown action\"}" ]'
send GET "ledger.php?action=record"
check F3b "a write action sent as GET: plain 404, nothing recorded" '[ "$CODE" = 404 ] && plain_error'
send GET "ledger.php?action=due" "" -
check F4 "no session on a staff endpoint: plain 401" '[ "$CODE" = 401 ] && plain_error'
send GET "ledger.php?action=due" "" "not-a-real-token-$RUN"
check F4b "a made-up token: plain 401" '[ "$CODE" = 401 ] && plain_error'
send POST "ai.php" '{"prompt":"hello"}'
check F5 "missing AI configuration: plain 503 that says so" '[ "$CODE" = 503 ] && plain_error && ! free_of "$(v .error)" "not configured"'
CT="$(curl -s -o /dev/null -w '%{content_type}' "$API/customers.php?action=zz_unknown_$RUN" -H "Authorization: Bearer $ADMIN")"
check F6 "errors are sent as application/json" '[ "${CT%%;*}" = application/json ]'
# Wrong-typed fields (an array where text is expected) must be a plain 400, never a server error.
send POST "contact.php" '{"name":["x"],"phone":["0800"],"message":{"m":1}}' -
check F7 "public contact form with an array for the name: plain 400 (defect: php-api/contact.php:34 trim() on an array gives a 500)" '[ "$CODE" = 400 ] && plain_error'
send POST "auth.php?action=login" '{"email":["x"],"password":{"p":1}}' -
check F7b "sign-in with an array for the email: plain 400 (defect: php-api/auth.php:78 strtolower() on an array gives a 500)" '[ "${CODE:0:1}" = 4 ] && plain_error'
send POST "customers.php?action=create" '{"name":["x"],"phone":"0800"}'
check F7c "staff client form with an array for the name: plain 400 (defect: php-api/customers.php:141 gives a 500)" '[ "$CODE" = 400 ] && plain_error'
send POST "companies.php?action=save" "{\"name\":[\"E2E Launch Co array $RUN\"]}"
BAD_CO="$(v '.company.id // empty')"
[ -n "$BAD_CO" ] && sql "UPDATE companies SET deleted_at = NOW() WHERE id = $BAD_CO"
check F7d "company form with an array for the name: refused (defect: php-api/companies.php:37 stores the text \"Array\")" '[ "$CODE" = 400 ] && plain_error'

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
