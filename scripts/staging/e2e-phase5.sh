#!/usr/bin/env bash
# HeritOS Phase 5 end-to-end checks (company orders, company and wearer portal
# views, samples, item handover) against LOCAL STAGING only (BUILD-SPEC 5.6).
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-phase5.sh
#
# Uses curl, jq and the mariadb client against $STAGING_API (default
# http://127.0.0.1:8088) and refuses any other host. It writes synthetic rows
# to the local heritos_staging database only, switches company_portal_enabled
# on for the run and puts the previous value back. Exit 0 only when every
# check passes.
set -uo pipefail

API="${STAGING_API:-http://127.0.0.1:8088}"
case "$API" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: STAGING_API must be http://127.0.0.1:<port> or http://localhost:<port>" >&2; exit 2 ;;
esac
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
RUN="$(date +%s)$RANDOM"
PASS=0; FAIL=0

sql() { "${DB[@]}" -e "$1"; }
key() { echo "e2e5-$1-$RUN-$RANDOM"; }
mint() {      # staff token for an @example.test user
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(32));')"
  sql "INSERT INTO auth_tokens (user_id, token, expires_at)
       SELECT id, '$tok', DATE_ADD(NOW(), INTERVAL 1 DAY) FROM users WHERE email = '$1' AND email LIKE '%@example.test'" || return 1
  echo "$tok"
}
csess() {     # portal session for a customer id (only the hash is stored, as in _portal.php)
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(24));')"
  sql "INSERT INTO customer_sessions (token_hash, customer_id, created_via, expires_at) VALUES (SHA2('$tok', 256), $1, 'invite', UTC_TIMESTAMP() + INTERVAL 1 DAY)"
  echo "$tok"
}
person() {    # synthetic customer; prints id
  sql "INSERT INTO customers (name, phone, email, phone_tail9) VALUES ('$1', '0800$RUN${2}', '', RIGHT('0800$RUN${2}', 9)); SELECT LAST_INSERT_ID();"
}
req() {       # req METHOD PATH [JSON] [TOKEN|-] -> CODE, BODY
  local tok="${4:-$TOKEN}" out auth=()
  [ "$tok" != "-" ] && auth=(-H "Authorization: Bearer $tok")
  if [ "$1" = GET ]; then out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} "$API/$2")"
  else out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -H 'Content-Type: application/json' -X POST "$API/$2" -d "${3:-{\}}")"; fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
j() { echo "$BODY" | jq -r "$1"; }
check() {
  local id="$1" name="$2"; shift 2
  if "$@"; then PASS=$((PASS+1)); echo "PASS  $id  $name"
  else FAIL=$((FAIL+1)); echo "FAIL  $id  $name"; echo "      code=$CODE body=$(echo "$BODY" | head -c 400)"; fi
}
eq() { [ "$1" = "$2" ]; }

# ---- Setup -------------------------------------------------------------------------
TOKEN="$(mint staging-admin@example.test)"
sql "INSERT IGNORE INTO users (name, email, password_hash, role, status) VALUES ('Test Tailor 05', 'tailor05@example.test', '!', 'tailor', 'active')"
TAILOR="$(mint tailor05@example.test)"
PREV_FLAG="$(sql "SELECT svalue FROM settings WHERE skey = 'company_portal_enabled'")"
restore() {
  if [ -z "$PREV_FLAG" ]; then sql "DELETE FROM settings WHERE skey = 'company_portal_enabled'"
  else sql "UPDATE settings SET svalue = '$PREV_FLAG' WHERE skey = 'company_portal_enabled'"; fi
}
trap restore EXIT
sql "INSERT INTO settings (skey, svalue) VALUES ('company_portal_enabled', '1') ON DUPLICATE KEY UPDATE svalue = '1'"

