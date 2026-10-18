<?php
/**
 * HeritOS: CLI tests for the pure helpers in _lib.php and _domain.php (no
 * database, no network), plus the case files required at the end.
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
// _domain.php has no dependencies, so it is loaded in place.
require __DIR__ . '/../_domain.php';

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

/* ---- sanitize_url_ok: off-site paths (matches safeHtml.js and richText.js) --- */
foreach (['/shop' => 'a site path', '/' => 'the home page', '/journal/linen-agbada?ref=1#fit' => 'a path with query and fragment',
          'https://heritclothing.com/x' => 'https', 'http://example.test/' => 'http', 'HTTPS://EXAMPLE.TEST' => 'upper-case scheme'] as $u => $what) {
  check("url ok: $what passes", sanitize_url_ok($u, false), true);
}
foreach (['//evil.test/x' => 'protocol-relative //host', '/\\evil.test' => '/\\host (browsers read \\ as /)',
          '\\\\evil.test' => '\\\\host', '/ /evil.test' => '"/ /host" (spaces ignored)', "/\t/evil.test" => 'tab between the slashes',
          "/\n\\evil.test" => 'newline before the backslash', '///evil.test' => 'three slashes',
          'shop' => 'a relative path without "/"', '#top' => 'a bare fragment', '?q=1' => 'a bare query', '' => 'empty', '   ' => 'spaces only',
          'javascript:alert(1)' => 'javascript:', 'data:text/html,x' => 'data:', 'vbscript:x' => 'vbscript:', 'ftp://x.test' => 'ftp:'] as $u => $what) {
  check("url ok: $what refused", sanitize_url_ok($u, true), false);
}
check('url ok: mailto only when allowed', [sanitize_url_ok('mailto:a@b.test', true), sanitize_url_ok('mailto:a@b.test', false)], [true, false]);
check('url ok: tel only when allowed', [sanitize_url_ok('tel:+2348000000000', true), sanitize_url_ok('tel:+2348000000000', false)], [true, false]);
check('sanitize: //host href removed', $has(sanitize_html('<a href="//evil.test/x">x</a>'), 'href'), false);
check('sanitize: /\\host href removed', $has(sanitize_html('<a href="/\\evil.test">x</a>'), 'href'), false);
check('sanitize: //host img src removed', $has(sanitize_html('<img src="//evil.test/p.gif" alt="p">'), 'src'), false);
check('sanitize: site path link kept', $has(sanitize_html('<a href="/book">Book</a>'), 'href="/book"'), true);

/* ---- cors_origin_allowed ------------------------------------------------- */
$prod = 'https://heritclothing.com';
check('cors: configured origin allowed', cors_origin_allowed($prod, $prod, false), true);
check('cors: localhost refused by default', cors_origin_allowed('http://localhost:5112', $prod, false), false);
check('cors: localhost allowed when switched on', cors_origin_allowed('http://localhost:5112', $prod, true), true);
check('cors: 127.0.0.1 allowed when switched on', cors_origin_allowed('http://127.0.0.1:5173', $prod, true), true);
check('cors: lookalike host refused even when on', cors_origin_allowed('http://localhost.evil.test', $prod, true), false);
check('cors: other origin refused', cors_origin_allowed('https://evil.test', $prod, true), false);
check('cors: empty origin refused', cors_origin_allowed('', $prod, true), false);

/* ---- public references and staff codes (A06) ----------------------------- */
$refs = [];
for ($i = 0; $i < 500; $i++) $refs[] = public_ref_generate();
check('public_ref: length is 10', array_unique(array_map('strlen', $refs)), [10]);
check('public_ref: only the unambiguous alphabet',
  count(array_filter($refs, fn($r) => preg_match('/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/', $r) === 1)), 500);
check('public_ref: no 0, O, 1, I or L ever appears', (bool) preg_match('/[0O1IL]/', implode('', $refs)), false);
check('public_ref: 500 draws are all different', count(array_unique($refs)), 500);
check('public_ref: alphabet has 31 characters', strlen(PUBLIC_REF_ALPHABET), 31);
check('public_ref: normalise accepts a typed reference', public_ref_normalise(' k7m2-p9qx 4r '), 'K7M2P9QX4R');
check('public_ref: normalise rejects an old ORD code', public_ref_normalise('ORD-0042'), '');
check('public_ref: normalise rejects ambiguous characters', public_ref_normalise('K7M2P9QX4O'), '');
check('public_ref: normalise rejects wrong length', public_ref_normalise('K7M2P9QX4'), '');
check('seq_code: pads to four digits', seq_code('ORD', 7), 'ORD-0007');
check('seq_code: keeps longer numbers', seq_code('HC', 12345), 'HC-12345');
check('duplicate key: errno 1062 detected', is_duplicate_key(new mysqli_sql_exception('Duplicate entry', 1062)), true);
check('duplicate key: other errors are not', is_duplicate_key(new mysqli_sql_exception('Deadlock', 1213)), false);
check('duplicate key: non-mysqli exception is not', is_duplicate_key(new RuntimeException('x', 1062)), false);

