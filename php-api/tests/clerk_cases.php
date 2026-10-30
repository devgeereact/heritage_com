<?php
/**
 * HeritOS: Clerk session token tests (_clerk.php). Required by run.php, which provides check() and
 * has loaded _lib.php (so cfg() exists). No database, no network: keys are generated here and the
 * JWKS fetch is injected. Linking against a database is in clerk_link.php (needs a throwaway DB).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_clerk.php';

$b64u = function ($x) { return rtrim(strtr(base64_encode($x), '+/', '-_'), '='); };
$mkKey = function () use ($b64u) {
  $k = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
  $d = openssl_pkey_get_details($k);
  return [$k, ['kty' => 'RSA', 'kid' => 'k1', 'n' => $b64u($d['rsa']['n']), 'e' => $b64u($d['rsa']['e'])]];
};
[$clerkKey, $clerkJwk] = $mkKey();
[$otherKey] = $mkKey();
$iss = 'https://clerk.heritclothing.com';
$now = 1800000000;
$sign = function ($key, array $claims, array $hdr = []) use ($b64u) {
  $h = $b64u(json_encode($hdr + ['alg' => 'RS256', 'kid' => 'k1', 'typ' => 'JWT']));
  $p = $b64u(json_encode($claims));
  openssl_sign("$h.$p", $sig, $key, OPENSSL_ALGO_SHA256);
  return "$h.$p." . $b64u($sig);
};
$good = ['iss' => $iss, 'sub' => 'user_abc', 'azp' => 'https://heritclothing.com', 'exp' => $now + 60, 'nbf' => $now - 5, 'email' => 'a@b.co'];
$cacheDir = sys_get_temp_dir() . '/herit-clerk-test-' . getmypid();
@mkdir($cacheDir, 0700, true);
$fetch = function ($u) use ($clerkJwk) { return json_encode(['keys' => [$clerkJwk]]); };
$verify = function ($tok) use ($iss, $cacheDir, $fetch, $now) {
  foreach (glob("$cacheDir/*") ?: [] as $f) @unlink($f);
  try {
    $v = new HeritClerkJwt($iss, ['https://heritclothing.com', 'https://local.heritclothing.com'], $cacheDir, $fetch, $now);
    return $v->verify($tok)['sub'];
  } catch (RuntimeException $e) { return 'rejected'; }
};

check('clerk: a correctly signed token verifies', $verify($sign($clerkKey, $good)), 'user_abc');
check('clerk: local-live origin is accepted', $verify($sign($clerkKey, ['azp' => 'https://local.heritclothing.com'] + $good)), 'user_abc');
check('clerk: token signed by another key is rejected', $verify($sign($otherKey, $good)), 'rejected');
check('clerk: wrong issuer is rejected', $verify($sign($clerkKey, ['iss' => 'https://clerk.evil.com'] + $good)), 'rejected');
check('clerk: expired token is rejected', $verify($sign($clerkKey, ['exp' => $now - 60] + $good)), 'rejected');
check('clerk: not-yet-valid token is rejected', $verify($sign($clerkKey, ['nbf' => $now + 600] + $good)), 'rejected');
check('clerk: unlisted azp is rejected', $verify($sign($clerkKey, ['azp' => 'https://evil.example'] + $good)), 'rejected');
$noAzp = $good; unset($noAzp['azp']);
check('clerk: missing azp is rejected', $verify($sign($clerkKey, $noAzp)), 'rejected');
$noSub = $good; unset($noSub['sub']);
check('clerk: missing sub is rejected', $verify($sign($clerkKey, $noSub)), 'rejected');
check('clerk: non-RS256 alg is rejected', $verify($sign($clerkKey, $good, ['alg' => 'HS256'])), 'rejected');
check('clerk: malformed token is rejected', $verify('a.b'), 'rejected');
$none = $b64u(json_encode(['alg' => 'none', 'kid' => 'k1'])) . '.' . $b64u(json_encode($good)) . '.';
check('clerk: alg=none is rejected', $verify($none), 'rejected');
check('clerk: unknown kid is rejected', $verify($sign($clerkKey, $good, ['kid' => 'unknown'])), 'rejected');
check('clerk: JWT bearer is told apart from a 64-hex staff token', [clerk_looks_like_jwt('a.b.c'), clerk_looks_like_jwt(bin2hex(random_bytes(32)))], [true, false]);
check('clerk: not configured without issuer and parties', clerk_configured(), false);
try { new HeritClerkJwt('http://clerk.example.com', ['x'], $cacheDir, $fetch); $threw = false; } catch (InvalidArgumentException $e) { $threw = true; }
check('clerk: http issuer is refused', $threw, true);
foreach (glob("$cacheDir/*") ?: [] as $f) @unlink($f);
@rmdir($cacheDir);
