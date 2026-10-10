#!/usr/bin/env bash
# HeritOS Phase 2 end-to-end checks against LOCAL STAGING only.
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-phase2.sh
#
# Uses curl and jq against $STAGING_API (default http://127.0.0.1:8088). It
# refuses any host other than 127.0.0.1 or localhost, so it can never reach
# production. Staff tokens are minted straight into the local heritos_staging
# database (synthetic users only). Every record it creates is synthetic.
# Exit code: 0 when every check passes, 1 otherwise.
set -uo pipefail

API="${STAGING_API:-http://127.0.0.1:8088}"
case "$API" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing: STAGING_API must be http://127.0.0.1:<port> or http://localhost:<port>" >&2; exit 2 ;;
esac
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
RUN="$(date +%s)$RANDOM"
PASS=0; FAIL=0; RESULTS=()

mint() {   # mint a 1-day token for a synthetic staging user
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(32));')"
  "${DB[@]}" -e "INSERT INTO auth_tokens (user_id, token, expires_at)
                 SELECT id, '$tok', DATE_ADD(NOW(), INTERVAL 1 DAY) FROM users WHERE email = '$1' AND email LIKE '%@example.test'" || return 1
  echo "$tok"
}
TOKEN="${TOKEN:-$(mint staging-admin@example.test)}"
"${DB[@]}" -e "UPDATE users SET status = 'active' WHERE email = 'tailor01@example.test'"
TAILOR="$(mint tailor01@example.test)"

req() {    # req METHOD PATH [JSON] [TOKEN] → sets CODE and BODY
  local tok="${4:-$TOKEN}" out
  if [ "$1" = GET ]; then
    out="$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $tok" "$API/$2")"
  else
    out="$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $tok" -H 'Content-Type: application/json' -X POST "$API/$2" -d "${3:-{\}}")"
  fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
j() { echo "$BODY" | jq -r "$1"; }
check() {  # check ID NAME CONDITION(0/1 exit of the test command)
  local id="$1" name="$2"; shift 2
  if "$@"; then PASS=$((PASS+1)); RESULTS+=("PASS  $id  $name"); echo "PASS  $id  $name"
  else FAIL=$((FAIL+1)); RESULTS+=("FAIL  $id  $name"); echo "FAIL  $id  $name"; echo "      code=$CODE body=$(echo "$BODY" | head -c 400)"; fi
}
eq() { [ "$1" = "$2" ]; }
key() { echo "e2e-$RUN-$1"; }

PHONE="0700${RUN: -7}"
# ---- E1: enquiry → idempotent conversion ------------------------------------
curl -s -o /dev/null -H 'Content-Type: application/json' -X POST "$API/contact.php" \
  -d "{\"name\":\"E2E Enquirer $RUN\",\"phone\":\"$PHONE\",\"type\":\"bespoke\",\"interest\":\"Senator (test)\",\"quantity\":5,\"message\":\"Synthetic e2e\"}"
req GET "enquiries.php?action=list&q=E2E%20Enquirer%20$RUN"; EID="$(j '.items[0].id')"
req POST "enquiries.php?action=convert&id=$EID" "{\"request_key\":\"$(key conv)\",\"job\":{\"garment_type\":\"senator\",\"quantity\":5,\"due_date\":\"2026-12-01\",\"event_date\":\"2026-12-05\"}}"
C1="$CODE"; CID="$(j .client_id)"; JID="$(j .job_id)"
req POST "enquiries.php?action=convert&id=$EID" "{\"request_key\":\"$(key conv)\",\"job\":{\"garment_type\":\"senator\"}}"
check E1 "convert then retry with same key: same client and job, duplicate:true" \
  bash -c "[ '$C1' = 201 ] && [ '$CODE' = 200 ] && [ '$(j .client_id)' = '$CID' ] && [ '$(j .job_id)' = '$JID' ] && [ '$(j .duplicate)' = true ]"
N="$("${DB[@]}" -e "SELECT COUNT(*) FROM tailoring_orders WHERE enquiry_id = $EID")"
check E1b "exactly one job exists for the enquiry" eq "$N" 1

# ---- E2: duplicate phone → 409 with candidates, no silent merge -------------
curl -s -o /dev/null -H 'Content-Type: application/json' -X POST "$API/contact.php" \
  -d "{\"name\":\"E2E Housemate $RUN\",\"phone\":\"+234${PHONE:1}\",\"type\":\"general\",\"message\":\"Synthetic e2e\"}"