/* ==== Phase 2 domain helpers (_domain.php) ================================ */

/* ---- money --------------------------------------------------------------- */
check('money: "12,500.50" is 1250050 kobo', money_to_minor('12,500.50'), 1250050);
check('money: "12500" is 1250000', money_to_minor('12500'), 1250000);
check('money: integer 15000', money_to_minor(15000), 1500000);
check('money: "0.10" stays exact', money_to_minor('0.10'), 10);
check('money: "0.1" is 10', money_to_minor('0.1'), 10);
check('money: float 12500.5', money_to_minor(12500.5), 1250050);
check('money: naira sign accepted', money_to_minor('₦18,500'), 1850000);
check('money: three decimals rejected', money_to_minor('1.234'), null);
check('money: negative rejected', money_to_minor('-5'), null);
check('money: words rejected', money_to_minor('abc'), null);
check('money: misplaced comma rejected', money_to_minor('1,2,3'), null);
check('money: empty rejected', money_to_minor(''), null);
check('money: NaN rejected', money_to_minor(NAN), null);
check('money: null rejected', money_to_minor(null), null);
check('minor_to_decimal: 1250050', minor_to_decimal(1250050), '12500.50');
check('minor_to_decimal: 5', minor_to_decimal(5), '0.05');
check('minor_to_decimal: negative', minor_to_decimal(-500000), '-5000.00');
check('decimal_to_minor: "-5000.00"', decimal_to_minor('-5000.00'), -500000);
check('decimal_to_minor: "45000.5"', decimal_to_minor('45000.5'), 4500050);

/* ---- payment state ------------------------------------------------------- */
check('state: nothing paid is unpaid', payment_state(5000000, 0, 0), 'unpaid');
check('state: 1 kobo paid is part_paid', payment_state(5000000, 1, 0), 'part_paid');
check('state: 1 kobo short is part_paid', payment_state(5000000, 4999999, 0), 'part_paid');
check('state: exactly the price is paid', payment_state(5000000, 5000000, 0), 'paid');
check('state: overpaid is credit', payment_state(5000000, 5500000, 0), 'credit');
check('state: refunded to zero is refunded', payment_state(5000000, 0, 2000000), 'refunded');
check('state: price 0 is unpriced', payment_state(0, 0, 0), 'unpriced');
check('state: price 0 with money in stays unpriced', payment_state(0, 100000, 0), 'unpriced');
check('state: partial refund leaves part_paid', payment_state(5000000, 1000000, 500000), 'part_paid');

/* ---- ledger totals ------------------------------------------------------- */
$L = fn($id, $kind, $amt, $ver = 1, $rev = null) => ['id' => $id, 'kind' => $kind, 'amount' => $amt, 'verified' => $ver, 'reverses_id' => $rev];
$t = ledger_totals([$L(1, 'payment', '20000.00'), $L(2, 'payment', '10000.00', 0)], 5000000);
check('ledger: unverified excluded from paid', $t['net_verified'], 2000000);
check('ledger: unverified reported apart', $t['unverified'], 1000000);
check('ledger: balance uses verified only', $t['balance'], 3000000);
$t = ledger_totals([$L(1, 'payment', '20000.00'), $L(2, 'reversal', '-20000.00', 1, 1)], 5000000);
check('ledger: reversal nets to zero', $t['net_verified'], 0);
check('ledger: reversal leaves full balance', $t['balance'], 5000000);
$t = ledger_totals([$L(1, 'payment', '20000.00'), $L(2, 'payment', '15000.50')], 5000000);
check('ledger: two payments sum', $t['net_verified'], 3500050);
$t = ledger_totals([$L(1, 'opening', '40000.00'), $L(2, 'payment', '10000.00')], 8500000);
check('ledger: opening plus payment sums', $t['net_verified'], 5000000);
$t = ledger_totals([$L(1, 'payment', '55000.00')], 5000000);
check('ledger: overpayment is credit, not capped', [$t['credit'], $t['balance']], [500000, 0]);
$t = ledger_totals([$L(1, 'payment', '55000.00'), $L(2, 'refund', '-5000.00')], 5000000);
check('ledger: refund clears credit', [$t['credit'], $t['refunded'], $t['net_verified']], [0, 500000, 5000000]);
$t = ledger_totals([$L(1, 'payment', '10000.00', 0), $L(2, 'reversal', '-10000.00', 0, 1)], 5000000);
check('ledger: reversed unverified entry vanishes', [$t['unverified'], $t['net_verified']], [0, 0]);
check('verified on entry: cash yes', payment_verified_on_entry('cash', ['cash']), true);
check('verified on entry: transfer no by default', payment_verified_on_entry('transfer', ['cash']), false);

