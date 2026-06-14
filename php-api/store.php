<?php
/**
 * HeritOS — Public storefront API (no auth). The customer-facing buy path.
 *
 *   GET  /store.php?action=catalogue          → public price list (slug → price)
 *   POST /store.php?action=checkout           → place a web order, returns code
 *        {customer, phone, email?, ship_address, city?, delivery, payment_method,
 *         notes?, gift_message?, items:[{slug, size, qty}]}
 *   POST /store.php?action=pay_init {code}    → start a gateway payment (Paystack
 *                                                / Flutterwave) if configured,
 *                                                else {provider:'manual'}
 *   GET  /store.php?action=pay_verify&reference=… → confirm payment, mark paid
 *
 * Prices are authoritative HERE — never trusted from the browser. The catalogue
 * mirrors the storefront product list until the live products table is wired to
 * the public site. Orders land in the same `orders` table the admin queue reads,
 * with channel='web'.
 */
require __DIR__ . '/_lib.php';
cors();

/* Server-side catalogue: slug → [name, fabric, price NGN]. Single source of
 * truth for what a piece costs, so the total can't be tampered client-side. */
$CATALOGUE = [
  'everyday-shirt-ankara'  => ['Everyday Shirt',  'Ankara',          18500],
  'signature-shirt-adire'  => ['Signature Shirt', 'Adire',           24000],
  'wrap-dress-adire'       => ['Wrap Dress',      'Adire',           32000],
  'two-piece-set-ankara'   => ['Two-Piece Set',   'Ankara',          45000],
  'heritage-set-asooke'    => ['Heritage Set',    'Aso-Oke',         68000],
  'heritage-accessory'     => ['Headwrap / Tie',  'Mixed',            6500],
];

$FREE_SHIP_OVER = 25000;          // free Lagos delivery threshold (NGN)
$LAGOS_SHIP     = 2500;           // flat Lagos delivery under the threshold
$NG_SHIP        = 4500;           // rest of Nigeria

$action = $_GET['action'] ?? 'catalogue';

/* ---- CATALOGUE ----------------------------------------------------------- */
if ($action === 'catalogue' && method() === 'GET') {
  $out = [];
  foreach ($CATALOGUE as $slug => [$name, $fabric, $price]) {
    $out[] = ['slug' => $slug, 'name' => $name, 'fabric' => $fabric, 'price_ngn' => $price];
  }
  json(['products' => $out, 'free_ship_over' => $FREE_SHIP_OVER]);
}

