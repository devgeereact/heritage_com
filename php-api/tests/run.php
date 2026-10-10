<?php
/**
 * HeritOS: CLI tests for the pure helpers in _lib.php (no database, no network).
 *
 *   php php-api/tests/run.php
 *
 * _lib.php loads config.php on include, so the test copies it into a temporary
 * folder next to a stub config.php (no credentials) and includes that copy.
 * Not deployed: deploy.yml copies named files only.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$tmp = sys_get_temp_dir() . '/heritos-tests-' . bin2hex(random_bytes(4));
mkdir($tmp, 0700);
copy(__DIR__ . '/../_lib.php', $tmp . '/_lib.php');
file_put_contents($tmp . '/config.php', "<?php\ndefine('CORS_ORIGIN', 'https://example.test');\n");
require $tmp . '/_lib.php';
restore_exception_handler();
unlink($tmp . '/_lib.php'); unlink($tmp . '/config.php'); rmdir($tmp);

$pass = 0; $failed = 0;
function check($name, $actual, $expected) {
  global $pass, $failed;
  if ($actual === $expected) { $pass++; echo "PASS  $name\n"; }
  else { $failed++; echo "FAIL  $name\n      expected " . var_export($expected, true) . "\n      got      " . var_export($actual, true) . "\n"; }
}

/* ---- throttle_retry_after ------------------------------------------------ */
$now = 1_800_000_000; $win = 900;
check('throttle: no failures allowed', throttle_retry_after([], 5, $win, $now), 0);
check('throttle: under limit allowed', throttle_retry_after([$now - 10, $now - 20, $now - 30, $now - 40], 5, $win, $now), 0);
check('throttle: at limit blocked until oldest leaves window',
  throttle_retry_after([$now - 10, $now - 20, $now - 30, $now - 40, $now - 100], 5, $win, $now), 800);
check('throttle: order of timestamps does not matter',
  throttle_retry_after([$now - 100, $now - 10, $now - 40, $now - 30, $now - 20], 5, $win, $now), 800);
check('throttle: oldest exactly at window edge is allowed',
  throttle_retry_after([$now - 1, $now - 2, $now - 3, $now - 4, $now - 900], 5, $win, $now), 0);
check('throttle: limit 0 disables', throttle_retry_after([$now, $now, $now], 0, $win, $now), 0);
check('throttle: only the newest $limit failures count',
  throttle_retry_after([$now - 5, $now - 6, $now - 500, $now - 700], 2, $win, $now), 894);

/* ---- pay_reference / pay_minor_units ------------------------------------- */
check('reference: format ORD-0001-<8 hex>', (bool) preg_match('/^ORD-0001-[0-9a-f]{8}$/', pay_reference('ORD-0001', 1)), true);
check('reference: deterministic', pay_reference('ORD-0001', 1), pay_reference('ORD-0001', '1'));
check('reference: differs per order id', pay_reference('ORD-0001', 1) === pay_reference('ORD-0001', 2), false);
check('minor units: 18500.00 NGN = 1850000 kobo', pay_minor_units('18500.00'), 1850000);
check('minor units: 19.99 = 1999', pay_minor_units(19.99), 1999);

/* ---- pay_check: Paystack (amount in kobo) -------------------------------- */
$ref = pay_reference('ORD-0042', 42);
$ngn = ['reference' => $ref, 'amount_minor' => 1850000, 'currency' => 'NGN'];
$ps = fn($over = []) => ['status' => true, 'data' => array_merge(
  ['status' => 'success', 'reference' => $ref, 'amount' => 1850000, 'currency' => 'NGN'], $over)];
check('paystack: match', pay_check('paystack', $ps(), $ngn), ['ok' => true, 'reason' => 'ok']);
check('paystack: wrong amount (paid less)', pay_check('paystack', $ps(['amount' => 100]), $ngn)['reason'], 'amount_mismatch');
check('paystack: amount sent in naira, not kobo', pay_check('paystack', $ps(['amount' => 18500]), $ngn)['reason'], 'amount_mismatch');
check('paystack: wrong currency', pay_check('paystack', $ps(['currency' => 'GHS']), $ngn)['reason'], 'currency_mismatch');
check('paystack: wrong reference', pay_check('paystack', $ps(['reference' => 'ORD-0042-deadbeef']), $ngn)['reason'], 'reference_mismatch');
check('paystack: not successful', pay_check('paystack', $ps(['status' => 'abandoned']), $ngn)['reason'], 'not_successful');
check('paystack: missing amount', pay_check('paystack', $ps(['amount' => null]), $ngn)['reason'], 'amount_mismatch');
check('paystack: overpayment accepted', pay_check('paystack', $ps(['amount' => 1900000]), $ngn)['ok'], true);
check('paystack: no response', pay_check('paystack', null, $ngn)['reason'], 'no_response');

/* ---- pay_check: Flutterwave (amount in naira) ---------------------------- */
$fw = fn($over = []) => ['status' => 'success', 'data' => array_merge(
  ['status' => 'successful', 'tx_ref' => $ref, 'amount' => 18500, 'currency' => 'NGN'], $over)];
check('flutterwave: match', pay_check('flutterwave', $fw(), $ngn), ['ok' => true, 'reason' => 'ok']);
check('flutterwave: wrong amount (paid less)', pay_check('flutterwave', $fw(['amount' => 18499.99]), $ngn)['reason'], 'amount_mismatch');
check('flutterwave: wrong currency', pay_check('flutterwave', $fw(['currency' => 'USD']), $ngn)['reason'], 'currency_mismatch');
check('flutterwave: wrong reference', pay_check('flutterwave', $fw(['tx_ref' => 'ORD-0041-' . substr(md5('x'), 0, 8)]), $ngn)['reason'], 'reference_mismatch');
check('flutterwave: not successful', pay_check('flutterwave', $fw(['status' => 'failed']), $ngn)['reason'], 'not_successful');