/* ---- stage mapping ------------------------------------------------------- */
$allMapped = true;
foreach (LEGACY_STAGES as $s) { [$n] = job_stage_from_legacy($s); if (!in_array($n, JOB_STAGES, true)) $allMapped = false; }
check('stages: every legacy stage maps', $allMapped, true);
check('stages: done maps to ready with review flag', job_stage_from_legacy('done'), ['ready', 1]);
check('stages: cut maps to in_production, no flag', job_stage_from_legacy('cut'), ['in_production', 0]);
check('stages: measure maps to confirmed', job_stage_from_legacy('measure'), ['confirmed', 0]);
check('stages: unknown legacy value', job_stage_from_legacy('weird'), [null, 0]);
$rt = [];
foreach (['measure', 'sew', 'fitting', 'done', 'cancelled'] as $s) $rt[$s] = job_stage_to_legacy(job_stage_from_legacy($s)[0]);
check('stages: legacy to new to legacy round-trips', $rt, ['measure' => 'measure', 'sew' => 'sew', 'fitting' => 'fitting', 'done' => 'done', 'cancelled' => 'cancelled']);
$allLegacy = true;
foreach (JOB_STAGES as $s) if (!in_array(job_stage_to_legacy($s), LEGACY_STAGES, true)) $allLegacy = false;
check('stages: every new stage has a legacy value', $allLegacy, true);

/* ---- stage transitions --------------------------------------------------- */
check('transition: quote to ready rejected', job_transition_ok('quote', 'ready'), false);
check('transition: quote to confirmed allowed', job_transition_ok('quote', 'confirmed'), true);
$none = true;
foreach (JOB_STAGES as $s) if (job_transition_ok('handed_over', $s)) $none = false;
check('transition: handed_over to anything rejected', $none, true);
check('transition: fitting back to in_production allowed', job_transition_ok('fitting', 'in_production'), true);
check('transition: unknown from rejected', job_transition_ok('nope', 'ready'), false);
check('handover: 2 of 5 stays ready', handover_stage_after('ready', 5, 2), 'ready');
check('handover: 5 of 5 is handed_over', handover_stage_after('ready', 5, 5), 'handed_over');

/* ---- measurement cleaning ------------------------------------------------ */
$f = [['key' => 'neck', 'label' => 'Neck'], ['key' => 'chest', 'label' => 'Chest'], ['key' => 'waist', 'label' => 'Waist']];
$r = measurement_clean($f, ['neck' => '16', 'chest' => '', 'colour' => 'blue'], 'in');
check('measure: unknown keys dropped and blanks stay missing', $r['clean'], ['neck' => 16.0]);
$r = measurement_clean($f, ['neck' => '0', 'chest' => '-40', 'waist' => 'big'], 'in');
check('measure: 0, negatives and words rejected', array_keys($r['errors']), ['neck', 'chest', 'waist']);
check('measure: rejected values never stored', $r['clean'], []);
$r = measurement_clean($f, ['neck' => '45'], 'in');
check('measure: implausible value warns, not rejects', [isset($r['clean']['neck']), isset($r['warnings']['neck'])], [true, true]);
$r = measurement_clean($f, ['neck' => '40'], 'cm');
check('measure: plausible cm value has no warning', $r['warnings'], []);
$r = measurement_clean($f, ['neck' => '16'], 'unknown');
check('measure: unknown unit skips range warnings', [$r['clean'], $r['warnings']], [['neck' => 16.0], []]);
$cm = ['neck' => 41.3, 'chest' => 101.6, 'waist' => 86.4];
$back = measurement_convert(measurement_convert($cm, 'cm', 'in'), 'in', 'cm');
$within = true;
foreach ($cm as $k => $v) if (abs($back[$k] - $v) > 0.1 + 1e-9) $within = false;
check('measure: cm to in to cm within 0.1', $within, true);
check('measure: in rounds to eighths', measurement_convert(['neck' => 41], 'cm', 'in'), ['neck' => 16.125]);
check('measure: convert to unknown unit refused', measurement_convert(['neck' => 41], 'cm', 'unknown'), []);
check('template fields: good list', template_fields_ok([['key' => 'neck', 'label' => 'Neck']]), true);
check('template fields: duplicate key rejected', template_fields_ok([['key' => 'neck', 'label' => 'A'], ['key' => 'neck', 'label' => 'B']]), false);
check('template fields: bad key rejected', template_fields_ok([['key' => 'Neck size', 'label' => 'Neck']]), false);

