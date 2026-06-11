<?php
/**
 * HeritOS — server configuration TEMPLATE.
 *
 * Copy this to `config.php` ON THE SERVER (cPanel document root) and fill in the
 * real values. `config.php` is gitignored and must NEVER be committed.
 *
 * Provides: $conn (mysqli) + the constants every endpoint expects.
 * Keep the constant NAMES exactly as below — the PHP files read these names.
 */

// ---- Database (cPanel → MySQL Databases) -------------------------------------
define('DB_HOST', 'localhost');                        // stays localhost on Namecheap
define('DB_NAME', 'devgeereact_heritage_com');         // exact cPanel DB name
define('DB_USER', 'devgeereact_heritage_com');         // exact cPanel DB user
define('DB_PASS', 'CHANGE_ME');                        // the DB user's password

// ---- Auth --------------------------------------------------------------------
define('TOKEN_SECRET', 'CHANGE_ME_long_random_string');// reserved for signed tokens
define('TOKEN_TTL_DAYS', 14);                          // session lifetime

// ---- OpenRouter (server-side AI only — key never reaches the browser) --------
define('OPENROUTER_KEY', '');                          // sk-or-v1-...  (set on server)
define('OR_MODEL', 'openai/gpt-oss-120b:free');        // model ai.php uses; pick from openrouter.ai/models

// ---- CORS --------------------------------------------------------------------
// Production is same-origin. In dev, _lib.php reflects ANY localhost port, so
// this is only a fallback — no need to chase Vite's auto-port here.
define('CORS_ORIGIN', 'http://localhost:5173');

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
