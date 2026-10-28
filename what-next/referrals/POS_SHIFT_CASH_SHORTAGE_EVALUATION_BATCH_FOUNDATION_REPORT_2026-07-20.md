# POS Shift Cash-Shortage Evaluation Batch Foundation Report

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 6  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Executive Outcome

Phase 3 / Slice 6 is **certified complete** at the product-capability level.

Stoquify now has a bounded, read-only, tenant-scoped service that loads eligible `pos.shift.closed` business events in deterministic pages and composes each trusted event with the approved cash-shortage policy effective at its close time. The service returns one existing Slice 4 evaluator result per source event.

The batch does not mark events processed, persist checkpoints, create assurance check runs or incidents, schedule work, notify users, expose a route or action, render UI, or configure a production threshold. It is an internal composition contract, not a production detector.

## Scope Boundary

Implemented:

- strict organization, recorded-time window, page-size, and structured cursor validation;
- exact tenant/event/source/schema/status filtering over `BusinessEvent`;
- deterministic `recordedAt`, then event-ID ordering;
- `limit + 1` pagination with an explicit continuation cursor;
- defensive tenant, window, cursor-advance, page-bound, and row-order validation;
- deliberate database-row serialization into the certified version-1 POS close event envelope;
- source-only evaluator preflight before any policy lookup;
- approved-policy resolution by requested tenant, event currency, and trusted close time;
- one side-effect-free evaluator result per included event;
- deterministic blocked, not-triggered, triggered, warning, and high counts;
- focused validation, query, pagination, composition, failure, isolation, and replay tests.

Not implemented:

- event processing markers, checkpoint tables, leases, locks, retries, polling, workers, or schedules;
- assurance definitions, multi-result registry changes, check-run persistence, incident creation, or alerts;
- production policy entry, seeded thresholds, currency defaults, or enforce mode;
- routes, actions, pages, components, dashboards, or module-catalog changes;
- POS producer, policy-governance, evaluator, business-event writer, inventory, AI, copilot, or WhatsApp changes;
- deployment of any pending migration.

## Before And After

### Before

- The POS close producer emitted trustworthy version-1 evidence.
- The policy resolver could return one approved tenant/currency policy effective at a close time.
- The evaluator could decide one caller-supplied event and policy.
- No service could discover eligible events, bind them to policy, and return deterministic per-source evaluations.
- The shared assurance registry still assumed one result per definition execution, which could not preserve one case identity per POS session.

### After

- A caller can request one finite recorded-time window for one organization.
- Only applied version-1 POS cash-drawer close events are loaded.
- Pages are deterministic, bounded to 100 requested rows, and queried with one extra row to prove continuation.
- Every returned database row is rechecked against tenant, window, cursor, and ordering invariants before evaluation.
- Untrustworthy source evidence blocks before policy resolution.
- Trusted source evidence resolves only the requested tenant's approved policy at the payload close time.
- Missing policy remains `POLICY_MISSING`; no fallback is invented.
- Policy hash or approval-event verification failure rejects the batch rather than producing a clean result.
- The same static page can be replayed with identical output and no write dependency.

## Read And Pagination Contract

The input contract requires:

- `organizationId`;
- `recordedFromInclusive`;
- `recordedThroughExclusive` later than the start;
- optional cursor `{ recordedAt, eventId }` within that same window;
- optional limit from 1 through 100, defaulting to 50.

The database query fixes:

- `organizationId` to the requested tenant;
- `eventType` to `pos.shift.closed`;
- `eventSource` to `POS`;
- `schemaVersion` to `1`;
- `status` to `APPLIED`;
- `sourceType` to `CASH_DRAWER_CLOSE`;
- `recordedAt` to the inclusive/exclusive window;
- ordering to `recordedAt ASC, id ASC`;
- `take` to `limit + 1`.

When a cursor is present, the query advances lexicographically beyond its `(recordedAt, eventId)` position. The service rejects out-of-window, cross-tenant, non-advancing, duplicate, unordered, or oversized query results rather than emitting an unstable page.

`nextCursor` is returned only when the extra row proves another page exists. This cursor continues the same static window. It is not a durable cross-run checkpoint.

## Evaluation Contract

For each included row:

1. The row is serialized into the exact strict POS close event shape with ISO timestamps.
2. The certified evaluator runs once with no policy as a source-integrity preflight.
3. Any source schema, status, hash, identity, arithmetic, direction, or explanation failure is returned immediately and policy is not queried.
4. A trusted source reaches the expected `POLICY_MISSING` preflight boundary.
5. The approved policy resolver is called with the requested organization, payload currency, and payload close time.
6. The event and resolved policy are passed to the unchanged certified evaluator.