/* ---- quotes -------------------------------------------------------------- */
$q = quote_totals([['description' => 'Agbada', 'qty' => 2, 'unit_price_minor' => 1500000]], 200000, 100000);
check('quote: 2 x 15000 + 2000 delivery - 1000 discount', [$q['subtotal'], $q['total'], $q['items'][0]['line_total_minor']], [3000000, 3100000, 3000000]);
check('quote: total never negative', quote_totals([['qty' => 1, 'unit_price_minor' => 100]], 0, 500)['total'], 0);
$h1 = quote_content_hash(['total' => '31000.00', 'terms' => 'x'], [['qty' => '2.00', 'unit_price' => '15000.00']]);
$h2 = quote_content_hash(['terms' => 'x', 'total' => '31000.00'], [['unit_price' => '15000.00', 'qty' => '2.00']]);
$h3 = quote_content_hash(['total' => '31000.00', 'terms' => 'x'], [['qty' => '2.00', 'unit_price' => '16000.00']]);
check('quote hash: stable under key order', $h1, $h2);
check('quote hash: changes when the price changes', $h1 === $h3, false);
check('quote hash: is sha256 hex', (bool) preg_match('/^[0-9a-f]{64}$/', $h1), true);
check('quote number', quote_number(12, 3), 'Q-12-v3');

/* ---- other helpers ------------------------------------------------------- */
check('enquiry: contacted maps to awaiting_reply', enquiry_status_from_legacy('contacted'), 'awaiting_reply');
check('enquiry: unknown status is null', enquiry_status_from_legacy('lost'), null);
check('today more: nothing hidden under the cap', today_more(12, 12), 0);
check('today more: 25 counted, 20 shown', today_more(25, 20), 5);
check('today more: never negative', today_more(3, 5), 0);
check('today more: numeric strings from the database', today_more('21', '20'), 1);
check('enquiry: accepted to new rejected', enquiry_transition_ok('accepted', 'new'), false);
check('enquiry: legacy contacted to quote_sent allowed', enquiry_transition_ok('contacted', 'quote_sent'), true);
check('client ref: 42', client_ref_from_id(42), 'CL-00042');
check('request key: 16 characters accepted', request_key_ok(str_repeat('a', 16)), true);
check('request key: 64 characters accepted', request_key_ok(str_repeat('A', 63) . '-'), true);
check('request key: 15 characters rejected', request_key_ok(str_repeat('a', 15)), false);
check('request key: 65 characters rejected', request_key_ok(str_repeat('a', 65)), false);
check('request key: other characters rejected', request_key_ok('abcdefghijklmno$'), false);
check('request key: non-string rejected', request_key_ok(1234567890123456), false);
check('phone tail: +234 and 0 forms match', phone_tail9('+234 803 000 0001') === phone_tail9('08030000001'), true);
check('phone tail: too short gives empty', phone_tail9('1234'), '');
check('phone masked', phone_masked('08030000042'), '••••••••042');
check('contact match: email ignores case', contact_matches('A@Example.test', 'a@example.test', null), true);
check('contact match: phone by last 9', contact_matches('+2348030000001', null, '08030000001'), true);
check('lagos today: 23:30 UTC is the next Lagos day', lagos_today(gmmktime(23, 30, 0, 10, 10, 2026)), '2026-10-11');
check('lagos today: 22:59 UTC is the same Lagos day', lagos_today(gmmktime(22, 59, 0, 10, 10, 2026)), '2026-10-10');
check('lagos local to UTC: 10:00 Lagos is 09:00 UTC', lagos_local_to_utc('2026-10-12T10:00'), '2026-10-12 09:00:00');
check('lagos local to UTC: explicit Z kept', lagos_local_to_utc('2026-10-12T10:00Z'), '2026-10-12 10:00:00');
check('lagos local to UTC: junk is null', lagos_local_to_utc('tomorrow'), null);
check('ymd: valid date', ymd_or_null('2026-02-28'), '2026-02-28');
check('ymd: impossible date rejected', ymd_or_null('2026-02-30'), null);
check('date add days', date_add_days('2026-10-28', 7), '2026-11-04');

/* ---- Phase 3: appointments ---------------------------------------------- */
$avail = availability_clean([
  'weekly' => ['mon' => [['14:00', '18:00'], ['09:00', '13:00']], 'tue' => [['09:00', '17:00']], 'sun' => []],
  'buffer_min' => 15, 'min_notice_hours' => 24, 'horizon_days' => 30, 'step_min' => 15,
  'durations' => ['consultation' => 45, 'fitting' => 30], 'request_hold_hours' => 48,
]);
check('availability: valid input has no errors', $avail['errors'], []);
$A = $avail['clean'];
check('availability: windows sorted by start', $A['weekly']['mon'], [['09:00', '13:00'], ['14:00', '18:00']]);
check('availability: empty input is valid but not ready', [availability_clean([])['errors'], availability_ready(availability_clean([])['clean'], 'consultation')], [[], false]);
check('availability: empty input keeps every number empty', availability_clean([])['clean']['buffer_min'], null);
check('availability: ready for a type with a duration', availability_ready($A, 'consultation'), true);
check('availability: not ready for a type without a duration', availability_ready($A, 'collection'), false);
check('availability: 50 minutes refused', isset(availability_clean(['durations' => ['fitting' => 50]])['errors']['durations.fitting']), true);
check('availability: overlapping windows refused', isset(availability_clean(['weekly' => ['mon' => [['09:00', '12:00'], ['11:00', '13:00']]]])['errors']['weekly.mon']), true);
check('availability: end before start refused', isset(availability_clean(['weekly' => ['mon' => [['12:00', '09:00']]]])['errors']['weekly.mon']), true);
check('availability: step 20 refused', isset(availability_clean(['step_min' => 20])['errors']['step_min']), true);

