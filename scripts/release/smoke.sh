#!/usr/bin/env bash
# HeritOS read-only smoke test (A02). Sends GET and HEAD requests only: never a
# POST, never a body, never a sign-in, never a cookie or token.
#
#   npm run release:smoke -- https://heritclothing.com
#   npm run release:smoke -- --api-only --no-headers http://127.0.0.1:8088
#   npm run release:smoke -- --site-only --no-headers http://127.0.0.1:4173
#
# Options:
#   --api-only    only the PHP checks (local staging serves php-api/ only)
#   --site-only   only the built site (a `vite preview` of dist/ has no PHP)
#   --no-headers  skip the Apache header and redirect checks (php -S and vite
#                 preview do not read .htaccess)
#
# Exit 0 when every check that ran passed, 1 when any failed, 2 on bad usage.
# Bash 3.2 compatible (macOS /bin/bash) and needs only curl.
set -uo pipefail

usage() { echo "Usage: smoke.sh [--api-only|--site-only] [--no-headers] <base-url>" >&2; exit 2; }

SITE=1 API=1 HEADERS=1 BASE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --api-only) SITE=0 ;;
    --site-only) API=0 ;;
    --no-headers) HEADERS=0 ;;
    -h|--help) usage ;;
    -*) echo "Unknown option: $1" >&2; usage ;;
    *) [ -z "$BASE" ] || usage; BASE="$1" ;;
  esac
  shift
done
[ -n "$BASE" ] || usage
[ "$SITE$API" = "00" ] && { echo "--api-only and --site-only together leave nothing to check" >&2; exit 2; }
case "$BASE" in
  http://*|https://*) ;;
  *) echo "The base URL must start with http:// or https://" >&2; exit 2 ;;
