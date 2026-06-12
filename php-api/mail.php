<?php
/**
 * HeritOS — outgoing mail (SMTP), no Composer / no PHPMailer.
 *
 *   POST /mail.php?action=send
 *     { to, subject, body, cc?, reply_to?, in_reply_to?, references? }
 *     → { ok: true }   (body is treated as HTML)
 *
 * Reads SMTP_* from config.php via cfg() — either $SMTP_HOST style vars or
 * define()d constants work. If SMTP_HOST is blank, falls back to PHP mail().
 *
 * Staff-only (managers and up). Every send is written to the audit log.
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
$user = require_auth($STAFF);

$action = $_GET['action'] ?? 'send';
if ($action !== 'send' || method() !== 'POST') fail('Unknown action', 404);

$b = body();
$to      = trim($b['to'] ?? '');
$subject = trim($b['subject'] ?? '');
$html    = (string)($b['body'] ?? '');
$cc      = trim($b['cc'] ?? '');
$replyTo = trim($b['reply_to'] ?? '');
$inReplyTo = trim($b['in_reply_to'] ?? '');   // Message-ID being replied to (threading)
$references = trim($b['references'] ?? '');

if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail('A valid recipient (to) is required.');
if ($subject === '') fail('Subject is required.');
if (trim(strip_tags($html)) === '') fail('Message body is required.');

$fromAddr = cfg('SMTP_FROM', cfg('SMTP_USER'));
$fromName = cfg('SMTP_FROM_NAME', 'HeritOS');

// Build RFC822 headers + HTML body.
$boundaryId = bin2hex(random_bytes(8));
$msgId = '<' . $boundaryId . '@heritclothing.com>';
$headers = [];
$headers[] = 'From: ' . mime_name($fromName) . ' <' . $fromAddr . '>';
$headers[] = 'To: ' . $to;
if ($cc !== '') $headers[] = 'Cc: ' . $cc;
$headers[] = 'Reply-To: ' . ($replyTo !== '' ? $replyTo : $fromAddr);
$headers[] = 'Message-ID: ' . $msgId;
if ($inReplyTo !== '') $headers[] = 'In-Reply-To: ' . $inReplyTo;
if ($references !== '') $headers[] = 'References: ' . $references;
elseif ($inReplyTo !== '') $headers[] = 'References: ' . $inReplyTo;
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/html; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'Subject: ' . mime_header($subject);
$headers[] = 'Date: ' . date('r');

$rcpts = array_filter(array_map('trim', array_merge([$to], $cc !== '' ? explode(',', $cc) : [])));

try {
  if (cfg('SMTP_HOST') === '') {
    // No SMTP configured — use PHP mail(). Subject + headers passed separately.
    $h = implode("\r\n", array_filter($headers, fn($x) => stripos($x, 'Subject:') !== 0 && stripos($x, 'To:') !== 0));
    $ok = mail($to, mime_header($subject), $html, $h);
    if (!$ok) fail('mail() failed (no SMTP configured and local MTA refused).', 502);
  } else {
    smtp_send($fromAddr, $rcpts, $headers, $html);
  }
} catch (Throwable $e) {
  $detail = (defined('GK_DEBUG') && GK_DEBUG) ? $e->getMessage() : null;
  json(['error' => 'Could not send email', 'detail' => $detail], 502);
}

audit($user['id'], 'mail_send', 'email', null, ['to' => $to, 'subject' => $subject]);
json(['ok' => true, 'message_id' => $msgId]);

/* -------------------------------------------------------------------------- */

/** RFC2047-encode a header value if it contains non-ASCII. */
function mime_header($s) {
  return preg_match('/[^\x20-\x7E]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
}
/** Encode a display name for use in From: (quote if needed). */
function mime_name($s) {
  if (preg_match('/[^\x20-\x7E]/', $s)) return mime_header($s);
  return '"' . str_replace('"', '', $s) . '"';
}

/**
 * Minimal SMTP client: connect, EHLO, optional STARTTLS, AUTH LOGIN, send.
 * Throws RuntimeException with the server reply on any unexpected response.
 */
function smtp_send($from, array $rcpts, array $headers, $body) {
  $host   = cfg('SMTP_HOST');
  $port   = (int) cfg('SMTP_PORT', 465);
  $secure = strtolower(cfg('SMTP_SECURE', 'ssl'));
  $user   = cfg('SMTP_USER');
  $pass   = cfg('SMTP_PASS');

  $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
  $dsn = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
  $fp = @stream_socket_client($dsn, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) throw new RuntimeException("connect failed: $errstr ($errno)");
  stream_set_timeout($fp, 20);

  smtp_expect($fp, 220);
  $ehlo = 'heritclothing.com';
  smtp_cmd($fp, "EHLO $ehlo", 250);

  if ($secure === 'tls') {
    smtp_cmd($fp, 'STARTTLS', 220);
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT
        | STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
      throw new RuntimeException('STARTTLS negotiation failed');
    }
    smtp_cmd($fp, "EHLO $ehlo", 250);
  }

  if ($user !== '') {
    smtp_cmd($fp, 'AUTH LOGIN', 334);
    smtp_cmd($fp, base64_encode($user), 334);
    smtp_cmd($fp, base64_encode($pass), 235);
  }

  smtp_cmd($fp, 'MAIL FROM:<' . $from . '>', 250);
  foreach ($rcpts as $r) smtp_cmd($fp, 'RCPT TO:<' . $r . '>', 250);
  smtp_cmd($fp, 'DATA', 354);

  // Dot-stuff lines that begin with '.', normalise newlines to CRLF.
  $data = implode("\r\n", $headers) . "\r\n\r\n" . $body;
  $data = preg_replace('/\r\n|\r|\n/', "\r\n", $data);
  $data = preg_replace('/^\./m', '..', $data);
  fwrite($fp, $data . "\r\n.\r\n");
  smtp_expect($fp, 250);

  fwrite($fp, "QUIT\r\n");
  fclose($fp);
}

function smtp_cmd($fp, $cmd, $expect) {
  fwrite($fp, $cmd . "\r\n");
  smtp_expect($fp, $expect);
}

/** Read a (possibly multi-line) SMTP reply and assert its code. */
function smtp_expect($fp, $expect) {
  $line = '';
  do {
    $line = fgets($fp, 1024);
    if ($line === false) throw new RuntimeException('SMTP connection closed unexpectedly');
    // Continuation lines look like "250-...", the final like "250 ...".
  } while (isset($line[3]) && $line[3] === '-');
  $code = (int) substr($line, 0, 3);
  if ($code !== (int) $expect) {
    throw new RuntimeException("expected $expect, got: " . trim($line));
  }
  return $line;
}
