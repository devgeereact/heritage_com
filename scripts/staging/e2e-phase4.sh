#!/usr/bin/env bash
# HeritOS Phase 4 end-to-end checks (website CMS, public projection, sitemap,
# robots, image uploads) against LOCAL STAGING only.
#
#   npm run staging:setup && npm run staging:serve   (in another terminal)
#   bash scripts/staging/e2e-phase4.sh
#
# Uses curl, jq and php against $STAGING_API (default http://127.0.0.1:8088)
# and refuses any other host, so it never reaches production. It writes to the
# local heritos_staging database only to mint staff tokens and to add a
# synthetic editor account. Test images are generated here (flat colours, a
# fake EXIF block, a PHP file renamed .jpg); no real photographs. Exit 0 only
# when every check passes.
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
DB=(mariadb heritos_staging -N -B)
command -v mariadb >/dev/null 2>&1 || DB=(mysql heritos_staging -N -B)
RUN="$(date +%s)$RANDOM"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0

sql() { "${DB[@]}" -e "$1"; }
mint() {
  local tok; tok="$(php -r 'echo bin2hex(random_bytes(32));')"
  sql "INSERT INTO auth_tokens (user_id, token, expires_at)
       SELECT id, SHA2('$tok', 256), DATE_ADD(NOW(), INTERVAL 1 DAY) FROM users WHERE email = '$1' AND email LIKE '%@example.test'" || return 1
  echo "$tok"
}
TOKEN="$(mint staging-admin@example.test)"
sql "INSERT IGNORE INTO users (name, email, password_hash, role, status)
     VALUES ('Test Editor 01', 'editor01@example.test', '!', 'editor', 'active')"
EDITOR="$(mint editor01@example.test)"

req() {    # req METHOD PATH [JSON] [TOKEN|-] -> CODE, BODY.  "-" sends no Authorization header.
  local tok="${4:-$TOKEN}" out auth=()
  [ "$tok" != "-" ] && auth=(-H "Authorization: Bearer $tok")
  if [ "$1" = GET ]; then
    out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} "$API/$2")"
  else
    out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -H 'Content-Type: application/json' -X POST "$API/$2" -d "${3:-{\}}")"
  fi
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
upload() { # upload FILE [TOKEN|-] [alt]
  local tok="${2:-$TOKEN}" out auth=()
  [ "$tok" != "-" ] && auth=(-H "Authorization: Bearer $tok")
  out="$(curl -s -w '\n%{http_code}' ${auth[@]+"${auth[@]}"} -F "file=@$1" -F "alt_text=${3:-}" "$API/cms.php?action=media_upload")"
  CODE="${out##*$'\n'}"; BODY="${out%$'\n'*}"
}
j() { echo "$BODY" | jq -r "$1"; }
check() {
  local id="$1" name="$2"; shift 2
  if "$@"; then PASS=$((PASS+1)); echo "PASS  $id  $name"
  else FAIL=$((FAIL+1)); echo "FAIL  $id  $name"; echo "      code=$CODE body=$(echo "$BODY" | head -c 400)"; fi
}
eq() { [ "$1" = "$2" ]; }
pub() { req GET "site.php?action=$1" -; }
in_sitemap() { curl -s "$API/sitemap.xml" | grep -qF "<loc>$1</loc>"; }
SITE="$(curl -s "$API/site.php?action=config" | jq -r .site_url)"

# ---- Test images (generated; never photographs) -------------------------------
php -r '
$d = $argv[1];
$im = imagecreatetruecolor(2000, 1000); imagefill($im, 0, 0, imagecolorallocate($im, 90, 60, 40));
$ink = imagecolorallocate($im, 255, 255, 255);
imagestring($im, 5, 20, 20, "STAGING E2E " . $argv[2], $ink);   // the run id keeps each run unique
imagejpeg($im, "$d/plain.jpg", 85);
// The same JPEG with an EXIF block: Make=STAGINGCAM and a GPS IFD (GPSLatitudeRef N).
$tiff = "II" . pack("v", 42) . pack("V", 8)
  . pack("v", 2)
  . pack("vvVV", 0x010F, 2, 11, 38)
  . pack("vvVV", 0x8825, 4, 1, 50)
  . pack("V", 0)
  . "STAGINGCAM\0" . "\0"
  . pack("v", 1) . pack("vvV", 0x0001, 2, 2) . "N\0\0\0" . pack("V", 0);