# ---- C1: company X with contacts A (approves) and B (views), five items, five wearers ----
req POST "companies.php?action=save" "{\"name\":\"E2E Company X $RUN\",\"invoice_name\":\"E2E X Holdings\",\"invoice_email\":\"ap@example.test\",\"notes_internal\":\"INTERNAL-$RUN\"}"
X="$(j .company.id)"
req POST "companies.php?action=contact_save" "{\"company_id\":$X,\"person\":{\"name\":\"E2E Contact A\",\"phone\":\"0801${RUN: -7}\",\"confirm_new\":true},\"can_approve_samples\":1,\"is_invoice_recipient\":1}"
KA="$(j .contact.id)"; CA="$(j .contact.customer_id)"
req POST "companies.php?action=contact_save" "{\"company_id\":$X,\"person\":{\"name\":\"E2E Contact B\",\"phone\":\"0802${RUN: -7}\",\"confirm_new\":true}}"
CB="$(j .contact.customer_id)"
W=(); for n in 1 2 3 4 5; do W+=("$(person "E2E Wearer $n" "$n")"); done
ITEMS="["; for n in 0 1 2 3 4; do ITEMS+="{\"description\":\"Senator, navy\",\"qty\":1,\"size_label\":\"M\",\"wearer_customer_id\":${W[$n]},\"wearer_label\":\"Driver $((n+1))\"},"; done; ITEMS="${ITEMS%,}]"
CKEY="$(key create)"
req POST "company_jobs.php?action=create" "{\"company_id\":$X,\"contact_id\":$KA,\"po_number\":\"PO-$RUN\",\"measurement_method\":\"sizes\",\"sample_required\":1,\"items\":$ITEMS,\"request_key\":\"$CKEY\"}"
check C1 "company job created with 5 items and quantity 5" bash -c "[ '$CODE' = 201 ] && [ '$(j '.items|length')' = 5 ] && [ '$(j .job.quantity)' = 5 ]"
JOB="$(j .job.id)"; REF="$(j .job.ref)"
mapfile -t IT < <(echo "$BODY" | jq -r '.items[].id')
req POST "company_jobs.php?action=create" "{\"company_id\":$X,\"contact_id\":$KA,\"items\":$ITEMS,\"request_key\":\"$CKEY\"}"
check C1b "same request key returns the same job" bash -c "[ '$CODE' = 200 ] && [ '$(j .job.id)' = '$JOB' ]"
check C12 "no automatic discount: price 0 until quoted, no group" \
  eq "$(sql "SELECT CONCAT(price, '/', COALESCE(group_id, 'none')) FROM tailoring_orders WHERE id = $JOB")" "0.00/none"

ATOK="$(csess "$CA")"; BTOK="$(csess "$CB")"; W1TOK="$(csess "${W[0]}")"

# ---- C2: contact A's view has no wearer or measurement data ----------------------------
req GET "portal.php?action=job&ref=$REF" '' "$ATOK"
check C2 "contact view: lines only, no wearer, measurement, notes or internal values" bash -c "[ '$CODE' = 200 ] && [ '$(j .kind)' = company ] \
  && ! echo '$BODY' | grep -Eqi 'wearer|measure|customer_id|notes|Driver|INTERNAL-|E2E Wearer|HC-[0-9]' && [ '$(j '.lines[0].qty')' = 5 ]"
check C2b "contact view: sizes counted, PO shown" bash -c "[ '$(j '.lines[0].sizes.M')' = 5 ] && [ '$(j .po_number)' = 'PO-$RUN' ]"

# ---- C3: a wearer sees only their own garment, no price ------------------------------
req GET "portal.php?action=job&ref=$REF" '' "$W1TOK"
check C3 "wearer view: own garment only, no price or company" bash -c "[ '$CODE' = 200 ] && [ '$(j .kind)' = wearer ] && [ '$(j .quantity)' = 1 ] \
  && [ \"\$(echo '$BODY' | jq -c 'keys')\" = '[\"description\",\"garment_type\",\"item_id\",\"kind\",\"promised_date\",\"quantity\",\"ref\",\"stage\",\"stage_label\"]' ] \
  && ! echo '$BODY' | grep -Eqi 'price|payment|PO-|Company X|E2E Contact'"
