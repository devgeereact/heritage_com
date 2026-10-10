# PWA Specification

This file owns whether HeritOS is a PWA and what its manifest and service worker do today. Offline behaviour is in [OFFLINE-SPEC.md](OFFLINE-SPEC.md), sync in [SYNC-SPEC.md](SYNC-SPEC.md), updates in [UPDATE-STRATEGY.md](UPDATE-STRATEGY.md). Evidence goes in [qa/PWA-AUDIT.md](../../qa/PWA-AUDIT.md).

- **Applicability:** Applicable, limited to an installable offline shell. The app ships a manifest and a service worker; offline job or payment storage is out of scope (D-016, from Plans 2026, approved 10 October 2026).
- **User reason for installation:** quick launch of the admin app on the owner's phone. The service worker comment still says "installable + offline-capable for the stall" (`public/sw.js:1`), a market-stall use that is no longer a launch priority.
- **Supported platforms:** browsers that support service workers; exact device list Unknown and NOT TESTED.
- **Manifest, start URL and scope:** `public/manifest.webmanifest`, linked from `index.html:11`. `start_url` `/`, `scope` `/`, `display` `standalone`, `orientation` `portrait-primary`, SVG icons including a maskable icon. Its description still lists catalogue, orders, stock and finance, and its colours are the old cream and ink (`manifest.webmanifest:4, 9-10`); both are updated with the Phase 4 token merge ([DESIGN-SYSTEM.md](../03-design/DESIGN-SYSTEM.md#implemented-today)).
- **Service worker strategy (Verified, `public/sw.js`):** cache `heritos-v1` (line 4); precaches `/`, `/index.html`, the manifest and `/icon.svg` (line 5); ignores non-GET requests (line 21); never caches `.php` or `/api` paths (line 25); network-first for navigations with the cached `index.html` as offline fallback (lines 28-30); cache-first for same-origin static assets, caching successful responses (lines 34-43).
- **Registration:** `index.html:100-102` registers `/sw.js` on load in every environment except `localhost` and `127.0.0.1`, so local development and staging run without it.
- **Installation and update experience:** no custom install prompt and no update prompt ([UPDATE-STRATEGY.md](UPDATE-STRATEGY.md)).

The PWA release gate in [LAUNCH-CHECKLIST.md](../09-release/LAUNCH-CHECKLIST.md) applies because the manifest and service worker ship to production.