esac
BASE="${BASE%/}"
# Only scheme, host and port: a path or query in the base would change what is checked.
case "${BASE#*://}" in */*|*\?*|*#*) echo "Give the site root only, for example https://heritclothing.com" >&2; exit 2 ;; esac
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 2; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/heritos-smoke.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
PASS=0 FAIL=0 SKIP=0
CODE="" BODY="$TMP/body" HEAD="$TMP/headers"

# The only network call in this script. GET or HEAD, nothing else: no -d, no
# -F, no -X with another method, no cookies, no ~/.curlrc (-q), no redirects followed (so a 301 is
# seen as a 301), http and https only.
fetch() {
  local method="$1" url="$2"
  case "$method" in
    GET)  CODE="$(curl -q -sS --proto '=http,https' --max-redirs 0 --max-time 20 -o "$BODY" -D "$HEAD" -w '%{http_code}' "$url" 2>"$TMP/err")" || CODE="${CODE:-000}" ;;
    HEAD) CODE="$(curl -q -sS --proto '=http,https' --max-redirs 0 --max-time 20 -I -o /dev/null -D "$HEAD" -w '%{http_code}' "$url" 2>"$TMP/err")" || CODE="${CODE:-000}" ;;
    *) echo "smoke: refusing to send $method; only GET and HEAD are allowed" >&2; exit 2 ;;
  esac
  [ -s "$BODY" ] || : > "$BODY"
}

pass() { PASS=$((PASS + 1)); printf '  PASS  %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf '  FAIL  %s\n        %s\n' "$1" "$2"; }
skip() { SKIP=$((SKIP + 1)); printf '  SKIP  %s (%s)\n' "$1" "$2"; }
header() { grep -i "^$1:" "$HEAD" | head -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }
body_has() { grep -qF -- "$1" "$BODY"; }

expect_code() { # name, url, wanted codes (space separated), optional body text
  local name="$1" url="$2" want="$3" text="${4:-}"
  fetch GET "$url"
  case " $want " in
    *" $CODE "*)
      if [ -n "$text" ] && ! body_has "$text"; then fail "$name" "HTTP $CODE but the answer does not contain $text"; else pass "$name (HTTP $CODE)"; fi ;;
    *) fail "$name" "expected HTTP $want, got $CODE $(head -c 120 "$TMP/err" 2>/dev/null)" ;;
  esac
}

echo "HeritOS smoke test (GET and HEAD only) against $BASE"
case "$BASE" in
  *heritclothing.com*) echo "  This is production: read-only requests only, nothing is signed in or saved." ;;
esac
echo

if [ "$SITE" = 1 ]; then
  echo "Site"
  expect_code "home page serves the app shell" "$BASE/" "200" 'id="root"'
  expect_code "robots.txt" "$BASE/robots.txt" "200" "User-agent"
  fetch GET "$BASE/robots.txt"
  if grep -q '^Disallow: /today' "$BODY" && grep -q '^Disallow: /settings' "$BODY"; then
    pass "robots.txt keeps staff paths (/today, /settings) out of search"
  else
    fail "robots.txt keeps staff paths out of search" "no Disallow for /today or /settings"
  fi
  # A staff route is a client-side route: the rewrite must serve the app shell.
  # Its in-page noindex is set by JavaScript, so curl cannot see it.
  expect_code "staff route /today serves the app shell (SPA rewrite)" "$BASE/today" "200" 'id="root"'
  echo
fi

if [ "$API" = 1 ]; then
  echo "API"
  expect_code "sitemap.xml" "$BASE/sitemap.xml" "200" "<urlset"
  expect_code "public site config (site.php?action=config) answers JSON" "$BASE/site.php?action=config" "200" "{"
  expect_code "auth.php?action=me without a token is refused" "$BASE/auth.php?action=me" "401"
  expect_code "api.php answers a JSON array (database reachable)" "$BASE/api.php" "200" "["
  for path in retention.php release_check.php config.php config.sample.php _lib.php _release.php release-manifest.json; do
    expect_code "/$path is not served" "$BASE/$path" "403 404"
  done
  echo
fi

if [ "$HEADERS" = 1 ]; then
  echo "Headers (Apache .htaccess)"
  if [ "$SITE" = 1 ]; then
    fetch HEAD "$BASE/"
    [ "$(header X-Content-Type-Options)" = "nosniff" ] && pass "X-Content-Type-Options: nosniff on the page" || fail "X-Content-Type-Options on the page" "got '$(header X-Content-Type-Options)'"
    csp="$(header Content-Security-Policy)"
    case "$csp" in *"default-src 'self'"*) pass "Content-Security-Policy on the page" ;; *) fail "Content-Security-Policy on the page" "got '${csp:-none}'" ;; esac
    case "$(header Cache-Control)" in *no-cache*) pass "page shell is revalidated (Cache-Control: no-cache)" ;; *) fail "Cache-Control on the page" "got '$(header Cache-Control)'" ;; esac
    case "$BASE" in
      https://*)
        case "$(header Strict-Transport-Security)" in max-age=*) pass "Strict-Transport-Security on HTTPS" ;; *) fail "Strict-Transport-Security on HTTPS" "missing" ;; esac
        fetch HEAD "http://${BASE#https://}/"
        loc="$(header Location)"
        if [ "$CODE" = 301 ] && case "$loc" in https://*) true ;; *) false ;; esac; then pass "http:// answers 301 to https://"; else fail "http:// redirects to https://" "got $CODE ${loc:-no Location}"; fi
        ;;
      *) skip "Strict-Transport-Security and the HTTPS redirect" "base URL is http" ;;
    esac
  fi
  if [ "$API" = 1 ]; then
    fetch GET "$BASE/auth.php?action=me"
    case "$(header X-Robots-Tag)" in *noindex*) pass "PHP answers carry X-Robots-Tag: noindex" ;; *) fail "X-Robots-Tag on PHP answers" "got '$(header X-Robots-Tag)'" ;; esac
    [ "$(header X-Content-Type-Options)" = "nosniff" ] && pass "X-Content-Type-Options: nosniff on PHP answers" || fail "X-Content-Type-Options on PHP answers" "got '$(header X-Content-Type-Options)'"
  fi
  echo
else
  skip "header and redirect checks" "--no-headers"
  echo
fi

echo "Result: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" -eq 0 ]
