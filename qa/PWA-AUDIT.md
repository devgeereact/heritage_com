# PWA Audit

Evidence for the installable shell. Specification: [docs/04-pwa/PWA-SPEC.md](../docs/04-pwa/PWA-SPEC.md).

- Applicability: Applicable, offline shell only (D-016).
- Tested version and environment: none. The service worker does not register on localhost (`index.html:100`), so local staging cannot exercise it.
- Devices and browsers: none tested.
- Network conditions: online, slow, intermittent, offline and restored all NOT TESTED.

| Gate | Expected | Observed | Status | Evidence |
|---|---|---|---|---|
| Manifest valid and installable | Install prompt available; icons render | Not run | NOT TESTED | None |
| Offline shell | Navigation offline shows the cached app shell | Not run | NOT TESTED | `public/sw.js:28-30` (source) |
| API never cached | `.php` and `/api` bypass the cache | Source matches | PASS (source review only) | `public/sw.js:25` |
| Writes blocked offline | Plain offline message; no false success | Not implemented | FAIL (not built) | [OFFLINE-SPEC.md](../docs/04-pwa/OFFLINE-SPEC.md) |
| Upgrade from previous build | New build served; old caches removed | Not run | NOT TESTED | [UPDATE-STRATEGY.md](../docs/04-pwa/UPDATE-STRATEGY.md) |

Blockers: write blocking offline is not built (A16). Recommendation: NO-GO for any claim of offline capability until the gates above pass.
