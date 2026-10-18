#!/usr/bin/env bash
# HeritOS Phase 3 end-to-end checks against LOCAL STAGING only.
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-phase3.sh
#
# Appointments and availability, public requests, verified customer access,
# the portal's object-level checks, messages, change requests and feedback.
# Uses curl, jq and php against $STAGING_API (default http://127.0.0.1:8088) and
# refuses any other host, so it can never reach production. It writes straight
# to the local heritos_staging database only to mint staff tokens, reset
# throttle counters between sections, expire a hold or a code, and move a
# synthetic job's stage. Sign-in codes are read from the staging-only log
# (STAGING_ACCESS_CODE_LOG in config.local.php). Exit 0 only when all pass.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API="${STAGING_API:-http://127.0.0.1:8088}"
case "$API" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: STAGING_API must be http://127.0.0.1:<port> or http://localhost:<port>" >&2; exit 2 ;;
esac
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
CODES="$ROOT/scripts/staging/.logs/access-codes.log"
RUN="$(date +%s)$RANDOM"
PASS=0; FAIL=0

sql() { "${DB[@]}" -e "$1"; }
mint() {
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(32));')"
  sql "INSERT INTO auth_tokens (user_id, token, expires_at)
       SELECT id, SHA2('$tok', 256), DATE_ADD(NOW(), INTERVAL 1 DAY) FROM users WHERE email = '$1' AND email LIKE '%@example.test'" || return 1
  echo "$tok"
}
TOKEN="$(mint staging-admin@example.test)"

req() {    # req METHOD PATH [JSON] [TOKEN|-] → CODE, BODY.  "-" sends no Authorization header.
  local tok="${4:-$TOKEN}" out auth=()
  [ "$tok" != "-" ] && auth=(-H "Authorization: Bearer $tok")
  if [ "$1" = GET ]; then
    out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} "$API/$2")"
  else
    out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -H 'Content-Type: application/json' -X POST "$API/$2" -d "${3:-{\}}")"
  fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
j() { echo "$BODY" | jq -r "$1"; }
check() {
  local id="$1" name="$2"; shift 2
  if "$@"; then PASS=$((PASS+1)); echo "PASS  $id  $name"
  else FAIL=$((FAIL+1)); echo "FAIL  $id  $name"; echo "      code=$CODE body=$(echo "$BODY" | head -c 400)"; fi
}
eq() { [ "$1" = "$2" ]; }
key() { echo "e2e3-$RUN-$1"; }
# A synthetic phone number with a fixed count of digits. Bare $RANDOM is 0 to 32767, so
# "0702$RANDOM" was under the 7-digit minimum about once in 330 requests and the
# server refused it as a bad phone number (400) before any time check (K-27).
phone() { printf "%s%05d" "$1" "$((RANDOM % 100000))"; }
reset_throttles() {
  sql "DELETE FROM audit_log WHERE action IN ('booking_slots_ip','booking_request_ip','access_start_ip','access_start_ref','access_verify_fail_ip')"
}
code_for() { grep -F "\"challenge\":\"$1\"" "$CODES" 2>/dev/null | tail -1 | jq -r .code; }
lagos() { php -r '$d = new DateTime("+'"$1"' days", new DateTimeZone("Africa/Lagos")); echo $d->format("Y-m-d");'; }

reset_throttles
DAY="$(lagos 4)"
FAR="$(lagos 40)"
# Clear this run's day: earlier runs may have left active timed appointments on it.
sql "UPDATE appointments SET status = 'cancelled' WHERE all_day = 0 AND status IN ('requested','confirmed')
       AND starts_at >= '$DAY 00:00:00' - INTERVAL 1 HOUR AND starts_at < '$DAY 00:00:00' + INTERVAL 23 HOUR"
AVAIL='{"weekly":{"mon":[["09:00","13:00"],["14:00","18:00"]],"tue":[["09:00","13:00"],["14:00","18:00"]],"wed":[["09:00","13:00"],["14:00","18:00"]],"thu":[["09:00","13:00"],["14:00","18:00"]],"fri":[["09:00","13:00"],["14:00","18:00"]],"sat":[["09:00","13:00"],["14:00","18:00"]],"sun":[["09:00","13:00"],["14:00","18:00"]]},"buffer_min":15,"min_notice_hours":2,"horizon_days":30,"step_min":15,"durations":{"consultation":45,"fitting":30,"collection":30},"request_hold_hours":48}'
req POST "appointments.php?action=availability_save" "{\"availability\":$AVAIL,\"public_booking_enabled\":true}"
check S0 "availability saved; consultation ready; public requests on" \
  bash -c "[ '$CODE' = 200 ] && [ '$(j .ready.consultation)' = true ] && [ '$(j .public_booking_enabled)' = true ]"
req POST "appointments.php?action=availability_save" '{"availability":{"durations":{"fitting":50}}}'
check S0b "invalid duration (50) refused" bash -c "[ '$CODE' = 400 ] && [ '$(j '.errors["durations.fitting"] != null')' = true ]"

