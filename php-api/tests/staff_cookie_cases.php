<?php
/**
 * HeritOS: staff session cookie and CSRF helper tests (A15, _lib.php). Required
 * by run.php, which provides check() and has loaded _lib.php.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$tokA = str_repeat('ab', 32);   // 64 hex characters, like issue_token()
$tokB = str_repeat('0f', 32);

/* ---- which credential ------------------------------------------------------ */
check('credential: Bearer header used', staff_credential_pick("Bearer $tokA", null, false), ['token' => $tokA, 'source' => 'bearer']);
check('credential: Bearer scheme is case-insensitive', staff_credential_pick("bearer  $tokA ", null, false), ['token' => $tokA, 'source' => 'bearer']);
check('credential: Bearer wins over the cookie', staff_credential_pick("Bearer $tokA", $tokB, true)['source'], 'bearer');
check('credential: cookie used when cookie auth is on', staff_credential_pick('', $tokB, true), ['token' => $tokB, 'source' => 'cookie']);
check('credential: cookie ignored when cookie auth is off', staff_credential_pick('', $tokB, false), null);
check('credential: malformed cookie ignored', staff_credential_pick('', 'not-a-token', true), null);
check('credential: upper-case hex cookie ignored', staff_credential_pick('', strtoupper($tokB), true), null);
check('credential: cookie array ignored', staff_credential_pick('', [$tokB], true), null);
check('credential: empty Bearer falls back to the cookie', staff_credential_pick('Bearer   ', $tokB, true)['source'], 'cookie');
check('credential: Basic auth is not a staff credential', staff_credential_pick('Basic dXNlcjpwYXNz', null, true), null);
check('credential: nothing sent', staff_credential_pick(null, null, true), null);

/* ---- CSRF rule ---------------------------------------------------------------- */
check('csrf: Bearer write needs no header', staff_csrf_ok('POST', 'bearer', null, null), true);
check('csrf: cookie GET needs no header', staff_csrf_ok('GET', 'cookie', null, null), true);
check('csrf: cookie HEAD and OPTIONS need no header', [staff_csrf_ok('HEAD', 'cookie', null, null), staff_csrf_ok('options', 'cookie', null, null)], [true, true]);
check('csrf: cookie POST with matching header passes', staff_csrf_ok('POST', 'cookie', $tokA, $tokA), true);
check('csrf: cookie POST without the header refused', staff_csrf_ok('POST', 'cookie', null, $tokA), false);
check('csrf: cookie POST with a different header refused', staff_csrf_ok('POST', 'cookie', $tokB, $tokA), false);
check('csrf: cookie POST with no CSRF cookie refused, even if both are empty', staff_csrf_ok('POST', 'cookie', '', ''), false);
check('csrf: malformed CSRF cookie refused even when echoed', staff_csrf_ok('POST', 'cookie', 'x', 'x'), false);
check('csrf: method name case does not open a gap', staff_csrf_ok('post', 'cookie', null, $tokA), false);
check('csrf: PUT, PATCH and DELETE are writes', [staff_csrf_ok('PUT', 'cookie', null, $tokA), staff_csrf_ok('PATCH', 'cookie', null, $tokA), staff_csrf_ok('DELETE', 'cookie', null, $tokA)], [false, false, false]);

/* ---- local http detection ------------------------------------------------------ */
$local = ['HTTP_HOST' => '127.0.0.1:8088', 'REMOTE_ADDR' => '127.0.0.1'];
check('local http: staging on 127.0.0.1', request_is_local_http($local), true);
check('local http: localhost with IPv6 loopback client', request_is_local_http(['HTTP_HOST' => 'localhost:5112', 'REMOTE_ADDR' => '::1']), true);
check('local http: HTTPS is never local http', request_is_local_http($local + ['HTTPS' => 'on']), false);
check('local http: HTTPS=off still counts as http', request_is_local_http($local + ['HTTPS' => 'off']), true);
check('local http: live host name', request_is_local_http(['HTTP_HOST' => 'heritclothing.com', 'REMOTE_ADDR' => '127.0.0.1']), false);
check('local http: forged localhost Host from a remote client', request_is_local_http(['HTTP_HOST' => 'localhost', 'REMOTE_ADDR' => '203.0.113.9']), false);
check('local http: nothing known', request_is_local_http([]), false);