$app1 = "\xFF\xE1" . pack("n", strlen($tiff) + 8) . "Exif\0\0" . $tiff;
$jpg = file_get_contents("$d/plain.jpg");
imagefill($im, 0, 0, imagecolorallocate($im, 40, 60, 90)); imagestring($im, 5, 20, 20, "STAGING E2E " . $argv[2], $ink);
imagejpeg($im, "$d/base2.jpg", 85);
$jpg2 = file_get_contents("$d/base2.jpg");
file_put_contents("$d/exif.jpg", substr($jpg2, 0, 2) . $app1 . substr($jpg2, 2));
// A real JPEG with PHP appended (polyglot), and PHP renamed .jpg.
imagefill($im, 0, 0, imagecolorallocate($im, 60, 90, 40)); imagestring($im, 5, 20, 20, "STAGING E2E " . $argv[2], $ink);
imagejpeg($im, "$d/base3.jpg", 85);
file_put_contents("$d/polyglot.jpg", file_get_contents("$d/base3.jpg") . "<?php echo \"PWNED\"; ?>");
file_put_contents("$d/evil.jpg", "<?php echo \"PWNED\"; ?>\n");
// 13 MB of noise named .jpg (over MEDIA_MAX_MB 8).
$f = fopen("$d/big.jpg", "w"); for ($i = 0; $i < 13; $i++) fwrite($f, random_bytes(1048576)); fclose($f);
' "$TMP" "$RUN"

# ---- Public config: only set facts, no private fields --------------------------
pub config
check P1 "config: staging business, checked socials, JSON-LD without ratings" \
  bash -c "[ '$CODE' = 200 ] && [ '$(j .business.name)' = 'Herit Clothing (Staging)' ] && [ '$(j '.socials|length')' -ge 1 ] && [ '$(j .jsonld.name)' = 'Herit Clothing (Staging)' ] && ! echo '$BODY' | grep -q aggregateRating"
check P2 "config: private address hidden (business_address_public=0)" eq "$(j '.business.address // "none"')" none
ETAG="$(curl -s -D - -o /dev/null "$API/site.php?action=config" | tr -d '\r' | awk -F': ' 'tolower($1)=="etag"{print $2}')"
check P3 "config: ETag answered with 304" eq "$(curl -s -o /dev/null -w '%{http_code}' -H "If-None-Match: $ETAG" "$API/site.php?action=config")" 304

# ---- Business profile ------------------------------------------------------------
req POST "cms.php?action=profile_save" '{"business_phone":"0800 000 0098"}'
pub config
check W1 "profile: new phone appears in the public config" eq "$(j .business.phone)" "0800 000 0098"
req POST "cms.php?action=profile_save" '{"business_phone":"0800 000 0099"}'
req POST "cms.php?action=profile_save" '{"socials":{"instagram":"http://instagram.com/x","facebook":"https://facebook.com.evil.io/x","x":"javascript:alert(1)","whatsapp":"https://wa.me/234"}}'
check W2 "profile: http, look-alike host, javascript: and short wa.me links refused" \
  bash -c "[ '$CODE' = 400 ] && [ '$(j '.errors|keys|sort|join(",")')' = 'socials.facebook,socials.instagram,socials.whatsapp,socials.x' ]"
req POST "settings.php" '{"socials":{"instagram":"https://instagram.com"}}'
check W3 "settings.php: same social rules (home page link refused)" eq "$CODE" 400
req POST "cms.php?action=profile_save" '{"business_name":"Editor change"}' "$EDITOR"
check W4 "profile: editor refused (owner only)" eq "$CODE" 403
pub config
check W5 "profile: refused saves changed nothing" bash -c "[ '$(j .business.name)' = 'Herit Clothing (Staging)' ] && [ '$(j '.socials|length')' = 2 ]"

