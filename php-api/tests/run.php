<?php
/**
 * HeritOS: CLI tests for the pure helpers in _lib.php and _domain.php (no
 * database, no network).
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

echo "\n$pass passed, $failed failed\n";
exit($failed ? 1 : 0);