req GET "enquiries.php?action=list&q=E2E%20Housemate%20$RUN"; EID2="$(j '.items[0].id')"
req POST "enquiries.php?action=convert&id=$EID2" "{\"request_key\":\"$(key conv2)\",\"job\":{\"garment_type\":\"kaftan\"}}"
check E2 "same phone (+234 form) answers 409 with the existing client as candidate" \
  bash -c "[ '$CODE' = 409 ] && [ '$(j "[.candidates[].id] | index($CID) != null")' = true ]"
N="$("${DB[@]}" -e "SELECT COUNT(*) FROM enquiries WHERE id = $EID2 AND job_id IS NULL")"
check E2b "nothing was created or merged on 409" eq "$N" 1
req POST "enquiries.php?action=convert&id=$EID2" "{\"request_key\":\"$(key conv2)\",\"client\":{\"confirm_new\":true},\"job\":{\"garment_type\":\"kaftan\"}}"
check E2c "confirm_new creates a separate client" bash -c "[ '$CODE' = 201 ] && [ '$(j .client_id)' != '$CID' ]"

# ---- E3: measurement set approved → snapshot → new set; snapshot unchanged ---
req POST "measurements.php?action=create" "{\"customer_id\":$CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"41\",\"chest\":\"102\",\"shoulder\":\"\",\"bogus\":\"9\"},\"request_key\":\"$(key msa)\"}"
SA="$(j .set.id)"
check E3a "owner set is approved; blank and unknown keys dropped" \
  bash -c "[ '$(j .set.status)' = approved ] && [ '$(j '.set.vals | keys | join(",")')' = 'chest,neck' ]"
req POST "measurements.php?action=create" "{\"customer_id\":$CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"41\"},\"request_key\":\"$(key msa)\"}"
check E3b "repeated measurement request key returns the same set" bash -c "[ '$(j .duplicate)' = true ] && [ '$(j .set.id)' = '$SA' ]"
req POST "tailoring.php?action=attach_measurements&id=$JID" "{\"set_id\":$SA}"
req POST "measurements.php?action=create" "{\"customer_id\":$CID,\"template_key\":\"native_top\",\"unit\":\"in\",\"vals\":{\"neck\":\"16.5\",\"chest\":\"41\"},\"request_key\":\"$(key msb)\"}"
SB="$(j .set.id)"
req GET "tailoring.php?action=get&id=$JID"
check E3c "job snapshot still set A (cm, neck 41) after set B" \
  bash -c "[ '$(j .measurement_snapshot.set_id)' = '$SA' ] && [ '$(j .measurement_snapshot.unit)' = cm ] && [ '$(j .measurement_snapshot.vals.neck)' = 41 ]"
ST="$("${DB[@]}" -e "SELECT status FROM measurement_sets WHERE id = $SA")"
check E3d "set A is superseded by set B" eq "$ST" superseded
req POST "measurements.php?action=create" "{\"customer_id\":$CID,\"template_key\":\"native_top\",\"unit\":\"cm\",\"vals\":{\"neck\":\"0\"},\"request_key\":\"$(key msz)\"}"
check E3e "a 0 value is rejected with a field error" bash -c "[ '$CODE' = 400 ] && [ '$(j .errors.neck)' != null ]"

# ---- Mixed units ------------------------------------------------------------
req GET "measurements.php?action=convert_preview&id=$SB&to=cm"
check MU1 "inches set previews in cm (16.5 in = 41.9 cm), not stored" bash -c "[ '$(j .vals.neck)' = 41.9 ] && [ '$(j .stored)' = false ]"
IMP="$("${DB[@]}" -e "SELECT id FROM measurement_sets WHERE status = 'imported_unverified' ORDER BY id LIMIT 1")"
req POST "measurements.php?action=approve&id=$IMP" '{}'
check MU2 "imported set with unknown unit cannot be approved without a unit" bash -c "[ '$CODE' = 400 ] && [ '$(j .needs_unit)' = true ]"
req POST "measurements.php?action=approve&id=$IMP" '{"unit":"in"}'
check MU3 "approving with unit=in records the unit" bash -c "[ '$(j .set.status)' = approved ] && [ '$(j .set.unit)' = in ]"

