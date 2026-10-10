# HeritOS: Herit Clothing

The app and website behind [heritclothing.com](https://heritclothing.com), for a men's fashion and tailoring business in Lagos run by one owner. It handles enquiries, clients, measurements, tailoring jobs, payments and the public site.

## Stack

- **Frontend:** React 19, Vite, Bootstrap 5 (Larkon admin kit), JavaScript. Builds to `dist/`.
- **API:** plain PHP endpoints with `mysqli` prepared statements, returning JSON. Source in [`php-api/`](php-api/).
- **Database:** MySQL on cPanel.
- **Deploy:** merging to `main` runs GitHub Actions, which uploads the build and nine PHP files; the rest of the server files are uploaded by hand.

## Develop

```bash
npm ci
npm run staging:setup   # once: local MariaDB/MySQL database with synthetic records
npm run staging:serve   # local API on http://127.0.0.1:8088 (leave running)
npm run dev             # http://localhost:5112, talking to the local staging API
```

Development no longer talks to production. Read [docs/07-operations/LOCAL-STAGING.md](docs/07-operations/LOCAL-STAGING.md) for staging details and before changing any live data.

## Documentation

- [docs/README.md](docs/README.md): index of the documentation, organised in the GEE OS hierarchy (`docs/00-foundation` to `docs/09-release`).
- [docs/Plans 2026/](docs/Plans%202026/READ-ME-FIRST.md): the approved plan of record.
- [qa/](qa/), [CHANGELOG.md](CHANGELOG.md) and [KNOWN-ISSUES.md](KNOWN-ISSUES.md): audit evidence, changes and open issues.
- [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md): entry points for coding agents.
