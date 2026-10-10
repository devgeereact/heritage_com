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

/* ---- PUBLIC CONFIG ------------------------------------------------------- */
/* Storefront-safe slice of platform settings — social links, store name and
 * whether the retail shop shows in public navigation —
 * so the public site (footer etc.) can show admin-set values without auth. */
if ($action === 'config' && method() === 'GET') {
  $socials = [];
  $storeName = '';
  $shopEnabled = false;   // retail shop hidden from public navigation unless switched on
  $res = $conn->query("SELECT skey, svalue FROM settings WHERE skey IN ('socials','store_name','shop_enabled')");
  while ($res && $row = $res->fetch_assoc()) {
    if ($row['skey'] === 'socials') { $d = json_decode($row['svalue'], true); if (is_array($d)) $socials = $d; }
    if ($row['skey'] === 'store_name') $storeName = (string)$row['svalue'];
    if ($row['skey'] === 'shop_enabled') $shopEnabled = (string)$row['svalue'] === '1';
  }
  json(['socials' => $socials, 'store_name' => $storeName, 'shop_enabled' => $shopEnabled]);
}

/* ---- BLOG (Journal) ------------------------------------------------------ */
/* Public, published-only. ?slug= returns the full post (with body); otherwise a
 * list (no body) newest first. */
