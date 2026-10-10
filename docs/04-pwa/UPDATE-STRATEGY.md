# Update Strategy

This file owns how a new deployment reaches installed or cached copies of the app. Current behaviour is Verified from `public/sw.js`; none of it has been tested on a device.

- **Service worker versioning:** a single hard-coded cache name, `heritos-v1` (`public/sw.js:4`). It changes only when someone edits it ("Bump CACHE to invalidate", line 3). It is not tied to the release version.
- **Cache migration and deletion:** on activate, every cache whose name differs from the current one is deleted (lines 11-16).
- **Update detection:** the browser's standard service worker update check on navigation. Navigations are network-first (lines 28-30), so a fresh `index.html` arrives whenever the network is available.
- **User prompt or automatic activation:** automatic. `skipWaiting()` on install (line 8) and `clients.claim()` on activate (line 15); there is no user prompt.
- **Unsaved-work protection:** none specific to updates. Risk: same-origin static assets are cache-first (lines 34-43); Vite emits hashed asset names, so a new build normally requests new files, but an open tab can keep running old JavaScript until reload. Impact on a form in progress is NOT TESTED.
- **Rollback path:** redeploy the previous build ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#rollback)); navigations pick it up network-first. If a broken service worker ever ships, bump the cache name in a fixed build.

Proposed (not decided): tie the cache name to the release version so each deploy clears old static files, and record the update check in the release checklist. Verify an upgrade from the previous production version; a clean install does not prove the update path ([qa/PWA-AUDIT.md](../../qa/PWA-AUDIT.md)).
