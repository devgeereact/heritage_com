# Production Check

This file owns the checks run against production around a release. Do not infer production health from a local build. Use designated test records only; never real client records.

| Check | Status | Evidence | Owner | Date |
|---|---|---|---|---|
| Correct account, repository, branch (`main`) and cPanel document root confirmed before any mutation | NOT TESTED | None | Business owner | None |
| Deploy job green; nine CI files uploaded | NOT TESTED | None | Business owner | None |
| Manual uploads and SQL imports from the pull request applied in order (after the deploy when they need new `_lib.php` functions) | NOT TESTED | None | Business owner | None |
| `https://heritclothing.com/api.php` returns a JSON array | NOT TESTED | None | Business owner | None |
| Post-release flows with test records: login, enquiry, booking, client isolation, measurement snapshot, quote, payment, message, delivery | NOT TESTED | None | Business owner | None |
| Secrets, permissions and production settings: `GK_DEBUG` off, `ALLOW_LOCALHOST_CORS` off, HTTPS valid, Cloudflare grey cloud | NOT TESTED | None | Business owner | None |
| `ALLOW_LEGACY_ORDER_CODE_LOOKUP` set as decided for this release | NOT TESTED | None | Business owner | None |
| Monitoring, failed-notification list, backup snapshot taken and rollback trigger agreed | NOT TESTED | None | Business owner | None |

No production check has been run by any agent. Procedure and rollback: [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#release-procedure).
