# HeritOS: Herit Clothing

The app and website behind [heritclothing.com](https://heritclothing.com), for a men's fashion and tailoring business in Lagos run by one owner. It handles enquiries, clients, measurements, tailoring jobs, payments and the public site.

## Stack

- **Frontend:** React 19, Vite, Bootstrap 5 (Larkon admin kit), JavaScript. Builds to `dist/`.
- **API:** plain PHP endpoints with `mysqli` prepared statements, returning JSON. Source in [`php-api/`](php-api).
- **Database:** MySQL on cPanel.
- **Deploy:** `npm run release` from the Mac over SSH (dry run, then `-- --go`): the build and every PHP file in `php-api/`, with a snapshot and automatic restore. Merging to `main` deploys nothing. `config.php`, `.htaccess` and SQL imports stay by hand ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Develop

```bash
npm ci
npm run staging:setup   # once: local MariaDB/MySQL database with synthetic records
npm run staging:serve   # local API on http://127.0.0.1:8088 (leave running)
npm run dev             # http://localhost:5112, talking to the local staging API
```

Development no longer talks to production. Read [docs/LOCAL-STAGING.md](docs/LOCAL-STAGING.md) for staging details and before changing any live data.

Checks: `npm run build`, `npm run lint`, `php php-api/tests/run.php`, `bash scripts/staging/e2e-phase2.sh` (against staging) and `node scripts/check-docs.mjs`.

## Documentation

- [docs/README.md](docs/README.md): index of the flat documentation and which file owns each fact.
- [docs/Plans 2026/](docs/Plans%202026/READ-ME-FIRST.md): the approved plan of record.
- [docs/ROADMAP.md](docs/ROADMAP.md): what is built, what is next.
- [docs/AUDIT.md](docs/AUDIT.md), [CHANGELOG.md](CHANGELOG.md) and [KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md): evidence, changes and open issues.
- [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md): entry points for coding agents, including the rule that keeps these docs current.