// 2026-10-12 is a Monday. Lagos is UTC+1 all year, so 09:00 Lagos is 08:00 UTC.
$mon = gmmktime(0, 0, 0, 10, 12, 2026);
$h = fn($hh, $mm = 0) => $mon + ($hh - 1) * 3600 + $mm * 60;     // Lagos hh:mm on Monday as Unix time
check('slot windows: Monday windows in UTC', slot_windows($A['weekly'], '2026-10-12'), [[$h(9), $h(13)], [$h(14), $h(18)]]);
check('slot windows: closed Sunday is empty', slot_windows($A['weekly'], '2026-10-11'), []);
check('slot windows: day with no entry is closed', slot_windows($A['weekly'], '2026-10-14'), []);
check('slot windows: invalid date is empty', slot_windows($A['weekly'], '2026-02-30'), []);
check('lagos midnight: 2026-10-12 is 23:00 UTC the day before', lagos_midnight_ts('2026-10-12'), gmmktime(23, 0, 0, 10, 11, 2026));
check('lagos iso: UTC 09:00 shows 10:00+01:00', lagos_iso('2026-10-12 09:00:00'), '2026-10-12T10:00:00+01:00');
check('lagos iso: Unix time as a digit string (UNIX_TIMESTAMP)', lagos_iso((string)gmmktime(9, 0, 0, 10, 12, 2026)), '2026-10-12T10:00:00+01:00');
check('lagos iso: null stays null', lagos_iso(null), null);

check('overlap: touching intervals do not overlap without buffer', intervals_overlap(0, 10, 10, 20, 0), false);
check('overlap: touching intervals overlap with a buffer', intervals_overlap(0, 10, 10, 20, 5), true);
check('overlap: gap equal to the buffer is fine', intervals_overlap(0, 10, 15, 20, 5), false);

$win = [[$h(9), $h(13)]];
$all = free_slots($win, [], [], 45 * 60, 15 * 60, 15 * 60, 0, PHP_INT_MAX);
check('free slots: step snaps to a 15 minute grid', array_slice(array_column($all, 0), 0, 3), [$h(9), $h(9, 15), $h(9, 30)]);
check('free slots: last slot ends at the window end', end($all)[1], $h(13));
$busy = [[$h(10), $h(10, 45)]];
$starts = array_column(free_slots($win, $busy, [], 45 * 60, 15 * 60, 15 * 60, 0, PHP_INT_MAX), 0);
check('free slots: 09:00 stays free (ends 09:45, 15 min buffer to 10:00)', in_array($h(9), $starts, true), true);
check('free slots: 09:15 excluded by the buffer', in_array($h(9, 15), $starts, true), false);
check('free slots: 10:00 to 10:45 starts excluded', [in_array($h(10), $starts, true), in_array($h(10, 45), $starts, true)], [false, false]);
check('free slots: 11:00 free again after the buffer', in_array($h(11), $starts, true), true);
$starts = array_column(free_slots($win, [], [[$h(11), $h(12)]], 30 * 60, 0, 30 * 60, 0, PHP_INT_MAX), 0);
check('free slots: a block removes slots without buffer', [in_array($h(10, 30), $starts, true), in_array($h(11), $starts, true), in_array($h(12), $starts, true)], [true, false, true]);
$starts = array_column(free_slots($win, [], [], 30 * 60, 0, 30 * 60, $h(10, 10), $h(11, 30)), 0);
check('free slots: minimum notice and horizon respected', $starts, [$h(10, 30), $h(11), $h(11, 30)]);

$now = $h(9) - 3 * 86400;     // Friday 09:00 Lagos
check('slot check: free grid slot is ok', slot_check($h(9), 'consultation', $A, [], [], $now), 'ok');
check('slot check: lunch break is outside hours', slot_check($h(13, 15), 'consultation', $A, [], [], $now), 'outside_hours');
check('slot check: running past the window end is outside hours', slot_check($h(12, 30), 'consultation', $A, [], [], $now), 'outside_hours');
check('slot check: off the grid is outside hours', slot_check($h(9, 5), 'consultation', $A, [], [], $now), 'outside_hours');
check('slot check: closed day is outside hours', slot_check($h(9) - 86400, 'consultation', $A, [], [], $now), 'outside_hours');
check('slot check: inside minimum notice is too soon', slot_check($h(9), 'consultation', $A, [], [], $h(9) - 3600), 'too_soon');
check('slot check: past the horizon is too far', slot_check($h(9), 'consultation', $A, [], [], $h(9) - 31 * 86400), 'too_far');
check('slot check: buffer conflict', slot_check($h(9, 15), 'consultation', $A, $busy, [], $now), 'conflict');
check('slot check: block wins', slot_check($h(9), 'consultation', $A, [], [[$h(9), $h(9, 30)]], $now), 'blocked');
check('slot check: type without duration not configured', slot_check($h(9), 'collection', $A, [], [], $now), 'not_configured');

