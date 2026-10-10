# Security Model

This file owns the threat picture, the baseline controls and their current state, and the private-file and content-safety rules. Sign-in and sessions are in [AUTH-MODEL.md](AUTH-MODEL.md); who may do what in [PERMISSIONS.md](PERMISSIONS.md); personal data in [DATA-PRIVACY.md](DATA-PRIVACY.md). Security findings and their status live in [ROADMAP.md](../08-change-management/ROADMAP.md#findings); evidence in [qa/SECURITY-AUDIT.md](../../qa/SECURITY-AUDIT.md). Nothing here is a penetration test result.

## Assets and threats

- **Sensitive data and operations:** client phone numbers, addresses, body measurements, messages, photos and payment records; staff and customer tokens; server `config.php`; FTP secrets; publishing to the public website.
- **Trust boundaries:** browser to PHP endpoint; PHP to MySQL; public JSON projection; the cPanel document root (anything placed there is web-reachable unless blocked); GitHub Actions to FTP.
- **Likely attackers and abuse paths:** guessing customer references to read another person's job (A03, A06); stored script in staff-written blog content (A04); cross-customer ID swapping on detail endpoints; development sessions writing to production (A01); stale or unknown hand-uploaded endpoints on the server (A02); token theft from JavaScript-readable storage (A15); spam through the public enquiry form.
- **Required controls:** the baseline below plus object-level ownership checks for every customer and company read or write ([AUTH-MODEL.md](AUTH-MODEL.md#access-requirements-approved-target)).

## Baseline controls and current state

| Control | State (10 October 2026) |
|---|---|
| Secrets outside client bundles, source and logs | `config.php` gitignored and server-only; FTP secrets in GitHub; only `VITE_*` values reach the browser (`.env.example`). Log contents NOT TESTED |
| Server-side authorisation | `require_auth($roles)` in every staff endpoint ([API-SPEC.md](../02-architecture/API-SPEC.md#endpoint-inventory)); object ownership for customers is not yet enforced everywhere (A03, A10) |
| Input validation and output encoding | Prepared statements throughout; blog HTML sanitised on save with an allowlist (`_lib.php:430-520`, `content.php:56`) on `feat/plans-2026-phase1` (A04, in progress) |
| Rate limiting | Staff login and PIN; customer login and tracking since phase 1 (A03); public enquiry form uses a honeypot (`website_url_confirm`, A11) and no rate limit |
| CORS | Same-origin in production; localhost allowed only when `ALLOW_LOCALHOST_CORS` is on (A15) |
| CSRF | Bearer tokens in headers today; a cookie migration would need a deliberate CSRF design ([AUTH-MODEL.md](AUTH-MODEL.md)) |
| Headers, cookies, production settings | `GK_DEBUG` false in production; HTTPS through cPanel AutoSSL. Security headers: Unknown |
| Dependencies | No vulnerability audit run (NOT TESTED); no blind upgrades |
| Monitoring and incident response | [MONITORING.md](../07-operations/MONITORING.md) |

## Private files and content safety

- Private reference images and proof live outside the public document root or behind authenticated download. Validate real MIME type and extension, limit size and count, randomise names, block execution, avoid inline rendering of active content. Start with JPEG, PNG, WebP and PDF only where needed. Attachments are never reachable by guessing a filename. Strip location metadata from public images; keep public derivatives separate. No private upload feature exists yet; these rules gate its build.
- Blog bodies were stored as raw HTML and rendered with `dangerouslySetInnerHTML` (BlogPostPage.jsx:47) with no sanitiser (A04). Writers are super_admin, admin and manager, so this was stored XSS from a staff account. Rule: sanitise allowed rich text on the server, prohibit scripts, event handlers and unsafe URLs, and treat staff content as untrusted for rendering. The blog update bind mismatch that stopped edits (A21) is fixed in the same batch so publishing edits work before content is relied on.
- CSV exports need formula-injection protection; privileged exports are logged and downloaded securely.
- Never put credentials, private IDs or internal notes in public JSON ([ARCHITECTURE.md](../02-architecture/ARCHITECTURE.md#cms-and-public-projection)).