# ---- E4: quotes: v1 sent, revised, v2 sent; v1 cannot be accepted -----------
req POST "quotes.php?action=create" "{\"job_id\":$JID,\"items\":[{\"description\":\"Senator (test)\",\"qty\":\"5\",\"unit_price\":\"15,000\"}],\"delivery_charge\":\"2000\",\"discount\":\"1000\",\"request_key\":\"$(key q1)\"}"
Q1="$(j .id)"
check E4a "quote totals computed on the server (5 x 15000 + 2000 - 1000)" eq "$(j .total)" "76000.00"
req POST "quotes.php?action=send&id=$Q1" '{"channel":"whatsapp"}'; H1="$(j .content_hash)"
EST="$("${DB[@]}" -e "SELECT status FROM enquiries WHERE id = $EID")"
check E4b "sending sets the enquiry to quote_sent" eq "$EST" quote_sent
req POST "quotes.php?action=revise&id=$Q1" "{\"request_key\":\"$(key q2)\"}"; Q2="$(j .id)"
req POST "quotes.php?action=save&id=$Q2" '{"items":[{"description":"Senator (test)","qty":"5","unit_price":"16000"}],"delivery_charge":"2000","discount":"1000","promised_date":"2026-12-02"}'
req POST "quotes.php?action=send&id=$Q2" '{"channel":"email"}'; H2="$(j .content_hash)"; N2="$(j .number)"
req POST "quotes.php?action=accept&id=$Q1" "{\"channel\":\"whatsapp\",\"content_hash\":\"$H1\"}"
check E4c "v1 (superseded) cannot be accepted" eq "$CODE" 409
req POST "quotes.php?action=accept&id=$Q2" "{\"channel\":\"in_person\",\"content_hash\":\"bad\"}"
check E4d "acceptance with a wrong content hash is refused" eq "$CODE" 409
req POST "quotes.php?action=accept&id=$Q2" "{\"channel\":\"in_person\",\"note\":\"Agreed at the shop\",\"content_hash\":\"$H2\"}"
req GET "tailoring.php?action=get&id=$JID"
check E4e "accepting v2 sets the job price, promised date and stage confirmed" \
  bash -c "[ '$(j .price)' = 81000.00 ] && [ '$(j .due_date)' = 2026-12-02 ] && [ '$(j .job_stage)' = confirmed ] && [ '$N2' = \"Q-$Q1-v2\" ]"
EST="$("${DB[@]}" -e "SELECT status FROM enquiries WHERE id = $EID")"
check E4f "the enquiry is accepted" eq "$EST" accepted

# ---- E5: ledger idempotency ------------------------------------------------
req POST "ledger.php?action=record" "{\"job_id\":$JID,\"amount\":\"30,000\",\"method\":\"cash\",\"request_key\":\"$(key p1)\"}"
req POST "ledger.php?action=record" "{\"job_id\":$JID,\"amount\":\"30,000\",\"method\":\"cash\",\"request_key\":\"$(key p1)\"}"
N="$("${DB[@]}" -e "SELECT COUNT(*) FROM job_payments WHERE job_id = $JID")"
check E5 "same request key twice: one ledger row, duplicate:true" bash -c "[ '$N' = 1 ] && [ '$(j .duplicate)' = true ] && [ '$(j .money.paid_verified)' = 30000.00 ]"

# ---- E6: two different payments at the same moment -------------------------
for k in pa pb; do
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -X POST "$API/ledger.php?action=record" \
    -d "{\"job_id\":$JID,\"amount\":\"10000\",\"method\":\"cash\",\"request_key\":\"$(key $k)\"}" &
done
wait
read -r N PT <<< "$("${DB[@]}" -e "SELECT (SELECT COUNT(*) FROM job_payments WHERE job_id = $JID), paid_total FROM tailoring_orders WHERE id = $JID")"
check E6 "two parallel payments both present; paid_total = 30000 + 10000 + 10000" bash -c "[ '$N' = 3 ] && [ '$PT' = 50000.00 ]"

# ---- E9: unverified transfer -----------------------------------------------
req POST "ledger.php?action=record" "{\"job_id\":$JID,\"amount\":\"20000\",\"method\":\"transfer\",\"external_ref\":\"TEST-E2E\",\"request_key\":\"$(key t1)\"}"
TID="$(j .entry.id)"
check E9a "transfer is not counted until verified" \
  bash -c "[ '$(j .entry.verified)' = 0 ] && [ '$(j .money.paid_verified)' = 50000.00 ] && [ '$(j .money.awaiting_verification)' = 20000.00 ]"
req GET "today.php"
check E9b "Today lists the unverified transfer" bash -c "[ '$(j "[.unverified_payments.items[].id] | index($TID) != null")' = true ]"
req POST "ledger.php?action=verify&id=$TID"
check E9c "verified transfer counts" eq "$(j .money.paid_verified)" "70000.00"

