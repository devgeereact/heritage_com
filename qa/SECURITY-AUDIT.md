# Security Audit

Evidence for security controls. Threat model and controls: [docs/05-security/SECURITY.md](../docs/05-security/SECURITY.md). Findings and status: [ROADMAP.md](../docs/08-change-management/ROADMAP.md#findings).

## Automated evidence

The GEE OS automated gate (`./scripts/project security` writing `.agent/evidence/security.json`) is not set up in this project: neither path exists (Verified 10 October 2026). Automated checks available today: `php php-api/tests/run.php` (70 helper checks, including the HTML sanitiser, CORS decision and throttle maths; PASS on 10 October 2026) and `php -l`. No dependency vulnerability audit has been run (NOT TESTED). These are not a threat model, penetration test or proof of complete application security.

## Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | Source review: `config.php` gitignored, only `VITE_*` reaches the browser | PARTIAL: Git history not scanned | Critical until checked | `.gitignore`, `.env.example` | Business owner |
| Customer authentication | Guessable references, enumeration (A03, A06) | Staging smoke checks for public reference, legacy flag, wrong phone | PARTIAL: throttle and generic errors in source; contact verification not built | P0 | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) | Business owner |
| Authorisation | Cross-customer and cross-role access | None | NOT TESTED | P0 | None | Business owner |
| Client and server role drift | UI and API disagree (K-01) | Source comparison | Observed, behaviour NOT TESTED | Low | [PERMISSIONS.md](../docs/05-security/PERMISSIONS.md#current-enforcement-verified-10-october-2026) | Business owner |
| Output encoding | Stored script in blog HTML (A04) | Helper tests of `sanitize_html()` | PARTIAL: rendered page NOT TESTED | P0 | `php-api/tests/run.php` | Business owner |
| Payment integrity | Lost concurrent deposits (A05) | Source review of transaction and row lock | PARTIAL: concurrency NOT TESTED | P0 | `tailoring.php:236-238` | Business owner |
| CORS | Localhost origins in production (A15) | Helper tests of the CORS decision | PASS (unit); live server NOT TESTED | P1 | `php-api/tests/run.php` | Business owner |
| Deployed state | Unknown hand-uploaded endpoints (A02, A20) | None | NOT TESTED | P0 | None | Business owner |
| Uploads, CSRF, headers, cookies | Per SECURITY.md | None | NOT TESTED | Unknown | None | Business owner |