/* ---- CHECKOUT ------------------------------------------------------------ */
if ($action === 'checkout' && method() === 'POST') {
  $b = body();
  $name = trim($b['customer'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  $address = trim($b['ship_address'] ?? '');
  $city = trim($b['city'] ?? '');
  $delivery = in_array($b['delivery'] ?? '', ['lagos', 'nigeria', 'pickup'], true) ? $b['delivery'] : 'lagos';
  $payment = in_array($b['payment_method'] ?? '', ['card', 'transfer', 'cod'], true) ? $b['payment_method'] : 'transfer';
  $notes = trim($b['notes'] ?? '');
  $gift = trim($b['gift_message'] ?? '');
  $reqItems = is_array($b['items'] ?? null) ? $b['items'] : [];

  if ($name === '') fail('Please enter your name');
  if ($phone === '') fail('Please enter a phone number');
  if ($delivery !== 'pickup' && $address === '') fail('Please enter a delivery address');
  if (!$reqItems) fail('Your basket is empty');

  // Resolve every line against the server catalogue; reject unknown slugs and
  // price the order from OUR numbers, not the client's.
  $items = [];
  $goods = 0;
  foreach ($reqItems as $it) {
    $slug = trim($it['slug'] ?? '');
    if (!isset($CATALOGUE[$slug])) fail('Unknown item: ' . $slug);
    [$pname, $fabric, $price] = $CATALOGUE[$slug];
    $size = trim($it['size'] ?? 'One size') ?: 'One size';
    $qty = max(1, min(20, (int)($it['qty'] ?? 1)));
    $label = $pname . ' · ' . $fabric . ' · ' . $size;
    $items[] = ['label' => $label, 'sku' => $slug . '-' . strtolower($size), 'qty' => $qty, 'unit_price' => $price];
    $goods += $qty * $price;
  }

  // Shipping.
  $ship = 0;
  if ($delivery === 'lagos')   $ship = $goods >= $FREE_SHIP_OVER ? 0 : $LAGOS_SHIP;
  if ($delivery === 'nigeria') $ship = $NG_SHIP;

  // Coupon — evaluated server-side against OUR numbers (never trust a browser
  // discount). free_ship zeroes delivery; percent/fixed take ₦ off the goods.
  $couponCode = strtoupper(trim($b['coupon'] ?? ''));
  $coupon = null; $discount = 0;
  if ($couponCode !== '') {
    $ev = coupon_eval($couponCode, $goods, $ship);
    if (!empty($ev['ok'])) {
      $coupon = $ev;
      if (!empty($ev['free_ship'])) $ship = 0;
      else $discount = (float)$ev['discount'];
    } else {
      fail($ev['error'] ?? 'That code is not valid');
    }
  }

  if ($ship > 0) $items[] = ['label' => 'Delivery (' . $delivery . ')', 'sku' => 'shipping', 'qty' => 1, 'unit_price' => $ship];
  if ($discount > 0) $items[] = ['label' => 'Discount (' . $coupon['code'] . ')', 'sku' => 'discount', 'qty' => 1, 'unit_price' => -$discount];
  $total = max(0, $goods + $ship - $discount);

  // Link to an existing customer by phone (so web orders enrich the CRM).
  $customerId = null;
  if ($phone !== '') {
    $stmt = $conn->prepare('SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('s', $phone);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) $customerId = (int)$row['id'];
  }

  // Next ORD-#### code.
  $res = $conn->query('SELECT MAX(id) AS m FROM orders');
  $next = (int)($res->fetch_assoc()['m'] ?? 0) + 1;
  $code = 'ORD-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);

  // COD counts as a promise to pay; card/transfer start unpaid until confirmed.
  $paymentMethod = $payment;                 // 'card' | 'transfer' | 'cod'
  $paid = 0;
  $fullNotes = trim(($notes !== '' ? $notes : '') . ($gift !== '' ? "\nGift message: " . $gift : ''));
  $shipFull = trim($address . ($city !== '' ? ', ' . $city : ''));

  $stmt = $conn->prepare(
    'INSERT INTO orders (code, customer_id, customer_name, customer_phone, channel,
                         payment_method, total, paid, ship_address, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,NULL)'
  );
  $channel = 'web';
  $stmt->bind_param(
    'sissssddss',
    $code, $customerId, $name, $phone, $channel,
    $paymentMethod, $total, $paid, $shipFull, $fullNotes
  );
  $stmt->execute();
  $orderId = $conn->insert_id;

  $itemStmt = $conn->prepare(
    'INSERT INTO order_items (order_id, variant_id, label, sku, qty, unit_price) VALUES (?,NULL,?,?,?,?)'
  );
  foreach ($items as $it) {
    $itemStmt->bind_param('issid', $orderId, $it['label'], $it['sku'], $it['qty'], $it['unit_price']);
    $itemStmt->execute();
  }

  // Record the coupon redemption + bump its usage counter (for caps + attribution).
  if ($coupon) {
    $effective = $discount > 0 ? $discount : (float)($coupon['shipping_saved'] ?? 0);
    $rstmt = $conn->prepare('INSERT INTO coupon_redemptions (coupon_id, order_id, code, discount) VALUES (?,?,?,?)');
    $rstmt->bind_param('iisd', $coupon['coupon_id'], $orderId, $coupon['code'], $effective);
    $rstmt->execute();
    $conn->query('UPDATE coupons SET used = used + 1 WHERE id = ' . (int)$coupon['coupon_id']);
  }

  // Stash email on the order notes-less side via a lightweight log row is overkill;
  // email travels in the confirmation only. Audit as a system (null-user) event.
  audit(null, 'web_order', 'order', $orderId, ['code' => $code, 'total' => $total, 'email' => $email, 'coupon' => $coupon['code'] ?? null]);

  // WhatsApp order confirmation (the brand's #1 channel). Non-fatal: a failure
  // here never blocks the order. Cloud API when configured, else logged as a
  // wa.me link staff can click from the inbox.
  $payNote = $paymentMethod === 'cod'
    ? 'Pay on delivery.'
    : 'We will share payment details shortly.';
  $waMsg = "Hi {$name}, thank you for your order with Herit Clothing! 🌿\n"
    . "Order {$code} · Total ₦" . number_format($total)
    . ".\n{$payNote}\nTrack it anytime: https://heritclothing.com/track (code {$code}).";
  wa_dispatch($phone, $waMsg, $customerId, 'order_confirmation');

  json([
    'ok' => true,
    'code' => $code,
    'order_id' => $orderId,
    'total' => $total,
    'goods' => $goods,
    'shipping' => $ship,
    'discount' => $discount,
    'coupon' => $coupon['code'] ?? null,
    'payment_method' => $paymentMethod,
  ], 201);
}

/* ---- PAY INIT ------------------------------------------------------------ */
if ($action === 'pay_init' && method() === 'POST') {
  $b = body();
  $code = trim($b['code'] ?? '');
  $email = trim($b['email'] ?? '');
  if ($code === '') fail('Order code is required');

  $stmt = $conn->prepare('SELECT id, total, paid, payment_method FROM orders WHERE code = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $order = $stmt->get_result()->fetch_assoc();
  if (!$order) fail('Order not found', 404);
  $amountKobo = (int) round(((float)$order['total']) * 100);

  $paystack = cfg('PAYSTACK_SECRET');
  $flw = cfg('FLW_SECRET');
  $provider = cfg('PAYMENT_PROVIDER');       // 'paystack' | 'flutterwave' | '' (auto)

  // Choose a provider only if its key is present. No key → manual fallback so
  // the customer still gets transfer / COD instructions and the order stands.
  if (($provider === 'paystack' || ($provider === '' && $paystack)) && $paystack) {
    $payload = json_encode([
      'email' => $email ?: 'customer@heritclothing.com',
      'amount' => $amountKobo,
      'currency' => 'NGN',
      'reference' => $code . '-' . substr(md5($code . $order['id']), 0, 8),
      'metadata' => ['order_code' => $code, 'order_id' => (int)$order['id']],
    ]);
    $resp = gateway_post('https://api.paystack.co/transaction/initialize', $payload, $paystack);
    if ($resp && !empty($resp['data']['authorization_url'])) {
      json(['provider' => 'paystack', 'authorization_url' => $resp['data']['authorization_url'], 'reference' => $resp['data']['reference']]);
    }
    fail('Could not start Paystack payment', 502);
  }

  if (($provider === 'flutterwave' || ($provider === '' && $flw)) && $flw) {
    $ref = $code . '-' . substr(md5($code . $order['id']), 0, 8);
    $payload = json_encode([
      'tx_ref' => $ref,
      'amount' => (float)$order['total'],
      'currency' => 'NGN',
      'redirect_url' => 'https://heritclothing.com/checkout?verify=' . urlencode($ref),
      'customer' => ['email' => $email ?: 'customer@heritclothing.com'],
      'meta' => ['order_code' => $code, 'order_id' => (int)$order['id']],
    ]);
    $resp = gateway_post('https://api.flutterwave.com/v3/payments', $payload, $flw);
    if ($resp && !empty($resp['data']['link'])) {
      json(['provider' => 'flutterwave', 'authorization_url' => $resp['data']['link'], 'reference' => $ref]);
    }
    fail('Could not start Flutterwave payment', 502);
  }

  // No gateway configured — manual settlement.
  json(['provider' => 'manual', 'total' => (float)$order['total']]);
}

/* ---- PAY VERIFY ---------------------------------------------------------- */
if ($action === 'pay_verify' && method() === 'GET') {
  $reference = trim($_GET['reference'] ?? '');
  if ($reference === '') fail('reference is required');
  $code = explode('-', $reference)[0] . '-' . (explode('-', $reference)[1] ?? '');

  $paystack = cfg('PAYSTACK_SECRET');
  $flw = cfg('FLW_SECRET');
  $ok = false;

  if ($paystack) {
    $resp = gateway_get('https://api.paystack.co/transaction/verify/' . rawurlencode($reference), $paystack);
    $ok = $resp && ($resp['data']['status'] ?? '') === 'success';
  } elseif ($flw) {
    $resp = gateway_get('https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=' . rawurlencode($reference), $flw);
    $ok = $resp && ($resp['data']['status'] ?? '') === 'successful';
  } else {
    fail('No payment gateway configured', 503);
  }

  if ($ok) {
    // Mark paid: paid = total, status → paid.
    $stmt = $conn->prepare("UPDATE orders SET paid = total, status = 'paid' WHERE code = ? AND deleted_at IS NULL");
    $stmt->bind_param('s', $code);
    $stmt->execute();
    audit(null, 'web_order_paid', 'order', null, ['code' => $code, 'reference' => $reference]);
    json(['ok' => true, 'code' => $code, 'status' => 'paid']);
  }
  json(['ok' => false, 'code' => $code, 'status' => 'unpaid']);
}

/* ---- TRACK (public order status) ----------------------------------------- */
/* A customer looks up their own order with code + phone. Phone must match (last
 * 9 digits, so +234/0 prefixes don't matter) so one can't browse others' orders. */
if ($action === 'track' && method() === 'GET') {
  $code = trim($_GET['code'] ?? '');
  $phone = trim($_GET['phone'] ?? '');
  if ($code === '' || $phone === '') fail('Order code and phone are required');

  $stmt = $conn->prepare(
    'SELECT id, code, customer_name, customer_phone, status, total, paid,
            courier, tracking_ref, tracking_url, return_status, created_at
       FROM orders WHERE code = ? AND deleted_at IS NULL LIMIT 1'
  );
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $order = $stmt->get_result()->fetch_assoc();

  $tail = fn($s) => substr(preg_replace('/\D/', '', (string)$s), -9);
  if (!$order || $tail($order['customer_phone']) === '' || $tail($order['customer_phone']) !== $tail($phone)) {
    fail('No order found for that code and phone.', 404);
  }

  $items = [];
  $istmt = $conn->prepare("SELECT label, qty FROM order_items WHERE order_id = ? AND sku <> 'shipping'");
  $istmt->bind_param('i', $order['id']);
  $istmt->execute();
  $ir = $istmt->get_result();
  while ($row = $ir->fetch_assoc()) $items[] = ['label' => $row['label'], 'qty' => (int)$row['qty']];

  json([
    'code' => $order['code'],
    'customer_name' => $order['customer_name'],
    'status' => $order['status'],
    'total' => (float)$order['total'],
    'paid' => (float)$order['paid'],
    'courier' => $order['courier'],
    'tracking_ref' => $order['tracking_ref'],
    'tracking_url' => $order['tracking_url'],
    'return_status' => $order['return_status'],
    'placed_at' => $order['created_at'],
    'items' => $items,
  ]);
}

fail('Unknown action', 404);

/* -------------------------------------------------------------------------- */
function gateway_post($url, $payload, $secret) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secret, 'Content-Type: application/json'],
    CURLOPT_TIMEOUT => 30,
  ]);
  $raw = curl_exec($ch);
  curl_close($ch);
  return $raw ? json_decode($raw, true) : null;
}
function gateway_get($url, $secret) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secret],
    CURLOPT_TIMEOUT => 30,
  ]);
  $raw = curl_exec($ch);
  curl_close($ch);
  return $raw ? json_decode($raw, true) : null;
}