req POST "portal.php?action=message" "{\"ref\":\"$REF\",\"body\":\"hello\",\"request_key\":\"$(key msg)\"}" "$W1TOK"
check C3b "wearer cannot use other portal actions" eq "$CODE" 404
req GET "portal.php?action=jobs" '' "$W1TOK"
check C3c "wearer's list shows the garment under wearing" bash -c "[ '$(j '.wearing|length')' -ge 1 ] && [ '$(j '.company_jobs|length')' = 0 ]"

# ---- Samples: C4 and C5 ----------------------------------------------------------------
req POST "company_jobs.php?action=sample_submit&job_id=$JOB" "{\"description\":\"Navy senator sample\",\"request_key\":\"$(key sample)\"}"
SID="$(j '.samples[-1].id')"
req POST "portal.php?action=sample_decide" "{\"ref\":\"$REF\",\"sample_id\":$SID,\"decision\":\"approve\",\"request_key\":\"$(key dec)\"}" "$BTOK"
check C4 "contact without approval rights gets 404" bash -c "[ '$CODE' = 404 ] && [ '$(j .error)' = 'Not found' ]"
req GET "portal.php?action=job&ref=$REF" '' "$ATOK"
check C5a "approver sees the sample waiting and may approve" bash -c "[ '$(j .sample.status)' = submitted ] && [ '$(j .can.approve_sample)' = true ]"
req POST "portal.php?action=sample_decide" "{\"ref\":\"$REF\",\"sample_id\":$SID,\"decision\":\"approve\",\"request_key\":\"$(key dec)\"}" "$ATOK"
check C5 "approver approves; channel portal recorded" bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT CONCAT(status, '/', decided_channel) FROM job_samples WHERE id = $SID")' = approved/portal ] \
  && [ '$(sql "SELECT sample_status FROM tailoring_orders WHERE id = $JOB")' = approved ]"

# ---- Progress and handover: C6, C7, C8, C13 ---------------------------------------------
req POST "company_jobs.php?action=item_progress&job_id=$JOB" "{\"item_id\":${IT[0]},\"qty_ready\":1}" "$TAILOR"
check T1 "progress refused while the job is a quote" eq "$CODE" 409
sql "UPDATE tailoring_orders SET job_stage = 'in_production' WHERE id = $JOB"
req POST "company_jobs.php?action=item_progress&job_id=$JOB" "{\"item_id\":${IT[0]},\"qty_ready\":1}" "$TAILOR"
check T2 "a tailor records progress and sees no money or company" bash -c "[ '$CODE' = 200 ] && [ '$(j '.company')' = null ] && [ '$(j '.job.price')' = null ]"
req POST "company_jobs.php?action=create" "{}" "$TAILOR"
check T3 "a tailor cannot create a company job" eq "$CODE" 403
req POST "company_jobs.php?action=item_save&job_id=$JOB" "{\"item_id\":${IT[0]},\"description\":\"Senator, black\",\"qty\":1}"
check C13 "editing an item in production without a stated effect is refused" bash -c "[ '$CODE' = 409 ] && [ '$(j .code)' = effect_required ]"
for n in 1 2 3; do req POST "company_jobs.php?action=item_progress&job_id=$JOB" "{\"item_id\":${IT[$n]},\"qty_ready\":1}"; done
sql "UPDATE tailoring_orders SET job_stage = 'ready' WHERE id = $JOB"
HKEY="$(key hand)"
req POST "company_jobs.php?action=handover&job_id=$JOB" "{\"items\":[{\"item_id\":${IT[0]},\"qty\":1},{\"item_id\":${IT[1]},\"qty\":1}],\"method\":\"collection\",\"request_key\":\"$HKEY\"}"
check C6 "hand over 2 of 5: job stays ready" bash -c "[ '$CODE' = 201 ] && [ '$(j .job.job_stage)' = ready ] && [ '$(j .job.progress)' = '2 of 5 handed over' ]"
req GET "portal.php?action=job&ref=$REF" '' "$ATOK"
check C6b "contact sees 2 of 5 handed over" eq "$(j .quantity_handed_over)/$(j .quantity)" "2/5"
req POST "company_jobs.php?action=handover&job_id=$JOB" "{\"items\":[{\"item_id\":${IT[0]},\"qty\":1},{\"item_id\":${IT[1]},\"qty\":1}],\"method\":\"collection\",\"request_key\":\"$HKEY\"}"
check C8 "same handover key twice: one row" bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT COUNT(*) FROM job_handovers WHERE request_key = '$HKEY'")' = 1 ]"
req POST "company_jobs.php?action=handover&job_id=$JOB" "{\"items\":[{\"item_id\":${IT[2]},\"qty\":1},{\"item_id\":${IT[3]},\"qty\":1},{\"item_id\":${IT[4]},\"qty\":2}],\"method\":\"delivery\",\"request_key\":\"$(key over)\"}"
check C7 "handing over more than is ready is refused and changes nothing" bash -c "[ '$CODE' = 422 ] && [ '$(sql "SELECT handed_over_qty FROM tailoring_orders WHERE id = $JOB")' = 2 ]"