The batch never converts a malformed source, policy conflict, or missing policy into a balanced, below-threshold, or otherwise clean result.

## Output Contract

Each item contains:

- business-event ID;
- source ID;
- event recorded time;
- the unchanged `CashShortageEvaluation` discriminated union.

The page also returns:

- requested organization and normalized window;
- scanned, blocked, not-triggered, triggered, warning, and high counts;
- `hasMore`;
- optional continuation cursor.

Raw event payload is not added as a second output surface. Triggered and not-triggered results retain the evaluator's evidence envelope; blocked results retain only their stable block code and safe message.

## Verification Evidence

| Check                                                | Outcome                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pre-implementation Leakage baseline                  | Passed, 3 suites and 60 tests                                                                  |
| Focused Slice 6 batch suite                          | Passed, 1 suite and 19 tests                                                                   |
| Expanded batch/evaluator/policy/event/POS regression | Passed, 6 suites and 92 tests                                                                  |
| Focused ESLint over all three new files              | Passed                                                                                         |
| Full `npm run typecheck` with 6144 MB Node heap      | Passed repository-wide in 161.7 seconds                                                        |
| Service-boundary fail gate                           | Passed, 0 active violations                                                                    |
| Module-surface fail gate                             | Passed, 367 current-workspace records                                                          |
| No-write/import source scan                          | Passed, no persistence, incident, scheduler, notification, audit, outbox, or transaction match |

The focused suite covers seven invalid input/window/cursor cases plus exact query scope, structured cursor filtering, valid source serialization, tenant/currency/close-time policy resolution, malformed source, identity drift, missing policy, mixed outcome counts, limit-plus-one continuation, policy verification failure, foreign-tenant defense, unstable-order rejection, and deterministic replay without write methods.

The first focused run had 18 passing tests and one failed assertion because the test expected a nested `evidence.source` object. The certified evaluator uses flat `eventId` and `sourceId` evidence fields. The assertion was corrected to the existing contract; production code was not changed for that failure.

The first full TypeScript pass found one local mismatch: the parsed event's ISO close string was passed where the existing resolver input type requires `Date`. The service now constructs `Date` from the already validated close time. A subsequent compiler attempt emitted no diagnostics but timed out while an unrelated concurrent POS Jest process consumed substantial memory and left the compiler child running. That identified compiler child was stopped without touching the unrelated process. After contention cleared, the authoritative full typecheck passed.

The module-surface command regenerated `what-next/module-surface-inventory.md` and `.json` from the entire current dirty worktree. These workspace-wide artifacts are release evidence, not a new Slice 6 route or commercial surface.

## Runtime And Release Constraints

The configured database still has four pending migrations:

1. `20260719190000_hris_org_manager_scope_foundation`
2. `20260719203000_workflow_assurance_stable_case_identity`
3. `20260720090000_close_assurance_schema_foundation`
4. `20260720130000_cash_shortage_policy_governance`

No migration was deployed or marked applied. The configured runtime therefore still lacks the stable case-identity key and cash-shortage policy table required for incident activation and production policy resolution.

The shared assurance registry still returns one result and writes one check-run row per definition execution. Slice 6 deliberately does not aggregate multiple sessions into one source or alter that shared contract.

A production worker still requires separately reviewed checkpoint persistence, overlapping recovery, transaction-commit watermark semantics, retry and lease behavior, observability, activation controls, and idempotent downstream writes. Pagination in this slice does not certify those concerns.

The 135 historical closed/reconciled sessions without the certified event remain ineligible. Existing aggregate drawer alerts and hard-coded threshold constants remain transient hints and are not durable Leakage Radar cases or approved policy.

## Files In This Slice

Product contract:

- `services/leakage/pos-shift-cash-shortage-batch.schemas.ts`
- `services/leakage/pos-shift-cash-shortage-batch.service.ts`

Tests:

- `services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts`

Program evidence:

- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_6_SELECTION_REPORT_2026-07-20.md`
- `what-next/referrals/POS_SHIFT_CASH_SHORTAGE_EVALUATION_BATCH_FOUNDATION_REPORT_2026-07-20.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated release evidence:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

## Certification Decision

The POS Shift Cash-Shortage Evaluation Batch Foundation is certified complete within its bounded, read-only, tenant-scoped boundary. It composes trusted source evidence and approved policy into deterministic per-event decisions, but it is not a scheduler, assurance runner, incident pipeline, or product detector.

Control returns to `/stoquify-referral-war-room`. The war room must review this evidence and select at most one next narrow slice. Registry cardinality, check-run and incident persistence, migration deployment, worker checkpointing, scheduling, money-protection resolution, production policy entry, UI, inventory-loss behavior, predictive scoring, AI authority, and WhatsApp authority remain separate decisions with independent stop conditions.