# ---- Draft, preview, publish, rollback, unpublish ---------------------------------
SLUG="e2e-service-$RUN"
req POST "cms.php?action=save_draft&entity=service" "{\"slug\":\"$SLUG\",\"data\":{\"title\":\"E2E Service v1\",\"summary\":\"First\"}}"
SID="$(j .item.id)"
check D1 "draft: created (201) with status draft" bash -c "[ '$CODE' = 201 ] && [ '$(j .item.status)' = draft ]"
pub "service&slug=$SLUG"
check D2 "draft: not visible publicly (404)" eq "$CODE" 404
check D3 "draft: not in the sitemap" bash -c "! curl -s '$API/sitemap.xml' | grep -qF '$SLUG'"
req GET "cms.php?action=preview&entity=service&id=$SID" '' -
check D4 "preview: needs a staff token (401)" eq "$CODE" 401
req GET "cms.php?action=preview&entity=service&id=$SID"
check D5 "preview: staff see the draft projection" eq "$(j .preview.title)" "E2E Service v1"
req POST "cms.php?action=publish&entity=service&id=$SID"
pub "service&slug=$SLUG"
check D6 "publish: visible publicly" bash -c "[ '$CODE' = 200 ] && [ '$(j .service.title)' = 'E2E Service v1' ]"
check D7 "publish: listed in the sitemap" in_sitemap "$SITE/services/$SLUG"
req POST "cms.php?action=save_draft&entity=service" "{\"id\":$SID,\"data\":{\"title\":\"E2E Service v2\",\"summary\":\"Second\"}}"
pub "service&slug=$SLUG"
check D8 "draft over a published item: public still v1" eq "$(j .service.title)" "E2E Service v1"
req POST "cms.php?action=publish&entity=service&id=$SID"
check D9 "publish v2: version 2, earlier version kept" bash -c "[ '$(j .item.version)' = 2 ] && [ '$(j .item.has_prev)' = true ]"
pub "service&slug=$SLUG"
check D10 "publish v2: public shows v2" eq "$(j .service.title)" "E2E Service v2"
req POST "cms.php?action=rollback&entity=service&id=$SID"
pub "service&slug=$SLUG"
check D11 "rollback: public shows v1 again" eq "$(j .service.title)" "E2E Service v1"
req POST "cms.php?action=save_draft&entity=service" "{\"id\":$SID,\"slug\":\"$SLUG-renamed\",\"data\":{\"title\":\"E2E Service v3\"}}"
check D12 "slug locked once published (409)" bash -c "[ '$CODE' = 409 ] && [ '$(j .code)' = slug_locked ]"
req POST "cms.php?action=delete&entity=service&id=$SID"
check D13 "published item cannot be deleted (409)" eq "$CODE" 409
req POST "cms.php?action=unpublish&entity=service&id=$SID"
pub "service&slug=$SLUG"
check D14 "unpublish: public 404" eq "$CODE" 404
check D15 "unpublish: gone from the sitemap" bash -c "! curl -s '$API/sitemap.xml' | grep -qF '$SLUG'"
pub services
check D16 "unpublish: gone from the services list" bash -c "! echo '$BODY' | grep -qF '$SLUG'"

# ---- Malicious HTML ---------------------------------------------------------------
BAD='<p onclick=\"steal()\">Hi<script>alert(1)</script><img src=x onerror=alert(2)> <a href=\"javascript:alert(3)\">x</a><iframe src=\"https://evil.test\"></iframe></p>'
req POST "cms.php?action=save_draft&entity=faq" "{\"data\":{\"question\":\"E2E question $RUN?\",\"answer\":\"$BAD\"}}"
FID="$(j .item.id)"
check H1 "malicious HTML stripped in the stored draft" \
  bash -c "! echo '$(j .item.draft.answer)' | grep -qiE 'script|onerror|onclick|javascript:|iframe'"
