<?php
/**
 * HeritOS: shared outgoing mail (SMTP), no Composer and no PHPMailer.
 * Extracted from mail.php (Phase 3, spec 3.0) so access codes and owner
 * messages can send mail without running the mail.php endpoint.
 *
 *   mail_send_html($to, $subject, $html, $opts) → ['ok', 'status', 'message_id', 'error']
 *     status is 'sent' (accepted by SMTP or PHP mail()) or 'failed'.
 *     $opts: cc, reply_to, in_reply_to, references, user_id (for the audit row),
 *            audit (default true), entity (audit entity, default 'email').
 *
 * Reads SMTP_* from config.php through cfg(). Blank SMTP_HOST falls back to PHP
 * mail(), as mail.php always has. Requires _lib.php ($conn, cfg, audit).
 */

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
 * Send one HTML email. Never throws: failures come back as status 'failed' with
 * an error (detail only when GK_DEBUG is on). Every attempt is audited without
 * the body, so codes and message text never reach the audit log.
 */
function mail_send_html($to, $subject, $html, array $opts = []) {
  $to = trim((string)$to);
  $subject = trim((string)$subject);
  $cc = trim((string)($opts['cc'] ?? ''));
  $replyTo = trim((string)($opts['reply_to'] ?? ''));
  $inReplyTo = trim((string)($opts['in_reply_to'] ?? ''));
  $references = trim((string)($opts['references'] ?? ''));
  if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return ['ok' => false, 'status' => 'failed', 'message_id' => null, 'error' => 'invalid recipient'];
  // Header injection guard: no line breaks in any header value.
  foreach ([$subject, $cc, $replyTo, $inReplyTo, $references] as $h) {
    if (preg_match('/[\r\n]/', $h)) return ['ok' => false, 'status' => 'failed', 'message_id' => null, 'error' => 'invalid header'];
  }

  $fromAddr = cfg('SMTP_FROM', cfg('SMTP_USER'));
  $fromName = cfg('SMTP_FROM_NAME', 'HeritOS');
  $msgId = '<' . bin2hex(random_bytes(8)) . '@heritclothing.com>';
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
  $rcpts = array_values(array_filter(array_map('trim', array_merge([$to], $cc !== '' ? explode(',', $cc) : []))));

  $status = 'sent'; $error = null;
  try {
    if (cfg('SMTP_HOST') === '') {
      // No SMTP configured: PHP mail(), with Subject and To passed separately.
      $h = implode("\r\n", array_filter($headers, fn($x) => stripos($x, 'Subject:') !== 0 && stripos($x, 'To:') !== 0));
      if (!mail($to, mime_header($subject), (string)$html, $h)) { $status = 'failed'; $error = 'mail() refused the message'; }
    } else {
      smtp_send($fromAddr, $rcpts, $headers, (string)$html);
    }
  } catch (Throwable $e) {
    $status = 'failed';
    $error = $e->getMessage();
  }

  if ($opts['audit'] ?? true) {
    try {
      audit($opts['user_id'] ?? null, $status === 'sent' ? 'mail_send' : 'mail_send_failed', $opts['entity'] ?? 'email', null,
        ['to' => $to, 'subject' => mb_substr($subject, 0, 120)]);
    } catch (Throwable $e) { /* auditing is best-effort here */ }
  }
  $debug = defined('GK_DEBUG') && GK_DEBUG;
  return ['ok' => $status === 'sent', 'status' => $status, 'message_id' => $status === 'sent' ? $msgId : null,
          'error' => $status === 'sent' ? null : ($debug ? $error : 'send failed')];
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
