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
npm run dev      # http://localhost:5112
```

Development talks to the live production API. Read [docs/OPERATIONS.md](docs/OPERATIONS.md) before changing any data.

## Documentation

- [docs/README.md](docs/README.md): index of product, architecture, design, operations, content and roadmap docs.
- [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md): entry points for coding agents.
