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
// Login throttling (auth.php). Failed attempts are counted in audit_log over a
// sliding window and answered with HTTP 429 once a limit is reached; 0 switches
// a limit off. The values below are the built-in defaults, so these lines are optional.
define('LOGIN_THROTTLE_WINDOW', 900);   // seconds
define('LOGIN_MAX_PER_IP',      10);    // email-login failures per IP
define('LOGIN_MAX_PER_ACCOUNT', 5);     // email-login failures per email address
define('PIN_MAX_PER_IP',        5);     // PIN failures per IP (the stall device)
define('PIN_MAX_GLOBAL',        20);    // PIN failures from every source combined

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
// International card payments (diaspora) via Stripe Checkout. Charges in
// STRIPE_CURRENCY, converting the NGN order total via STRIPE_USD_RATE (NGN per 1
// unit of that currency, e.g. 1600). Leave STRIPE_SECRET blank to keep it off.
define('STRIPE_SECRET',    '');            // sk_live_... / sk_test_...  (server only)
define('STRIPE_CURRENCY',  'usd');         // usd | gbp | eur …
define('STRIPE_USD_RATE',  0);             // NGN per 1 unit (0 = charge the NGN number as-is)

// ---- Image AI (text-to-image — ai_image.php) ---------------------------------
// Read by ai_image.php via cfg(). Leave IMAGE_PROVIDER blank to keep visual AI
// in "not configured" mode (Studio shows a clean notice).
//
// Easiest: set IMAGE_PROVIDER = 'openrouter' to reuse the OPENROUTER_KEY already
// configured above — NO extra key needed. Point OR_IMAGE_MODEL at an
// image-capable model (default below). The plain OR_MODEL used for text is NOT
// image-capable, so this is a separate model id.
//   '' auto-picks: OpenRouter (if its key is set and no dedicated image key is),
//   else OpenAI, else Stability. Force one with the provider name.
define('IMAGE_PROVIDER',   '');            // '' | 'openrouter' | 'openai' | 'stability'
define('OR_IMAGE_MODEL',   'google/gemini-2.5-flash-image');  // image-capable OpenRouter model (e.g. google/gemini-3.1-flash-image-preview, openai/gpt-5-image)
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

// ---- WhatsApp (Meta Cloud API) ----------------------------------------------
// Read by whatsapp.php + _lib.php's wa_dispatch(). Leave WHATSAPP_TOKEN blank to
// run in fallback mode: every "send" is logged and surfaced as a wa.me click-to-
// send link instead of going out automatically (nothing breaks, nothing is lost).
// To go live: create a Meta WhatsApp Business app, get a permanent token + the
// phone-number id, and point the webhook at /whatsapp.php?action=webhook using
// WHATSAPP_VERIFY_TOKEN as the verify string.
define('WHATSAPP_TOKEN',        '');       // permanent access token (server only)
define('WHATSAPP_PHONE_ID',     '');       // phone number ID from the Meta dashboard
define('WHATSAPP_VERIFY_TOKEN', '');       // any random string; must match the webhook config

// ---- Loyalty / store credit -------------------------------------------------
// Read by store.php pay_verify. Fraction of the goods value awarded back as
// store credit when a web order is confirmed paid. 0 = loyalty off; 0.02 = 2%.
define('LOYALTY_RATE', 0);

// ---- Referral reward --------------------------------------------------------
// Read by referral_settle() (_lib.php). Store credit (₦) given to BOTH the
// referrer and the new customer when a referred friend's first order is paid.
// 0 = referrals off. e.g. 2000 = "give ₦2,000, get ₦2,000".
define('REFERRAL_REWARD', 0);

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
