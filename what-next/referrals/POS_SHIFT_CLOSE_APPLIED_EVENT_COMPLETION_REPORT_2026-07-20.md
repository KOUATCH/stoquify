# POS Shift-Close Applied Event Completion Report

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 7  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Supporting skill: `007-aqstoqflow-pos-ledger-controls`

## Executive Outcome

Phase 3 / Slice 7 is **certified complete** at the product-capability level.

Newly committed POS shift-close evidence now reaches `APPLIED` with a non-null processing time inside the same Serializable source transaction that closes the session, closes the drawer, clears the terminal, records the closing cash movement, creates the versioned business event and outbox row, and writes the close audit. Exact replay now accepts only that applied evidence state.

This closes the producer/consumer mismatch that made the certified Slice 6 batch unable to discover future close events. It does not activate a detector, worker, scheduler, assurance definition, check run, incident, notification, production threshold, route, action, or UI.

## Before And After

### Before

- `recordBusinessEventInTx` created `pos.shift.closed` with the Prisma default `RECORDED` status.
- `closePOSShift` committed the source event and outbox but did not invoke the existing event applied-state helper.
- The Slice 6 batch deliberately admitted only `APPLIED` version-1 POS cash-drawer close events.
- A correctly committed future close was therefore invisible to the certified batch.
- Exact replay validated payload and source evidence but did not require `APPLIED` plus `processedAt`.

### After

- `closePOSShift` calls `markBusinessEventAppliedInTx` immediately after event/outbox creation and before the close audit.
- The helper writes `status: APPLIED` and `processedAt: new Date()` through the existing tenant-scoped event update.
- Any event-update failure rejects the enclosing Serializable transaction, so no session, drawer, terminal, closing movement, event, outbox, or audit can partially commit.
- Exact replay requires both `status === APPLIED` and a non-null `processedAt` before returning the original result.
- Exact replay does not apply the event again.
- The strict Slice 6 loader can now discover future committed source events without weakening its eligibility filter.

## Source-Owned Transaction Contract

The certified close sequence remains source-owned:

1. Claim the tenant/session/terminal/drawer close transition.
2. Persist the closing cash-drawer movement.
3. Record one versioned `pos.shift.closed` event and its outbox message.
4. Mark that exact tenant event `APPLIED` with processing time.
5. Write the close audit.
6. Commit all state and evidence together.

The applied-state helper is the contract boundary: a successful Prisma update proves the fixed values were written; a failed update rejects. Slice 7 does not widen the helper's intentionally minimal shared return type.

## Focused Test Evidence

Unit coverage now proves:

- event creation begins at the expected `RECORDED` fixture state;
- the tenant-scoped event update writes `APPLIED` and a `Date` processing time;
- event creation precedes event application, which precedes the close audit;
- event-application failure stops before audit and surfaces the existing safe business error;
- exact replay performs no second event update;
- replay fails closed when persisted evidence is still `RECORDED` or lacks `processedAt`.

PostgreSQL certification now proves:

- successful simultaneous-close and close-versus-writer paths persist `APPLIED` plus `processedAt`;
- the existing event, outbox, and audit failure triggers still roll back every close write;
- a new `BEFORE UPDATE` trigger on the close event's `APPLIED` transition rolls back every close write;
- raw PostgreSQL trigger details remain behind the existing public-safe error boundary;
- expected Serializable write-conflict logs are recovered by the bounded close retry/replay behavior.

## Verification

| Check                                           | Outcome                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Pre-change focused source-to-detector baseline  | Passed, 4 suites and 73 tests                                                                                 |
| Final focused source-to-detector regression     | Passed, 4 suites and 75 tests                                                                                 |
| Final isolated PostgreSQL certification         | Passed, 1 suite and 7 tests                                                                                   |
| Focused ESLint over the three Slice 7 files     | Passed                                                                                                        |
| Full `npm run typecheck` with 6144 MB Node heap | Passed repository-wide in 81.6 seconds                                                                        |
| Service-boundary fail gate                      | Passed, 0 active violations                                                                                   |
| Module-surface fail gate                        | Passed, 367 current-workspace records                                                                         |
| Prisma migration status                         | Passed, all 23 migrations applied                                                                             |
| Final isolated-schema cleanup                   | Passed, certification schema absent                                                                           |
| Final public activation aggregate               | 0 certification organizations, policies, approved policies, eligible close events, incidents, and definitions |

