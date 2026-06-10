# HeritOS — Herit Clothing brand operations platform

The system behind [heritclothing.com](https://heritclothing.com): products and
variants, orders across web and the Ajuwon Market floor, stock, customers,
marketing and money — with a 2026 AI layer. Full feature spec in
[`HeritOS.html`](HeritOS.html) (14 modules, 182 features).

## Stack

- **Frontend:** React 18 + Vite + Bootstrap 5 (Larkon admin kit), builds to `dist/`.
- **API:** PHP + `mysqli` prepared statements, JSON. Source in [`php-api/`](php-api/).
- **DB:** MySQL on cPanel (phpMyAdmin). Schema: [`php-api/schema.sql`](php-api/schema.sql).
- **AI:** OpenRouter, server-side via `php-api/ai.php`.
- **Deploy:** push to `main` → GitHub Actions builds and FTP-uploads `dist/`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

`fetch` calls to real endpoints hit the live API via `API_BASE` (see
`src/context/constants.js`). Larkon's bundled mock backend serves demo data for
modules not yet wired to PHP.

## Server setup (once, by hand)

See [`php-api/README.md`](php-api/README.md): create the DB, import `schema.sql`,
copy `config.sample.php` → `config.php` with real credentials, upload the PHP
files + `.htaccess` to the document root.

Seed login: `dev@heritclothing.com` / `Testing123!` — change in production.

## Project memory

[`CLAUDE.md`](CLAUDE.md) holds the architecture, golden rules, and build notes.
