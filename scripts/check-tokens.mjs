#!/usr/bin/env node
// Fails when a stylesheet that should read the shared token layer, or any
// public-site JSX/JS file, holds a raw colour (hex, rgb() or hsl()). Colour
// values live only in src/assets/tokens/ (docs/DESIGN-SYSTEM.md, A23).
// Run: npm run check:tokens (also part of npm run lint, so CI runs it).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STYLESHEETS = [
  'src/app/(public)/site/site.css',
  'src/app/(public)/site/ui/ui.css',
  'src/app/(public)/site/landing.css',
  'src/app/(public)/site/portal/portal.css',
  'src/assets/scss/heritos-admin.css',
  'src/components/herit/herit-daily.css',
];
const PUBLIC_DIR = 'src/app/(public)';
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;

/** Every .js/.jsx file under a folder. */
const scripts = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  if (statSync(p).isDirectory()) return scripts(p);
  return /\.(jsx?|mjs)$/.test(name) ? [p] : [];
});

let bad = 0;
const scan = (f, { jsx }) => {
  const lines = readFileSync(f, 'utf8').split('\n');
  let inComment = false;
  lines.forEach((raw, i) => {
    let line = raw;
    // ignore comments (single and multi-line)
    if (inComment) { const e = line.indexOf('*/'); if (e < 0) return; line = line.slice(e + 2); inComment = false; }
    line = line.replace(/\/\*.*?\*\//g, '');
    const s = line.indexOf('/*'); if (s >= 0) { line = line.slice(0, s); inComment = true; }
    if (jsx) {
      line = line.replace(/\/\/.*$/, '');
      // in-page anchors (href="#brief", to="/x#brief") are not colours
      line = line.replace(/(?:href|to|id)=["'`{]*[^"'`}\s]*#[\w-]*/g, '');
    }
    for (const m of line.matchAll(COLOUR)) { bad++; console.log(`${f}:${i + 1}: raw colour "${m[0]}"; use a --hc-* token`); }
  });
};

STYLESHEETS.forEach((f) => scan(f, { jsx: false }));
const publicFiles = scripts(PUBLIC_DIR);
publicFiles.forEach((f) => scan(f, { jsx: true }));

if (bad) { console.log(`check-tokens: FAIL (${bad})`); process.exit(1); }
console.log(`check-tokens: PASS (${STYLESHEETS.length} stylesheets, ${publicFiles.length} public scripts)`);
