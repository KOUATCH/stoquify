# Stoquify Offline POS Fiscal Replay Finalizer Implementation

Date: 2026-07-11

Mode: narrow implementation and verification

Primary skill: `stoquify-offline-pos-fiscal-replay-finalizer`

Supporting skills:

- `stoquify-ohada-leadership-orchestrator`
- `stoquify-ledger-close-truth-guardian`
- `stoquify-release-evidence-ratchet`

## Scope

Trace browser-local queue creation, provisional receipt policy, device identity, device sequence and hash chains, tenant and terminal scope, sync ingestion, quarantine, replay idempotency, POS finalization, stock/cash/ledger effects, fiscal receipt truth, conflict evidence, replay certificates, and Workflow Assurance.

Selected implementation boundary:

- replay-time device-status revalidation;
- inactive-device conflict evidence;
- prevention of POS side effects from revoked, suspended, or rotating devices;
- a fail-mode offline POS fiscal replay ratchet.

## Existing Control Spine

The audit confirmed these controls already exist:

- the browser queue rejects final fiscal-number claims unless an explicit country policy permits them;
- queue payloads use deterministic JSON hashing, device sequence numbers, previous hashes, and entry hashes;
- sync ingestion derives tenant scope from authenticated context and verifies terminal, location, and enrolled device scope;
- inactive devices are rejected during ingestion;
- idempotency reuse, duplicate sequence mismatch, sequence gaps, and hash-chain forks create visible conflict or quarantine evidence;
- accepted events remain `PENDING_REPLAY` with an explicit close blocker and provisional receipt notification;
- replay validates stored payload hashes and sale envelope terminal, location, and session scope;
- replay uses the normal `commitPOSSale` service, producing stock, tender, ledger, receipt, and fiscal effects through the established atomic POS workflow;
- completed-sale lookup and post-error recovery make replay crash-recoverable and idempotent;
- replay evidence retains the posting batch, receipt document hash, fiscal document status, legal-delivery status, business event, audit event, and device acknowledgement;
- five Workflow Assurance checks monitor replay SLA, accepted-event proof, sequence/hash conflicts, quarantine proof, and replay proof.

## Audit Finding

Sync ingestion rechecked that a device was `ACTIVE`, but `replayPendingOfflineSaleEnvelope` loaded only the device ID and sequence state. It did not reload or enforce the current device status before calling `commitPOSSale`.

An event accepted while a device was active could therefore remain pending, the device could later be suspended, revoked, or rotated, and an operator could still replay that event into completed sale, stock, payment, ledger, receipt, and fiscal effects.

## Implementation

`loadOfflineSaleReplayEvent` now loads current device status with the accepted event.

Immediately before payload validation and POS finalization, replay requires the enrolled device to remain `ACTIVE`. An inactive device produces:

- replay result `BLOCKED`;
- blocker code `OFFLINE_REPLAY_DEVICE_INACTIVE`;
- a critical `DEVICE_REVOKED` conflict linked to the event and sync batch;
- persisted blocked-event metadata;
- manager and accountant notifications;
- audit and business-event evidence;
- a refreshed blocked device certificate.

`commitPOSSale` is not invoked, so no sale, inventory, cash, payment, ledger, receipt, or fiscal side effect can occur. Already replayed events remain idempotent and return stored evidence without creating new effects.

## Evidence Ratchet

Added `scripts/offline-pos-fiscal-replay-gate.js` and negative fixture tests. The gate verifies:

- provisional-only client receipt policy;
- deterministic device hash chains;
- tenant, terminal, location, and device scope;
- inactive-device ingestion quarantine;
- inactive-device replay-time revalidation before POS finalization;
- sequence, hash, and idempotency quarantine;
- accepted-event pending-replay proof;
- exact-once POS finalization and crash recovery;
- receipt, fiscal, legal-delivery, posting, and replay evidence;
- offline Workflow Assurance and policy-gate wiring.

Package command:

- `npm run offline:pos:replay:gate`

The command is now part of `npm run policy:gates`.

## Generated Evidence

- `what-next/offline-pos-fiscal-replay-readiness.md`
- `what-next/offline-pos-fiscal-replay-readiness.json`

Latest result: 10/10 checks ready and 0 blockers.

## Verification

Passed:

- Broadened Jest bundle: 8 suites, 93 tests.
- Browser-local queue tests.
- Offline sync ingestion and replay tests.
- POS sync action boundary tests.
- POS finalization tests.
- Public receipt and fiscal-document tests.
- Workflow Assurance registry tests.
- Offline replay gate tests with negative fixtures.
- Focused ESLint across implementation, test, and gate files.
- `npm run typecheck` with no diagnostics.
- `npm run receipt:token:config-gate`: ready, with the existing local secret warning.
- `npm run offline:pos:replay:gate`: 10/10 ready, 0 blockers.
- `npm run policy:gates`: complete chain passed.
- Scoped Git whitespace validation.

## Non-Claims and Residual Risk

- This slice does not certify offline hardware, local storage durability, network behavior, fiscal authorities, or statutory receipt compliance.
- It does not apply or require a production database migration.
- Devices store a public-key fingerprint and events may carry signatures, but the server does not yet cryptographically verify event signatures against enrolled public-key material. A key-enrollment, rotation, verification, and revocation protocol remains a high-priority security requirement.
- Device replay certificates currently move between `OPEN` and `BLOCKED`; there is no complete operator-signed transition to `CERTIFIED` with fresh-auth and immutable certification evidence.
- A replayed receipt can remain legally blocked pending fiscal certification, while the device certificate close-blocker currently counts open sync conflicts and pending replay only. Fiscal legal-delivery blockers should be incorporated into certificate refresh and close assurance.
- Browser and service tests prove deterministic behavior, but live multi-tab concurrency, storage eviction, clock drift, prolonged network partitions, device key loss, and high-volume replay require environment and chaos evidence.
- The public receipt token gate retains its existing local warning because the production receipt-token secret is not configured in this environment.

## Completion Decision

The selected replay authorization gap is closed and protected by a fail-mode repository ratchet. A previously accepted offline event can no longer be converted into economic and fiscal effects after its enrolled device becomes inactive.

## Next Recommended Skill Slice

Run `stoquify-statutory-country-pack-production-gate` next, following the leadership blueprint order. Trace country selection, versioned parameter resolution, provenance, effective dates, expert review, accounting and tax consumers, certification claims, fallback behavior, and release gates; then implement the highest-risk remaining hardcoded or uncertified statutory boundary.
