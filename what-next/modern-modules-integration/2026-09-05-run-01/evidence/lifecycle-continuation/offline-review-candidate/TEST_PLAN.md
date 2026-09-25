# Proposed tests — NOT EXECUTED

These are required checks after approval, not verification results. No candidate code, migration, test, app or database was executed while preparing this package.

## Focused proposed test source

The candidate includes `services/pos/__tests__/offline-continuation.service.test.ts` with mocked, explicitly synthetic evidence. It tests current source reads and proof decisions; it does **not** prove PostgreSQL locking, action authentication, money movement or real customer readiness.

## Existing unit/action suites to adapt and run

Inspected `package.json` uses Jest for `npm test` and `tsc --noEmit --pretty false` for `npm run typecheck`. The default build runs migrations; do not use it for this review.

```powershell
npm test -- --runInBand --runTestsByPath `
  "services/pos/__tests__/offline-continuation.service.test.ts" `
  "services/pos/__tests__/pos.service.test.ts" `
  "services/pos/__tests__/offline-sync.service.test.ts" `
  "services/pos/__tests__/pos-shift-close.service.test.ts" `
  "actions/pos/__tests__/sync.actions.test.ts"
npm run typecheck
npx eslint services/pos/pos.service.ts services/pos/offline-sync.service.ts services/pos/offline-continuation.service.ts services/pos/__tests__/offline-continuation.service.test.ts
```

These commands have **not** been run. Confirm current scripts and explicit database URLs first because Jest loads the project environment. The commands are not authorization to run against that inherited environment.

Existing offline mocks must export `commitAcceptedOfflinePOSSale` and assert that replay passes only eventId plus server actor/tenant. Add transactional configuration/clock/device locks and actual acceptance relation fixtures. Replace placeholder entry hashes with the existing canonical hash builder. Adapt the completed-sale shortcut tests to exact COMMITTED/COMPLETED registry evidence rather than suppressing that check.

## Required boundary assertions

| ID | Arrangement and action | Required evidence |
| --- | --- | --- |
| U01 | Ordinary new sale after explicit POS or required Sales stop; include forged continuation flag/event ID/old time in client input. | Denied before registry claim, sale transition, payment, stock and ledger effects; continuation helper never used by ordinary input. |
| U02 | Existing COMMITTED result with identical actor/tenant/request; stop active and device now revoked. | Return same financial result and recover receipt through existing registry; no admission check or repeated effects. |
| U03 | Existing COMPLETED result with identical request after stop. | Same result hash/identity; no added postings/payments/stock/fiscal dispatch. |
| U04 | Same commit key with changed tender, customer, receipt option, actor, terminal or sale ID. | Existing idempotency conflict; completed-sale lookup cannot convert it to success. |
| U05 | Stored valid accepted pending event before every cutoff, unchanged server cart. | Normal POS controls execute; one sale/payment/stock/ledger outcome and durable replay acknowledgment. |
| U06 | Missing acceptance, wrong tenant/actor/device/terminal/location/session, changed payload, entry or acceptance source hash. | Denied before new effects; foreign actor cannot persist BLOCKED against another cashier's envelope. |
| U07 | Missing, invalid, equal-to-acceptance or earlier dependency cutoff. | Denied even if device time is decades old. |
| U08 | Receipt after cutoff, acceptance after cutoff, or forged old timestamps in caller metadata. | Denied. Stored server clock remains authoritative. |
| U09 | Server cart changes between acceptance and replay, including same-priced item substitution, note/customer/line edits. | Fingerprint mismatch before financial effects; no newly created replacement cart. |
| U10 | Stored payload changes between wrapper read and transaction read. | Fresh revalidation rejects; no old in-memory payload authority. |
| U11 | Database source read/clock/admission query fails. | Error propagates; no successful zero or false acceptance. |
| U12 | Same-device uploads concurrently start from same lastSequence. | Device lock serializes them; exact duplicate result or genuine sequence conflict, no duplicate accepted events/outbox. |
| U13 | Exact old upload duplicate while stopped. | Existing duplicate result retained; no second acceptance proof/event. Altered duplicate becomes conflict. |
| U14 | Atomic mixed batch includes exact old duplicate plus new forbidden envelope. | Transaction rejects new work and rolls back batch effects; existing accepted row remains byte-identical. Duplicate-only retry succeeds under existing session/device controls. |
| U15 | COMMITTED receipt hydration fails once, then retry. | Envelope stays PENDING_REPLAY; registry preserves money/stock and later acknowledgment finishes. |
| U16 | A failed replay races a successful financial commit and acknowledgment. | Device/event locking + registry recheck prevents BLOCKED overwriting committed/replayed work. |
| U17 | Replayed envelope retried. | Existing stored result retained; acknowledgment and conflict counts unchanged. |
| U18 | Legacy envelope has no proof, or opaque payload cannot identify a current scoped cart. | Never invent proof. No-stop handling retains ordinary controls; stopped continuation denied. |
| U19 | Device key absent versus key rotated/revoked later. | No claim of device-signature verification when absent; recorded verification mode honest; changed key/device denies stopped continuation. |
| U20 | NODE_ENV production/development with opt-in on; test with opt-in off. | Both public replay and new stored-reference entry deny before database reads. Only test plus explicit opt-in may execute. |
| U21 | Authorized and denied actions with caller-supplied tenant/user IDs. | Existing protect layer derives actor/tenant; foreign override ignored; denied users never invoke replay. |
| U22 | Refund, void, shift closing, existing payment settlement, receipt access, accounting/stock invariants. | Existing focused controls still pass; no new admission applied to mandatory completion paths. |

## Real PostgreSQL interleavings — separate isolated target only

Use two actual Prisma/PostgreSQL clients and promise barriers around the service's transaction adapter; do not replace lock decisions with mocks and do not add sleeps as ordering proof. No production service test hooks are proposed.

- **Ingestion first:** hold after its organization SHARE lock and before accepted event writes. Start stop transaction taking organization UPDATE; verify it waits. Release ingestion and commit acceptance/outbox/device sequence. Stop then records a later cutoff and sees the accepted obligation. Replay must complete once if all domain controls still pass.
- **Stop first:** hold organization UPDATE after publishing the stop policy in its transaction. Start ingestion; verify its SHARE acquisition waits. Commit stop, then release ingestion; a new sale envelope must be rejected before any durable accepted row/outbox or sequence advancement. Backdate capturedAtDevice in this test.
- **Acknowledgment versus stop observation:** pause replay acknowledgment with SHARE held; stop waits and then observes its final durable status. Reverse ordering must preserve the already counted obligation and allow later completion.
- **Commit versus late failure:** pause one replay after registry creation within its transaction, start a second failure-recording path, then commit the first. The failure path must observe the registry and refuse BLOCKED.
- **Changing cart:** edit a line before replay and verify fingerprint rejection. Race line update/insertion with locked replay; prove serialization/rollback and unchanged financial invariants. Check the parent row/FK insertion locks with real PostgreSQL.
- **Device/hash-chain concurrency:** invoke two distinct batches for the same sequence and two identical retries. Verify unique constraints and high-water mark; no false acceptance from transaction-start timestamps.
- **Migration immutability:** in rollback-only transactions attempt each protected field mutation, acceptance-link removal, accepted event deletion, acceptance payload/time/actor change, and conversion of another event into capture. Each must fail. Operational status/error updates must still work. Exercise organization/session/batch parent deletion to document the intentional retention impact.
- **Lost response:** complete financial transaction, lose response before envelope acknowledgment, retry exact request, and compare row counts, registry/result hashes and posting amounts.

Capture exact database host/name (without credentials), source/migration hashes, real query/results, lock ordering, counts before/after and wall times. Report failed/skipped/blocked honestly. No latency, release, accounting, legal or security certification follows from a passing isolated test.