/* ---- cookie attributes ---------------------------------------------------------- */
check('cookie names: __Host- prefix on the live site', staff_cookie_names(false), ['session' => '__Host-herit_staff', 'csrf' => '__Host-herit_csrf']);
check('cookie names: bare names on local http', staff_cookie_names(true), ['session' => 'herit_staff', 'csrf' => 'herit_csrf']);
$live = staff_cookie_names(false);
check('cookie: session cookie on the live site',
  staff_cookie_header($live['session'], $tokA, 1209600, true, true),
  "__Host-herit_staff=$tokA; Max-Age=1209600; Path=/; Secure; HttpOnly; SameSite=Strict");
check('cookie: CSRF cookie is readable by the page',
  staff_cookie_header($live['csrf'], $tokB, 1209600, true, false),
  "__Host-herit_csrf=$tokB; Max-Age=1209600; Path=/; Secure; SameSite=Strict");
check('cookie: __Host- rules hold on the live site (Secure, Path=/, no Domain)',
  array_map(fn($h) => [str_contains($h, '; Secure'), str_contains($h, '; Path=/;'), stripos($h, 'domain=') === false],
    [staff_cookie_header($live['session'], $tokA, 1, true, true), staff_cookie_header($live['csrf'], $tokB, 1, true, false)]),
  [[true, true, true], [true, true, true]]);
check('cookie: local staging drops only Secure',
  staff_cookie_header('herit_staff', $tokA, 60, false, true),
  "herit_staff=$tokA; Max-Age=60; Path=/; HttpOnly; SameSite=Strict");
check('cookie: clearing sends an empty value and Max-Age 0',
  staff_cookie_header('herit_staff', '', 0, true, true),
  'herit_staff=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict');
check('cookie: negative lifetime is clamped to 0', strpos(staff_cookie_header('herit_csrf', '', -5, true, false), 'Max-Age=0;') !== false, true);
check('cookie: a value cannot add attributes', staff_cookie_header('herit_staff', 'a; Domain=evil.test', 1, true, true),
  'herit_staff=a%3B%20Domain%3Devil.test; Max-Age=1; Path=/; Secure; HttpOnly; SameSite=Strict');

/* ---- sign-in request rule (login CSRF) ------------------------------------------ */
$self = 'https://heritclothing.com'; $cors = 'https://heritclothing.com';
$lr = fn($ct, $sfs = '', $origin = '', $allowLocal = false) => staff_login_request_check($ct, $sfs, $origin, $self, $cors, $allowLocal);
check('login: JSON with no Origin (curl, e2e) allowed', $lr('application/json'), null);
check('login: JSON with a charset allowed', $lr('Application/JSON; charset=utf-8'), null);
check('login: same-origin browser request allowed', $lr('application/json', 'same-origin', $self), null);
check('login: text/plain form refused with 415', $lr('text/plain', 'cross-site', 'https://evil.example')[0], 415);
check('login: urlencoded form refused', $lr('application/x-www-form-urlencoded')[0], 415);
check('login: multipart refused', $lr('multipart/form-data; boundary=x')[0], 415);
check('login: no Content-Type refused', $lr('')[0], 415);
check('login: a JSON-looking suffix does not pass', $lr('text/plain; application/json')[0], 415);
check('login: foreign Origin refused with 403', $lr('application/json', 'cross-site', 'https://evil.example')[0], 403);
check('login: foreign Origin refused even without Sec-Fetch-Site', $lr('application/json', '', 'https://evil.example')[0], 403);
check('login: cross-site with no Origin refused', $lr('application/json', 'cross-site')[0], 403);
check('login: same-site sibling with no Origin allowed', $lr('application/json', 'same-site'), null);
check('login: null Origin (sandboxed frame) refused', $lr('application/json', 'cross-site', 'null')[0], 403);
check('login: configured CORS origin allowed', staff_login_request_check('application/json', 'cross-site', 'https://heritclothing.com', 'https://www.heritclothing.com', $cors, false), null);
check('login: localhost dev origin allowed only with ALLOW_LOCALHOST_CORS',
  [$lr('application/json', 'cross-site', 'http://localhost:5112', true), $lr('application/json', 'cross-site', 'http://localhost:5112', false)[0]], [null, 403]);
check('login: http origin of the same host is not the https site', $lr('application/json', 'cross-site', 'http://heritclothing.com')[0], 403);
