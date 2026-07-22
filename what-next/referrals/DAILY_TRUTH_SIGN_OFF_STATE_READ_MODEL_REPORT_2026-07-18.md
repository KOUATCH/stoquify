# Daily Truth Sign-Off State Read Model Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 13 - Branch daily-close sign-off state read model
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 13 is complete. Stoquify now has a service-owned, tenant- and location-authorized read model that reports branch daily-close sign-off state as `NOT_STARTED`, `BLOCKED`, `AWAITING_SIGN_OFF`, or `SIGNED` without changing operational readiness, drift behavior, or any product surface.

The service resolves operating access before reading tenant records, verifies one active location, and then reads one branch/day review plus sign-off lifecycle evidence inside one repeatable-read transaction. `SIGNED` is returned only when exactly one active sign-off matches the review's tenant, run, evidence hashes, evidence observation time, distinct checker, L1 assurance, and 300-second fresh-auth boundary. Invalid, duplicate, cross-tenant, cross-run, self-approved, future-dated, or lifecycle-inconsistent evidence fails closed.

Revoked and superseded rows are represented only as data-minimized history counts and latest terminal time. They never become the active signature. No idempotency key, request hash, correlation ID, organization configuration, user profile, raw authentication material, audit payload, or delivery information is selected or returned.

The result has a deterministic `projectionHash` that is deliberately separate from `BranchDailyCloseRun.readinessSourceHash`. Its controls state that sign-off is excluded from the pre-sign readiness hash, readiness is not promoted, and final close is not claimed. The service imports neither the readiness service nor the drift service, preventing the new signature from creating circular or self-induced drift.

No server action, API route, page, component, readiness mutation, sign-off mutation, revocation command, certificate, notification, AI, or WhatsApp behavior was added.

## Before

- Slice 12 could create one controlled active sign-off but returned state only to its service caller.
- No reusable read model could distinguish missing review, blocked review, awaiting sign-off, active signature, or terminal-only history.
- A future route or UI would otherwise be tempted to read Prisma models directly.
- Existing readiness and drift deliberately treated manager sign-off as unsupported.
- Directly adding post-sign evidence to the source hash used by the stored review would risk making a valid signature drift against itself.

## After

### Strict Read Input

`getBranchDailyCloseSignOffState()` accepts only:

- trusted operating access context;
- one bounded location ID;
- one strict `YYYY-MM-DD` business date;
- optional valid evaluation time.

The evaluation time is used to reject future review, signature, invalidation-summary, creation, and update evidence. Durable sign-off state is not assigned an artificial snapshot max age: an old valid signature remains valid history until a separately controlled revocation or supersession changes its lifecycle.

### Access Before Evidence

The order is fixed:

1. Normalize input.
2. Resolve operating access and its existing audit evidence.
3. Reassert tenant and actor identity.
4. Require tenant-wide authority or an exact, internally consistent managed-location scope containing the requested location.
5. Read and reassert one active location belonging to the tenant.
6. Open one repeatable-read transaction for review and sign-off lifecycle evidence.

Denied account or unmanaged-location requests fail before location, review, or sign-off records are read.

### Review Projection

The review projection exposes only:

- run ID and `IN_REVIEW`/`BLOCKED` status;
- readiness state and evidence coverage state;
- supported, unsupported, and blocker counts;
- evidence observation time;
- readiness source hash and evidence hash;
- maker ID and review start time.

The service reasserts tenant, location, business date, maker tenant, valid hashes and dates, nonnegative counts, exact coverage/count consistency, and the review writer's status/readiness mapping:

- `READY_FOR_REVIEW` or `NO_ACTIVITY` maps to `IN_REVIEW`;
- `ACTION_REQUIRED` or `UNAVAILABLE` maps to `BLOCKED`.

No evidence manifest or financial detail is loaded.

### Active Signature Projection

The transaction queries at most two active rows so duplicate active evidence can be detected even though the database normally prevents it. Lifecycle aggregation independently confirms the active count.

An active signature is accepted only when:

- tenant and run match the review;
- status is `ACTIVE` and active key equals the run ID;
- signed readiness and evidence hashes exactly equal the review;
- signed evidence observation time exactly equals the review;
- signer is nonempty, belongs to the tenant, and differs from the review maker;
- assurance is exactly `L1`;
- fresh authentication is at or before sign time and no more than 300 seconds old;
- evidence and review precede sign time;
- sign, create, and update times are not in the future;
- active rows contain no invalidation evidence.

The result exposes only signature ID, exact signed evidence, signer/time, and safe L1/fresh-auth time.

### Terminal History

Lifecycle aggregation returns:

- total count;
- active count as `0` or `1`;
- revoked count;
- superseded count;
- terminal count;
- latest terminal invalidation time.

Terminal rows require a valid nonfuture aggregate invalidation time. Terminal-only history leaves an `IN_REVIEW` review in `AWAITING_SIGN_OFF`; it does not resurrect a revoked or superseded signature.

### Explicit States

| State | Review | Active signature | Meaning |
|---|---|---|---|
| `NOT_STARTED` | absent | not queried | no stored review exists for the authorized branch/day |
| `BLOCKED` | `BLOCKED` | prohibited | review evidence requires action or is unavailable |
| `AWAITING_SIGN_OFF` | `IN_REVIEW` | absent | review exists but no active signature exists |
| `SIGNED` | `IN_REVIEW` | one exact row | one valid maker-checker signature exists |

