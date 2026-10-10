# Authentication Model

This file owns how staff and customers sign in, how sessions live and end, and the approved target for customer access and session hardening. Authentication does not replace authorisation ([PERMISSIONS.md](PERMISSIONS.md)).

## Staff

- **Method:** email and password, or a staff PIN for a shared device (`users.pin_hash`, schema_phase12). `auth.php` issues a random token stored in `auth_tokens` with device, IP and last-seen columns.
- **Throttling:** failed email and PIN logins are throttled (`LOGIN_*`, `PIN_*` settings, [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#server-configuration)).
- **Storage in the browser:** React keeps the token in the `_LARKON_AUTH_KEY_` cookie, which is JavaScript-readable (A15).
- **Expiry:** `TOKEN_TTL_DAYS` server setting. Logout revokes the token through `auth.php`.
- **Registration:** no self-registration; staff are created in Team and access (`users.php`, admin only). The kit `/auth/sign-up` screen is template UI.
- **Recovery:** the seed account's password is set by hash in phpMyAdmin ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#database-and-schema-files)); in-app owner recovery is a launch-core requirement and is not built. The kit `/auth/reset-pass` screen must not show usable controls until a recovery endpoint is verified.
- **Multi-factor:** none in the app. Assess app MFA before launch; at minimum hosting, source control, mailbox and social accounts use their own MFA. Recovery codes never go in the repository or app content.

## Customers

**Current (Verified 10 October 2026, with phase 1 changes):** `account.php` issues a token stored in `customer_tokens`; React keeps it in localStorage as `herit_customer_token` (A15). Sign-in is phone plus an order reference. On `feat/plans-2026-phase1` and `feat/phase1b-staging` it is throttled per IP and per phone, returns one generic failure, and accepts the random public reference (A03, A06). The portal reads only retail `orders`, so tailoring clients cannot use it (A09), and the token can overwrite the customer's own measurements without review (A10).

**Approved target (D-010):** a reference is a locator, not a password.

1. Screen one: reference plus registered contact.
2. Screen two: a short-lived, single-use link or code sent through a verified channel. With no delivery provider configured, the owner approves an access invitation manually through an established contact rather than weakening authentication.
3. Unauthenticated lookup returns nothing sensitive and uses one generic response.
4. Expiry, logout and revocation; recovery through verified contact. No mandatory customer password at first.
5. A company contact may see its authorised parent jobs, never individual wearer profiles.

What a verified customer may see and do is in [USER-JOURNEYS.md J-07](../01-product/USER-JOURNEYS.md#j-07-customer-access).

## Access requirements (approved target)

- Customer and company access checks ownership on every request: detail, measurement, message, quote, attachment and export. UI hiding is not enforcement. A company contact never reads unrelated clients or wearer measurements.
- Login, reference lookup, verification and public writes get throttles, generic failure messages, payload limits and server validation. Staff-login throttling does not cover customer or public paths. No CAPTCHA until abuse is observed; honeypot plus request limits first.
- Move towards secure, HttpOnly cookies with explicit expiry and revocation, through a reviewed narrow migration. Cookie auth needs a deliberate CSRF design; SameSite alone is not enough. HTTPS, production debug off, restricted origins and no token logging are prerequisites.
- Owner recovery must work without bypassing access control.

## States to design and test

Wrong credentials, throttled, disabled or suspended account, expired token, revoked token, provider unavailable (no verification channel configured). Current status of every state: NOT TESTED in a browser; the staging API smoke checks cover wrong password, suspended account and customer sign-in by public reference ([qa/FUNCTIONAL-AUDIT.md](../../qa/FUNCTIONAL-AUDIT.md)).

PWA and offline lifecycle: tokens are never cached by the service worker; offline sessions cannot write ([OFFLINE-SPEC.md](../04-pwa/OFFLINE-SPEC.md)).
