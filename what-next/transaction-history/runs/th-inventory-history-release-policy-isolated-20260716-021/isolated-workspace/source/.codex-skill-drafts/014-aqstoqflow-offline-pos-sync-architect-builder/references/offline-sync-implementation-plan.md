# Offline POS Sync Implementation Plan

## Scope

Build a fiscal-safe offline POS sync foundation for AqStoqFlow. This is a vertical foundation, not a full offline rewrite.

The first implementation should prove:

- device registry and revocation state;
- immutable offline event inbox;
- sync batch evidence;
- sequence and hash-chain validation;
- idempotency conflict handling;
- conflict/quarantine visibility;
- provisional receipt and close blockers;
- data-trust/accountant surface readiness.

## Offline Capability Ruling

| Feature | Ruling | Allowed Offline Events | Denied Offline Actions | Caps/TTL | Conflict Rule | Certification Impact |
| --- | --- | --- | --- | --- | --- | --- |
| Sale capture | DEGRADED | `OFFLINE_SALE_CAPTURED` with provisional local reference | final fiscal number, journal, stock finalization, AR, drawer truth | policy-defined; default server certification required | no last-write-wins; conflict by idempotency, sequence, hash chain, stale policy | blocks final close until accepted/replayed/certified |
| Refund/void | ONLINE-ONLY initially | none | refund, void, tender reversal | n/a | n/a | add later after sale path is certified |
| Drawer/Z close | ONLINE-ONLY initially | local evidence only if already modeled | final Z/day close | n/a | unresolved offline events block close | manager/accountant blocker |
| Payment claim | DEGRADED | provisional tender claim | settled revenue/payment reconciliation | provider/tenant cap | unmatched claim remains suspense/blocker | accountant reconciliation blocker |

## Schema Targets

Use existing model names where available. Add missing schema only for durable state:

- `POSOfflineDevice`: organization, terminal, location, device fingerprint/key state, status, last sequence, high-water hash, enrollment/revocation metadata.
- `POSOfflineSyncBatch`: one server ingestion attempt with counts, actor, hash, status, and timestamps.
- `POSOfflineEvent`: append-only event envelope with `deviceSeq`, `idempotencyKey`, `payloadHash`, `prevHash`, `entryHash`, signature placeholder, payload, status, conflict/posting/business-event pointers, and source metadata.
- `POSOfflineSyncConflict`: quarantine/exception queue with severity, type, expected/actual sequence/hash facts, status, resolution metadata, and operator message.
- `POSOfflineSyncCertificate`: read model/proof for certification or close blocker.

Use uniqueness constraints for:

- `(organizationId, deviceId, deviceSeq)`;
- `(organizationId, idempotencyKey)`;
- `(organizationId, deviceId, entryHash)`.

## Ingestion Transaction

For every submitted batch:

1. Parse with Zod and normalize dates.
2. Load tenant-scoped active device, terminal, and location.
3. Create a sync batch in `PROCESSING`.
4. For each event in sequence:
   - recompute or verify canonical payload hash;
   - verify `entryHash == sha256(deviceId|deviceSeq|eventType|schemaVersion|payloadHash|prevHash)`;
   - check duplicate idempotency;
   - check duplicate sequence;
   - check `prevHash == currentHighWaterHash`;
   - accept as `PENDING_REPLAY` or quarantine as `CONFLICT`.
5. For accepted envelopes, create a business event such as `OFFLINE_EVENT_CAPTURED`; do not mutate financial truth directly.
6. For conflicts, create a conflict row and notification outbox payload.
7. Update device high-water mark only for accepted contiguous events.
8. Create or refresh a certification/blocker record.
9. Commit the batch counts and return safe DTOs.

If the repo already has an event gateway helper, use it. Otherwise create only the durable envelope and explicit blocker.

## Conflict Types

- `IDEMPOTENCY_PAYLOAD_MISMATCH`
- `SEQUENCE_GAP`
- `SEQUENCE_DUPLICATE_MISMATCH`
- `HASH_CHAIN_FORK`
- `DEVICE_REVOKED`
- `SIGNATURE_INVALID`
- `STALE_REFERENCE_SNAPSHOT`
- `PROVISIONAL_RECEIPT_PENDING`
- `UNPOSTED_ACCEPTED_EVENT`
- `UNRECONCILED_TENDER_CLAIM`

## Notifications

Represent notifications using the repo's existing outbox/event mechanism:

- cashier: offline mode active, sync pending, sync accepted/rejected;
- manager: device gap, duplicate sync, conflict queue;
- accountant: provisional receipt pending certification, unresolved offline events, unposted accepted event.

Do not create silent logs as the only operator signal.

## UI States

The POS status strip and manager panel should include:

- loading;
- empty/no device state;
- permission denied;
- offline/degraded mode;
- pending sync count;
- last successful sync/as-of timestamp;
- conflict count and severity badge;
- retry action;
- stale policy warning;
- accountant/close blocker summary.

Use hooks/actions only; do not import Prisma or services in UI.

## Tests

Minimum focused tests:

- duplicate replay with same payload is idempotent;
- same idempotency key with different payload is rejected;
- sequence gap creates conflict/quarantine;
- same sequence with different hash creates conflict/quarantine;
- forked `prevHash` creates conflict/quarantine;
- revoked device cannot sync;
- tenant mismatch rejects access;
- action maps errors safely;
- dashboard exposes conflicts/blockers and as-of metadata;
- static scans prove no Prisma-in-UI and no mock/sample production data.

## Report

Save:

`what-next/AQSTOQFLOW_014_OFFLINE_POS_SYNC_ARCHITECT_BUILDER_EXECUTION_REPORT_2026-06-15.md`

Include:

- selected skill;
- parent skill;
- architecture decisions;
- files changed;
- gates passed;
- gates blocked;
- verification commands and results;
- whether 014 can advance to 015.
