# Daily Truth End-Of-Day Review Foundation Report

Generated: 2026-07-18

Selected skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`

Companion boundary: `004-aqstoqflow-business-event-gateway`

Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Phase 2 / Slice 6 is complete. Stoquify now has a dedicated durable record and transactional command for starting a non-final review of one authorized branch and one business date.

The record cannot represent approval, completion, certification, or manager sign-off. The only available states are `IN_REVIEW` and `BLOCKED`.

The next narrow slice is Phase 2 / Slice 7: a read-only branch payment-capture attribution contract. It must prove only payments directly attributable through an organization-owned sales order and must leave provider reconciliation and unlinked payment ownership unsupported.

## Before

- Slice 5 could calculate branch close readiness but had no durable review record.
- Repeating a manager review request had no domain idempotency boundary.
- There was no branch/day evidence manifest, mutation audit, or business event for starting review.
- Accounting-period `CloseRun` was the only durable close-shaped record and could not be reused.
- Manager sign-off was correctly unavailable.

## After

`BranchDailyCloseRun` now stores:

- organization, location, and date identity;
- UTC period start and end;
- non-final `IN_REVIEW` or `BLOCKED` status;
- Slice 5 readiness and evidence coverage states;
- supported, unsupported, and blocker counts;
- deterministic readiness, manifest, and request hashes;
- a data-minimized JSON evidence manifest;
- evidence observation time;
- initiating actor, idempotency key, correlation identifier, and timestamps.

Database invariants enforce:

- one run per organization, location, and business date;
- one idempotency key per organization;
- nonnegative evidence and blocker counts;
- recognized readiness and coverage values;
- fixed SHA-256 hash lengths;
- non-empty idempotency and correlation identifiers;
- a valid positive period window.

No relation to accounting `CloseRun` was introduced.

## Command Boundary

`startBranchDailyCloseReview()` performs this sequence:

1. Validate actor, location, strict `YYYY-MM-DD` date, idempotency key, correlation identifier, and optional clock.
2. Reject actor/context mismatch before evidence reads.
3. Call the Slice 5 readiness service, which resolves operating access before branch reads.
4. Recheck organization, actor, location, scope, and business-date identity on the returned evidence.
5. Require payment reconciliation and manager sign-off to remain explicit `UNSUPPORTED` items.
6. Build a deterministic, sorted, non-monetary evidence manifest.
7. Create the run, mutation audit, and business event in one Prisma transaction.
8. Emit no outbox message or notification.

`READY_FOR_REVIEW` and `NO_ACTIVITY` become `IN_REVIEW`. `ACTION_REQUIRED` and `UNAVAILABLE` become `BLOCKED`.

## Idempotency And Conflict Proof

- Same organization, key, and deterministic request hash returns the existing run without duplicate writes.
- Reusing a key with changed evidence fails with `ConflictError`.
- A second key for the same organization/location/date fails with `ConflictError`.
- Unique-constraint races reload the existing row and return it only when key and request hash match.
- Rejected replay and uniqueness conflicts are audited outside the rejected domain transaction so their audit evidence is not rolled back.
- The business event gateway provides a second organization/source/key idempotency boundary.

## Evidence And Redaction Controls

The persisted manifest contains only:

- source identifiers, hashes, observation times, freshness, and evidence grades;
- readiness and coverage states;
- session/drawer/snapshot counts already authorized by Slice 5;
- blocker codes, severities, gates, and source tables;
- explicit unsupported checklist keys and false control claims.

Runtime validation rejects manifest keys containing amount, balance, variance, currency, or total. Titles, descriptive details, payment values, POS balances, drawer variances, and tenant-wide fallback data are not persisted.

The business event contains hashes, counts, identity, non-final state, and correlation data only. Its outbox list is empty.

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260718100000_branch_daily_close_review_foundation/migration.sql`
- `services/end-of-day-close/end-of-day-close-review-contracts.ts`
- `services/end-of-day-close/end-of-day-close-review.service.ts`
- `services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_END_OF_DAY_REVIEW_FOUNDATION_REPORT_2026-07-18.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- generated verification evidence under `what-next/prisma-migration-deployment-readiness.{md,json}` and `what-next/role-based-operating-cockpit-readiness.{md,json}`

No action, route, page, component, notification delivery, export, AI, or WhatsApp behavior was added.

## Verification

Focused Slice 6 tests:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts
```