slots() { req GET "booking.php?action=slots&type=consultation&from=$DAY&days=1" -; }
has_slot() { echo "$BODY" | jq -e --arg s "${DAY}T$1:00+01:00" '[.slots[].start] | index($s) != null' >/dev/null; }
not_slot() { ! has_slot "$1"; }

# ---- B1: slots exclude a booking and its buffer ------------------------------
req POST "appointments.php?action=create" "{\"type\":\"consultation\",\"start\":\"${DAY}T10:00\",\"contact_name\":\"E2E Owner Booking $RUN\",\"request_key\":\"$(key b1)\"}"
B1="$(j .id)"
check B1 "owner books 10:00 (45 min)" eq "$CODE" 201
slots
check B1b "slots keep 09:00 and 11:00 (buffer 15 min)" bash -c "$(declare -f has_slot); DAY=$DAY BODY='$BODY'; has_slot 09:00 && has_slot 11:00"
check B1c "slots drop 09:15, 10:00 and 10:45" bash -c "$(declare -f has_slot not_slot); DAY=$DAY BODY='$BODY'; not_slot 09:15 && not_slot 10:00 && not_slot 10:45"
check B1d "slots never reveal who is booked" bash -c "! echo '$BODY' | grep -q 'E2E Owner Booking'"
req POST "appointments.php?action=create" "{\"type\":\"consultation\",\"start\":\"${DAY}T10:15\",\"contact_name\":\"E2E Clash $RUN\",\"request_key\":\"$(key b1clash)\"}"
check B1e "owner clash without a reason: 409 with can_override" bash -c "[ '$CODE' = 409 ] && [ '$(j .can_override)' = true ] && [ '$(j .reason)' = conflict ]"
req POST "appointments.php?action=create" "{\"type\":\"consultation\",\"start\":\"${DAY}T10:15\",\"contact_name\":\"E2E Clash $RUN\",\"override_reason\":\"E2E agreed double booking\",\"request_key\":\"$(key b1clash)\"}"
OV="$(j .id)"
check B1f "owner override stores the reason" bash -c "[ '$CODE' = 201 ] && [ '$(j .override_reason)' = 'E2E agreed double booking' ]"
req POST "appointments.php?action=cancel&id=$OV" '{"reason":"e2e clean-up"}'

