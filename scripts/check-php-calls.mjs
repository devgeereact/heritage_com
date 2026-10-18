#!/usr/bin/env node
// Every endpoint in php-api/ must load the helper file that defines each
// function it calls. A missing require is not a syntax error, so php -l passes
// and the endpoint only fails at runtime with "Call to undefined function".
// Helper files (names starting with _) are skipped: they rely on their callers.
//
//   node scripts/check-php-calls.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'php-api')
const files = readdirSync(dir).filter((f) => f.endsWith('.php'))
const src = Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), 'utf8')]))

const defs = new Map()
for (const [f, s] of Object.entries(src)) {
  for (const m of s.matchAll(/^\s*function\s+([A-Za-z_]\w*)\s*\(/gm)) {
    if (!defs.has(m[1])) defs.set(m[1], new Set())
    defs.get(m[1]).add(f)
  }
}

function loaded(f, seen = new Set()) {
  if (seen.has(f) || !src[f]) return seen
  seen.add(f)
  for (const m of src[f].matchAll(/require(?:_once)?\s*\(?\s*__DIR__\s*\.\s*'\/([\w.]+\.php)'/g)) loaded(m[1], seen)
  return seen
}

const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/^\s*#.*$/gm, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, "''")

const problems = []
for (const f of files.filter((name) => !name.startsWith('_'))) {
  const have = loaded(f)
  const calls = new Set([...strip(src[f]).matchAll(/(?<![\w>$:\\])([a-z_]\w*)\s*\(/g)].map((m) => m[1]))
  for (const c of calls) {
    const where = defs.get(c)
    if (where && ![...where].some((d) => have.has(d))) problems.push(`${f}: calls ${c}() from ${[...where].join(', ')} without loading it`)
  }
}

if (problems.length) {
  console.error(`check-php-calls: ${problems.length} problem(s)`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log(`check-php-calls: PASS (${files.length} PHP files)`)
