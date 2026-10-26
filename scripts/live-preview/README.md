# Live-API preview of the production build

Shows the exact bundle a push to `main` deploys (`npm run build`, served from `dist/`) and forwards the API paths (`*.php`, `/uploads/*`) to the live site, so the page behaves as it will in production.

Everything for this lives in this folder. It touches nothing outside the project except the optional user service link below.

## Run by hand

```bash
git switch main && git pull --ff-only   # what a push would deploy
npm run build
npm run live:preview                    # http://127.0.0.1:5112/
```

To point the same production build at local staging instead of the live site (every route works, nothing real is touched), start `npm run staging:serve` and run `HERIT_API=http://127.0.0.1:8088 npm run live:preview`.

Pass another port with `node scripts/live-preview/serve.mjs 5113`. After changing code, run `npm run build` again and reload: the server reads `dist/` on every request.

## Run at boot (user service, this computer only)

The unit file is in this folder. The service listens on 127.0.0.1 only.

```bash
# free port 5112 from the old frontend preview first
systemctl --user disable --now gideon-preview@heritage.service gideon-preview@heritage.timer

npm run build
mkdir -p ~/.config/systemd/user
ln -sf "$PWD/scripts/live-preview/heritage-live-preview.service" ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now heritage-live-preview.service
systemctl --user status heritage-live-preview.service
```

Undo it:

```bash
systemctl --user disable --now heritage-live-preview.service
rm ~/.config/systemd/user/heritage-live-preview.service
systemctl --user daemon-reload
systemctl --user enable --now gideon-preview@heritage.service gideon-preview@heritage.timer
```

## What it does and does not do

- Requests are forwarded to https://heritclothing.com unchanged, including the `Origin` header. The live server's own CORS rule (`ALLOW_LOCALHOST_CORS`, default off, see `docs/LOCAL-STAGING.md`) still decides what a localhost page may do, so writes from here should be refused. Do not turn that flag on for this.
- It reads real production data. Pointing at production needs the owner's agreement (see `docs/LOCAL-STAGING.md`); this setup was agreed on 22 October 2026.
- Staff login will not work here. The live cookie is `__Host-` prefixed and needs HTTPS, and this server is plain HTTP.
- If the live server lacks a file the new build calls (for example `site.php` returned 404 on 22 October 2026), the page shows that gap. That is the point: it is what would ship.
- Local staging (`npm run staging:serve`, synthetic data) is unchanged and separate.