# ---- B2: two parallel requests for one slot ----------------------------------
reset_throttles
P1="$(mktemp)"; P2="$(mktemp)"
for n in 1 2; do
  curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$API/booking.php?action=request" \
    -d "{\"type\":\"consultation\",\"start\":\"${DAY}T14:00\",\"name\":\"E2E Parallel $n $RUN\",\"phone\":\"$(phone 0700000$n)\",\"request_key\":\"$(key par$n)\"}" > "$( [ $n = 1 ] && echo "$P1" || echo "$P2")" &
done
wait
CODES2="$(sort <(cat "$P1"; echo) <(cat "$P2"; echo) | tr -d '\n' | tr -s ' ')"; rm -f "$P1" "$P2"
CODE="$CODES2"; BODY=""
check B2 "parallel requests for 14:00: exactly one 201 and one 409" eq "$CODES2" "201409"
N="$(sql "SELECT COUNT(*) FROM appointments WHERE request_key IN ('$(key par1)','$(key par2)') AND status = 'requested'")"
check B2b "exactly one active request stored" eq "$N" 1
REQ1="$(sql "SELECT id FROM appointments WHERE request_key IN ('$(key par1)','$(key par2)') AND status = 'requested'")"
N="$(sql "SELECT COUNT(*) FROM enquiries WHERE request_key = 'appt-$REQ1'")"
check B2c "the request also opened an enquiry" eq "$N" 1

# ---- B3: an expired hold frees the slot --------------------------------------
sql "UPDATE appointments SET hold_expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = $REQ1"
reset_throttles
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T14:00\",\"name\":\"E2E After Expiry $RUN\",\"email\":\"after-$RUN@example.test\",\"request_key\":\"$(key exp)\"}" -
check B3 "slot is requestable again after the hold ran out" eq "$CODE" 201
check B3b "old request is now expired, with history" bash -c "[ '$(sql "SELECT status FROM appointments WHERE id = $REQ1")' = expired ] && [ '$(sql "SELECT COUNT(*) FROM appointment_events WHERE appointment_id = $REQ1 AND to_status = 'expired'")' = 1 ]"

# ---- B4: cancel frees the slot -----------------------------------------------
REQ2="$(sql "SELECT id FROM appointments WHERE request_key = '$(key exp)'")"
req POST "appointments.php?action=decline&id=$REQ2" '{"reason":"e2e"}'
check B4 "owner declines the request" bash -c "[ '$CODE' = 200 ] && [ '$(j .status)' = cancelled ]"
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T14:00\",\"name\":\"E2E After Cancel $RUN\",\"phone\":\"$(phone 07011)\",\"request_key\":\"$(key aftercancel)\"}" -
check B4b "the freed slot can be requested again" eq "$CODE" 201
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T14:00\",\"name\":\"E2E After Cancel $RUN\",\"phone\":\"$(phone 07011)\",\"request_key\":\"$(key aftercancel)\"}" -
check B4c "same request key again: 200, nothing new" bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT COUNT(*) FROM appointments WHERE request_key = '$(key aftercancel)'")' = 1 ]"

# ---- B5: outside hours, too soon, too far ------------------------------------
reset_throttles
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T13:15\",\"name\":\"E2E Lunch $RUN\",\"phone\":\"$(phone 0702)\",\"request_key\":\"$(key lunch)\"}" -
check B5 "lunch-break request refused (422 outside_hours)" bash -c "[ '$CODE' = 422 ] && [ '$(j .reason)' = outside_hours ]"
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T20:00\",\"name\":\"E2E Night $RUN\",\"phone\":\"$(phone 0702)\",\"request_key\":\"$(key night)\"}" -
check B5b "evening request refused (422 outside_hours)" bash -c "[ '$CODE' = 422 ] && [ '$(j .reason)' = outside_hours ]"
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${FAR}T10:00\",\"name\":\"E2E Far $RUN\",\"phone\":\"$(phone 0702)\",\"request_key\":\"$(key far)\"}" -
check B5c "beyond the 30-day horizon refused (422 too_far)" bash -c "[ '$CODE' = 422 ] && [ '$(j .reason)' = too_far ]"
req POST "appointments.php?action=availability_save" "{\"availability\":$(echo "$AVAIL" | jq -c '.min_notice_hours = 200')}"
reset_throttles
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T16:00\",\"name\":\"E2E Soon $RUN\",\"phone\":\"$(phone 0702)\",\"request_key\":\"$(key soon)\"}" -
check B5d "inside the minimum notice refused (422 too_soon)" bash -c "[ '$CODE' = 422 ] && [ '$(j .reason)' = too_soon ]"
req POST "appointments.php?action=availability_save" "{\"availability\":$AVAIL}"
N="$(sql "SELECT COUNT(*) FROM appointments WHERE request_key IN ('$(key lunch)','$(key night)','$(key far)','$(key soon)')")"
check B5e "no refused request was stored" eq "$N" 0

# ---- B6: reschedule is atomic and keeps history ------------------------------
req POST "appointments.php?action=reschedule&id=$B1" "{\"start\":\"${DAY}T11:30\",\"reason\":\"E2E client asked\"}"
check B6 "owner moves 10:00 to 11:30" bash -c "[ '$CODE' = 200 ] && [ '$(j .starts_at_local)' = '${DAY}T11:30:00+01:00' ]"
req GET "appointments.php?action=get&id=$B1"
check B6b "history records from and to" bash -c "[ '$(j '[.events[] | select(.from_starts_at != null and .to_starts_at != null)] | length')' = 1 ]"
slots
check B6c "old 10:00 slot is free again; 11:30 is not" bash -c "$(declare -f has_slot not_slot); DAY=$DAY BODY='$BODY'; has_slot 10:00 && not_slot 11:30"

# ---- B7: an all-day fitting never blocks timed slots -------------------------
req POST "tailoring.php?action=create" "{\"customer\":\"E2E Fitting Client $RUN\",\"phone\":\"0703${RUN: -7}\",\"confirm_new\":true,\"garment_type\":\"kaftan\"}"
FJ="$(j .id)"
slots; BEFORE="$(j '.slots | length')"
req POST "tailoring.php?action=fitting&id=$FJ" "{\"fitting_date\":\"$DAY\"}"
check B7 "job fitting date creates an all-day fitting appointment" bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT CONCAT(all_day, status) FROM appointments WHERE id = $(j .appointment_id)")' = 1confirmed ]"
slots
check B7b "timed slots unchanged by the all-day fitting" eq "$(j '.slots | length')" "$BEFORE"

# ---- B8: public requests switched off ----------------------------------------
req POST "appointments.php?action=availability_save" '{"public_booking_enabled":false}'
req GET "booking.php?action=config" -
check B8 "config says enabled:false" eq "$(j .enabled)" false
slots
check B8b "slots answer 503" eq "$CODE" 503
req POST "booking.php?action=request" "{\"type\":\"consultation\",\"start\":\"${DAY}T16:00\",\"name\":\"E2E Off $RUN\",\"phone\":\"$(phone 0702)\",\"request_key\":\"$(key off)\"}" -
check B8c "requests answer 503" eq "$CODE" 503

# ---- Customers for the access and portal checks ------------------------------
mkclient() {   # mkclient NAME PHONE EMAIL → sets CID, JREF, JID
  local email="$3" body
  body="{\"name\":\"$1\",\"phone\":\"$2\",\"confirm_new\":true"; [ -n "$email" ] && body="$body,\"email\":\"$email\""; body="$body}"
  req POST "customers.php?action=create" "$body"; CID="$(j .id)"
  req POST "tailoring.php?action=create" "{\"customer_id\":$CID,\"garment_type\":\"senator\",\"description\":\"E2E job\",\"price\":\"50000\"}"
  JID="$(j .id)"; JREF="$(j .public_ref)"
}
mkclient "E2E Alpha $RUN" "0704${RUN: -7}" "alpha-$RUN@example.test"; A_CID=$CID; A_JID=$JID; A_REF=$JREF
mkclient "E2E Bravo $RUN" "0705${RUN: -7}" "bravo-$RUN@example.test"; B_CID=$CID; B_JID=$JID; B_REF=$JREF
mkclient "E2E Charlie $RUN" "0706${RUN: -7}" ""; C_CID=$CID; C_REF=$JREF
GUESS="$(php -r '$a="23456789ABCDEFGHJKMNPQRSTUVWXYZ"; $s=""; for($i=0;$i<10;$i++) $s.=$a[random_int(0,30)]; echo $s;')"

# ---- A1: start answers the same way whatever happened ------------------------
reset_throttles
start() { req POST "access.php?action=start" "{\"reference\":\"$1\",\"contact\":\"$2\"}" -; }
start "$A_REF" "alpha-$RUN@example.test"; A_CH="$(j .challenge)"; S_OK="$CODE $(j 'del(.challenge)' | tr -d ' \n')"
start "$A_REF" "wrong-$RUN@example.test"; S_WRONG="$CODE $(j 'del(.challenge)' | tr -d ' \n')"
start "$GUESS" "alpha-$RUN@example.test"; S_GUESS="$CODE $(j 'del(.challenge)' | tr -d ' \n')"
start "NOT-A-REF" "0704${RUN: -7}"; S_BAD="$CODE $(j 'del(.challenge)' | tr -d ' \n')"
check A1 "match, wrong contact, guessed ref and malformed ref: identical replies" \
  bash -c "[ '$S_OK' = '$S_WRONG' ] && [ '$S_OK' = '$S_GUESS' ] && [ '$S_OK' = '$S_BAD' ] && [ '${S_OK%% *}' = 200 ]"
check A1b "challenge is 64 hex characters" bash -c "[[ '$A_CH' =~ ^[0-9a-f]{64}$ ]]"
N="$(sql "SELECT COUNT(*) FROM customer_access_challenges WHERE customer_id IS NULL AND created_at > NOW() - INTERVAL 1 MINUTE")"
check A1c "non-matching requests stored as decoys (no customer)" bash -c "[ $N -ge 3 ]"
A_CODE="$(code_for "$A_CH")"
check A1d "a code was sent for the matching request (staging mail log)" bash -c "[[ '$A_CODE' =~ ^[0-9]{6}$ ]] && grep -q '$A_CODE' '$ROOT/scripts/staging/.logs/mail.log'"
check A1e "neither the code nor the challenge is stored in plain text" \
  bash -c "[ '$(sql "SELECT COUNT(*) FROM customer_access_challenges WHERE code_hash = '$A_CODE' OR challenge_hash = '$A_CH'")' = 0 ]"

# ---- A2: verify --------------------------------------------------------------
GENERIC='{"error":"That code didn'"'"'t work or has expired."}'
is_generic() { [ "$CODE" = 400 ] && [ "$BODY" = "$GENERIC" ]; }
WRONG="$(printf '%06d' $(( (10#$A_CODE + 1) % 1000000 )))"
for i in 1 2 3 4 5; do req POST "access.php?action=verify" "{\"challenge\":\"$A_CH\",\"code\":\"$WRONG\"}" -; done
check A2 "wrong code: generic 400" is_generic
req POST "access.php?action=verify" "{\"challenge\":\"$A_CH\",\"code\":\"$A_CODE\"}" -
check A2b "right code after five wrong ones: still refused (locked)" is_generic
reset_throttles
start "$A_REF" "0704${RUN: -7}"; A_CH="$(j .challenge)"; A_CODE="$(code_for "$A_CH")"
req POST "access.php?action=verify" "{\"challenge\":\"$A_CH\",\"code\":\"$A_CODE\"}" -
A_TOK="$(j .token)"
check A2c "phone as contact, code by email: session issued" bash -c "[ '$CODE' = 200 ] && [[ '$A_TOK' =~ ^[0-9a-f]{48}$ ]] && [ '$(j .expires_in_days)' = 7 ]"
check A2d "only the token hash is stored" bash -c "[ '$(sql "SELECT COUNT(*) FROM customer_sessions WHERE token_hash = SHA2('$A_TOK', 256) AND customer_id = $A_CID")' = 1 ] && [ '$(sql "SELECT COUNT(*) FROM customer_sessions WHERE token_hash = '$A_TOK'")' = 0 ]"
req POST "access.php?action=verify" "{\"challenge\":\"$A_CH\",\"code\":\"$A_CODE\"}" -
check A2e "reusing a used code: generic 400" is_generic
start "$A_REF" "alpha-$RUN@example.test"; X_CH="$(j .challenge)"; X_CODE="$(code_for "$X_CH")"
sql "UPDATE customer_access_challenges SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE challenge_hash = SHA2('$X_CH', 256)"
req POST "access.php?action=verify" "{\"challenge\":\"$X_CH\",\"code\":\"$X_CODE\"}" -
check A2f "expired code: generic 400" is_generic
req POST "access.php?action=verify" "{\"challenge\":\"$(php -r 'echo bin2hex(random_bytes(32));')\",\"code\":\"123456\"}" -
check A2g "unknown challenge: generic 400" is_generic
reset_throttles
start "$B_REF" "bravo-$RUN@example.test"; B_CH="$(j .challenge)"
req POST "access.php?action=verify" "{\"challenge\":\"$B_CH\",\"code\":\"$(code_for "$B_CH")\"}" -; B_TOK="$(j .token)"

# ---- A3: throttles -----------------------------------------------------------
reset_throttles
for i in 1 2 3 4 5; do start "$C_REF" "nobody-$i@example.test"; done
start "$C_REF" "nobody-6@example.test"
check A3 "sixth start for one reference in 15 minutes: 429" bash -c "[ '$CODE' = 429 ] && [ '$(j .error | cut -c1-17)' = 'Too many attempts' ]"
reset_throttles
for i in $(seq 1 10); do start "$(php -r '$a="23456789ABCDEFGHJKMNPQRSTUVWXYZ"; $s=""; for($i=0;$i<10;$i++) $s.=$a[random_int(0,30)]; echo $s;')" "x$i@example.test"; done
start "$A_REF" "alpha-$RUN@example.test"
check A3b "eleventh start from one IP: 429" eq "$CODE" 429
reset_throttles

# ---- A4: manual invite (no email on file) ------------------------------------
start "$C_REF" "0706${RUN: -7}"
N="$(sql "SELECT COUNT(*) FROM customer_access_challenges WHERE customer_id = $C_CID AND status = 'awaiting_owner'")"
check A4 "client without email: request waits for the owner" eq "$N" 1
req GET "access.php?action=requests"
CHID="$(j "[.items[] | select(.customer_id == $C_CID)][0].id")"
check A4b "owner sees the access request (phone masked)" bash -c "[ '$CHID' != null ] && [ '$(j "[.items[] | select(.customer_id == $C_CID)][0].phone_masked | test(\"^•+[0-9]{3}$\")")' = true ]"
req POST "access.php?action=invite" "{\"challenge_id\":$CHID}"
INV="$(j .invite_url | sed 's/.*invite=//')"
check A4c "owner creates a single-use invite link" bash -c "[ '$CODE' = 201 ] && [[ '$INV' =~ ^[0-9a-f]{64}$ ]] && [ '$(j .wa_link | cut -c1-14)' = 'https://wa.me/' ]"
req POST "access.php?action=redeem" "{\"invite\":\"$INV\"}" -
C_TOK="$(j .token)"
check A4d "invite redeemed once: session issued" bash -c "[ '$CODE' = 200 ] && [[ '$C_TOK' =~ ^[0-9a-f]{48}$ ]]"
req POST "access.php?action=redeem" "{\"invite\":\"$INV\"}" -
check A4e "invite redeemed again: generic 400" is_generic

# ---- P1: object-level isolation (customer A against customer B) --------------
req GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
check P1 "A reads A's job" bash -c "[ '$CODE' = 200 ] && [ '$(j .ref)' = '$A_REF' ]"
req GET "portal.php?action=job&ref=$B_REF" "" "$A_TOK"; X1="$CODE $BODY"
req GET "portal.php?action=job&ref=$GUESS" "" "$A_TOK"; X2="$CODE $BODY"
check P1b "A asking for B's job: same 404 as a missing job" bash -c "[ '$X1' = '$X2' ] && [ '${X1%% *}' = 404 ]"
req GET "portal.php?action=messages&ref=$B_REF" "" "$A_TOK"
check P1c "A cannot read B's messages" eq "$CODE" 404
req POST "portal.php?action=message" "{\"ref\":\"$B_REF\",\"body\":\"hello\",\"request_key\":\"$(key xmsg)\"}" "$A_TOK"
check P1d "A cannot post to B's thread" eq "$CODE" 404
req GET "portal.php?action=change_requests&ref=$B_REF" "" "$A_TOK"
check P1e "A cannot read B's change requests" eq "$CODE" 404
req POST "portal.php?action=feedback" "{\"ref\":\"$B_REF\",\"comment\":\"x\",\"request_key\":\"$(key xfb)\"}" "$A_TOK"
check P1f "A cannot give feedback on B's job" eq "$CODE" 404
req GET "portal.php?action=jobs" "" "$A_TOK"
check P1g "A's job list holds only A's jobs" bash -c "[ '$(j '[.jobs[].ref] | join(",")')' = '$A_REF' ]"
req GET "portal.php?action=measurements" "" "$A_TOK"
check P1h "measurements hidden while portal_show_measurements is off" eq "$CODE" 404
req POST "measurements.php?action=create" "{\"customer_id\":$B_CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"43.7\"},\"request_key\":\"$(key bset)\"}"
req POST "measurements.php?action=create" "{\"customer_id\":$A_CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"41\",\"chest\":\"100\"},\"request_key\":\"$(key aset)\"}"
A_SET="$(j .set.id)"
req POST "settings.php" '{"portal_show_measurements":"1"}'
req GET "portal.php?action=measurements" "" "$A_TOK"
check P1i "with the setting on, A sees only A's sets, read-only" \
  bash -c "[ '$CODE' = 200 ] && [ '$(j .read_only)' = true ] && ! echo '$BODY' | grep -q '43.7' && echo '$BODY' | grep -q '\"neck\":41'"
req POST "settings.php" '{"portal_show_measurements":"0"}'
req GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
check P1j "a session cannot use the staff API" bash -c "curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer $A_TOK' '$API/today.php' | grep -q 401"

# ---- P2: no private fields in the portal -------------------------------------
req POST "tailoring.php?action=costs&id=$A_JID" '{"fabric_cost":12345,"labour_cost":6789}'
req GET "tailoring.php?action=get&id=$A_JID"; LV="$(j .lock_version)"; A_CODE_HC="$(j .code)"
req POST "tailoring.php?action=update&id=$A_JID" "{\"lock_version\":$LV,\"notes\":\"SECRET-NOTE-$RUN\"}"
req POST "ledger.php?action=record" "{\"job_id\":$A_JID,\"amount\":\"7000\",\"method\":\"transfer\",\"request_key\":\"$(key unv)\"}"
req GET "portal.php?action=job&ref=$A_REF" "" "$A_TOK"
check P2 "portal job JSON has no costs, notes, staff code, tailor or lock version" \
  bash -c "! echo '$BODY' | grep -Eq 'fabric_cost|labour_cost|notes_internal|\"notes\"|SECRET-NOTE|12345|6789|$A_CODE_HC|tailor|lock_version|\"internal\"'"
check P2b "unverified transfer not counted or shown" bash -c "[ '$(j .payment.paid_verified)' = 0.00 ] && [ '$(j '.payment.receipts | length')' = 0 ]"

# ---- M: messages -------------------------------------------------------------
req POST "messages.php?action=post" "{\"job_id\":$A_JID,\"visibility\":\"internal\",\"body\":\"INTERNAL-$RUN\",\"request_key\":\"$(key mi)\"}"
check M1 "owner adds an internal note" bash -c "[ '$CODE' = 201 ] && [ '$(j .channel)' = note ]"
req POST "messages.php?action=post" "{\"job_id\":$A_JID,\"visibility\":\"client\",\"channel\":\"portal\",\"body\":\"CLIENT-$RUN\",\"request_key\":\"$(key mc)\"}"
req GET "portal.php?action=messages&ref=$A_REF" "" "$A_TOK"
check M2 "portal thread shows the client message, never the internal note" \
  bash -c "echo '$BODY' | grep -q 'CLIENT-$RUN' && ! echo '$BODY' | grep -q 'INTERNAL-$RUN'"
for i in 1 2; do req POST "portal.php?action=message" "{\"ref\":\"$A_REF\",\"body\":\"Hello <b>from</b> A $RUN\",\"request_key\":\"$(key cm)\"}" "$A_TOK"; done
check M3 "same request key twice: one message, duplicate:true" \
  bash -c "[ '$(j .duplicate)' = true ] && [ '$(sql "SELECT COUNT(*) FROM job_messages WHERE request_key = '$(key cm)'")' = 1 ]"
check M3b "body kept as plain text" eq "$(sql "SELECT body FROM job_messages WHERE request_key = '$(key cm)'")" "Hello <b>from</b> A $RUN"
req GET "messages.php?action=unread_count"; U1="$(j .messages)"
req GET "today.php"
check M4 "Today counts the unread client message" bash -c "[ '$(j .messages_unread.count)' = '$U1' ] && [ '$(j "[.messages_unread.items[] | select(.job_id == $A_JID)] | length")' = 1 ]"
req POST "messages.php?action=mark_read" "{\"job_id\":$A_JID}"
req GET "messages.php?action=unread_count"
check M4b "mark read clears it" eq "$(j .messages)" "$((U1 - 1))"

# ---- C: change requests ------------------------------------------------------
req POST "portal.php?action=change_request" "{\"ref\":\"$A_REF\",\"kind\":\"address\",\"details\":\"Deliver to work\",\"address\":\"E2E Office, Lagos\",\"request_key\":\"$(key cr1)\"}" "$A_TOK"
CR1="$(j .id)"
check C1 "client asks for an address correction" bash -c "[ '$CODE' = 201 ] && [ '$(j .status)' = open ]"
req POST "messages.php?action=change_decide&id=$CR1" '{"decision":"approve","response":"Done, we will deliver there."}'
req GET "portal.php?action=change_requests&ref=$A_REF" "" "$A_TOK"
check C1b "client sees the approval and the owner's response" \
  bash -c "[ '$(j ".items[] | select(.id == $CR1) | .status")' = approved ] && [ '$(j ".items[] | select(.id == $CR1) | .owner_response")' = 'Done, we will deliver there.' ]"
req GET "portal.php?action=messages&ref=$A_REF" "" "$A_TOK"
check C1c "a notice appears in the client thread" bash -c "echo '$BODY' | grep -q 'address correction was approved'"

# Measurement proposal after cutting starts: never touches the approved set or the snapshot.
req POST "tailoring.php?action=attach_measurements&id=$A_JID" "{\"set_id\":$A_SET}"
sql "UPDATE tailoring_orders SET job_stage = 'in_production', stage = 'sew' WHERE id = $A_JID"
SNAP0="$(sql "SELECT CONCAT(measurement_set_id, ':', MD5(measurement_snapshot)) FROM tailoring_orders WHERE id = $A_JID")"
req POST "portal.php?action=propose_measurements" "{\"ref\":\"$A_REF\",\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"42\",\"chest\":\"104\"},\"request_key\":\"$(key prop)\"}" "$A_TOK"
CR2="$(j .change_request_id)"
check C2 "client proposal is stored as pending with a change request" \
  bash -c "[ '$CODE' = 201 ] && [ '$(j .pending)' = true ] && [ '$(sql "SELECT status FROM measurement_sets WHERE request_key = '$(key prop)'")' = pending ]"
check C2b "approved set and job snapshot unchanged by the proposal" \
  bash -c "[ '$(sql "SELECT status FROM measurement_sets WHERE id = $A_SET")' = approved ] && [ '$(sql "SELECT CONCAT(measurement_set_id, ':', MD5(measurement_snapshot)) FROM tailoring_orders WHERE id = $A_JID")' = '$SNAP0' ]"
req POST "messages.php?action=change_decide&id=$CR2" '{"decision":"approve"}'
check C2c "after cutting, approval without a price or date effect is refused (422)" eq "$CODE" 422
req POST "messages.php?action=change_decide&id=$CR2" '{"decision":"approve","date_effect":"2026-12-24","price_effect":"0","response":"Will adjust"}'
check C2d "approval with a stated effect succeeds" bash -c "[ '$CODE' = 200 ] && [ '$(j .status)' = approved ] && [ '$(j .date_effect)' = 2026-12-24 ]"
check C2e "new set approved, job snapshot still the old one until re-attached" \
  bash -c "[ '$(sql "SELECT status FROM measurement_sets WHERE request_key = '$(key prop)'")' = approved ] && [ '$(sql "SELECT CONCAT(measurement_set_id, ':', MD5(measurement_snapshot)) FROM tailoring_orders WHERE id = $A_JID")' = '$SNAP0' ]"
req GET "portal.php?action=change_requests&ref=$A_REF" "" "$A_TOK"
check C2f "client sees the date effect" eq "$(j ".items[] | select(.id == $CR2) | .date_effect")" 2026-12-24

# Appointment request and reschedule request from the portal.
req POST "portal.php?action=appointment_request" "{\"ref\":\"$A_REF\",\"type\":\"fitting\",\"start\":\"${DAY}T16:00\",\"request_key\":\"$(key pf)\"}" "$A_TOK"
PA="$(j .id)"
check C3 "client requests a fitting slot" bash -c "[ '$CODE' = 201 ] && [ '$(j .status)' = requested ]"
req POST "portal.php?action=appointment_request" "{\"ref\":\"$A_REF\",\"type\":\"fitting\",\"start\":\"${DAY}T16:15\",\"request_key\":\"$(key pf2)\"}" "$A_TOK"
check C3b "a clashing portal request is refused (409)" eq "$CODE" 409
req POST "portal.php?action=appointment_reschedule_request" "{\"ref\":\"$A_REF\",\"appointment_id\":$PA,\"start\":\"${DAY}T17:00\",\"reason\":\"Later please\",\"request_key\":\"$(key prs)\"}" "$A_TOK"
CR3="$(j .id)"
check C3c "client asks to move it (change request)" bash -c "[ '$CODE' = 201 ] && [ '$(j .kind)' = reschedule ]"
req POST "messages.php?action=change_decide&id=$CR3" '{"decision":"approve","response":"Moved"}'
check C3d "owner approval moves the appointment, with history" \
  bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT DATE_FORMAT(starts_at + INTERVAL 1 HOUR, '%H:%i') FROM appointments WHERE id = $PA")' = 17:00 ] && [ '$(sql "SELECT COUNT(*) FROM appointment_events WHERE appointment_id = $PA AND from_starts_at IS NOT NULL")' = 1 ]"
req POST "portal.php?action=appointment_reschedule_request" "{\"ref\":\"$B_REF\",\"appointment_id\":$PA,\"start\":\"${DAY}T17:30\",\"request_key\":\"$(key xrs)\"}" "$B_TOK"
check C3e "B cannot move A's appointment through B's own job" eq "$CODE" 404

# ---- F: feedback and consent -------------------------------------------------
# Close follow-ups left open by earlier runs: Today lists only the oldest 20, so
# after about 20 runs this run's follow-up would fall off the list and F5 would fail.
sql "UPDATE job_feedback f JOIN customers c ON c.id = f.customer_id SET f.follow_up = 'done'
       WHERE f.follow_up = 'open' AND c.name LIKE 'E2E %' AND c.email LIKE '%@example.test'"
req POST "portal.php?action=feedback" "{\"ref\":\"$A_REF\",\"rating\":2,\"comment\":\"Too tight\",\"request_key\":\"$(key fb)\"}" "$A_TOK"
check F1 "feedback before handover refused" eq "$CODE" 409
sql "UPDATE tailoring_orders SET job_stage = 'handed_over', stage = 'done' WHERE id = $A_JID"
req POST "portal.php?action=feedback" "{\"ref\":\"$A_REF\",\"rating\":2,\"comment\":\"Too tight\",\"contact_ok\":true,\"publish_consent\":\"no\",\"photo_consent\":false,\"request_key\":\"$(key fb)\"}" "$A_TOK"
check F2 "feedback after handover accepted" eq "$CODE" 201
check F2b "low rating opens a follow-up; consents and wording stored" \
  bash -c "[ '$(sql "SELECT CONCAT(follow_up, ':', publish_consent, ':', photo_consent, ':', contact_ok, ':', publish_wording IS NOT NULL) FROM job_feedback WHERE job_id = $A_JID")' = 'open:no:0:1:1' ]"
req POST "portal.php?action=feedback" "{\"ref\":\"$A_REF\",\"rating\":5,\"comment\":\"Changed my mind\",\"request_key\":\"$(key fb2)\"}" "$A_TOK"
check F3 "a second feedback for the job is refused (409)" eq "$CODE" 409
FB="$(sql "SELECT id FROM job_feedback WHERE job_id = $A_JID")"
req POST "messages.php?action=feedback_publish&id=$FB"
check F4 "publishing without consent is refused" eq "$CODE" 409
req GET "today.php"
check F5 "Today lists the follow-up" bash -c "[ '$(j "[.feedback_follow_up.items[] | select(.job_id == $A_JID)] | length")' = 1 ]"
sql "UPDATE tailoring_orders SET job_stage = 'handed_over', stage = 'done' WHERE id = $B_JID"
req POST "portal.php?action=feedback" "{\"ref\":\"$B_REF\",\"rating\":5,\"comment\":\"Lovely work $RUN\",\"publish_consent\":\"first_name\",\"photo_consent\":true,\"request_key\":\"$(key fbb)\"}" "$B_TOK"
FBB="$(sql "SELECT id FROM job_feedback WHERE job_id = $B_JID")"
req POST "messages.php?action=feedback_publish&id=$FBB"
TID="$(j .testimonial_id)"
check F6 "with consent the owner can publish: hidden testimonial, first name only" \
  bash -c "[ '$CODE' = 201 ] && [ '$(sql "SELECT CONCAT(name, ':', status) FROM testimonials WHERE id = $TID")' = 'E2E:hidden' ]"

# ---- Q: quote acceptance stays off -------------------------------------------
req POST "portal.php?action=quote_accept" "{\"ref\":\"$A_REF\",\"quote_id\":1,\"content_hash\":\"x\",\"confirm\":true}" "$A_TOK"
check Q1 "portal quote acceptance off by default (403)" eq "$CODE" 403

# ---- L: sessions -------------------------------------------------------------
req POST "access.php?action=logout" "{}" "$A_TOK"
req GET "portal.php?action=jobs" "" "$A_TOK"
check L1 "after logout the token is refused (401)" eq "$CODE" 401
req POST "access.php?action=revoke" "{\"customer_id\":$C_CID}"
req GET "portal.php?action=jobs" "" "$C_TOK"
check L2 "owner revoke ends the client's sessions (401)" eq "$CODE" 401
sql "UPDATE customer_sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE token_hash = SHA2('$B_TOK', 256)"
req GET "portal.php?action=jobs" "" "$B_TOK"
check L3 "an expired session is refused (401)" eq "$CODE" 401
ORDREF="$(sql "SELECT public_ref FROM orders WHERE customer_phone = '08000000001' AND public_ref IS NOT NULL ORDER BY id LIMIT 1")"
req POST "account.php?action=login" "{\"phone\":\"08000000001\",\"order_code\":\"$ORDREF\"}" -
LTOK="$(j .token)"
check L4 "legacy login (flag on in staging) now issues a hashed, expiring session" \
  bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT created_via FROM customer_sessions WHERE token_hash = SHA2('$LTOK', 256)")' = legacy ]"
req GET "portal.php?action=jobs" "" "$LTOK"
check L4b "that session reads the portal too" eq "$CODE" 200

reset_throttles
echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