check('appointment: requested to confirmed allowed', appointment_transition_ok('requested', 'confirmed'), true);
check('appointment: completed to requested refused', appointment_transition_ok('completed', 'requested'), false);
check('appointment: cancelled is final', appointment_transition_ok('cancelled', 'confirmed'), false);

/* ---- Phase 3: customer access -------------------------------------------- */
$code = access_code_new();
check('access code: six digits', (bool)preg_match('/^\d{6}$/', $code), true);
check('access code hash: deterministic', access_code_hash('123456', 's1'), access_code_hash('123456', 's1'));
check('access code hash: differs per secret', access_code_hash('123456', 's1') === access_code_hash('123456', 's2'), false);
check('access code hash: is not the code', strpos(access_code_hash('123456', 's1'), '123456'), false);
$hc = access_code_hash('012345', 'sec');
check('access code ok: right code', access_code_ok('012345', $hc, 'sec'), true);
check('access code ok: spaces ignored', access_code_ok(' 012 345 ', $hc, 'sec'), true);
check('access code ok: wrong code', access_code_ok('012346', $hc, 'sec'), false);
check('access code ok: wrong secret', access_code_ok('012345', $hc, 'other'), false);
check('access code ok: letters never match', access_code_ok('01234a', $hc, 'sec'), false);
check('token hash: sha256 hex', strlen(token_hash('abc')), 64);
$t0 = gmmktime(12, 0, 0, 10, 12, 2026);
$ch = ['customer_id' => 7, 'channel' => 'email', 'status' => 'pending', 'expires_at' => gmdate('Y-m-d H:i:s', $t0 + 600), 'used_at' => null, 'attempts' => 0];
check('challenge: fresh is ok', challenge_state($ch, $t0), 'ok');
check('challenge: expired after ten minutes', challenge_state($ch, $t0 + 600), 'expired');
check('challenge: used', challenge_state(['used_at' => '2026-10-12 12:01:00', 'status' => 'used'] + $ch, $t0), 'used');
check('challenge: locked after five attempts', challenge_state(['attempts' => 5] + $ch, $t0), 'locked');
check('challenge: decoy has no customer', challenge_state(['customer_id' => null] + $ch, $t0), 'decoy');
check('challenge: awaiting owner cannot verify', challenge_state(['status' => 'awaiting_owner'] + $ch, $t0), 'pending_owner');
check('contact match: partial phone fails', contact_matches('0001', null, '08030000001'), false);
check('contact match: partial email fails', contact_matches('a@example', 'a@example.test', null), false);
check('contact match: empty fails', contact_matches('', 'a@example.test', '08030000001'), false);
check('contact match: email given, record has none', contact_matches('a@example.test', null, '08030000001'), false);

/* ---- Phase 3: portal projection ------------------------------------------ */
$jobRow = ['id' => 9, 'code' => 'HC-0009', 'public_ref' => 'ABCDEFGH23', 'customer_id' => 3, 'job_stage' => 'in_production',
  'description' => 'Two kaftans', 'garment_type' => 'kaftan', 'quantity' => 2, 'price' => '50000.00', 'due_date' => '2026-11-01',
  'event_date' => '2026-11-05', 'handed_over_qty' => 0, 'notes' => 'PRIVATE NOTE', 'notes_internal' => 'PRIVATE', 'owner_notes' => 'PRIVATE',
  'fabric_cost' => '9000.00', 'labour_cost' => '7000.00', 'assigned_tailor_id' => 4, 'tailor_name' => 'Tailor X', 'lock_version' => 3,
  'measurements' => '{"chest":40}', 'measurement_snapshot' => '{"vals":{}}'];