The first compiler run found a local type mismatch because the shared event helper returns an intentionally minimal event record. The redundant inspection of its return fields was removed; successful update remains the helper guarantee, while unit and PostgreSQL tests assert the actual persisted values. The authoritative final compiler run passed.

File-wide `git diff --check` remains non-zero only for a pre-existing extra blank line at the end of `services/pos/pos.service.ts`, reproduced by the exact pre-Slice 7 Jest source snapshot. No Slice 7 hunk introduces trailing whitespace or a new blank line.

## Database Safety Record

The first direct opt-in PostgreSQL command inherited the configured local `public` schema. The trigger helper correctly refused to install test triggers outside `codex_pos_shift_close_cert_20260719`, but the three earlier concurrency tests and four rollback fixture setups had already created seven unmistakable certification organizations in `public`.

The issue was detected by the post-test read-only aggregate, which changed from zero to three eligible close events. Cleanup proceeded only after proving all seven rows had exact `pos-close-cert-*` slugs, `POS close certification *` names, UUID fixture IDs, one test user and location each, and creation timestamps within the failed run's one-second window.

A guarded Serializable dependency-order cleanup removed only those exact fixture graphs:

- 4 audit logs;
- 3 outbox rows;
- 3 business events;
- 11 cash-drawer transactions;
- 7 drawers;
- 7 sessions;
- 7 terminals;
- 7 locations;
- 7 users;
- 7 organizations.

The final read-only snapshot proves `certificationOrganizations: 0`, `policies: 0`, `approvedPolicies: 0`, `closeEvents: 0`, `incidents: 0`, and `definitions: 0`. The final seven-test certification ran only in the isolated schema, set `NODE_ENV=test`, dropped the schema in `finally`, and verified it absent. No application organization or historical row was altered.

## Runtime And Activation Boundary

The configured local runtime reports all 23 migrations applied. Schema deployment is no longer the active blocker, but runtime activation remains prohibited:

- no production cash-shortage policy or approved threshold exists;
- no assurance definition or incident exists;
- no worker checkpoint, lease, retry, dead-letter, or scheduling contract exists;
- no historical close event was backfilled or synthetically applied;
- the 135 legacy closed/reconciled rows remain excluded;
- no event processing marker or detector checkpoint was written.

## Residual Design Gates

- Registry cardinality must preserve one aggregate execution plus zero-to-many deterministic source findings, including stable finding identity, ordering, caps, duplicate rejection, and transactional idempotency.
- Incident-writing activation must wait for a legal state machine, owning-source recheck, maker-checker controls, tenant-safe assignees, correct permissions, and sufficient audit evidence.
- Worker activation must add a frozen scan window, fenced lease, durable checkpoint, overlap recovery, retries, dead-letter handling, and atomic output-plus-cursor persistence. `(recordedAt, eventId)` pagination alone is not a commit watermark.
- Scheduler activation remains a separate release decision after source, registry, lifecycle, and worker contracts are certified.

## Files In This Slice

Product source:

- `services/pos/pos.service.ts`

Focused tests:

- `services/pos/__tests__/pos-shift-close.service.test.ts`
- `services/pos/__tests__/pos-shift-close.postgres.test.ts`

Program evidence:

- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_7_SELECTION_REPORT_2026-07-20.md`
- `what-next/referrals/POS_SHIFT_CLOSE_APPLIED_EVENT_COMPLETION_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated release evidence:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

## Certification Decision

The POS Shift-Close Applied Event Completion slice is certified complete within its narrow source-owned boundary. Future committed version-1 POS close events can satisfy the existing strict `APPLIED` loader contract, and exact replay now rejects incomplete lifecycle evidence.

Control returns to `/stoquify-referral-war-room`. No Slice 8 is preselected. The war room must review the residual registry, incident-lifecycle, worker, and activation gates before authorizing at most one next narrow slice.
