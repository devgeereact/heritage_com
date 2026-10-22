<?php
/**
 * HeritOS — in-app inbox (incoming mail over IMAP).
 *
 *   GET  /inbox.php?action=list&limit=30&folder=INBOX  → recent messages
 *   GET  /inbox.php?action=get&uid=N                    → one message, full body (read-only:
 *        fetched with FT_PEEK, so it does not set \Seen; K-28)
 *   POST /inbox.php?action=seen&uid=N  { seen: true }   → flag/unflag read
 *
 * Reads IMAP_* from config.php via cfg(). Requires the PHP imap extension.
 * If IMAP_HOST is blank or imap isn't available, returns a clean 501 so the UI
 * can show a friendly "inbox not configured" notice instead of breaking.
 *
 * Staff-only (managers and up).
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor', 'employee'];
require_auth($STAFF);

if (cfg('IMAP_HOST') === '') fail('Inbox not configured (set IMAP_* in config.php).', 501);
if (!function_exists('imap_open')) fail('The PHP imap extension is not enabled on this server.', 501);

$host = cfg('IMAP_HOST');
$port = (int) cfg('IMAP_PORT', 993);
$user = cfg('IMAP_USER');
$pass = cfg('IMAP_PASS');
$folder = preg_replace('/[^A-Za-z0-9_\/\. -]/', '', in_str($_GET, 'folder', 'INBOX')) ?: 'INBOX';

$ref = '{' . $host . ':' . $port . '/imap/ssl/novalidate-cert}';
$mbox = @imap_open($ref . $folder, $user, $pass, 0, 1);
if (!$mbox) fail('IMAP login failed: ' . imap_last_error(), 502);

$action = $_GET['action'] ?? 'list';

try {
  if ($action === 'list' && method() === 'GET') {
    $limit = max(1, min(100, in_int($_GET, 'limit', 30)));
    $total = imap_num_msg($mbox);
    $rows = [];
    // Newest first: walk down from the highest sequence number.
    for ($n = $total, $c = 0; $n >= 1 && $c < $limit; $n--, $c++) {
      $ov = imap_fetch_overview($mbox, (string) $n, 0);
      if (!$ov || !isset($ov[0])) continue;
      $o = $ov[0];
      $rows[] = [
        'uid'     => $o->uid,
        'from'    => isset($o->from) ? decode_mime($o->from) : '',
        'subject' => isset($o->subject) ? decode_mime($o->subject) : '(no subject)',
        'date'    => isset($o->date) ? date('c', strtotime($o->date)) : null,
        'seen'    => !empty($o->seen),
        'answered'=> !empty($o->answered),
        'message_id' => $o->message_id ?? null,
      ];
    }
    imap_close($mbox);
    json(['folder' => $folder, 'total' => $total, 'messages' => $rows]);
  }

  if ($action === 'get' && method() === 'GET') {
    $uid = in_int($_GET, 'uid');
    if (!$uid) fail('uid required');
    $hdr = imap_rfc822_parse_headers(imap_fetchheader($mbox, $uid, FT_UID));
    $structure = imap_fetchstructure($mbox, $uid, FT_UID);
    [$html, $text] = extract_body($mbox, $uid, $structure);

    $msg = [
      'uid'        => $uid,
      'subject'    => isset($hdr->subject) ? decode_mime($hdr->subject) : '(no subject)',
      'from'       => isset($hdr->fromaddress) ? decode_mime($hdr->fromaddress) : '',
      'from_email' => isset($hdr->from[0]) ? ($hdr->from[0]->mailbox . '@' . $hdr->from[0]->host) : '',
      'to'         => isset($hdr->toaddress) ? decode_mime($hdr->toaddress) : '',
      'date'       => isset($hdr->date) ? date('c', strtotime($hdr->date)) : null,
      'message_id' => $hdr->message_id ?? null,
      'references' => $hdr->references ?? null,
      'html'       => $html,
      'text'       => $text,
    ];
    // GET is read-only (K-28): the body is fetched with FT_PEEK, so \Seen is not
    // set; the app marks the message read with POST ?action=seen.
    imap_close($mbox);
    json($msg);
  }

  if ($action === 'seen' && method() === 'POST') {
    $uid = in_int($_GET, 'uid');
    if (!$uid) fail('uid required');
    $seen = in_scalar(body(), 'seen', true);
    if ($seen) imap_setflag_full($mbox, (string) $uid, '\\Seen', ST_UID);
    else       imap_clearflag_full($mbox, (string) $uid, '\\Seen', ST_UID);
    imap_close($mbox);
    json(['ok' => true]);
  }

  imap_close($mbox);
  fail('Unknown action', 404);
} catch (Throwable $e) {
  if ($mbox) @imap_close($mbox);
  $detail = (defined('GK_DEBUG') && GK_DEBUG) ? $e->getMessage() : null;
  json(['error' => 'Inbox error', 'detail' => $detail], 500);
}

/* -------------------------------------------------------------------------- */

/** Decode RFC2047 (=?UTF-8?...?=) words to UTF-8. */
function decode_mime($s) {
  $out = '';
  foreach (imap_mime_header_decode($s) as $part) {
    $cs = strtoupper($part->charset);
    $txt = $part->text;
    if ($cs !== 'DEFAULT' && $cs !== 'UTF-8' && $cs !== 'US-ASCII') {
      $conv = @mb_convert_encoding($txt, 'UTF-8', $cs);
      if ($conv !== false) $txt = $conv;
    }
    $out .= $txt;
  }
  return $out;
}

/** Decode a single MIME part body by its transfer encoding. */
function decode_part($data, $encoding) {
  switch ($encoding) {
    case 3: return base64_decode($data);          // BASE64
    case 4: return quoted_printable_decode($data); // QUOTED-PRINTABLE
    default: return $data;                          // 7BIT/8BIT/BINARY/other
  }
}

/**
 * Walk the MIME structure and pull the text/html and text/plain parts.
 * Returns [htmlOrNull, textOrNull].
 */
function extract_body($mbox, $uid, $structure) {
  $html = null; $text = null;

  $collect = function ($struct, $partNo) use (&$collect, &$html, &$text, $mbox, $uid) {
    if (!empty($struct->parts)) {
      foreach ($struct->parts as $i => $sub) {
        $no = $partNo === '' ? (string)($i + 1) : $partNo . '.' . ($i + 1);
        $collect($sub, $no);
      }
      return;
    }
    $subtype = strtoupper($struct->subtype ?? '');
    $body = imap_fetchbody($mbox, $uid, $partNo === '' ? '1' : $partNo, FT_UID | FT_PEEK);
    $body = decode_part($body, $struct->encoding ?? 0);
    // Charset → UTF-8.
    $charset = 'UTF-8';
    if (!empty($struct->parameters)) {
      foreach ($struct->parameters as $p) if (strtoupper($p->attribute) === 'CHARSET') $charset = strtoupper($p->value);
    }
    if ($charset !== 'UTF-8' && $charset !== 'US-ASCII') {
      $conv = @mb_convert_encoding($body, 'UTF-8', $charset);
      if ($conv !== false) $body = $conv;
    }
    if ($subtype === 'HTML' && $html === null) $html = $body;
    elseif ($subtype === 'PLAIN' && $text === null) $text = $body;
  };

  if (empty($structure->parts)) {
    // Single-part message.
    $body = imap_body($mbox, $uid, FT_UID | FT_PEEK);
    $body = decode_part($body, $structure->encoding ?? 0);
    if (strtoupper($structure->subtype ?? '') === 'HTML') $html = $body; else $text = $body;
  } else {
    $collect($structure, '');
  }
  return [$html, $text];
}
