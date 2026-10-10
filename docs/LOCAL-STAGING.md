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

- `scripts/staging/setup.sh` creates database `heritos_staging` and local user `heritos_local` with a new random password, writes the gitignored `php-api/config.local.php`, imports `schema.sql`, `schema_modules.sql` and `schema_phase2.sql` to the newest `schema_phaseN.sql` in numeric order, reports any file that raised an error (details in `scripts/staging/.logs/`), then runs `scripts/staging/seed.php`. On the Phase 2 branch it then replays `schema_phase18.sql` onwards over the seeded records (an idempotency check) and runs `seed.php --phase2` for the Phase 2 extras. `npm run staging:setup -- --keep` re-imports over the existing database instead of rebuilding it.
- The admin connection defaults to `mariadb` as the current OS user. Set `HERITOS_DB_ADMIN` to another client command (for example `mysql -u root -p`) if that does not work.
- Seed data: staff `staging-admin@example.test` (super_admin) and `tailor01@example.test`; eight clients `Test Client 01` to `08` with phones `08000000001` to `08000000008` and `@example.test` emails; seven tailoring jobs across every stage; three retail orders with public references; four enquiries (one with a company); two blog posts. The staging admin password is random and **printed once by setup**; it exists only in the local database. Run setup again for a new one. The accounts that `schema.sql` seeds on real-domain addresses are suspended with an unusable password, and its two sample clients are removed.
- `scripts/staging/serve.sh` runs `php -S` through `scripts/staging/router.php`. The router maps `/name.php` to `php-api/name.php`, refuses `_lib.php` and every `config*.php`, and defines `HERITOS_STAGING` so `_lib.php` loads `config.local.php`. Production never defines that constant, so the live server keeps loading `config.php`.
- Staging config: `GK_DEBUG` on, `ALLOW_LOCALHOST_CORS` on, `ALLOW_LEGACY_ORDER_CODE_LOOKUP` on, and no mail, WhatsApp, payment or AI credentials. WhatsApp falls back to logged wa.me links, payments to manual mode and AI to "not configured". PHP `mail()` is redirected to `scripts/staging/.logs/mail.log`. Only `weather.php` calls out (Open-Meteo, read-only).
## End-to-end checks

```bash
bash scripts/staging/e2e-phase2.sh   # with staging:serve running
```

Phase 2 API journey checks with `curl` and `jq` (48 checks, PASS on two runs on 10 October 2026). The script refuses any host other than `127.0.0.1` or `localhost`, mints one-day tokens straight into the local `heritos_staging` database for synthetic users only, and exits 0 only when every check passes. Set `STAGING_API` to use another local port.

Results of every staging and browser run: [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md).
