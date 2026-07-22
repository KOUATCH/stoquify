# Daily Truth End-Of-Day Readiness Report

Generated: 2026-07-18

Selected skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`

Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Phase 2 / Slice 5 is complete. Stoquify now has a read-only, service-owned contract for the readiness of exactly one branch on exactly one business date. The service does not claim that the branch is closed, reconciled, approved, or signed off.

The next narrow slice is Phase 2 / Slice 6: a dedicated durable branch daily-close review foundation. It must remain separate from accounting-period `CloseRun` and must not expose a write action or UI until its persistence, access, audit, idempotency, and event boundaries are proven.

## Before

- No dedicated branch end-of-day readiness service or contract existed.
- `closePOSShift()` closed one cashier or terminal session; it was not branch-level manager sign-off.
- The branch operating snapshot exposed POS activity counts but no daily-close checklist or completion record.
- Existing payment reconciliation evidence did not prove a safe location-owned dimension for branch close.
- Accounting `CloseRun` represented period close assurance and could not be relabelled as branch daily-close truth.
- No durable daily-close manager sign-off source existed.

## After

The new contract represents one authorized location and one normalized UTC business-date window. It separates these concepts:

- `readiness`: `READY_FOR_REVIEW`, `ACTION_REQUIRED`, `NO_ACTIVITY`, or `UNAVAILABLE`.
- checklist evidence: `READY`, `ACTION_REQUIRED`, `NO_ACTIVITY`, `STALE`, `BLOCKED`, `UNAVAILABLE`, or `UNSUPPORTED`.
- `completion`: explicitly `NOT_AVAILABLE`, with `signedOff: false` and reason `NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE`.
- coverage: complete only across sources the service can honestly support; payment reconciliation and manager sign-off remain `UNSUPPORTED`.

Readiness evidence currently includes:

- verified organization/location identity;
- branch operating snapshot identity, status, observation time, freshness, evidence grade, source hash, and blockers;
- POS session identifiers, states, timestamps, freshness, and active or inconsistent-session blockers;
- cash drawer identifiers, open/closed state, timestamps, freshness, and open or stale-drawer blockers.

The response deliberately excludes balances, variances, totals, currency, and other monetary fields.

## Access And Trust Boundary

- The service accepts trusted `OperatingAccessContext`, `locationId`, and a strict `YYYY-MM-DD` business date.
- Operating access is resolved before any branch evidence read.
- Tenant authority is constrained to an active, non-deleted location owned by the active organization.
- Managed-location authority is constrained to the resolver's assigned location identifiers.
- Denied, unassigned, cross-tenant, inactive, deleted, and identity-inconsistent locations fail closed.
- Missing or foreign locations use the same non-enumerating error message.
- Snapshot identity is checked before its evidence enters the result.
- The result never combines, ranks, or compares locations.

## Source Honesty

| Checklist source | State in Slice 5 | Reason |
|---|---|---|
| Location | supported | Organization ownership and active state are verified directly. |
| Branch operating snapshot | supported | Existing location-scoped service-owned evidence is reused. |
| POS session closure | supported | Sessions overlapping the requested day are queried by location. |
| Cash drawer closure | supported | Drawers are queried by location and represented without money. |
| Branch payment reconciliation | unsupported | No certified location-owned payment source was found. |
| Manager sign-off | unsupported | No durable branch daily-close sign-off record exists. |

The service does not query accounting `CloseRun`, payment reconciliation runs, or tenant-wide payment totals.

## Files Added

- `services/end-of-day-close/end-of-day-close-readiness-contracts.ts`
- `services/end-of-day-close/end-of-day-close-readiness.service.ts`
- `services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_END_OF_DAY_READINESS_REPORT_2026-07-18.md`

No schema, migration, protected action, page, component, notification, AI, or WhatsApp behavior was added.

## Verification

Focused readiness tests:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts
```

Result: 1 suite passed, 12 tests passed, 0 failed.

Focused regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts
```

Result: 3 suites passed, 22 tests passed, 0 failed.

Additional gates:

- `npm run typecheck`: passed.
- focused ESLint for the three new TypeScript files: passed.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- zero-write audit: passed; no create, update, delete, upsert, transaction mutation, event, or outbox call is made.
- data-minimization audit: passed; service selectors contain no balance, variance, total, amount, or currency field.
- source-boundary audit: passed; only location, branch snapshot, POS session, and cash drawer reads are used.

The role cockpit gate documents Daily Digest coverage only and is not treated as certification of every manager surface.

## Test Coverage

The focused service tests prove:

- nominal tenant-authority readiness for one branch;
- strict UTC date normalization and overlap queries;
- access resolution before location reads;
- managed-location no-activity behavior;
- denial before evidence reads for unassigned or invalid authority;
- non-enumerating missing, inactive, deleted, and cross-tenant handling;
- active, suspended, or inconsistent POS session blockers;
- open and stale drawer blockers;
- stale, blocked, failed, and identity-inconsistent snapshot handling;
- unsupported payment and sign-off honesty;
- no financial fields, accounting close reads, payment reads, or domain writes.

## Residual Risks

- The business-date boundary uses UTC because organization or location timezone truth is not yet part of this contract.
- Payment reconciliation remains unsupported until a trustworthy location-owned source and ownership rule exist.
- Manager sign-off remains unavailable until a dedicated durable lifecycle exists.
- POS shift closure stores monetary evidence, but Slice 5 intentionally withholds it because no explicit close-view permission and redaction contract exists.
- Overall evidence coverage remains partial while payment and sign-off are unsupported.
- A later sign-off command must re-read fresh source evidence inside its controlled workflow and reject evidence drift.

## Next Slice Gate

Phase 2 / Slice 6 will establish a dedicated branch daily-close review record and service command foundation only. It must:

1. Use a location/day record unique within an organization and never reuse accounting `CloseRun`.
2. Resolve trusted operating access and verify tenant/location identity before mutation.
3. Capture the Slice 5 readiness manifest, source hashes, observation time, coverage, and blockers without monetary data.
4. Create or replay the same review request idempotently and reject key reuse with a different payload.
5. Write the review record, audit evidence, and business event atomically.
6. Keep the record in a non-final review state; no command may claim manager sign-off in this slice.
7. Add no route, action, page, notification delivery, AI, WhatsApp, or external artifact.
8. Prove tenant isolation, assigned-location scope, replay behavior, conflict behavior, atomic failure, audit/event linkage, evidence hashing, and absence of sign-off transitions with focused tests.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`.

Companion boundary: `004-aqstoqflow-business-event-gateway`.