Impossible combinations do not become a fifth normal state. They throw a safe forbidden error so downstream callers cannot accidentally treat inconsistent evidence as signable or signed.

### Self-Drift Boundary

`projectionHash` hashes only the read model's review, signature, history, state, and frozen boundary controls. It excludes viewer identity and evaluation time, so authorized viewers see the same business-fact hash.

The projection explicitly states:

- `projectionPurpose: SIGN_OFF_STATE_ONLY`;
- `preSignReadinessSourceHashIncludesSignOff: false`;
- `readinessPromoted: false`;
- `finalCloseClaimed: false`.

The service has no runtime or type dependency on end-of-day readiness or review drift. Existing pre-sign source hashes and command replay behavior therefore remain untouched.

## Files

Added for Slice 13:

- `services/end-of-day-close/branch-daily-close-sign-off-state-contracts.ts`
- `services/end-of-day-close/branch-daily-close-sign-off-state.service.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-sign-off-state.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_STATE_READ_MODEL_REPORT_2026-07-18.md`

Updated for Slice 13:

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

No existing readiness, drift, review, sign-off command, action, route, page, component, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 13.

## Verification

Focused Slice 13 suite:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off-state.service.test.ts
```

Result: 1 suite passed, 33 tests passed, 0 failed.

Required state/command/drift/readiness regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off-state.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts
```

Result: 4 suites passed, 92 tests passed, 0 failed.

Complete end-of-day-close regression:

```text
npm test -- --runInBand services/end-of-day-close
```

Result: 8 suites passed, 144 tests passed, 0 failed.

Additional checks:

- focused ESLint for contract, service, and tests: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed after final consistency hardening;
- `npx prisma validate`: schema valid;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- action/route/component reference scan: 0 public-surface references;
- private-field, credential, readiness/drift dependency, delivery, and mutation scan: 0 forbidden markers;
- focused file trailing-whitespace scan: 0 findings;
- temporary Slice 13 artifacts: 0.

The role-cockpit gate applies to the Daily Digest supporting surface, not every Stoquify role surface. It remains supporting evidence rather than broad Phase 2 certification.

## Slice 13 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Strict access/location/day/time input | typed contract, normalizer, malformed-input tests | passed |
| Access before tenant records | invocation-order and denied/unmanaged tests | passed |
| Tenant/location/day review | scoped composite query and identity tests | passed |
| Explicit normal states | `NOT_STARTED`, `BLOCKED`, `AWAITING_SIGN_OFF`, `SIGNED` tests | passed |
| Exact active signature | hash/time/run/signer/assurance lifecycle checks | passed |
| Maker-checker and signer tenant | relation identity and self-approval tests | passed |
| Terminal history not active | grouped counts and terminal-only test | passed |
| Duplicate/inconsistent evidence fails closed | duplicate, cross-record, malformed, and impossible-state tests | passed |
| Self-drift separation | separate projection hash, frozen controls, dependency scan | passed |
| Data-minimized result and query | selected-field assertions and recursive redaction test | passed |
| No write or delivery behavior | source test and static scan | passed |
| Focused and regression gates | 33 focused, 92 required-regression, 144 complete-close tests | passed |

## Residual Risks

- The read model is intentionally not exposed through a product action, route, or UI.
- Existing readiness still reports manager sign-off and completion as unsupported.
- A future composition must preserve the current pre-sign source hash exactly. Changing checklist inputs after signature would break drift and replay semantics.
- Terminal history is summarized through database lifecycle aggregation; individual terminal evidence remains protected by Slice 11 SQL checks and is not returned by this projection.
- Slice 6 and Slice 11 migrations remain validated but undeployed locally, so no migrated-database integration test ran.
- Revocation and supersession still have no command or policy behavior.
- Direct privileged SQL could still mutate signed evidence; service and release gates must continue to prohibit it.
- Provider reconciliation and unlinked payment branch coverage remain incomplete.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 14 should add a **versioned branch daily-close completion composition read model only**. It should:

1. compose existing pre-sign readiness and the Slice 13 sign-off state through service APIs, not direct dashboard or Prisma truth;
2. reassert tenant, actor, location, business date, authority, review ID, and evidence identity across both results;
3. preserve the existing readiness `sourceHash`, checklist, blockers, readiness state, and drift inputs byte-for-byte as the pre-sign layer;
4. expose sign-off `projectionHash` as a separate post-review layer;
5. derive explicit completion states without feeding sign-off back into the pre-sign source hash;
6. prove that the same operational evidence has the same pre-sign source hash before and after an active signature;
7. keep command replay and stored-versus-current drift behavior unchanged;
8. report signed evidence without claiming payment reconciliation, final close, certificate issuance, or readiness promotion;
9. return a data-minimized versioned contract suitable for a later action/UI workflow;
10. add focused tests for cross-result identity mismatch, missing/blocked/awaiting/signed states, self-drift stability, redaction, and dependency boundaries;
11. add no command, server action, API route, page, component, revocation, certificate, notification, AI, or WhatsApp behavior.

Expected report: `what-next/referrals/DAILY_TRUTH_COMPLETION_COMPOSITION_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
