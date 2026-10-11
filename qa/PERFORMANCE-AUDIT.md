# Performance Audit

Evidence for performance. Targets: [docs/CONTENT.md](../docs/CONTENT.md#seo-and-performance).

- Agreed budgets: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less at the 75th percentile, where field data exists (Plans 2026, approved 10 October 2026). No byte budget agreed.
- Tested build, route, device and network: production build only; no route measured.
- Lab evidence: NOT TESTED.
- Field evidence: N/A until real traffic is measured.

| Measure | Budget | Observed | Status | Evidence | Action |
|---|---|---|---|---|---|
| Largest content rendering (LCP) | 2.5s | Not measured | NOT TESTED | None | Lab check of the public home page in Phase 4 |
| Interaction delay (INP) | 200ms | Not measured | NOT TESTED | None | Lab check of forms |
| Layout stability (CLS) | 0.1 | Not measured | NOT TESTED | None | Lab check |
| Production JavaScript | None agreed | 1,550,879 bytes in 109 files; `dist` 2,592 KB (was 10,212 KB after A18 and 15,396 KB before it; JS was 4,985,796 bytes in 259 files before A18) | Recorded | `npm run build`, 10 Oct 2026, `chore/cleanup-docs-sync` after unused packages, images, fonts and style partials were removed | Large-chunk warning remains; measure the public initial load. On `feat/phase3-appointments-portal`, 11 Oct 2026, with the Phase 3 screens added and the calendar packages gone: 1,296,727 bytes in 115 files, `dist` 2,364 KB |

Inspect image and font weight, script cost, caching, critical rendering, interaction delay and layout stability. A slow-network enquiry or booking must stay clear and recoverable.

## PWA

Evidence for the installable shell (formerly `qa/PWA-AUDIT.md`). Specification: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md#pwa-offline-and-updates).

- Applicability: Applicable, offline shell only (D-016).
- Tested version and environment: none. The service worker does not register on localhost (`index.html:101`), so local staging cannot exercise it.
- Devices and browsers: none tested.
- Network conditions: online, slow, intermittent, offline and restored all NOT TESTED.

| Gate | Expected | Observed | Status | Evidence |
|---|---|---|---|---|
| Manifest valid and installable | Install prompt available; icons render | Not run | NOT TESTED | None |
| Offline shell | Navigation offline shows the cached app shell | Not run | NOT TESTED | `public/sw.js:28-30` (source) |
| API never cached | `.php` and `/api` bypass the cache | Source matches | PASS (source review only) | `public/sw.js:25` |
| Writes blocked offline | Plain offline message; no false success | Not implemented | FAIL (not built) | [ARCHITECTURE.md](../docs/ARCHITECTURE.md#offline-behaviour) |
| Upgrade from previous build | New build served; old caches removed | Not run | NOT TESTED | [ARCHITECTURE.md](../docs/ARCHITECTURE.md#updates) |

Blockers: write blocking offline is not built (A16). Recommendation: NO-GO for any claim of offline capability until the gates above pass.
