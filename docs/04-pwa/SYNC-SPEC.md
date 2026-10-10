# Synchronisation Specification

**Status: N/A.** HeritOS does no offline queueing or background synchronisation, and none is planned. Reason: the approved plan treats the service worker as an offline shell only, blocks writes while offline and defers background sync "until justified" (D-016; Plans 2026 finding A16, approved by the owner on 10 October 2026). POS offline sync is also in the Defer row of [PRODUCT-SPEC.md](../01-product/PRODUCT-SPEC.md#scope). Decision owner: the business owner.

Consequences while N/A:

- Queue ownership and storage, stable operation identifiers, retry and backoff, ordering, conflict detection and resolution: not applicable on the client.
- Server-side duplicate protection still applies to online writes: idempotency keys for payments and enquiry conversion ([BR-02, BR-22](../01-product/BUSINESS-RULES.md)) and updated-at conflict checks when two screens edit one record ([DATA-MODEL.md](../02-architecture/DATA-MODEL.md#rules)).
- Data-loss prevention relies on keeping typed values in memory and refusing writes while offline ([OFFLINE-SPEC.md](OFFLINE-SPEC.md)).

Revisit only through a new decision in [DECISIONS.md](../08-change-management/DECISIONS.md) backed by a repeated owner need. If that happens, this file must define local, queued, syncing, synced, conflicted and failed states before any build.
