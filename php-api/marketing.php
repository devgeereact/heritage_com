<?php
/**
 * HeritOS — Marketing & Social. A lightweight campaign / post planner.
 *
 *   GET  /marketing.php?action=list                 → campaigns + summary
 *   POST /marketing.php?action=create {name, channel, goal, starts_on, ends_on, notes}
 *   POST /marketing.php?action=status&id=N {status} → planned|live|done|paused
 *   POST /marketing.php?action=delete&id=N
 *
 * Staff-only (managers + editors).
 */
require __DIR__ . '/_lib.php';
cors();

$STAFF = ['super_admin', 'admin', 'manager', 'editor'];
$CHANNELS = ['instagram', 'whatsapp', 'email', 'tiktok', 'facebook'];
$STATUSES = ['planned', 'live', 'done', 'paused'];

$user = require_auth($STAFF);
$action = $_GET['action'] ?? 'list';

if ($action === 'list' && method() === 'GET') {
  $rows = [];
  $res = $conn->query("SELECT id, name, channel, status, goal, starts_on, ends_on, notes, created_at
                         FROM campaigns WHERE deleted_at IS NULL ORDER BY
                         FIELD(status,'live','planned','paused','done'), id DESC");
  $live = 0; $planned = 0;
  while ($res && $row = $res->fetch_assoc()) {
    if ($row['status'] === 'live') $live++;
    elseif ($row['status'] === 'planned') $planned++;
    $rows[] = $row;
  }
  json(['campaigns' => $rows, 'summary' => ['total' => count($rows), 'live' => $live, 'planned' => $planned]]);
}

if ($action === 'create' && method() === 'POST') {
  $b = body();
  $name = trim($b['name'] ?? '');
  if ($name === '') fail('Campaign name is required');
  $channel = in_array($b['channel'] ?? '', $CHANNELS, true) ? $b['channel'] : 'instagram';
  $goal = trim($b['goal'] ?? '');
  $starts = trim($b['starts_on'] ?? '');  $starts = preg_match('/^\d{4}-\d{2}-\d{2}$/', $starts) ? $starts : null;
  $ends = trim($b['ends_on'] ?? '');      $ends = preg_match('/^\d{4}-\d{2}-\d{2}$/', $ends) ? $ends : null;
  $notes = trim($b['notes'] ?? '');
  $stmt = $conn->prepare('INSERT INTO campaigns (name, channel, goal, starts_on, ends_on, notes, created_by) VALUES (?,?,?,?,?,?,?)');
  $stmt->bind_param('ssssssi', $name, $channel, $goal, $starts, $ends, $notes, $user['id']);
  $stmt->execute();
  $id = $conn->insert_id;
  audit($user['id'], 'campaign_create', 'campaign', $id, ['name' => $name]);
  json(['id' => $id, 'name' => $name], 201);
}

if ($action === 'status' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $b = body();
  $status = $b['status'] ?? '';
  if (!in_array($status, $STATUSES, true)) fail('Invalid status');
  $stmt = $conn->prepare('UPDATE campaigns SET status = ? WHERE id = ? AND deleted_at IS NULL');
  $stmt->bind_param('si', $status, $id);
  $stmt->execute();
  audit($user['id'], 'campaign_status', 'campaign', $id, ['status' => $status]);
  json(['ok' => true, 'status' => $status]);
}

if ($action === 'delete' && method() === 'POST') {
  $id = (int)($_GET['id'] ?? 0);
  $stmt = $conn->prepare('UPDATE campaigns SET deleted_at = NOW() WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  audit($user['id'], 'campaign_delete', 'campaign', $id, null);
  json(['ok' => true]);
}

fail('Unknown action', 404);
