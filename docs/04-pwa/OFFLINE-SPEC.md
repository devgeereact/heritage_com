# Offline Specification

This file owns what HeritOS does without a connection. Decision D-016 (Plans 2026, approved 10 October 2026): the service worker is an offline shell, not offline job or payment storage; writes are blocked while offline; no background sync until justified (finding A16).

## Current behaviour (Verified 10 October 2026)

- The shell and static files load offline; navigations fall back to the cached `index.html` (`public/sw.js:28-30`).
- API calls are never cached (`public/sw.js:25`), so every data request fails offline.
- The app has no connection detection: no `navigator.onLine` or `offline` event handling in `src/`. Some admin pages show a state they call "offline" when a request fails (for example `tailoring/page.jsx:135`, `sales/page.jsx:58`); that label means "request failed", and some still show the owner a technical upload instruction, the same problem A17 fixed on the Enquiries page (`tailoring/page.jsx:207-210`, `tailoring/groups/page.jsx:152`; tracked as K-02 in [KNOWN-ISSUES.md](../../KNOWN-ISSUES.md)).
- Write blocking while offline: not implemented.

## Target behaviour

| Journey | Offline read | Offline write | User message | Queue or fallback | Recovery |
|---|---|---|---|---|---|
| Any admin screen | Shell only; no cached records | Blocked | Plain "You are offline. Changes cannot be saved until the connection returns." (Proposed wording) | None; typed values kept in memory | Retry when back online |
| Measurement entry, payment, stage change | None | Blocked | As above, shown before submit | None | Values kept in memory; owner resubmits |
| Public enquiry and booking request | Public shell only | Blocked | As above | None | Typed values kept on screen |
| Customer access | None | Blocked | As above | None | Retry |

Rules:

- Never imply a write succeeded before the server confirms it.
- During outages keep unsent form values in memory and tell the user what happened. Do not persist private drafts on shared devices by default (Plans 2026, 04).
- Cache allowlist stays limited to the shell and static assets; private data is never cached.
- Behaviour on slow, intermittent and restored connections is NOT TESTED ([qa/PWA-AUDIT.md](../../qa/PWA-AUDIT.md)).