req POST "cms.php?action=publish&entity=faq&id=$FID"
pub faqs
check H2 "malicious HTML absent from the public FAQ" \
  bash -c "echo '$BODY' | grep -qF 'E2E question $RUN' && ! echo '$BODY' | grep -qiE 'script|onerror|onclick|javascript:|iframe'"
req POST "cms.php?action=save_draft&entity=faq" "{\"id\":$FID,\"data\":{\"question\":\"Q?\",\"answer\":\"<p>[owner: write this]</p>\"}}"
req POST "cms.php?action=publish&entity=faq&id=$FID"
check H3 "placeholder text blocks publishing (422)" bash -c "[ '$CODE' = 422 ] && [ '$(j '.problems.placeholder != null')' = true ]"

# ---- Uploads ----------------------------------------------------------------------
upload "$TMP/evil.jpg"
check U1 "PHP disguised as .jpg refused (415)" eq "$CODE" 415
upload "$TMP/big.jpg"
check U2 "13 MB upload refused (413)" eq "$CODE" 413
upload "$TMP/plain.jpg" -
check U3 "upload needs a staff token (401)" eq "$CODE" 401
upload "$TMP/polyglot.jpg"
POLY="$BODY"
check U4 "JPEG with PHP appended: accepted, re-encoded" eq "$CODE" 201
POLYOK=1
for u in $(echo "$POLY" | jq -r '.media.public.srcset[].url, .media.public.url'); do
  curl -s "$API$u" | grep -q 'PWNED' && POLYOK=0
done
check U5 "re-encoded images carry no appended PHP" eq "$POLYOK" 1
php -r '$e = @exif_read_data($argv[1], null, true); exit(isset($e["IFD0"]["Make"], $e["GPS"]) ? 0 : 1);' "$TMP/exif.jpg"
check U6 "test image really has EXIF Make and GPS" eq "$?" 0
upload "$TMP/exif.jpg" "$TOKEN" "E2E navy swatch, front view"
EXIF_ID="$(j .media.id)"; EXIF_BODY="$BODY"
check U7 "JPEG with EXIF accepted (201) with variants 800, 1600 and 2000 (never upscaled)" \
  bash -c "[ '$CODE' = 201 ] && [ '$(j '[.media.public.srcset[].width]|join(",")')' = '800,1600,2000' ] && [ '$(j .media.width)' = 2000 ]"
NOEXIF=1
for u in $(echo "$EXIF_BODY" | jq -r '.media.public.srcset[].url, .media.public.url'); do
  curl -s "$API$u" -o "$TMP/out.bin"
  grep -aq -e 'STAGINGCAM' -e 'Exif' "$TMP/out.bin" && NOEXIF=0
done
php -r '$e = @exif_read_data($argv[1], null, true); exit(($e && (isset($e["GPS"]) || isset($e["IFD0"]["Make"]))) ? 1 : 0);' "$TMP/out.bin" || NOEXIF=0
check U8 "served variants have no EXIF or GPS" eq "$NOEXIF" 1
NAMES="$(echo "$EXIF_BODY" | jq -r '.media.public.url')"
check U9 "file names are random hex, not the upload name" bash -c "echo '$NAMES' | grep -qE '^/uploads/site/[a-f0-9]{32}-w[0-9]+\.jpg$'"
check U10 "variant served as an image" bash -c "curl -s -o /dev/null -w '%{content_type}' '$API$(echo "$EXIF_BODY" | jq -r '.media.public.srcset[0].url')' | grep -q image/webp"
check U11 "a .php path under /uploads is never executed (404, no output)" \
  bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' '$API/uploads/site/evil.php')\" = 404 ] && ! curl -s '$API/uploads/site/evil.php' | grep -q PWNED"
check U12 "uploads folder has no PHP files" bash -c "! ls '$ROOT/scripts/staging/.uploads/site' | grep -qvE '^[a-f0-9]{32}-w[0-9]+\.(webp|jpg)$'"
upload "$TMP/exif.jpg"
check U13 "same image again is recognised (200 duplicate)" bash -c "[ '$CODE' = 200 ] && [ '$(j .duplicate)' = true ] && [ '$(j .media.id)' = '$EXIF_ID' ]"

