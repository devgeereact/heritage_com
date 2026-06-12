<?php
/**
 * HeritOS — server configuration TEMPLATE.
 *
 * Copy this to `config.php` ON THE SERVER (cPanel document root) and fill in the
 * real values. `config.php` is gitignored and must NEVER be committed.
 *
 * Provides: $conn (mysqli) + the constants every endpoint expects.
 * Keep the constant NAMES exactly as below — the PHP files read these names.
 *
 * IMPORTANT: use plain ASCII single quotes ('), not smart/curly quotes (’ ‘),
 * or PHP will throw a parse error and every endpoint returns a blank 500.
 */

// ---- Error reporting ---------------------------------------------------------
// One switch. Leave GK_DEBUG false in production: errors are still written to
// the PHP error log, but never shown to visitors (a stack trace leaks server
// paths). Flip to true only while debugging, then flip back.
define('GK_DEBUG', false);                 // true only while debugging
ini_set('display_errors', GK_DEBUG ? '1' : '0');
ini_set('display_startup_errors', GK_DEBUG ? '1' : '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// ---- Database (cPanel → MySQL Databases) -------------------------------------
define('DB_HOST', 'localhost');                        // stays localhost on Namecheap
define('DB_NAME', 'devgeereact_heritage_com');         // exact cPanel DB name
define('DB_USER', 'devgeereact_heritage_com');         // exact cPanel DB user
define('DB_PASS', 'CHANGE_ME');                        // the DB user's password

// ---- Auth --------------------------------------------------------------------
define('TOKEN_SECRET',   'CHANGE_ME_long_random_string'); // reserved for signed tokens
define('TOKEN_TTL_DAYS', 14);                             // session lifetime in days

// ---- OpenRouter (server-side AI only — key never reaches the browser) --------
define('OPENROUTER_KEY', '');                          // sk-or-v1-...  (set on server)
define('OR_MODEL',       'openai/gpt-oss-120b:free');  // primary model ai.php uses
define('OR_MODELS', [                                  // fallback chain, first → last
    'openai/gpt-oss-120b:free',
    'google/gemma-4-31b-it:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'anthropic/claude-sonnet-4-6',                     // paid fallback, last resort
]);
define('OR_REFERER', '');                              // '' = auto-detect from live request
define('OR_TITLE',   'Heritage Clothing');             // shown on OpenRouter dashboard

// ---- OpenWeather (https://openweathermap.org) --------------------------------
define('OPENWEATHER_API_KEY', '');                     // CHANGE_ME
define('OPENWEATHER_UNITS',   'metric');               // metric | imperial | standard

// ---- Payment gateways (storefront checkout — store.php) ----------------------
// Read by store.php via cfg(). Leave the secrets blank to run the storefront in
// "manual" mode: orders still place fine and the customer gets bank-transfer /
// pay-on-delivery instructions; no card step is offered. Drop in a secret key to
// switch card payments on — no code change needed.
//   PAYMENT_PROVIDER: '' auto-picks whichever secret is set; force one with
//   'paystack' or 'flutterwave'.
define('PAYMENT_PROVIDER', '');            // '' | 'paystack' | 'flutterwave'
define('PAYSTACK_SECRET',  '');            // sk_live_... / sk_test_...  (server only)
define('PAYSTACK_PUBLIC',  '');            // pk_live_... (safe for the browser, if needed)
define('FLW_SECRET',       '');            // FLWSECK-...  (server only)
define('FLW_PUBLIC',       '');            // FLWPUBK-...

// ---- Image AI (text-to-image — ai_image.php) ---------------------------------
// Read by ai_image.php via cfg(). Leave blank to keep the visual-AI features in
// "not configured" mode (the Studio shows a clean notice). Drop in a key to turn
// image generation on — no code change. IMAGE_PROVIDER '' auto-picks whichever
// key is set; force one with 'openai' or 'stability'.
define('IMAGE_PROVIDER',   '');            // '' | 'openai' | 'stability'
define('OPENAI_IMAGE_KEY', '');            // sk-...  (OpenAI Images / gpt-image-1)
define('STABILITY_KEY',    '');            // sk-...  (Stability AI)

// ---- Outgoing mail (SMTP) ----------------------------------------------------
// Read by mail.php (via cfg(), which accepts either these $vars or define()d
// constants of the same name). Leave $SMTP_HOST blank to fall back to PHP mail().
// On cPanel use the mail server host with a real mailbox + password.
$SMTP_HOST      = '';                      // e.g. 'premium152.web-hosting.com' or 'localhost'
$SMTP_PORT      = 465;                     // 465 = SSL, 587 = STARTTLS
$SMTP_SECURE    = 'ssl';                   // 'ssl' | 'tls' | ''  (must match the port)
$SMTP_USER      = 'hello@heritclothing.com';
$SMTP_PASS      = 'CHANGE_ME';             // mailbox password (secret; never commit)
$SMTP_FROM      = 'hello@heritclothing.com';
$SMTP_FROM_NAME = 'HERIT CLOTHING';

// ---- Incoming mail (IMAP) for the in-app inbox -------------------------------
// Read by inbox.php. Requires the PHP imap extension. Leave $IMAP_HOST blank to
// disable the inbox (the Inbox page then shows a clean "not configured" notice).
$IMAP_HOST = '';                           // e.g. 'premium152.web-hosting.com' or 'localhost'
$IMAP_PORT = 993;                          // 993 = IMAP over SSL
$IMAP_USER = 'hello@heritclothing.com';
$IMAP_PASS = 'CHANGE_ME';

// ---- CORS --------------------------------------------------------------------
// Production is same-origin. In dev, _lib.php reflects ANY localhost port, so
// this is only a fallback — no need to chase Vite's auto-port here.
define('CORS_ORIGIN', 'https://heritclothing.com');

// ---- Connect -----------------------------------------------------------------
// PHP 8.1+ makes mysqli THROW on a failed connection by default, which becomes
// an uncaught fatal (blank 500). Turn it off so we return a clean JSON error.
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_errno) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Database connection failed', 'detail' => $conn->connect_error]);
  exit;
}
$conn->set_charset('utf8mb4');