# ---- C9: another company's contact gets the same 404 as a missing ref --------------------
req POST "companies.php?action=save" "{\"name\":\"E2E Other Firm $RUN\",\"confirm_new\":true}"
Y="$(j .company.id)"
req POST "companies.php?action=contact_save" "{\"company_id\":$Y,\"person\":{\"name\":\"E2E Contact Y\",\"phone\":\"0803${RUN: -7}\",\"confirm_new\":true},\"can_approve_samples\":1}"
YTOK="$(csess "$(j .contact.customer_id)")"
req GET "portal.php?action=job&ref=$REF" '' "$YTOK"; OTHER="$CODE $BODY"
req GET "portal.php?action=job&ref=HJ-NOPE00" '' "$YTOK"; MISSING="$CODE $BODY"
check C9 "other company's ref answers exactly like a missing one" bash -c "[ '$OTHER' = '$MISSING' ] && [ '${OTHER%% *}' = 404 ]"

# ---- C11: invoice and quote carry the bill-to, PO and recipient ---------------------------
req GET "tailoring.php?action=document&id=$JOB&doc=invoice"
check C11 "invoice shows the bill-to, PO and invoice recipient" bash -c "[ '$(j .po_number)' = 'PO-$RUN' ] && [ '$(j .bill_to.invoice_name)' = 'E2E X Holdings' ] && [ '$(j .bill_to.recipient.name)' = 'E2E Contact A' ]"
req POST "quotes.php?action=create" "{\"job_id\":$JOB,\"items\":[{\"description\":\"Senator, navy\",\"qty\":5,\"unit_price\":\"40000\"}],\"request_key\":\"$(key quote)\"}"
QID="$(j .id)"
req POST "quotes.php?action=send&id=$QID" '{"channel":"whatsapp"}'
check C11b "sending the quote freezes the bill-to" bash -c "[ '$CODE' = 200 ] && [ '$(sql "SELECT JSON_UNQUOTE(JSON_EXTRACT(bill_to_snapshot, '$.po_number')) FROM quotes WHERE id = $QID")' = 'PO-$RUN' ]"

# ---- C10: a deactivated contact sees nothing from the next request ------------------------
req POST "companies.php?action=contact_deactivate&id=$KA"
req GET "portal.php?action=jobs" '' "$ATOK"
check C10 "deactivated contact: no company jobs listed" eq "$(j '.company_jobs|length')" 0
req GET "portal.php?action=job&ref=$REF" '' "$ATOK"
check C10b "deactivated contact: job ref is 404 (even as the job's primary client)" eq "$CODE" 404

# ---- Switch: company portal off ------------------------------------------------------------
sql "UPDATE settings SET svalue = '0' WHERE skey = 'company_portal_enabled'"
req GET "portal.php?action=job&ref=$REF" '' "$BTOK"
check F1 "company portal off: contacts get 404" eq "$CODE" 404

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