$ledgerRows = [
  ['id' => 1, 'kind' => 'payment', 'amount' => '20000.00', 'verified' => 1, 'method' => 'cash', 'received_on' => '2026-10-01', 'reverses_id' => null, 'note' => 'PRIVATE'],
  ['id' => 2, 'kind' => 'payment', 'amount' => '5000.00', 'verified' => 0, 'method' => 'transfer', 'received_on' => '2026-10-02', 'reverses_id' => null],
  ['id' => 3, 'kind' => 'payment', 'amount' => '1000.00', 'verified' => 1, 'method' => 'cash', 'received_on' => '2026-10-03', 'reverses_id' => null],
  ['id' => 4, 'kind' => 'reversal', 'amount' => '-1000.00', 'verified' => 1, 'method' => 'cash', 'received_on' => '2026-10-03', 'reverses_id' => 3],
];
$apptRows = [
  ['id' => 5, 'type' => 'fitting', 'status' => 'confirmed', 'all_day' => 0, 'starts_at' => '2026-10-20 09:00:00', 'ends_at' => '2026-10-20 09:30:00', 'notes_internal' => 'PRIVATE', 'override_reason' => 'PRIVATE'],
  ['id' => 6, 'type' => 'fitting', 'status' => 'cancelled', 'all_day' => 0, 'starts_at' => '2026-10-19 09:00:00', 'ends_at' => '2026-10-19 09:30:00'],
];
$eventRows = [
  ['stage' => 'in_production', 'kind' => 'stage', 'note' => 'PRIVATE stage note', 'public' => 1, 'created_at' => '2026-10-05 10:00:00'],
  ['stage' => 'in_production', 'kind' => 'measurements', 'note' => 'PRIVATE', 'public' => 0, 'created_at' => '2026-10-05 11:00:00'],
];
$handoverRows = [['method' => 'delivery', 'status' => 'planned', 'quantity' => 2, 'planned_for' => '2026-11-01 10:00:00', 'address' => 'PRIVATE',
  'received_by' => 'PRIVATE', 'evidence_note' => 'PRIVATE', 'balance_at_handover' => '1.00', 'checklist' => '{}', 'courier' => null, 'tracking_url' => null]];
$pv = job_public_view($jobRow, null, $ledgerRows, $handoverRows, $apptRows, $eventRows);
check('public view: exact key set', array_keys($pv), JOB_PUBLIC_KEYS);
$pvJson = json_encode($pv);
check('public view: no private text anywhere', strpos($pvJson, 'PRIVATE'), false);
check('public view: no HC code, costs or tailor', [strpos($pvJson, 'HC-0009'), strpos($pvJson, '9000'), strpos($pvJson, 'Tailor X'), strpos($pvJson, 'lock_version')], [false, false, false, false]);
check('public view: stage label mapped to customer wording', $pv['stage_label'], 'Being made');
check('public view: only verified, unreversed money counts', [$pv['payment']['paid_verified'], $pv['payment']['balance']], ['20000.00', '30000.00']);
check('public view: receipts exclude unverified and reversed', array_column($pv['payment']['receipts'], 'receipt_no'), ['RCT-1']);
check('public view: cancelled appointments hidden; Lagos time', [count($pv['appointments']), $pv['appointments'][0]['starts_at']], [1, '2026-10-20T10:00:00+01:00']);
check('public view: appointment keys', array_keys($pv['appointments'][0]), ['id', 'type', 'status', 'all_day', 'starts_at', 'ends_at']);
check('public view: timeline has public stage events only, no notes', $pv['timeline'], [['stage' => 'in_production', 'label' => 'Being made', 'at' => '2026-10-05T11:00:00+01:00']]);
check('public view: handover keys', array_keys($pv['handovers'][0]), ['method', 'status', 'quantity', 'planned_for', 'completed_at', 'courier', 'tracking_url']);

/* ---- Phase 3: messages and feedback --------------------------------------- */
check('message body: trimmed and control characters removed', message_body_clean("  hi\x07 there\n "), "hi there");
check('message body: empty refused', message_body_clean('   '), null);
check('message body: too long refused', message_body_clean(str_repeat('a', 2001)), null);
check('message body: HTML kept as text', message_body_clean('<b>x</b>'), '<b>x</b>');
$fb = feedback_clean(['rating' => '4', 'comment' => 'Lovely fit', 'publish_consent' => 'first_name', 'photo_consent' => true]);
check('feedback: valid', [$fb['errors'], $fb['clean']['rating'], $fb['clean']['publish_consent'], $fb['clean']['photo_consent'], $fb['clean']['contact_ok']], [[], 4, 'first_name', 1, 0]);
check('feedback: rating optional with a comment', feedback_clean(['comment' => 'ok'])['errors'], []);
check('feedback: consents default to no', [feedback_clean(['comment' => 'ok'])['clean']['publish_consent'], feedback_clean(['comment' => 'ok'])['clean']['photo_consent']], ['no', 0]);
check('feedback: rating 6 refused', isset(feedback_clean(['rating' => 6])['errors']['rating']), true);
check('feedback: nothing given refused', isset(feedback_clean([])['errors']['comment']), true);
check('feedback: unknown consent refused', isset(feedback_clean(['comment' => 'x', 'publish_consent' => 'yes'])['errors']['publish_consent']), true);
check('testimonial name: anonymous', testimonial_name('anonymous', 'Ada Obi'), 'Herit client');
check('testimonial name: first name only', testimonial_name('first_name', 'Ada Obi'), 'Ada');
check('testimonial name: no consent never publishes', testimonial_name('no', 'Ada Obi'), null);

