# Backup and Recovery

This file owns backup targets, the restore procedure and the outage runbook list. Finding A20: backups, private storage, deployed config and schema cannot be certified from the repository.

- **Data and configuration covered:** the MySQL database, private files (none stored yet; future job photos), server `config.php` (kept by the owner, never in Git), hand-uploaded endpoint versions (release snapshot).
- **Backup owner, frequency and retention:** owner. Proposed targets, to confirm against the hosting plan (not achieved guarantees): daily encrypted database and private-file backup stored away from the live host; recent daily copies plus longer periodic copies.
- **Encryption and access:** backup credentials and encryption keys stay outside Git and recoverable by the owner.
- **Recovery time and recovery point objectives:** Proposed: at most 24 hours of data loss; restoration within four hours only if realistically supported.
- **Restore procedure and last restore test:** `NOT TESTED`.

## Restore procedure (Proposed)

A downloaded SQL file is not proof of a usable backup. Restore into a separate environment, check record counts and one linked client, job, payment and photo, and record the time taken. Repeat after major storage or schema changes and periodically (monthly sample restore, [MONITORING.md](MONITORING.md)). Before any production change, snapshot first ([DEPLOYMENT.md](DEPLOYMENT.md#release-procedure)).

## Runbook list

Keep a short runbook for each: host or database outage; accidental edit; payment mismatch; failed reminders; suspected data exposure ([DATA-PRIVACY.md](../05-security/DATA-PRIVACY.md#rights-requests-and-incidents)). During outages, block unsafe writes, keep unsent form values in memory and tell the user what happened. Do not persist private drafts on shared devices by default. Runbooks written so far: none.

Gaps: no backup schedule confirmed with the host; no restore ever performed; no shared environment to restore into except local staging.
