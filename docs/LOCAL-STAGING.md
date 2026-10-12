# Local Development and Staging

How to run HeritOS on a laptop without touching production. Split from [DEPLOYMENT.md](DEPLOYMENT.md) to keep that file to production concerns. Local staging closes finding A01 locally (PR #7); a shared staging server is still open.

## Local setup

```bash
npm ci           # install exactly from package-lock.json
npm run dev      # http://localhost:5112, strictPort: fails loudly if the port is taken
```

In development `API_BASE` is `VITE_API_BASE` when set, otherwise the local staging API `http://127.0.0.1:8088` (`src/context/constants.js`). Start staging first, or every request fails cleanly instead of touching production. The service worker does not register on `localhost` or `127.0.0.1` (`index.html:100`).

Pointing development at production (`VITE_API_BASE=https://heritclothing.com` in `.env.local`) reads and writes real client records. Do that only with the owner's explicit agreement and for a specific reason. The live server also refuses localhost origins unless `ALLOW_LOCALHOST_CORS` is true in the server `config.php` (default off, A15); switch it on only for that session and off again afterwards. `.env.example` documents the variable.

## Local staging

A throwaway copy of the API and database on the laptop, with synthetic records only. Needs PHP 8.1+ with mysqli and a local MariaDB or MySQL server (verified with PHP 8.5 and MariaDB 12.3 on 10 October 2026).

```bash
npm run staging:setup     # build heritos_staging and seed it (drops and rebuilds by default)
npm run staging:serve     # API on http://127.0.0.1:8088; leave running
npm run dev               # second terminal: app on http://localhost:5112, talking to staging
```

- `scripts/staging/setup.sh` creates database `heritos_staging` and local user `heritos_local` with a new random password, writes the gitignored `php-api/config.local.php`, imports `schema.sql`, `schema_modules.sql` and `schema_phase2.sql` to the newest `schema_phaseN.sql` in numeric order, reports any file that raised an error (details in `scripts/staging/.logs/`), then runs `scripts/staging/seed.php`. It then replays `schema_phase18.sql` onwards over the seeded records (an idempotency check, including the Phase 3 fitting-date migration) and runs `seed.php --phase2`, `seed.php --phase3` and `seed.php --phase4` for the extras. The Phase 3 extras fill in availability for staging only (Monday to Friday 09:00 to 13:00 and 14:00 to 18:00, Saturday 10:00 to 14:00, buffer 15 minutes, notice 2 hours, horizon 30 days, durations 45, 30 and 30 minutes, hold 48 hours), add two appointments, two messages (one an internal note) and one open change request. Production availability starts empty. The Phase 4 extras fill in a business profile whose values all say Staging or use `example.test`, and publish three services, three portfolio projects (images are generated flat colour swatches labelled STAGING, never photographs), two FAQs, both policies and the home and about pages. Production starts with an empty profile and no website content. Website images go to the gitignored `scripts/staging/.uploads/site/` (emptied when the database is rebuilt); the router serves them at `/uploads/site/`, plus `/sitemap.xml` and `/robots.txt`. `serve.sh` raises PHP's upload limits to 16 MB so the 8 MB `MEDIA_MAX_MB` check is the one that answers. `npm run staging:setup -- --keep` re-imports over the existing database instead of rebuilding it.
- The admin connection defaults to `mariadb` as the current OS user. Set `HERITOS_DB_ADMIN` to another client command (for example `mysql -u root -p`) if that does not work.
- Seed data: staff `staging-admin@example.test` (super_admin) and `tailor01@example.test`; eight clients `Test Client 01` to `08` with phones `08000000001` to `08000000008` and `@example.test` emails; seven tailoring jobs across every stage; three retail orders with public references; four enquiries (one with a company); two blog posts. The staging admin password is random and **printed once by setup**; it exists only in the local database. Run setup again for a new one. The accounts that `schema.sql` seeds on real-domain addresses are suspended with an unusable password, and its two sample clients are removed.
- `scripts/staging/serve.sh` runs `php -S` through `scripts/staging/router.php`. The router maps `/name.php` to `php-api/name.php`, refuses `_lib.php` and every `config*.php`, and defines `HERITOS_STAGING` so `_lib.php` loads `config.local.php`. Production never defines that constant, so the live server keeps loading `config.php`.
- Staging config: `GK_DEBUG` on, `ALLOW_LOCALHOST_CORS` on, `ALLOW_LEGACY_ORDER_CODE_LOOKUP` on, `SITE_URL` `http://localhost:5112`, and no mail, WhatsApp, payment or AI credentials. `STAGING_ACCESS_CODE_LOG` points at `scripts/staging/.logs/access-codes.log`: `access.php` also writes each customer sign-in code there, only when the staging router is running, so the end-to-end script can sign in. Production never sets it. WhatsApp falls back to logged wa.me links, payments to manual mode and AI to "not configured". PHP `mail()` is redirected to `scripts/staging/.logs/mail.log`. Only `weather.php` calls out (Open-Meteo, read-only).
## End-to-end checks

```bash
bash scripts/staging/e2e-phase2.sh   # with staging:serve running
bash scripts/staging/e2e-phase3.sh
bash scripts/staging/e2e-phase4.sh
bash scripts/staging/e2e-phase5.sh
```

Phase 2 API journey checks with `curl` and `jq` (48 checks, PASS on two runs on 10 October 2026). `e2e-phase3.sh` adds 93 Phase 3 checks (PASS on two runs on a fresh rebuild, 10 October 2026): availability, slots with buffers, two parallel requests for one slot, hold expiry, cancel, reschedule history, hours, notice and horizon, the public switch, generic access replies, code expiry, reuse and lockout, throttles, owner invites, cross-client isolation, private fields, internal notes, request keys, change requests after cutting, measurement proposals, feedback consent and sessions. It resets throttle counters in the local database between sections. The script refuses any host other than `127.0.0.1` or `localhost`, mints one-day tokens straight into the local `heritos_staging` database for synthetic users only, and exits 0 only when every check passes. Set `STAGING_API` to use another local port.

`e2e-phase4.sh` adds 62 website checks (PASS on two runs, 11 October 2026): drafts never public, preview needs staff, publish, a second version, rollback, slug lock, unpublish removing an item from the projection and the sitemap, malicious HTML stripped, placeholder text blocked, social and WhatsApp link rules, owner-only profile and policy actions, uploads (PHP renamed `.jpg`, a JPEG with PHP appended, 13 MB, EXIF and GPS removed, random names, nothing executed under `/uploads`), portfolio consent and alt text, no private fields in any public answer, sitemap, robots and the removed offers. It generates its own test images and adds a synthetic `editor01@example.test` account.

`e2e-phase5.sh` adds 25 company-order checks (PASS, 12 October 2026): company job with five wearers and an idempotent create, the contact view carries no wearer, measurement, notes or staff code, a wearer sees only their own garment and no other portal action, sample approval only by an approver and recorded as `portal`, tailors record progress without money, an in-production edit needs a stated effect, partial handover (2 of 5), over-quantity refused, one row per request key, another company's reference answers like a missing one, the invoice and a sent quote carry the bill-to and PO, a deactivated contact and the switch turned off both lose access. It turns `company_portal_enabled` on for the run and restores the previous value.

Results of every staging and browser run: [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md).
