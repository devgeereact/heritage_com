<?php
/**
 * HeritOS — AI image proxy (text-to-image). Same idea as ai.php but for the
 * visual AI features (campaign creative, fabric pattern ideas, brand-story
 * visuals, background scenes). The provider key stays server-side.
 *
 *   POST /ai_image.php  (Bearer token)  {task, prompt, size?}
 *     → { image: "data:image/png;base64,..." }  or  { image_url: "https://..." }
 *
 * Provider is chosen by IMAGE_PROVIDER in config.php (or auto by whichever key
 * is set). With no key configured it returns a clean 503 so the UI can show a
 * "not configured yet" notice instead of failing — mirrors the payment gateway
 * pattern. Image-to-image features (on-model photos, virtual try-on) need an
 * input photo and a different call; this scaffold covers text-to-image.
 */
require __DIR__ . '/_lib.php';
cors();

$user = require_auth();                 // staff only — image generation costs money
if (method() !== 'POST') fail('Method not allowed', 405);

$b = body();
$prompt = trim($b['prompt'] ?? '');
$size = preg_match('/^\d{3,4}x\d{3,4}$/', $b['size'] ?? '') ? $b['size'] : '1024x1024';
$task = trim($b['task'] ?? 'image');
if ($prompt === '') fail('prompt is required');

$provider = cfg('IMAGE_PROVIDER');      // '' | 'openrouter' | 'openai' | 'stability'
$openai = cfg('OPENAI_IMAGE_KEY');
$stability = cfg('STABILITY_KEY');
$openrouter = cfg('OPENROUTER_KEY');     // shared with ai.php — no extra key needed
$orImageModel = cfg('OR_IMAGE_MODEL', 'google/gemini-2.5-flash-image');

/* OpenRouter — image-capable chat model returns the image inline. Reuses the
 * OpenRouter key already configured for ai.php; pick the provider explicitly or
 * let auto-mode use it when no dedicated image key is set. */
if (($provider === 'openrouter' || ($provider === '' && $openrouter && !$openai && !$stability)) && $openrouter) {
  $payload = json_encode([
    'model' => $orImageModel,
    'modalities' => ['image', 'text'],
    'messages' => [['role' => 'user', 'content' => $prompt]],
  ]);
  [$resp, $httpCode] = img_post('https://openrouter.ai/api/v1/chat/completions', $payload, [
    'Authorization: Bearer ' . $openrouter,
    'Content-Type: application/json',
    'HTTP-Referer: https://heritclothing.com',
    'X-Title: HeritOS',
  ]);
  $d = $resp ? json_decode($resp, true) : null;
  $msg = $d['choices'][0]['message'] ?? [];
  // Image-capable models return the image in message.images[]; some return a
  // data: URL inside message.content. Check both.
  $url = $msg['images'][0]['image_url']['url']
       ?? ($msg['images'][0]['url'] ?? null);
  if (!$url && !empty($msg['content']) && preg_match('#(data:image/[^\s"\)]+)#', is_string($msg['content']) ? $msg['content'] : json_encode($msg['content']), $m)) {
    $url = $m[1];
  }
  if ($url) {
    audit($user['id'], 'ai_image', 'ai', null, ['task' => $task, 'provider' => 'openrouter', 'model' => $orImageModel]);
    json(['image_url' => $url]);
  }
  // No image. Return 200 with diagnostics (5xx gets masked by the host's error
  // page, so we can't see the real provider error otherwise).
  json([
    'error' => $d['error']['message'] ?? 'OpenRouter returned no image',
    'provider_http' => $httpCode,
    'model' => $orImageModel,
    'detail' => is_string($resp) ? substr($resp, 0, 600) : null,
  ], 200);
}

if (($provider === 'openai' || ($provider === '' && $openai)) && $openai) {
  $payload = json_encode(['model' => 'gpt-image-1', 'prompt' => $prompt, 'size' => $size, 'n' => 1]);
  [$resp] = img_post('https://api.openai.com/v1/images/generations', $payload, ['Authorization: Bearer ' . $openai, 'Content-Type: application/json']);
  $d = $resp ? json_decode($resp, true) : null;
  $b64 = $d['data'][0]['b64_json'] ?? null;
  $url = $d['data'][0]['url'] ?? null;
  if ($b64) { audit($user['id'], 'ai_image', 'ai', null, ['task' => $task, 'provider' => 'openai']); json(['image' => 'data:image/png;base64,' . $b64]); }
  if ($url) { audit($user['id'], 'ai_image', 'ai', null, ['task' => $task, 'provider' => 'openai']); json(['image_url' => $url]); }
  fail($d['error']['message'] ?? 'Image provider error', 502);
}

if (($provider === 'stability' || ($provider === '' && $stability)) && $stability) {
  // Stability SD3 — multipart form, returns raw image bytes.
  $ch = curl_init('https://api.stability.ai/v2beta/stable-image/generate/core');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => ['prompt' => $prompt, 'output_format' => 'png'],
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $stability, 'Accept: image/*'],
    CURLOPT_TIMEOUT => 120,
  ]);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($raw !== false && $code < 400) {
    audit($user['id'], 'ai_image', 'ai', null, ['task' => $task, 'provider' => 'stability']);
    json(['image' => 'data:image/png;base64,' . base64_encode($raw)]);
  }
  fail('Stability image error', 502);
}

fail('Image AI is not configured on this server', 503);

/* -------------------------------------------------------------------------- */
function img_post($url, $payload, $headers) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 120,
  ]);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($raw === false) $raw = 'curl error: ' . curl_error($ch);
  curl_close($ch);
  return [$raw, $code];
}
