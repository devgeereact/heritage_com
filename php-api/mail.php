<?php
/**
 * HeritOS — outgoing mail (SMTP), no Composer / no PHPMailer.
 *
 *   POST /mail.php?action=send
 *     { to, subject, body, cc?, reply_to?, in_reply_to?, references? }
 *     → { ok: true, message_id }   (body is treated as HTML)
 *
 * A thin endpoint over mail_send_html() in _mail.php (Phase 3 extraction). Reads
 * SMTP_* from config.php via cfg(); blank SMTP_HOST falls back to PHP mail().
 *
 * Staff-only. Every send is written to the audit log (mail_send or
 * mail_send_failed).
 */
require __DIR__ . '/_lib.php';
require __DIR__ . '/_mail.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
$user = require_auth($STAFF);

$action = $_GET['action'] ?? 'send';
if ($action !== 'send' || method() !== 'POST') fail('Unknown action', 404);

$b = body();
$to      = trim(in_str($b, 'to'));
$subject = trim(in_str($b, 'subject'));
$html    = in_str($b, 'body');

if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail('A valid recipient (to) is required.');
if ($subject === '') fail('Subject is required.');
if (trim(strip_tags($html)) === '') fail('Message body is required.');

$r = mail_send_html($to, $subject, $html, [
  'cc' => in_str($b, 'cc'), 'reply_to' => in_str($b, 'reply_to'),
  'in_reply_to' => in_str($b, 'in_reply_to'), 'references' => in_str($b, 'references'),
  'user_id' => $user['id'],
]);
if (!$r['ok']) json(['error' => 'Could not send email', 'detail' => $r['error']], 502);
json(['ok' => true, 'message_id' => $r['message_id']]);
