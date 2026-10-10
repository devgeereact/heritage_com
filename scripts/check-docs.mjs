#!/usr/bin/env node
// Documentation check for HeritOS. No dependencies; run with `node scripts/check-docs.mjs`.
//
// Fails (exit 1) on:
//   1. a relative Markdown link, in any tracked-style .md file, whose target file
//      or #anchor does not exist;
//   2. an em dash (U+2014) in docs/*.md, the root *.md files or qa/*.md
//      (docs/Plans 2026/ is the read-only plan of record and is not checked for this);
//   3. a `docs/...` or `qa/...` path mentioned in code, workflows, scripts or docs
//      that does not exist (for example a stale folder name left over from the old numbered layout).
//
// The rule behind it: .claude/rules/docs-sync.md.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.idea', '.vscode', 'coverage', '.logs']);
const PLANS = 'docs/Plans 2026';
const TEXT_EXT = new Set(['.md', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.php', '.sql', '.yml', '.yaml', '.sh', '.json', '.html', '.css', '.scss']);

// Paths that no longer exist but are named on purpose as history (removed files).
const HISTORICAL = [
  /^docs\/(features|nav-map|seo-analytics)\.md$/,
  /^docs\/brief\.json$/,
  /^docs\/HeritOS\.html$/,
  /^docs\/(PRODUCT|DESIGN|OPERATIONS|CONTENT-AND-SOCIAL|GEE-OS)\.md$/,
  /^qa\/(UX|PWA)-AUDIT\.md$/, // merged into FUNCTIONAL-AUDIT.md and PERFORMANCE-AUDIT.md (D-020)
];

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

// GitHub heading slug: lower case, drop punctuation except hyphen, underscore and space, spaces to hyphens.
function slug(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
    .replace(/ /g, '-');
}

const anchorCache = new Map();
function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const seen = new Map();
  const set = new Set();
  let fence = false;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    set.add(n === 0 ? base : `${base}-${n}`);
  }
  for (const m of readFileSync(file, 'utf8').matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) set.add(m[1]);
  anchorCache.set(file, set);
  return set;
}

const errors = [];
const files = walk(ROOT);
const mdFiles = files.filter((f) => f.endsWith('.md'));

// 1. Relative links and anchors.
for (const file of mdFiles) {
  let fence = false;
  readFileSync(file, 'utf8').split('\n').forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; return; }
    if (fence) return;
    const line = raw.replace(/`[^`]*`/g, '');
    for (const m of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+(?: [^)>"]+)*)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const target = m[1].trim();
      if (/^(https?:|mailto:|tel:|data:)/i.test(target)) continue;
      const [pathPart, anchor] = target.split('#');
      const decoded = decodeURIComponent(pathPart);
      const dest = decoded ? resolve(dirname(file), decoded) : file;
      const where = `${rel(file)}:${i + 1}`;
      if (!existsSync(dest)) { errors.push(`${where} broken link: ${target}`); continue; }
      if (anchor && dest.endsWith('.md') && !anchorsOf(dest).has(anchor.toLowerCase())) {
        errors.push(`${where} missing anchor: ${target}`);
      }
    }
  });
}

// 2. Em dashes in the live documentation.
const live = mdFiles.filter((f) => {
  const r = rel(f);
  if (r.startsWith(`${PLANS}/`)) return false;
  return !r.includes('/') || /^docs\/[^/]+\.md$/.test(r) || /^qa\/[^/]+\.md$/.test(r);
});
for (const file of live) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('—')) errors.push(`${rel(file)}:${i + 1} em dash`);
  });
}

// 3. Mentions of docs/ and qa/ paths that do not exist.
for (const file of files) {
  const r = rel(file);
  if (r.startsWith(`${PLANS}/`) || r === 'scripts/check-docs.mjs') continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/(?<![\w./-])((?:docs|qa)\/(?:Plans(?: |%20)2026\/?)?[\w.-]*(?:\/[\w.-]+)*\/?)/g)) {
      const p = m[1].replace(/%20/g, ' ').replace(/[.,;:]+$/, '');
      if (p === 'docs/' || p === 'qa/' || p === 'docs' || p === 'qa') continue;
      if (HISTORICAL.some((re) => re.test(p))) continue;
      const base = r.includes('/') && !/^(docs|qa)\//.test(p) ? dirname(file) : ROOT;
      if (!existsSync(resolve(base, p)) && !existsSync(resolve(ROOT, p))) {
        errors.push(`${r}:${i + 1} path does not exist: ${p}`);
      }
    }
  });
}

if (errors.length) {
  console.error(`check-docs: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`check-docs: PASS (${mdFiles.length} Markdown files, ${files.length} text files scanned)`);
