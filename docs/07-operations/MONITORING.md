# Monitoring

This file owns how problems are noticed and reviewed. Approved direction (Plans 2026, 04): no operations platform; hosting error logs, a simple public uptime check and an owner-visible list of failed notifications.

- **Availability checks:** a simple public uptime check (Proposed; provider not chosen). Smoke check: `https://heritclothing.com/api.php` returns a JSON array.
- **Error capture and release tagging:** cPanel hosting error logs; PHP uncaught errors return a JSON 500 without detail unless `GK_DEBUG` is on ([ARCHITECTURE.md](../02-architecture/ARCHITECTURE.md#runtime-map)). No release tagging yet.
- **Structured logs and privacy filtering:** logs carry request IDs, endpoint and error category, never tokens or full measurement bodies (target; request IDs are not implemented). `audit_log` records staff actions through `audit()` in `_lib.php`.
- **Product and performance signals:** enquiry source, relevant enquiries, appointments and accepted jobs ([CONTENT.md](../01-product/CONTENT.md#analytics)). WhatsApp sends are logged in `whatsapp_messages`.
- **Alert thresholds, owners and escalation:** owner only; thresholds Unknown.
- **Incident record location:** not decided (Proposed: a dated note in the private job or a short incident log kept outside the public site).

## Review rhythm

- Weekly: unread enquiries, overdue jobs, pending payment reconciliation, failed messages, backup status.
- Monthly: a sample restore ([BACKUP-RECOVERY.md](BACKUP-RECOVERY.md)), accounts and access review, published service promises.

Status: nothing above has been verified with a safe test event. Verify monitoring by producing one in the intended environment when authorised.
