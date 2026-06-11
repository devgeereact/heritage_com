<?php
/**
 * HeritOS — server configuration TEMPLATE.
 *
 * Copy this to `config.php` ON THE SERVER (cPanel document root) and fill in the
 * real values. `config.php` is gitignored and must NEVER be committed.
 *
 * It exposes:
 *   - $conn      a mysqli connection (host = localhost on cPanel)
 *   - constants  OpenRouter key/model, CORS origin, JWT/token secret
 */

// ---- Database (cPanel → MySQL Databases) -------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'heritage_com');      // <-- confirm exact cPanel DB name
define('DB_USER', 'heritage_com');      // <-- confirm exact cPanel DB user
define('DB_PASS', 'CHANGE_ME');         // <-- set to the DB user password

// ---- Auth --------------------------------------------------------------------
define('TOKEN_SECRET', 'CHANGE_ME_long_random_string'); // sign/verify session tokens
define('TOKEN_TTL_DAYS', 14);

// ---- OpenRouter (server-side AI only — key never reaches the browser) --------
define('OPENROUTER_KEY', '');                        // <-- set on server only
define('OR_MODEL', 'anthropic/claude-sonnet-4.6');   // pick from openrouter.ai/models

// ---- CORS --------------------------------------------------------------------
// Dev server origin allowed to call the live API. Production is same-origin.
// Vite dev may pick a different port; widen this if your dev port changes.
define('CORS_ORIGIN', 'http://localhost:5173');

// ---- Connect -----------------------------------------------------------------
// PHP 8.1+ makes mysqli THROW on a failed connection by default, which would be
// an uncaught fatal (blank 500). Turn that off so we return a clean JSON error.
mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_errno) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Database connection failed', 'detail' => $conn->connect_error]);
  exit;
}
$conn->set_charset('utf8mb4');
