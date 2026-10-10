# Performance Audit

Evidence for performance. Targets: [docs/01-product/CONTENT.md](../docs/01-product/CONTENT.md#seo-and-performance).

- Agreed budgets: LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less at the 75th percentile, where field data exists (Plans 2026, approved 10 October 2026). No byte budget agreed.
- Tested build, route, device and network: production build only; no route measured.
- Lab evidence: NOT TESTED.
- Field evidence: N/A until real traffic is measured.

| Measure | Budget | Observed | Status | Evidence | Action |
|---|---|---|---|---|---|
| Largest content rendering (LCP) | 2.5s | Not measured | NOT TESTED | None | Lab check of the public home page in Phase 4 |
| Interaction delay (INP) | 200ms | Not measured | NOT TESTED | None | Lab check of forms |
| Layout stability (CLS) | 0.1 | Not measured | NOT TESTED | None | Lab check |
| Production JavaScript | None agreed | 1,553,500 bytes in 98 files after A18 (was 4,985,796 in 259); `dist` 10,212 KB (was 15,396 KB) | Recorded | `npm run build`, 10 Oct 2026, `feat/phase1b-staging` | Large-chunk warning remains; measure the public initial load before removing dependencies |

Inspect image and font weight, script cost, caching, critical rendering, interaction delay and layout stability. A slow-network enquiry or booking must stay clear and recoverable.