# ---- E7: overpayment shows credit ------------------------------------------
req POST "ledger.php?action=record" "{\"job_id\":$JID,\"amount\":\"16000\",\"method\":\"cash\",\"request_key\":\"$(key over)\"}"
OID="$(j .entry.id)"
check E7 "overpay by 5000: state credit, credit 5000, balance 0 (not capped)" \
  bash -c "[ '$(j .money.payment_state)' = credit ] && [ '$(j .money.credit)' = 5000.00 ] && [ '$(j .money.balance)' = 0.00 ]"
DEP="$("${DB[@]}" -e "SELECT deposit FROM tailoring_orders WHERE id = $JID")"
check E7b "deposit mirror equals paid_total (86000), above the price" eq "$DEP" "86000.00"

# ---- E8: reversal, then a second reversal is refused -----------------------
req POST "ledger.php?action=reverse&id=$OID" "{\"reason\":\"Typed twice by mistake\",\"request_key\":\"$(key r1)\"}"
check E8a "reversal entry nets the payment out" \
  bash -c "[ '$CODE' = 201 ] && [ '$(j .entry.amount)' = -16000.00 ] && [ '$(j .money.paid_verified)' = 70000.00 ] && [ '$(j .money.payment_state)' = part_paid ]"
req POST "ledger.php?action=reverse&id=$OID" "{\"reason\":\"Again\",\"request_key\":\"$(key r2)\"}"
check E8b "second reversal of the same entry is refused" eq "$CODE" 409

# ---- E10: invoice totals equal the ledger -----------------------------------
SUM="$("${DB[@]}" -e "SELECT SUM(amount) FROM job_payments WHERE job_id = $JID AND verified = 1")"
req GET "tailoring.php?action=document&id=$JID&doc=invoice"
JCODE="$(j .job.code)"
check E10 "invoice paid total equals the verified ledger sum; reversed entry marked" \
  bash -c "[ '$(j .totals.paid_verified)' = '$SUM' ] && [ '$(j .number)' = 'INV-$JCODE' ] && [ '$(j "[.entries[] | select(.id == $OID) | .reversed_by_id] | .[0] != null")' = true ]"
req GET "tailoring.php?action=document&id=$JID&doc=receipt&ref=$TID"
check E10b "receipt numbered RCT-{id}" eq "$(j .number)" "RCT-$TID"

# ---- E11: stale lock_version -------------------------------------------------
req GET "tailoring.php?action=get&id=$JID"; LV="$(j .lock_version)"
req POST "tailoring.php?action=update&id=$JID" "{\"lock_version\":$LV,\"next_action\":\"Call about fabric (test)\",\"next_action_date\":\"2026-10-01\"}"
OK1="$CODE"
req POST "tailoring.php?action=update&id=$JID" "{\"lock_version\":$LV,\"description\":\"stale\"}"
check E11 "update with the current version succeeds, then the stale one is 409" bash -c "[ '$OK1' = 200 ] && [ '$CODE' = 409 ]"

# ---- E12: partial handover (2 of 5) ---------------------------------------
"${DB[@]}" -e "UPDATE tailoring_orders SET job_stage = 'ready', stage = 'done' WHERE id = $JID"
req POST "tailoring.php?action=handover_save&id=$JID" "{\"method\":\"collection\",\"quantity\":2,\"planned_for\":\"2026-10-20T10:00\",\"request_key\":\"$(key h1)\"}"
H1ID="$(j .id)"; PF="$(j .planned_for)"
req POST "tailoring.php?action=handover_complete&id=$JID&hid=$H1ID" '{"received_by":"Test Client","checklist":{"garment_count":true,"fit":true}}'
check E12a "2 of 5 handed over: job stays ready; Lagos 10:00 stored as 09:00 UTC" \
  bash -c "[ '$(j .job_stage)' = ready ] && [ '$(j .handed_over_qty)' = 2 ] && [ '$(j .progress)' = '2 of 5 handed over' ] && [ '$PF' = '2026-10-20 09:00:00' ]"
