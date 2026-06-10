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
define('DB_NAME', 'heritcl_heritos');   // <-- set to your cPanel DB name
define('DB_USER', 'heritcl_heritos');   // <-- set to your cPanel DB user
define('DB_PASS', 'CHANGE_ME');         // <-- set to the DB user password

// ---- Auth --------------------------------------------------------------------
define('TOKEN_SECRET', 'CHANGE_ME_long_random_string'); // sign/verify session tokens
define('TOKEN_TTL_DAYS', 14);

// ---- OpenRouter (server-side AI only — key never reaches the browser) --------
define('OPENROUTER_KEY', '');                       // <-- set on server only
define('OR_MODEL', 'anthropic/claude-3.5-sonnet');  // pick from openrouter.ai/models

// ---- CORS --------------------------------------------------------------------
// Dev server origin allowed to call the live API. Production is same-origin.
define('CORS_ORIGIN', 'http://localhost:5173');

// ---- Connect -----------------------------------------------------------------
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_errno) {
  http_response_code(500);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Database connection failed']);
  exit;
}
$conn->set_charset('utf8mb4');
