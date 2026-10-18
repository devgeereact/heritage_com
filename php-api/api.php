<?php
/**
 * HeritOS — default / smoke-test endpoint.
 *
 * Proves the pipe: React → api.php → MySQL → JSON, before any feature work.
 *   GET  /api.php          → list items   (returns [] on a fresh `items` table)
 *   POST /api.php {label}  → insert an item, returns the created row (staff only)
 */
require __DIR__ . '/_lib.php';
cors();

$m = method();

if ($m === 'GET') {
  $rows = [];
  $res = $conn->query('SELECT id, label, created_at FROM items ORDER BY id DESC');
  while ($res && $row = $res->fetch_assoc()) $rows[] = $row;
  json($rows);
}

if ($m === 'POST') {
  // Writing needs a staff session; no page calls this, so only smoke tests are affected.
  require_auth(['super_admin', 'admin', 'manager', 'tailor', 'editor', 'seller', 'employee']);
  $b = body();
  $label = trim(in_str($b, 'label'));
  if ($label === '') fail('label is required');
  $stmt = $conn->prepare('INSERT INTO items (label) VALUES (?)');
  $stmt->bind_param('s', $label);
  $stmt->execute();
  $id = $conn->insert_id;
  $stmt = $conn->prepare('SELECT id, label, created_at FROM items WHERE id = ?');
  $stmt->bind_param('i', $id);
  $stmt->execute();
  json($stmt->get_result()->fetch_assoc(), 201);
}

fail('Method not allowed', 405);
