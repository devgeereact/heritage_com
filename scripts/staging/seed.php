<?php
/**
 * HeritOS local staging seed. Run by scripts/staging/setup.sh; CLI only.
 *
 * Every record is clearly synthetic: names like "Test Client 01", phones
 * 0800000000x, emails @example.test. The staging admin password is random and
 * printed once; it exists only in the local heritos_staging database.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

define('HERITOS_STAGING', true);
require __DIR__ . '/../../php-api/_lib.php';
restore_exception_handler();
if (!defined('HERITOS_ENV') || HERITOS_ENV !== 'staging' || DB_NAME !== 'heritos_staging') {
  fwrite(STDERR, "Refusing to seed: config.local.php is not the heritos_staging config.\n");
  exit(1);
}

function q($sql, $types = '', ...$args) {
  global $conn;
  $stmt = $conn->prepare($sql);
  if ($types !== '') $stmt->bind_param($types, ...$args);
  $stmt->execute();
  return $stmt;
}

// schema.sql seeds real-domain staff and two sample clients (again on every
// re-import). Lock those staff accounts (random unusable password, suspended)
// and remove the sample clients and their jobs, so staging holds only obviously
// synthetic records.
$locked = password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT);
q("UPDATE users SET password_hash = ?, status = 'suspended' WHERE email NOT LIKE '%@example.test'", 's', $locked);
$sample = "SELECT id FROM customers WHERE name IN ('Chukwu Okafor','Emeka Bello')";
$conn->query("DELETE FROM tailoring_orders WHERE customer_id IN ($sample)");
$conn->query("DELETE FROM customers WHERE id IN (SELECT id FROM ($sample) AS s)");

// Already seeded (setup.sh --keep)? Leave the synthetic records alone.
if (q("SELECT id FROM users WHERE email = 'staging-admin@example.test'")->get_result()->fetch_row()) {
  echo "  Synthetic records already present; nothing added. Run setup without --keep to reset the password.\n";
  exit(0);
}

// Staff.
$adminPass = rtrim(strtr(base64_encode(random_bytes(12)), '+/', 'Kq'), '=');
q("INSERT INTO users (name, email, password_hash, role, status) VALUES (?,?,?,?, 'active')",
  'ssss', $n = 'Staging Admin', $e = 'staging-admin@example.test', $h = password_hash($adminPass, PASSWORD_DEFAULT), $r = 'super_admin');
$adminId = $conn->insert_id;
q("INSERT INTO users (name, email, password_hash, role, status) VALUES (?,?,?,?, 'active')",
  'ssss', $n = 'Test Tailor 01', $e = 'tailor01@example.test', $h = $locked, $r = 'tailor');
$tailorId = $conn->insert_id;

// Clients.
$measure = ['chest' => 40, 'waist' => 34, 'shoulder' => 18, 'sleeve' => 25, 'length' => 30, 'unit' => 'in'];
$clients = [];
for ($i = 1; $i <= 8; $i++) {
  $nn = sprintf('%02d', $i);
  q('INSERT INTO customers (name, phone, email, measurements, notes) VALUES (?,?,?,?,?)', 'sssss',
    $n = "Test Client $nn", $p = '0800000000' . $i, $e = "client$nn@example.test",
    $m = json_encode($measure), $no = 'Synthetic staging record');
  $clients[$i] = $conn->insert_id;
}

// Tailoring jobs across every workshop stage.
$jobs = [
  [1, 'agbada', 'Aso-oke (test)', 'measure', 90000, 0, 14],
  [2, 'kaftan', 'Plain cotton (test)', 'cut', 45000, 20000, 10],
  [3, 'senator', 'Linen (test)', 'sew', 55000, 25000, 7],
  [4, 'suit', 'Wool blend (test)', 'finish', 120000, 60000, 5],
  [5, 'shirt', 'Adire (test)', 'fitting', 25000, 25000, 2],
  [6, 'trouser', 'Cotton twill (test)', 'done', 18000, 18000, -3],
  [7, 'agbada', 'Damask (test)', 'sew', 75000, 0, 1],
];
$jobRefs = [];
foreach ($jobs as [$ci, $garment, $fabric, $stage, $price, $deposit, $dueIn]) {
  $due = date('Y-m-d', strtotime("$dueIn days"));
  [$jid, $code] = insert_with_code('tailoring_orders', 'HC', function ($code) use ($clients, $ci, $garment, $fabric, $stage, $price, $deposit, $due, $tailorId, $adminId, $measure) {
    global $conn;
    q('INSERT INTO tailoring_orders (code, customer_id, garment_type, fabric, measurements, notes, assigned_tailor_id, stage, price, deposit, due_date, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', 'sissssisddsi',
      $code, $clients[$ci], $garment, $fabric, $m = json_encode($measure), $no = 'Synthetic staging job',
      $tailorId, $stage, $price, $deposit, $due, $adminId);
    return $conn->insert_id;
  });
  q('INSERT INTO tailoring_events (order_id, stage, note, user_id) VALUES (?,?,?,?)', 'issi', $jid, $stage, $no = 'Seeded', $adminId);
  $jobRefs[] = $code . ' ' . (assign_public_ref('tailoring_orders', $jid) ?? '');
}

// Retail orders (the shop is hidden from public navigation, but the records exist).
$orders = [
  [1, 'pending', 'transfer', 'Everyday Shirt (test)', 18500, 0],
  [2, 'paid', 'card', 'Signature Shirt (test)', 24000, 24000],
  [3, 'shipped', 'cod', 'Two-Piece Set (test)', 45000, 0],
];
$orderRefs = [];
foreach ($orders as [$ci, $status, $pay, $label, $total, $paid]) {
  [$oid, $code] = insert_with_code('orders', 'ORD', function ($code) use ($clients, $ci, $status, $pay, $total, $paid) {
    global $conn;
    q("INSERT INTO orders (code, customer_id, customer_name, customer_phone, channel, status, payment_method, total, paid, ship_address, notes)
       VALUES (?,?,?,?, 'web', ?,?,?,?, 'Test Street 1, Lagos', 'Synthetic staging order')", 'sissssdd',
      $code, $clients[$ci], $n = sprintf('Test Client %02d', $ci), $p = '0800000000' . $ci, $status, $pay, $total, $paid);
    return $conn->insert_id;
  });
  q('INSERT INTO order_items (order_id, label, sku, qty, unit_price) VALUES (?,?,?,1,?)', 'issd', $oid, $label, $s = 'TEST-SKU', $total);
  $orderRefs[] = $code . ' ' . (assign_public_ref('orders', $oid) ?? '') . ' (phone 0800000000' . $ci . ')';
}

// Enquiries.
$withCompany = has_column('enquiries', 'company');
$enquiries = [
  ['Test Enquirer 01', '08000000011', 'enquirer01@example.test', 'fitting', 'Agbada', 'Synthetic: would like a fitting next week.', 'new', null],
  ['Test Enquirer 02', '08000000012', null, 'bespoke', 'Suit', 'Synthetic: wedding suit enquiry.', 'contacted', null],
  ['Test Enquirer 03', null, 'enquirer03@example.test', 'wholesale', 'Staff uniforms', 'Synthetic: twelve matching kaftans.', 'new', 'Test Company Ltd'],
  ['Test Enquirer 04', '08000000014', null, 'general', '', 'Synthetic: opening hours question.', 'closed', null],
];
foreach ($enquiries as [$n, $p, $e, $t, $in, $msg, $st, $co]) {
  if ($withCompany) {
    q('INSERT INTO enquiries (name, phone, email, type, interest, message, status, source, company) VALUES (?,?,?,?,?,?,?, \'staging-seed\', ?)',
      'ssssssss', $n, $p, $e, $t, $in, $msg, $st, $co);
  } else {
    q('INSERT INTO enquiries (name, phone, email, type, interest, message, status, source) VALUES (?,?,?,?,?,?,?, \'staging-seed\')',
      'sssssss', $n, $p, $e, $t, $in, $msg, $st);
  }
}

// Blog posts: one published, one draft.
q("INSERT INTO blog_posts (slug, title, excerpt, body, category, status, author, published_at)
   VALUES ('test-post-published', 'Test Post (published)', 'Synthetic excerpt.', '<p>Synthetic staging body.</p>', 'Craft', 'published', 'Staging Admin', NOW()),
          ('test-post-draft', 'Test Post (draft)', 'Synthetic draft.', '<p>Synthetic draft body.</p>', 'Craft', 'draft', 'Staging Admin', NULL)");

echo "  Staff:     staging-admin@example.test (super_admin), tailor01@example.test (tailor, no usable password)\n";
echo "  Clients:   8 (Test Client 01-08, phones 08000000001-08000000008)\n";
echo "  Jobs:      " . implode(', ', $jobRefs) . "\n";
echo "  Orders:    " . implode('; ', $orderRefs) . "\n";
echo "  Enquiries: 4, blog posts: 2 (1 published)\n";
echo "\n  LOCAL STAGING ADMIN PASSWORD (shown once, local database only): $adminPass\n";