/* ---- pay_check: Stripe (amount_total in cents) --------------------------- */
$cs = 'cs_test_a1b2c3';
$usd = ['reference' => $cs, 'amount_minor' => 1157, 'currency' => 'usd', 'code' => 'ORD-0042'];
$st = fn($over = []) => array_merge(['id' => $cs, 'payment_status' => 'paid', 'amount_total' => 1157,
  'currency' => 'usd', 'client_reference_id' => 'ORD-0042', 'metadata' => ['order_code' => 'ORD-0042']], $over);
check('stripe: match', pay_check('stripe', $st(), $usd), ['ok' => true, 'reason' => 'ok']);
check('stripe: wrong amount', pay_check('stripe', $st(['amount_total' => 1156]), $usd)['reason'], 'amount_mismatch');
check('stripe: wrong currency', pay_check('stripe', $st(['currency' => 'eur']), $usd)['reason'], 'currency_mismatch');
check('stripe: wrong reference (other session)', pay_check('stripe', $st(['id' => 'cs_test_other']), $usd)['reason'], 'reference_mismatch');
check('stripe: session for another order', pay_check('stripe', $st(['metadata' => ['order_code' => 'ORD-0001'], 'client_reference_id' => 'ORD-0001']), $usd)['reason'], 'order_mismatch');
check('stripe: unpaid', pay_check('stripe', $st(['payment_status' => 'unpaid']), $usd)['reason'], 'not_successful');

/* ---- pay_check: guards ---------------------------------------------------- */
check('unknown provider rejected', pay_check('paypal', $ps(), $ngn)['reason'], 'unknown_provider');
check('empty expectation rejected', pay_check('paystack', $ps(), ['reference' => '', 'amount_minor' => 1, 'currency' => 'NGN'])['reason'], 'bad_expectation');

/* ---- sanitize_html -------------------------------------------------------- */
$has = fn($html, $needle) => str_contains($html, $needle);
check('sanitize: script removed with its content',
  sanitize_html('<p>Hi</p><script>alert(1)</script>'), '<p>Hi</p>');
check('sanitize: onerror removed, safe img kept',
  sanitize_html('<img src="/a.jpg" alt="A" onerror="alert(1)">'), '<img src="/a.jpg" alt="A">');
check('sanitize: javascript: href removed', $has(sanitize_html('<a href="javascript:alert(1)">x</a>'), 'href'), false);
check('sanitize: obfuscated java&#x09;script: href removed', $has(sanitize_html('<a href="java&#x09;script:alert(1)">x</a>'), 'href'), false);
check('sanitize: data: img src removed', $has(sanitize_html('<img src="data:image/svg+xml;base64,AAAA">'), 'src'), false);
check('sanitize: https link kept with rel added',
  sanitize_html('<a href="https://heritclothing.com/shop" title="Shop" target="_blank">Shop</a>'),
  '<a href="https://heritclothing.com/shop" title="Shop" rel="noopener noreferrer">Shop</a>');
check('sanitize: mailto link kept', $has(sanitize_html('<a href="mailto:hello@heritclothing.com">mail</a>'), 'href="mailto:'), true);
check('sanitize: allowed tags kept',
  sanitize_html('<h2>T</h2><p><strong>b</strong> <em>i</em></p><ul><li>one</li></ul><blockquote>q</blockquote>'),
  '<h2>T</h2><p><strong>b</strong> <em>i</em></p><ul><li>one</li></ul><blockquote>q</blockquote>');
check('sanitize: style and class removed, unknown tag unwrapped',
  sanitize_html('<div class="x"><p style="color:red" onclick="x()">Hello <span>there</span></p></div>'),
  '<p>Hello there</p>');
check('sanitize: iframe, svg and form dropped',
  sanitize_html('<p>a</p><iframe src="https://evil.test"></iframe><svg onload="x()"><circle/></svg><form><input></form>'), '<p>a</p>');
check('sanitize: UTF-8 naira and accents preserved',
  sanitize_html('<p>Agbada ₦45,000, café, Ọ̀yọ́</p>'), '<p>Agbada ₦45,000, café, Ọ̀yọ́</p>');
check('sanitize: no html/body wrapper',
  preg_match('#<(html|body|head|!doctype)#i', sanitize_html('<p>x</p>')), 0);
check('sanitize: plain text passes through', sanitize_html('Just text & more'), 'Just text &amp; more');
check('sanitize: empty stays empty', sanitize_html(''), '');
check('sanitize: fallback strips attributes and scripts',
  sanitize_html_fallback('<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:x">b</a>'), '<p>a</p><a>b</a>');

/* ---- cors_origin_allowed ------------------------------------------------- */
$prod = 'https://heritclothing.com';
check('cors: configured origin allowed', cors_origin_allowed($prod, $prod, false), true);
check('cors: localhost refused by default', cors_origin_allowed('http://localhost:5112', $prod, false), false);
check('cors: localhost allowed when switched on', cors_origin_allowed('http://localhost:5112', $prod, true), true);
check('cors: 127.0.0.1 allowed when switched on', cors_origin_allowed('http://127.0.0.1:5173', $prod, true), true);
check('cors: lookalike host refused even when on', cors_origin_allowed('http://localhost.evil.test', $prod, true), false);
check('cors: other origin refused', cors_origin_allowed('https://evil.test', $prod, true), false);
check('cors: empty origin refused', cors_origin_allowed('', $prod, true), false);

echo "\n$pass passed, $failed failed\n";
exit($failed ? 1 : 0);
