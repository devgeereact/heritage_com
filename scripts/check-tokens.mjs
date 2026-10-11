#!/usr/bin/env node
// Fails when a stylesheet that should read the shared token layer holds a raw
// colour (hex, rgb() or hsl()). Colour values live only in src/assets/tokens/
// (docs/DESIGN-SYSTEM.md, A23). Run: npm run check:tokens
import { readFileSync } from 'node:fs';

const FILES = [
  'src/app/(public)/site/site.css',
  'src/app/(public)/site/ui/ui.css',
  'src/app/(public)/site/portal/portal.css',
  'src/assets/scss/heritos-admin.css',
  'src/components/herit/herit-daily.css',
];
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;

let bad = 0;
for (const f of FILES) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let inComment = false;
  lines.forEach((raw, i) => {
    let line = raw;
    // ignore comments (single and multi-line)
    if (inComment) { const e = line.indexOf('*/'); if (e < 0) return; line = line.slice(e + 2); inComment = false; }
    line = line.replace(/\/\*.*?\*\//g, '');
    const s = line.indexOf('/*'); if (s >= 0) { line = line.slice(0, s); inComment = true; }
    for (const m of line.matchAll(COLOUR)) { bad++; console.log(`${f}:${i + 1}: raw colour "${m[0]}"; use a --hc-* token`); }
  });
}
if (bad) { console.log(`check-tokens: FAIL (${bad})`); process.exit(1); }
console.log(`check-tokens: PASS (${FILES.length} stylesheets)`);
