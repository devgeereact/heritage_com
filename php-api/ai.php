<?php
/**
 * HeritOS — AI proxy. Every AI feature routes through here so the OpenRouter
 * key stays server-side and never reaches the browser.
 *
 *   POST /ai.php  (Bearer token)  {task, prompt, system?, max_tokens?}
 *     → {text}
 *
 * `task` is a label for auditing/rate context (e.g. "product_description").
 */
require __DIR__ . '/_lib.php';
cors();

$user = require_auth();           // only signed-in staff may spend tokens
if (method() !== 'POST') fail('Method not allowed', 405);
if (OPENROUTER_KEY === '') fail('AI is not configured on this server', 503);

$b = body();
$prompt = trim($b['prompt'] ?? '');
$system = trim($b['system'] ?? 'You are a helpful assistant for Herit Clothing, a Lagos fashion brand celebrating African heritage. Write in clear UK English. No marketing fluff.');
$task = trim($b['task'] ?? 'general');
$maxTokens = min(2000, max(64, (int)($b['max_tokens'] ?? 800)));
if ($prompt === '') fail('prompt is required');
if (mb_strlen($prompt) > 20000 || mb_strlen($system) > 4000) fail('That request is too long');

// Daily cap per staff member so a lost token or a loop cannot run up the bill.
$capKey = 'user:' . (int)$user['id'];
throttle_enforce([[(int)cfg('AI_MAX_PER_USER_DAY', 200), 'ai_call_cap', $capKey]], 86400);
audit($user['id'], 'ai_call_cap', $capKey);

$payload = json_encode([
  'model' => OR_MODEL,
  'max_tokens' => $maxTokens,
  'messages' => [
    ['role' => 'system', 'content' => $system],
    ['role' => 'user', 'content' => $prompt],
  ],
]);

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . OPENROUTER_KEY,
    'Content-Type: application/json',
    'HTTP-Referer: https://heritclothing.com',
    'X-Title: HeritOS',
  ],
  CURLOPT_TIMEOUT => 60,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($resp === false) fail('The AI service could not be reached. Try again shortly.' . (cfg('GK_DEBUG', false) ? ' (' . curl_error($ch) . ')' : ''), 502);
curl_close($ch);

$data = json_decode($resp, true);
if ($code >= 400) fail($data['error']['message'] ?? 'AI provider error', 502);

$text = $data['choices'][0]['message']['content'] ?? '';
audit($user['id'], 'ai_call', 'ai', null, ['task' => $task, 'model' => OR_MODEL]);
json(['text' => $text]);