if ($action === 'blog' && method() === 'GET') {
  $slug = trim($_GET['slug'] ?? '');
  if ($slug !== '') {
    $stmt = $conn->prepare("SELECT slug, title, excerpt, body, category, tile, tags, author, published_at
                              FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->bind_param('s', $slug);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) fail('Post not found', 404);
    // Sanitise on the way out too, so posts saved before content.php cleaned
    // bodies are still safe to render as HTML.
    $row['body'] = sanitize_html($row['body'] ?? '');
    $row['cat'] = $row['category'];
    $row['date'] = $row['published_at'] ? date('F Y', strtotime($row['published_at'])) : '';
    json(['post' => $row]);
  }
  $limit = min(50, max(1, (int)($_GET['limit'] ?? 24)));
  $out = [];
  $res = $conn->query("SELECT slug, title, excerpt, category, tile, published_at
                         FROM blog_posts WHERE status = 'published'
                        ORDER BY published_at DESC LIMIT $limit");
  while ($res && $row = $res->fetch_assoc()) {
    $out[] = [
      'slug' => $row['slug'], 'title' => $row['title'], 'excerpt' => $row['excerpt'],
      'cat' => $row['category'], 'category' => $row['category'], 'tile' => $row['tile'],
      'date' => $row['published_at'] ? date('F Y', strtotime($row['published_at'])) : '',
    ];
  }
  json(['posts' => $out]);
}

/* ---- TESTIMONIALS -------------------------------------------------------- */
if ($action === 'testimonials' && method() === 'GET') {
  $out = [];
  $res = $conn->query("SELECT name, location, quote, rating, tile FROM testimonials
                        WHERE status = 'published' ORDER BY featured DESC, sort ASC, id DESC LIMIT 24");
  while ($res && $row = $res->fetch_assoc()) {
    $out[] = [
      'name' => $row['name'], 'role' => $row['location'], 'location' => $row['location'],
      'text' => $row['quote'], 'rating' => (int)$row['rating'], 'tile' => $row['tile'],
    ];
  }
  json(['testimonials' => $out]);
}

/* ---- CATALOGUE ----------------------------------------------------------- */
/* Serves the live products table (published pieces), shaped for the storefront.
 * Falls back to the curated $CATALOGUE only if nothing is published yet. */
if ($action === 'catalogue' && method() === 'GET') {
  $out = [];
  $res = $conn->query(
    "SELECT p.id, p.slug, p.name, p.category, p.fabric, p.description, p.story, p.care,
            p.base_price, p.one_of_a_kind, p.image_url, p.storefront,
            COALESCE(SUM(v.stock),0) AS stock,
            GROUP_CONCAT(DISTINCT v.size ORDER BY FIELD(v.size,'XS','S','M','L','XL','XXL','One size') SEPARATOR ',') AS sizes
       FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
      WHERE p.deleted_at IS NULL AND p.published = 1 AND p.status = 'active' AND p.slug IS NOT NULL AND p.slug <> ''
   GROUP BY p.id ORDER BY p.id ASC"
  );
  while ($res && $row = $res->fetch_assoc()) {
    $sf = $row['storefront'] ? json_decode($row['storefront'], true) : [];
    if (!is_array($sf)) $sf = [];
    $out[] = [
      'slug' => $row['slug'], 'name' => $row['name'], 'fabric' => $row['fabric'],
      'fabricKey' => $sf['fabricKey'] ?? null, 'tile' => $sf['tile'] ?? 'hc-tile-mixed',
      'type' => $sf['type'] ?? ($row['category'] ?: 'Pieces'), 'occasion' => $sf['occasion'] ?? null,
      'priceNgn' => (float)$row['base_price'], 'price_ngn' => (float)$row['base_price'],
      'priceUsd' => $sf['priceUsd'] ?? null, 'premium' => !empty($sf['premium']),
      'short' => $sf['short'] ?? $row['description'], 'story' => $row['story'],
      'fit' => $sf['fit'] ?? null, 'material' => $sf['material'] ?? null, 'model' => $sf['model'] ?? null,
      'care' => $row['care'], 'oneOfAKind' => (bool)$row['one_of_a_kind'], 'image' => $row['image_url'],
      'sizes' => $row['sizes'] ? explode(',', $row['sizes']) : [], 'stock' => (int)$row['stock'],
    ];
  }
  // Nothing published — hand back the curated fallback so the shop is never bare.
  if (!$out) {
    foreach ($CATALOGUE as $slug => [$name, $fabric, $price]) {
      $out[] = ['slug' => $slug, 'name' => $name, 'fabric' => $fabric, 'price_ngn' => $price, 'priceNgn' => $price];
    }
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

  // Resolve every line against the LIVE products table (authoritative pricing +
  // real variant stock). Unknown-in-DB slugs fall back to the curated list so
  // legacy links keep working. Never trust the client's price.
  $items = [];
  $goods = 0;
  $prodStmt = $conn->prepare("SELECT id, name, fabric, base_price, one_of_a_kind, care FROM products WHERE slug = ? AND deleted_at IS NULL AND published = 1 LIMIT 1");
  foreach ($reqItems as $it) {
    $slug = trim($it['slug'] ?? '');
    $size = trim($it['size'] ?? 'One size') ?: 'One size';
    $qty = max(1, min(20, (int)($it['qty'] ?? 1)));

    $prodStmt->bind_param('s', $slug);
    $prodStmt->execute();
    $p = $prodStmt->get_result()->fetch_assoc();

    if ($p) {
      // Match the requested size to a variant; else take any variant of the piece.
      $vstmt = $conn->prepare("SELECT id, sku, stock, price_override FROM product_variants WHERE product_id = ? AND size = ? LIMIT 1");
      $vstmt->bind_param('is', $p['id'], $size);
      $vstmt->execute();
      $v = $vstmt->get_result()->fetch_assoc();
      if (!$v) {
        $v = $conn->query("SELECT id, sku, stock, price_override FROM product_variants WHERE product_id = " . (int)$p['id'] . " LIMIT 1")->fetch_assoc();
      }
      $price = ($v && $v['price_override'] !== null) ? (float)$v['price_override'] : (float)$p['base_price'];
      $label = $p['name'] . ' · ' . $p['fabric'] . ' · ' . $size;
      $sku = $v ? $v['sku'] : $slug . '-' . strtolower($size);
      $items[] = ['label' => $label, 'sku' => $sku, 'qty' => $qty, 'unit_price' => $price, 'variant_id' => $v ? (int)$v['id'] : null];
      $goods += $qty * $price;
    } elseif (isset($CATALOGUE[$slug])) {
      [$pname, $fabric, $price] = $CATALOGUE[$slug];
      $label = $pname . ' · ' . $fabric . ' · ' . $size;
      $items[] = ['label' => $label, 'sku' => $slug . '-' . strtolower($size), 'qty' => $qty, 'unit_price' => $price, 'variant_id' => null];
      $goods += $qty * $price;
    } else {
      fail('Unknown item: ' . $slug);
    }
  }

  // Shipping.
  $ship = 0;
  if ($delivery === 'lagos')   $ship = $goods >= $FREE_SHIP_OVER ? 0 : $LAGOS_SHIP;
  if ($delivery === 'nigeria') $ship = $NG_SHIP;

  // Resolve the customer up front — link by phone, or create a CRM record for a
  // new web buyer. Doing this here (not after the order) means store credit,
  // loyalty and referrals can all attach to a real customer id.
  $customerId = null; $isNewCustomer = false;
  if ($phone !== '') {
    $stmt = $conn->prepare('SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1');
    $stmt->bind_param('s', $phone);
    $stmt->execute();
    if ($row = $stmt->get_result()->fetch_assoc()) $customerId = (int)$row['id'];
  }
  if (!$customerId) {
    $ins = $conn->prepare('INSERT INTO customers (name, phone, email) VALUES (?,?,?)');
    $emailVal = $email !== '' ? $email : null;
    $ins->bind_param('sss', $name, $phone, $emailVal);
    $ins->execute();
    $customerId = $conn->insert_id;
    $isNewCustomer = true;
  }

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

  // VAT — configurable rate (settings.vat_rate, a percent). Applied to the
  // taxable goods after any discount; 0/unset = no VAT line.
  $vatRow = $conn->query("SELECT svalue FROM settings WHERE skey = 'vat_rate' LIMIT 1")->fetch_assoc();
  $vatRate = $vatRow ? (float)$vatRow['svalue'] : 0;
  $vat = $vatRate > 0 ? round(max(0, $goods - $discount) * ($vatRate / 100), 2) : 0;
  if ($vat > 0) $items[] = ['label' => 'VAT (' . rtrim(rtrim(number_format($vatRate, 2), '0'), '.') . '%)', 'sku' => 'vat', 'qty' => 1, 'unit_price' => $vat];

  $total = max(0, $goods + $ship - $discount + $vat);

  // Gift card — redeem against the running total (after coupon). Decremented
  // for real after the order is created.
  $giftRow = null; $giftApplied = 0;
  $giftCode = strtoupper(trim($b['gift_card'] ?? ''));
  if ($giftCode !== '' && $total > 0) {
    $gs = $conn->prepare('SELECT id, code, balance FROM gift_cards WHERE UPPER(code) = ? AND active = 1 LIMIT 1');
    $gs->bind_param('s', $giftCode);
    $gs->execute();
    $giftRow = $gs->get_result()->fetch_assoc();
    if (!$giftRow) fail('That gift card is not valid');
    $giftApplied = min((float)$giftRow['balance'], $total);
    if ($giftApplied > 0) {
      $items[] = ['label' => 'Gift card (' . $giftRow['code'] . ')', 'sku' => 'giftcard', 'qty' => 1, 'unit_price' => -$giftApplied];
      $total -= $giftApplied;
    }
  }

  // Store credit — redeem this customer's balance (a returning buyer's pot).
  $creditApplied = 0;
  $wantCredit = isset($b['use_credit']) ? (float)$b['use_credit'] : 0;   // 0/absent = none; -1 = all
  if ($customerId && $total > 0 && ($wantCredit > 0 || $wantCredit == -1)) {
    $bal = credit_balance($customerId);
    $cap = $wantCredit == -1 ? $bal : min($wantCredit, $bal);
    $creditApplied = min($cap, $total);
    if ($creditApplied > 0) {
      $items[] = ['label' => 'Store credit', 'sku' => 'credit', 'qty' => 1, 'unit_price' => -$creditApplied];
      $total -= $creditApplied;
    }
  }
  $total = max(0, $total);

  // Referral — only a brand-new customer can be referred, and never by themself.
  // Captured on the order now; the reward is paid to BOTH only when it's paid.
  $referralCode = strtoupper(trim($b['referral_code'] ?? ''));
  $referrerId = null;
  if ($referralCode !== '' && $isNewCustomer) {
    $rid = referrer_by_code($referralCode);
    if ($rid && $rid !== $customerId) { $referrerId = $rid; }
    else { $referralCode = ''; }   // invalid / self — silently drop, don't block the sale
  } else {
    $referralCode = '';
  }

  // COD counts as a promise to pay; card/transfer start unpaid until confirmed.
  $paymentMethod = $payment;                 // 'card' | 'transfer' | 'cod'
  $paid = 0;
  $fullNotes = trim(($notes !== '' ? $notes : '') . ($gift !== '' ? "\nGift message: " . $gift : ''));
  $shipFull = trim($address . ($city !== '' ? ', ' . $city : ''));
  $sourceVal = substr(trim($b['source'] ?? ''), 0, 60) ?: null;          // utm_source / referrer host
  $utmVal = substr(trim($b['utm_campaign'] ?? ''), 0, 120) ?: null;

  $stmt = $conn->prepare(
    'INSERT INTO orders (code, customer_id, customer_name, customer_phone, channel, source, utm_campaign,
                         payment_method, total, paid, ship_address, notes,
                         referral_code, referrer_id, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)'
  );
  $channel = 'web';
  $refCodeVal = $referralCode !== '' ? $referralCode : null;
  // Next ORD-#### staff code (shared sequence with orders.php), retried on a
  // duplicate; the customer gets a separate random public_ref to track with.
  [$orderId, $code] = insert_with_code('orders', 'ORD', function ($code) use (
    $conn, $stmt, $customerId, $name, $phone, $channel, $sourceVal, $utmVal,
    $paymentMethod, $total, $paid, $shipFull, $fullNotes, $refCodeVal, $referrerId
  ) {
    $stmt->bind_param(
      'sissssssddsssi',
      $code, $customerId, $name, $phone, $channel, $sourceVal, $utmVal,
      $paymentMethod, $total, $paid, $shipFull, $fullNotes,
      $refCodeVal, $referrerId
    );
    $stmt->execute();
    return $conn->insert_id;
  });
  $publicRef = assign_public_ref('orders', $orderId);
  $trackRef = $publicRef ?? $code;

  // A completed order recovers any abandoned cart for this phone (best-effort).
  try {
    $rec = $conn->prepare('UPDATE abandoned_carts SET recovered = 1 WHERE phone = ?');
    $rec->bind_param('s', $phone);
    $rec->execute();
  } catch (\Throwable $e) { /* table may not exist yet */ }

  $itemStmt = $conn->prepare(
    'INSERT INTO order_items (order_id, variant_id, label, sku, qty, unit_price) VALUES (?,?,?,?,?,?)'
  );
  $stockStmt = $conn->prepare('UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ?');
  $soldVariantIds = [];
  foreach ($items as $it) {
    $vid = $it['variant_id'] ?? null;
    $itemStmt->bind_param('iissid', $orderId, $vid, $it['label'], $it['sku'], $it['qty'], $it['unit_price']);
    $itemStmt->execute();
    if ($vid) {
      $stockStmt->bind_param('ii', $it['qty'], $vid);
      $stockStmt->execute();
      $soldVariantIds[] = (int)$vid;
    }
  }

  // Auto-retire any sold-out one-of-a-kind piece sold on this web order.
  if ($soldVariantIds) {
    $in = implode(',', array_unique($soldVariantIds));
    $conn->query(
      "UPDATE products p SET p.status = 'archived', p.published = 0
        WHERE p.one_of_a_kind = 1 AND p.deleted_at IS NULL
          AND p.id IN (SELECT v.product_id FROM product_variants v WHERE v.id IN ($in))
          AND (SELECT COALESCE(SUM(v2.stock),0) FROM product_variants v2 WHERE v2.product_id = p.id) = 0"
    );
  }

  // Record the coupon redemption + bump its usage counter (for caps + attribution).
  if ($coupon) {
    $effective = $discount > 0 ? $discount : (float)($coupon['shipping_saved'] ?? 0);
    $rstmt = $conn->prepare('INSERT INTO coupon_redemptions (coupon_id, order_id, code, discount) VALUES (?,?,?,?)');
    $rstmt->bind_param('iisd', $coupon['coupon_id'], $orderId, $coupon['code'], $effective);
    $rstmt->execute();
    $conn->query('UPDATE coupons SET used = used + 1 WHERE id = ' . (int)$coupon['coupon_id']);
  }

  // Decrement the gift card balance now the order is real.
  if ($giftRow && $giftApplied > 0) {
    $gu = $conn->prepare('UPDATE gift_cards SET balance = GREATEST(0, balance - ?) WHERE id = ?');
    $gu->bind_param('di', $giftApplied, $giftRow['id']);
    $gu->execute();
  }

  // Debit the redeemed store credit against the ledger.
  if ($customerId && $creditApplied > 0) {
    credit_add($customerId, -$creditApplied, 'redeem', $code, 'Redeemed at checkout');
  }

  // COD orders count as a sale on placement — settle any referral now. Card and
  // transfer settle later, when the payment is actually confirmed.
  if ($paymentMethod === 'cod' && $referrerId) referral_settle($orderId);

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
    . "Order reference {$trackRef} · Total ₦" . number_format($total)
    . ".\n{$payNote}\nTrack it anytime: https://heritclothing.com/track (reference {$trackRef}).";
  wa_dispatch($phone, $waMsg, $customerId, 'order_confirmation');

  json([
    'ok' => true,
    'code' => $code,
    'public_ref' => $publicRef,
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
      'reference' => pay_reference($code, $order['id']),
      'metadata' => ['order_code' => $code, 'order_id' => (int)$order['id']],
    ]);
    $resp = gateway_post('https://api.paystack.co/transaction/initialize', $payload, $paystack);
    if ($resp && !empty($resp['data']['authorization_url'])) {
      json(['provider' => 'paystack', 'authorization_url' => $resp['data']['authorization_url'], 'reference' => $resp['data']['reference']]);
    }
    fail('Could not start Paystack payment', 502);
  }

  if (($provider === 'flutterwave' || ($provider === '' && $flw)) && $flw) {
    $ref = pay_reference($code, $order['id']);
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

  // Stripe (international / diaspora). Charges in STRIPE_CURRENCY, converting the
  // NGN total via STRIPE_USD_RATE (NGN per 1 unit, e.g. 1600). Config-gated.
  $stripe = cfg('STRIPE_SECRET');
  if (($provider === 'stripe' || ($provider === '' && $stripe && !$paystack && !$flw)) && $stripe) {
    $cur = strtolower(cfg('STRIPE_CURRENCY', 'usd'));
    $rate = (float)cfg('STRIPE_USD_RATE', 0);
    $amountMajor = $rate > 0 ? ((float)$order['total'] / $rate) : (float)$order['total'];
    $fields = [
      'mode' => 'payment',
      'success_url' => 'https://heritclothing.com/checkout?verify={CHECKOUT_SESSION_ID}',
      'cancel_url' => 'https://heritclothing.com/checkout',
      'client_reference_id' => $code,
      'metadata[order_code]' => $code,
      'line_items[0][quantity]' => 1,
      'line_items[0][price_data][currency]' => $cur,
      'line_items[0][price_data][unit_amount]' => (int) round($amountMajor * 100),
      'line_items[0][price_data][product_data][name]' => 'Herit Clothing ' . $code,
    ];
    if ($email) $fields['customer_email'] = $email;
    $resp = stripe_post('https://api.stripe.com/v1/checkout/sessions', $fields, $stripe);
    if ($resp && !empty($resp['url'])) {
      json(['provider' => 'stripe', 'authorization_url' => $resp['url'], 'reference' => $resp['id']]);
    }
    fail('Could not start Stripe payment', 502);
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
  $stripe = cfg('STRIPE_SECRET');
  $ok = false;

  if (strpos($reference, 'cs_') === 0 && $stripe) {
    // Stripe Checkout session id → confirm + recover the order code from metadata.
    $provider = 'stripe';
    $resp = gateway_get('https://api.stripe.com/v1/checkout/sessions/' . rawurlencode($reference), $stripe);
    $code = $resp['metadata']['order_code'] ?? ($resp['client_reference_id'] ?? $code);
  } elseif ($paystack) {
    $provider = 'paystack';
    $resp = gateway_get('https://api.paystack.co/transaction/verify/' . rawurlencode($reference), $paystack);
  } elseif ($flw) {
    $provider = 'flutterwave';
    $resp = gateway_get('https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=' . rawurlencode($reference), $flw);
  } else {
    fail('No payment gateway configured', 503);
  }

  // A "successful" status is not enough: the gateway transaction must carry the
  // reference pay_init issued for THIS order and at least its total, in the
  // currency pay_init charged (see pay_check() in _lib.php for the units).
  $stmt = $conn->prepare('SELECT id, total, paid FROM orders WHERE code = ? AND deleted_at IS NULL LIMIT 1');
  $stmt->bind_param('s', $code);
  $stmt->execute();
  $order = $stmt->get_result()->fetch_assoc();
  if ($order) {
    if ($provider === 'stripe') {
      $rate = (float)cfg('STRIPE_USD_RATE', 0);
      $expect = [
        'reference' => $reference,
        'amount_minor' => pay_minor_units($rate > 0 ? ((float)$order['total'] / $rate) : (float)$order['total']),
        'currency' => cfg('STRIPE_CURRENCY', 'usd'),
        'code' => $code,
      ];
    } else {
      $expect = [
        'reference' => pay_reference($code, $order['id']),
        'amount_minor' => pay_minor_units($order['total']),
        'currency' => 'NGN',
      ];
    }
    $check = pay_check($provider, $resp, $expect);
    $ok = $check['ok'] && hash_equals($expect['reference'], $reference);
    if (!$ok && ($check['reason'] ?? '') !== 'not_successful') {
      audit(null, 'web_order_pay_mismatch', 'order', (int)$order['id'], ['code' => $code, 'reference' => $reference, 'provider' => $provider, 'reason' => $check['ok'] ? 'reference_mismatch' : $check['reason']]);
    }
    // Already settled (e.g. the customer reloaded the confirmation page): report
    // paid without re-awarding loyalty credit or moving the status backwards.
    if ($ok && (float)$order['total'] > 0 && (float)$order['paid'] >= (float)$order['total']) {
      json(['ok' => true, 'code' => $code, 'status' => 'paid']);
    }
  }

  if ($ok) {
    // Mark paid: paid = total, status → paid.
    $stmt = $conn->prepare("UPDATE orders SET paid = total, status = 'paid' WHERE id = ? AND deleted_at IS NULL");
    $oidPaid = (int)$order['id'];
    $stmt->bind_param('i', $oidPaid);
    $stmt->execute();

    // Loyalty: award store credit on the goods value (a % back, config-set).
    $rate = (float)cfg('LOYALTY_RATE', 0);
    if ($rate > 0) {
      $o = $conn->query("SELECT id, customer_id FROM orders WHERE code = '" . $conn->real_escape_string($code) . "' LIMIT 1")->fetch_assoc();
      if ($o && $o['customer_id']) {
        $goodsRow = $conn->query("SELECT COALESCE(SUM(qty*unit_price),0) AS g FROM order_items WHERE order_id = " . (int)$o['id'] . " AND unit_price > 0 AND sku NOT IN ('shipping')")->fetch_assoc();
        $earn = round(((float)$goodsRow['g']) * $rate);
        if ($earn > 0) credit_add((int)$o['customer_id'], $earn, 'loyalty', $code, 'Earned on order ' . $code);
      }
    }

    // Settle any referral now the order is genuinely paid.
    $oid = $conn->query("SELECT id FROM orders WHERE code = '" . $conn->real_escape_string($code) . "' LIMIT 1")->fetch_assoc();
    if ($oid) referral_settle((int)$oid['id']);

    audit(null, 'web_order_paid', 'order', null, ['code' => $code, 'reference' => $reference]);
    json(['ok' => true, 'code' => $code, 'status' => 'paid']);
  }
  json(['ok' => false, 'code' => $code, 'status' => 'unpaid']);
}

/* ---- WAITLIST JOIN (public "notify me") ---------------------------------- */
if ($action === 'waitlist_join' && method() === 'POST') {
  $b = body();
  $product = trim($b['product'] ?? '');
  $slug = trim($b['slug'] ?? '');
  $size = trim($b['size'] ?? '');
  $cname = trim($b['name'] ?? '');
  $phone = trim($b['phone'] ?? '');
  $email = trim($b['email'] ?? '');
  if ($product === '' && $slug === '') fail('Which piece?');
  if ($phone === '' && $email === '') fail('Leave a phone or email so we can reach you');

  $cid = customer_id_by_phone($phone);
  $cidVal = $cid ?: null;
  $stmt = $conn->prepare('INSERT INTO waitlist (product, slug, size, customer_name, phone, email, customer_id) VALUES (?,?,?,?,?,?,?)');
  $stmt->bind_param('ssssssi', $product, $slug, $size, $cname, $phone, $email, $cidVal);
  $stmt->execute();
  json(['ok' => true], 201);
}

/* ---- SAVE CART (abandoned-cart capture) ---------------------------------- */
/* Called from checkout once a contact phone is entered, before the order is
 * placed. Upserts one row per phone; a completed order flips recovered=1.    */
if ($action === 'save_cart' && method() === 'POST') {
  $b = body();
  $phone = trim($b['phone'] ?? '');
  if ($phone === '') fail('phone is required');
  $cname = trim($b['name'] ?? '');
  $email = trim($b['email'] ?? '');
  $items = isset($b['items']) ? json_encode($b['items']) : null;
  $subtotal = (float)($b['subtotal'] ?? 0);

  $stmt = $conn->prepare(
    'INSERT INTO abandoned_carts (phone, customer_name, email, items, subtotal, recovered, nudged)
     VALUES (?,?,?,?,?,0,0)
     ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name), email = VALUES(email),
                             items = VALUES(items), subtotal = VALUES(subtotal),
                             recovered = 0, updated_at = CURRENT_TIMESTAMP'
  );
  $stmt->bind_param('ssssd', $phone, $cname, $email, $items, $subtotal);
  $stmt->execute();
  json(['ok' => true]);
}

/* ---- TRACK (public order status) ----------------------------------------- */
/* A customer looks up their own order with its reference + phone. The reference
 * is the random public_ref (or, while ALLOW_LEGACY_ORDER_CODE_LOOKUP is on, the
 * old ORD- code). Phone must match (last 9 digits, so +234/0 prefixes don't
 * matter) so one can't browse others' orders. */
if ($action === 'track' && method() === 'GET') {
  $code = trim($_GET['code'] ?? '');
  $phone = trim($_GET['phone'] ?? '');
  if ($code === '' || $phone === '') fail('Order reference and phone are required');

  // Failed lookups are counted per IP in audit_log so code + phone pairs cannot
  // be guessed at speed. TRACK_MAX_PER_IP = 0 switches this off.
  $trackIpKey = 'ip:' . client_ip();
  throttle_enforce([[(int) cfg('TRACK_MAX_PER_IP', 20), 'track_fail_ip', $trackIpKey]],
    (int) cfg('LOGIN_THROTTLE_WINDOW', 900));

  $order = order_by_customer_ref($code,
    'id, code, ' . (has_column('orders', 'public_ref') ? 'public_ref' : 'NULL AS public_ref') . ',
     customer_name, customer_phone, status, total, paid,
     courier, tracking_ref, tracking_url, return_status, created_at');

  $tail = fn($s) => substr(preg_replace('/\D/', '', (string)$s), -9);
  if (!$order || $tail($order['customer_phone']) === '' || $tail($order['customer_phone']) !== $tail($phone)) {
    audit(null, 'track_fail_ip', $trackIpKey);
    fail('No order found for that reference and phone.', 404);
  }

  $items = [];
  $istmt = $conn->prepare("SELECT label, qty FROM order_items WHERE order_id = ? AND sku <> 'shipping'");
  $istmt->bind_param('i', $order['id']);
  $istmt->execute();
  $ir = $istmt->get_result();
  while ($row = $ir->fetch_assoc()) $items[] = ['label' => $row['label'], 'qty' => (int)$row['qty']];

  json([
    'code' => $order['code'],
    'public_ref' => $order['public_ref'],
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
// Stripe wants application/x-www-form-urlencoded, not JSON.
function stripe_post($url, $fields, $secret) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($fields),
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secret, 'Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_TIMEOUT => 30,
  ]);
  $raw = curl_exec($ch);
  curl_close($ch);
  return $raw ? json_decode($raw, true) : null;
}