Result: 1 suite passed, 17 tests passed, 0 failed.

Focused regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/events/__tests__/business-event.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 4 suites passed, 40 tests passed, 0 failed.

Additional gates:

- `npm run typecheck`: passed.
- focused ESLint for the Slice 6 contract, service, and test: passed.
- `npx prisma validate`: passed after the final schema edit.
- `npm run prisma:migration:safety:gate`: ready, 8/8 checks, 18 migrations, 0 risk findings, 0 blockers.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.

The role gate covers Daily Digest, not every manager surface. The migration gate intentionally skipped database execution because no deployable `DATABASE_URL` was configured; schema and migration are validated but not applied to a database in this run.

Prisma client type generation succeeded. A later normal generation attempt refreshed the client to `engineType: library` but Windows could not replace the already loaded same-version query-engine DLL; the active normal DLL remained present and the failed temporary DLL was removed.

A runtime instantiation check passed without a database connection and exposed `branchDailyCloseRun` as a generated Prisma model delegate.

## Test Coverage

The focused tests prove:

- tenant-authority and managed-location review starts;
- readiness-before-transaction ordering;
- actor, organization, scope, location, date, and cross-tenant failure behavior;
- `IN_REVIEW` and `BLOCKED` derivation;
- deterministic, non-monetary manifest and event payloads;
- same-key replay without duplicate writes;
- changed-evidence replay conflict with separately persisted audit;
- organization/location/date uniqueness;
- transaction failure is returned instead of partial command success;
- malformed dates and empty keys fail before evidence reads;
- no signed, completed, approved, certified, or notification state is written.

## Residual Risks

- The migration is not deployed in this local run.
- Organization timezone exists in the schema, but this slice intentionally preserves the Slice 5 UTC business-date convention. A timezone policy needs its own compatibility plan.
- The review manifest is observed evidence, not certification. A later sign-off command must re-read fresh evidence and reject drift.
- Payment reconciliation and manager sign-off remain unsupported.
- No external command surface exists; a future action requires an explicit permission, module entitlement, sensitive-action policy, and fresh-auth control.
- `Payment` has no direct location field. POS payment ownership can be derived only when a payment is linked to an organization-owned `SalesOrder.locationId`.
- Provider events, statement lines, payment transactions, provider accounts, and reconciliation runs do not currently prove branch ownership.

## Next Slice Gate

Phase 2 / Slice 7 will add a read-only branch payment-capture attribution contract and service only. It must:

1. Accept trusted operating access context, one requested location, and one strict business date.
2. Resolve operating access before payment evidence reads and preserve one-branch scope.
3. Attribute inbound payment capture only through a payment's organization-owned sales order and that sales order's exact location.
4. Exclude purchase-order payments, deleted payments, foreign sales orders, unlinked payments, and tenant/provider evidence without branch ownership.
5. Represent unlinked and provider reconciliation coverage as `UNAVAILABLE` or `UNSUPPORTED` without exposing tenant-wide fallback counts to a branch manager.
6. Return counts, statuses, source identifiers, timestamps, and source hashes only; no amounts, balances, variances, totals, or currency.
7. Avoid the synthetic provider-line logic in the payment reconciliation workbench and make no reconciliation or settlement claim.
8. Add no schema, write, action, UI, notification, sign-off, AI, or WhatsApp behavior.
9. Prove tenant/location scope, direct sales-order attribution, exclusions, no-activity, stale evidence, no monetary keys, no provider-reconciliation claim, and zero domain writes with focused tests.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`.

Companion audit skill: `01-payment-recon-readiness-audit`.