req POST "tailoring.php?action=handover_save&id=$JID" "{\"method\":\"delivery\",\"quantity\":4,\"request_key\":\"$(key h2)\"}"
check E12b "cannot plan more pieces than remain" eq "$CODE" 409
req POST "tailoring.php?action=handover_save&id=$JID" "{\"method\":\"delivery\",\"quantity\":3,\"tracking_url\":\"http://x.test\",\"request_key\":\"$(key h3)\"}"
check E12c "non-https tracking link refused" eq "$CODE" 400
req POST "tailoring.php?action=handover_save&id=$JID" "{\"method\":\"delivery\",\"quantity\":3,\"courier\":\"Test Courier\",\"tracking_url\":\"https://track.example.test/1\",\"request_key\":\"$(key h4)\"}"
H2ID="$(j .id)"
req POST "tailoring.php?action=handover_complete&id=$JID&hid=$H2ID" '{"received_by":"Test Client"}'
check E12d "remaining 3 complete it: handed_over, 5 of 5" bash -c "[ '$(j .job_stage)' = handed_over ] && [ '$(j .handed_over_qty)' = 5 ]"

# ---- E13: legacy pay and legacy stage still work ----------------------------
req POST "tailoring.php?action=create" "{\"customer_id\":$CID,\"garment_type\":\"kaftan\",\"price\":\"45000\"}"; LJ="$(j .id)"
req POST "tailoring.php?action=stage&id=$LJ" '{"stage":"cut"}'
check E13a "legacy stage=cut maps to in_production and keeps stage=cut" bash -c "[ '$(j .job_stage)' = in_production ] && [ '$(j .stage)' = cut ]"
BEFORE="$("${DB[@]}" -e "SELECT COUNT(*) FROM job_payments WHERE job_id = $LJ")"
req POST "tailoring.php?action=pay&id=$LJ" '{"amount":5000}'
AFTER="$("${DB[@]}" -e "SELECT COUNT(*) FROM job_payments WHERE job_id = $LJ")"
check E13b "legacy pay writes one ledger entry (method unknown, awaiting verification)" \
  bash -c "[ '$CODE' = 200 ] && [ \$(( $AFTER - $BEFORE )) = 1 ] && [ '$(j .payment_verified)' = 0 ]"
req POST "tailoring.php?action=stage&id=$LJ" '{"stage":"ready"}'
check E13c "invalid new-stage move is refused with allowed list" bash -c "[ '$CODE' = 409 ] && [ '$(j '.allowed | length')' -gt 0 ]"

# ---- E14: tailor sees no money --------------------------------------------
req GET "tailoring.php?action=get&id=$JID" "" "$TAILOR"
check E14a "tailor job view has no price, deposit, paid_total, money or ledger" \
  bash -c "[ '$CODE' = 200 ] && [ '$(j 'has("price") or has("deposit") or has("paid_total") or has("money") or has("ledger")')' = false ]"
req GET "tailoring.php?action=list" "" "$TAILOR"
check E14b "tailor job list has no money fields" eq "$(j '[.[] | has("price") or has("balance")] | any')" false
req GET "ledger.php?action=list&job_id=$JID" "" "$TAILOR"
check E14c "tailor gets 403 from ledger.php" eq "$CODE" 403
req GET "today.php" "" "$TAILOR"
check E14d "tailor gets 403 from today.php" eq "$CODE" 403
req POST "tailoring.php?action=pay&id=$LJ" '{"amount":100}' "$TAILOR"
check E14e "tailor cannot record a payment" eq "$CODE" 403

# ---- E15: Today buckets -----------------------------------------------------
req GET "today.php"
check E15a "Today has every block" \
  bash -c "[ '$(j '[.appointments_today,.overdue,.due_soon,.next_actions,.ready,.enquiries,.balances,.credits,.unverified_payments,.stage_review,.measurements_pending] | map(has("count") and has("items")) | all')' = true ]"
check E15b "Today overdue contains a synthetic overdue job" bash -c "[ '$(j '.overdue.count')' -ge 1 ]"
check E15c "Today enquiries contain the due follow-up (Test Enquirer 02 or 05)" \
  bash -c "[ '$(j '[.enquiries.items[] | select(.name == "Test Enquirer 02" or .name == "Test Enquirer 05")] | length')' -ge 1 ]"
check E15e "Today date is the Lagos date" eq "$(j .date)" "$(TZ=Africa/Lagos date +%F)"

# ---- Client profile change leaves the job snapshot alone (BR-06) ------------
req POST "customers.php?action=measure&id=$CID" '{"measurements":{"neck":"17","chest":"44"}}'
req GET "tailoring.php?action=get&id=$JID"
check S1 "legacy profile measure creates a new set; job snapshot unchanged" bash -c "[ '$(j .measurement_snapshot.set_id)' = '$SA' ]"

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