# ---- Portfolio consent, alt text and private fields --------------------------------
req POST "cms.php?action=media_update&id=$EXIF_ID" '{"alt_text":""}'
PSLUG="e2e-project-$RUN"
req POST "cms.php?action=save_draft&entity=project" "{\"slug\":\"$PSLUG\",\"data\":{\"title\":\"E2E Project\",\"cover_media_id\":$EXIF_ID,\"consent_note\":\"Signed by client 0803 555 0101\",\"client_id\":424242}}"
PID="$(j .item.id)"
req POST "cms.php?action=publish&entity=project&id=$PID"
check C1 "publish refused without consent and alt text (422)" \
  bash -c "[ '$CODE' = 422 ] && [ '$(j '.problems.consent != null')' = true ] && [ '$(j ".problems[\"media.$EXIF_ID\"] != null")' = true ]"
req POST "cms.php?action=media_update&id=$EXIF_ID" '{"alt_text":"E2E navy swatch, front view"}'
req POST "cms.php?action=save_draft&entity=project" "{\"id\":$PID,\"data\":{\"title\":\"E2E Project\",\"summary\":\"Call 0803 555 0101\",\"cover_media_id\":$EXIF_ID,\"consent_images\":true,\"consent_client\":true,\"consent_note\":\"Signed by client\",\"client_id\":424242}}"
req POST "cms.php?action=publish&entity=project&id=$PID"
check C2 "phone number in public text needs confirmation (409 warnings)" bash -c "[ '$CODE' = 409 ] && [ '$(j '.warnings|join(",")')' = phone ]"
req POST "cms.php?action=save_draft&entity=project" "{\"id\":$PID,\"data\":{\"title\":\"E2E Project\",\"summary\":\"A navy suit\",\"cover_media_id\":$EXIF_ID,\"consent_images\":true,\"consent_client\":true,\"consent_note\":\"Signed by client\",\"client_id\":424242}}"
req POST "cms.php?action=publish&entity=project&id=$PID"
check C3 "publish with consents and alt text" eq "$CODE" 200
pub "work_item&slug=$PSLUG"
check C4 "project public, no consent or client fields" \
  bash -c "[ '$CODE' = 200 ] && ! echo '$BODY' | grep -qE 'consent|client_id|424242'"
req POST "cms.php?action=media_delete&id=$EXIF_ID"
check C5 "image in use cannot be deleted (409)" eq "$CODE" 409

# ---- Roles --------------------------------------------------------------------------
req GET "cms.php?action=list&entity=policy" '' "$EDITOR"
PRIV="$(j '.items[] | select(.key=="privacy") | .id')"
check R1 "editor can read the CMS" eq "$CODE" 200
req POST "cms.php?action=unpublish&entity=policy&id=$PRIV" '{}' "$EDITOR"
check R2 "editor cannot unpublish a policy (403)" eq "$CODE" 403
TAILOR="$(mint tailor01@example.test)"
req GET "cms.php?action=list&entity=service" '' "$TAILOR"
check R3 "tailor has no CMS access (403)" eq "$CODE" 403

# ---- Whole public projection: nothing private -----------------------------------------
ALL=""
for a in config home services "service&slug=staging-service-one" work "work_item&slug=staging-project-1" faqs "policy&key=privacy" "page&key=about" journal; do
  pub "$a"; ALL="$ALL$BODY"
done
check X1 "no private or staff fields in any public answer" \
  bash -c "! echo '$ALL' | grep -qE '\"(draft|prev|live|consent[a-z_]*|own_work|client_id|customer_id|source_job_id|created_by|draft_updated_by|sha256|base_name)\"'"
pub "page&key=company"
check X2 "unpublished page key answers 404" eq "$CODE" 404
pub "policy&key=cookies"
check X3 "unknown policy answers 404" eq "$CODE" 404
req POST "site.php?action=config" '{}' -
check X4 "public projection is GET only (405)" eq "$CODE" 405