/* ---- Phase 4: website CMS (_cms.php) --------------------------------------- */
require __DIR__ . '/cms_cases.php';

/* ---- Phase 5: company orders (_company.php) -------------------------------- */
require __DIR__ . '/company_cases.php';

/* ---- Retention plan (_retention.php, K-18) ---------------------------------- */
require __DIR__ . '/retention_cases.php';

/* ---- Phase 7: usage allowlist and review report (_review.php) --------------- */
require __DIR__ . '/review_cases.php';

/* ---- A15: staff session cookie and CSRF (_lib.php) ------------------------- */
require __DIR__ . '/staff_cookie_cases.php';

/* ---- A02: release manifest check (_release.php) ---------------------------- */
require __DIR__ . '/release_cases.php';

/* ---- K-25: reset request answers take a fixed minimum time ----------------- */
$t0 = 1_800_000_000.0;
check('min duration: fresh request waits the whole floor', min_duration_wait_us($t0, $t0, 600), 600000);
check('min duration: waits only what is left', min_duration_wait_us($t0, $t0 + 0.25, 600), 350000);
check('min duration: slow work past the floor waits nothing', min_duration_wait_us($t0, $t0 + 0.9, 600), 0);
check('min duration: exactly at the floor waits nothing', min_duration_wait_us($t0, $t0 + 0.6, 600), 0);
check('min duration: a negative floor counts as none', min_duration_wait_us($t0, $t0, -50), 0);
$s = microtime(true); wait_min_duration(120, $s); $took = microtime(true) - $s;
check('min duration: wait_min_duration sleeps at least the floor', $took >= 0.12 && $took < 0.5, true);
$s = microtime(true); wait_min_duration(100, $s - 1); $took = microtime(true) - $s;
check('min duration: no sleep once the floor has passed', $took < 0.05, true);
check('early answer: the CLI has no way to end a response early', json_send_early_finisher(), null);
check('early answer: json_send_early sends nothing and says so on the CLI', json_send_early(['ok' => true]), false);

/* ---- spa.php: paths that preview nothing never open the database ----------- */
// spa.php runs in a child PHP next to a stub _lib.php that leaves a marker file
// and then fails, as a missing config or database would.
$spaDir = sys_get_temp_dir() . '/heritos-spa-' . bin2hex(random_bytes(4));
mkdir($spaDir, 0700);
copy(__DIR__ . '/../spa.php', "$spaDir/spa.php");
copy(__DIR__ . '/../_cms.php', "$spaDir/_cms.php");
file_put_contents("$spaDir/index.html", '<html><head><!--hc:head--></head><body>APP</body></html>');
file_put_contents("$spaDir/_lib.php", "<?php touch(__DIR__ . '/lib-loaded'); throw new RuntimeException('no database');\n");
$spaRun = function ($uri) use ($spaDir) {
  @unlink("$spaDir/lib-loaded");
  $code = '$_SERVER["REQUEST_URI"] = ' . var_export($uri, true) . '; require ' . var_export("$spaDir/spa.php", true) . ';';
  $out = shell_exec(escapeshellarg(PHP_BINARY) . ' -d display_errors=0 -r ' . escapeshellarg($code) . ' 2>/dev/null');
  return [(string)$out, is_file("$spaDir/lib-loaded")];
};
[$out, $lib] = $spaRun('/shop/some-item');
check('spa: a shop path is served as index.html', strpos($out, 'APP') !== false, true);
check('spa: a shop path never loads _lib.php (no database)', $lib, false);
[$out, $lib] = $spaRun('/admin/dashboard');
check('spa: an admin path never loads _lib.php', $lib, false);
[$out, $lib] = $spaRun('/services/bespoke-suits');
check('spa: a preview path does load _lib.php', $lib, true);
check('spa: and still serves index.html when the database fails', strpos($out, 'APP') !== false, true);
array_map('unlink', glob("$spaDir/*")); rmdir($spaDir);

/* ---- K-26: reset throttle per address and IP pair ------------------------- */
$k1 = account_ip_key('a@example.test', '203.0.113.5');
check('pair key: stable for one address and IP', account_ip_key('a@example.test', '203.0.113.5'), $k1);
check('pair key: another IP gives another key', account_ip_key('a@example.test', '198.51.100.7') !== $k1, true);
check('pair key: another address gives another key', account_ip_key('b@example.test', '203.0.113.5') !== $k1, true);
check('pair key: no readable address or IP inside', strpos($k1, 'example') === false && strpos($k1, '203.0') === false, true);
check('pair key: fits audit_log.entity', (bool) preg_match('/^acip:[0-9a-f]{32}$/', $k1), true);

/* ---- Request rules: lost races and wrong-typed fields (_lib.php) ---------- */
require __DIR__ . '/request_cases.php';

echo "\n$pass passed, $failed failed\n";
exit($failed ? 1 : 0);
