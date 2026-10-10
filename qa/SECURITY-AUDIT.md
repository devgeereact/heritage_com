# Security Audit

Evidence for security controls. Threat model and controls: [docs/SECURITY.md](../docs/SECURITY.md). Findings and status: [ROADMAP.md](../docs/ROADMAP.md#findings).

## Automated evidence

The GEE OS automated gate (`./scripts/project security` writing `.agent/evidence/security.json`) is not set up in this project: neither path exists (Verified 10 October 2026). Automated checks available today: `php php-api/tests/run.php` (166 helper checks on the Phase 2 branch, including the HTML sanitiser, CORS decision and throttle maths; PASS on 10 October 2026) and `php -l`. No dependency vulnerability audit has been run (NOT TESTED). These are not a threat model, penetration test or proof of complete application security.

## Manual assurance

| Area | Threat or control | Test performed | Result | Severity | Evidence | Owner |
|---|---|---|---|---|---|---|
| Secrets | Client, source and history exposure | Source review: `config.php` gitignored, only `VITE_*` reaches the browser | PARTIAL: Git history not scanned | Critical until checked | `.gitignore`, `.env.example` | Business owner |
| Customer authentication | Guessable references, enumeration (A03, A06) | Staging smoke checks for public reference, legacy flag, wrong phone | PARTIAL: throttle and generic errors in source; contact verification not built | P0 | [FUNCTIONAL-AUDIT.md](FUNCTIONAL-AUDIT.md) | Business owner |
| Authorisation | Cross-customer and cross-role access | None | NOT TESTED | P0 | None | Business owner |
| Client and server role drift | UI and API disagree (K-01) | Source comparison; tailor role in a browser | PASS for source and the tailor role (Phase 2 branch); other roles NOT TESTED | Low | [SECURITY.md](../docs/SECURITY.md#permissions) | Business owner |
| Output encoding | Stored script in blog HTML (A04) | Helper tests of `sanitize_html()` | PARTIAL: rendered page NOT TESTED | P0 | `php-api/tests/run.php` | Business owner |
| Payment integrity | Lost or double-counted payments (A05) | Transaction and row lock (PR #6); append-only ledger with request keys checked by `e2e-phase2.sh` (PR #9) | PARTIAL: duplicate submits PASS on staging; concurrency NOT TESTED | P0 | `ledger.php`, `scripts/staging/e2e-phase2.sh` | Business owner |
| Shared includes | Direct requests to `_*.php` or `config*.php` | `php-api/.htaccess` rule (Phase 2 branch); staging router refuses them | PASS on staging; live `.htaccess` NOT TESTED | P1 | `php-api/.htaccess`, `scripts/staging/router.php` | Business owner |
| CORS | Localhost origins in production (A15) | Helper tests of the CORS decision | PASS (unit); live server NOT TESTED | P1 | `php-api/tests/run.php` | Business owner |
| Deployed state | Unknown hand-uploaded endpoints (A02, A20) | None | NOT TESTED | P0 | None | Business owner |
| Uploads, CSRF, headers, cookies | Per SECURITY.md | None | NOT TESTED | Unknown | None | Business owner |