# ---- Sitemap and robots -----------------------------------------------------------------
check S1 "sitemap is XML with the right type" bash -c "curl -s -D - -o /dev/null '$API/sitemap.xml' | tr -d '\r' | grep -qi '^content-type: application/xml'"
curl -s "$API/sitemap.xml" > "$TMP/sitemap.xml"
php -r 'exit(simplexml_load_file($argv[1]) === false ? 1 : 0);' "$TMP/sitemap.xml"
check S2 "sitemap parses" eq "$?" 0
check S3 "sitemap lists published items and the published project" \
  bash -c "grep -qF '$SITE/services/staging-service-one' '$TMP/sitemap.xml' && grep -qF '$SITE/work/$PSLUG' '$TMP/sitemap.xml'"
check S4 "sitemap has no admin, portal or unpublished paths" \
  bash -c "! grep -qE '/(website|account|today|settings|company-orders|how-it-works)' '$TMP/sitemap.xml' && ! grep -qF '$SLUG' '$TMP/sitemap.xml'"
req POST "cms.php?action=profile_save" '{"journal_enabled":"0"}'
check S5 "journal off: gone from the sitemap and the journal list" \
  bash -c "! curl -s '$API/sitemap.xml' | grep -qF '/journal' && [ \"\$(curl -s '$API/site.php?action=journal' | jq '.items|length')\" = 0 ]"
req POST "cms.php?action=profile_save" '{"journal_enabled":"1"}'
check S6 "journal on: published post listed" in_sitemap "$SITE/journal/test-post-published"
curl -s "$API/robots.txt" > "$TMP/robots.txt"
check S7 "robots.txt served, points at the sitemap, blocks admin and portal" \
  bash -c "grep -q '^Sitemap: https://heritclothing.com/sitemap.xml' '$TMP/robots.txt' && grep -q '^Disallow: /website' '$TMP/robots.txt' && grep -q '^Disallow: /account' '$TMP/robots.txt'"

# ---- Invented offers removed ---------------------------------------------------------------
req GET "store.php?action=catalogue" '' -
check O1 "no free-delivery offer in the catalogue reply" eq "$(j .free_ship_over)" null
# heritage-accessory was only in the removed fallback list, never a seeded product.
FALLBACK_SLUG=heritage-accessory
[ "$(sql "SELECT COUNT(*) FROM products WHERE slug = '$FALLBACK_SLUG' AND published = 1 AND deleted_at IS NULL")" = 0 ] || FALLBACK_SLUG="e2e-no-such-piece-$RUN"
# The retail shop is deferred: its public writes answer 403 while shop_enabled is off.
SHOP_WAS="$(sql "SELECT svalue FROM settings WHERE skey = 'shop_enabled'")"
sql "INSERT INTO settings (skey, svalue) VALUES ('shop_enabled','0') ON DUPLICATE KEY UPDATE svalue = '0'"
req POST "store.php?action=checkout" "{\"customer\":\"E2E\",\"phone\":\"08000000001\",\"delivery\":\"pickup\",\"items\":[{\"slug\":\"$FALLBACK_SLUG\",\"qty\":1}]}" -
check O2a "checkout refused while the shop is switched off" eq "$CODE" 403
sql "UPDATE settings SET svalue = '1' WHERE skey = 'shop_enabled'"
req POST "store.php?action=checkout" "{\"customer\":\"E2E\",\"phone\":\"08000000001\",\"delivery\":\"pickup\",\"items\":[{\"slug\":\"$FALLBACK_SLUG\",\"qty\":1}]}" -
check O2 "slug from the removed fallback list refused at checkout" bash -c "[ '$CODE' = 400 ] && echo '$BODY' | grep -q 'Unknown item'"
sql "UPDATE settings SET svalue = '${SHOP_WAS:-0}' WHERE skey = 'shop_enabled'"
check O3 "seeded HERIT10 and FREESHIP codes switched off" \
  eq "$(sql "SELECT COUNT(*) FROM coupons WHERE code IN ('HERIT10','FREESHIP') AND active = 1")" 0

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
