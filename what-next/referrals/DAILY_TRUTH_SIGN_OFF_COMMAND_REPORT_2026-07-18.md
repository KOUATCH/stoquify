# Daily Truth Sign-Off Command Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 12 - Branch daily-close sign-off service command
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 12 is complete. Stoquify now has a service-owned command that can create one controlled, active branch daily-close sign-off against the exact evidence preserved by a current, in-review branch/day run.

The command is intentionally not exposed through a server action, API route, page, or component. It first resolves tenant- and location-authorized current readiness through the existing drift service. Inside one serializable Prisma transaction it re-reads the tenant/location/day review, derives the maker only from `BranchDailyCloseRun.startedById`, reads service-owned organization module configuration, evaluates the Slice 10 critical control, handles idempotency and one-active-sign-off conflicts, writes the Slice 11 persistence record, writes control and success audits, and records a deterministic business event with an explicitly empty delivery outbox.

Missing permission, stale authentication, self-approval, and module-entitlement denial commit only a denial audit. They do not create a sign-off or business event. `NOT_STARTED`, `DRIFTED`, blocked, cross-tenant, and transaction-drifted review evidence fail closed. Persistence, success-audit, and business-event failures propagate from the same transaction so Prisma rolls back the transaction rather than returning a signed result.

The command does not promote readiness, claim final close, revoke or supersede evidence, issue a certificate, send a notification, or invoke AI or WhatsApp. Readiness continues to report manager sign-off and completion as unsupported until a separately verified read-model integration exists.

## Before

- Slice 10 defined `branch.daily-close.sign` as a critical, direct-permission action with L1/fresh-auth, maker-checker, audit, detector, and enforced dashboard entitlement controls.
- Slice 11 added append-oriented sign-off persistence with exact evidence hashes, safe authentication evidence, idempotency, and one-active-record constraints.
- `getBranchDailyCloseReviewDrift()` could compare the stored review baseline with current service-owned readiness.
- No service composed those capabilities into an executable transaction.
- Sign-off persistence was unreachable and could not be represented as a completed workflow.

## After

### Strict Command Boundary

`signBranchDailyClose()` accepts only:

- trusted operating access context;
- actor identity matching that context;
- one location;
- one strict `YYYY-MM-DD` business date;
- one bounded idempotency key;
- optional bounded correlation ID;
- safe fresh-auth time evidence;
- optional readiness freshness inputs.

The command accepts no maker identity, assurance override, evidence hash, sign time, organization override, final-close flag, raw authentication token, credential, or delivery instruction.

### Access And Evidence Order

The read/write order is fixed:

1. Normalize strict input and reject actor/context mismatch or future authentication time.
2. Call the existing drift service, which establishes operating access and current readiness before sign-off storage is trusted.
3. Require one internally consistent `CURRENT` drift result with a stored review.
4. Open one serializable Prisma transaction.
5. Re-read the review by tenant, location, and business date.
6. Require `IN_REVIEW` and exact equality with the preflight run ID, state, counts, observation time, readiness source hash, and evidence hash.
7. Read the active tenant's service-owned `requestedModules`.
8. Derive the maker from stored `startedById` and evaluate critical permission, fresh auth, maker-checker, and dashboard write entitlement.
9. Resolve idempotency and active-sign-off conflicts.
10. Write allowed control audit, active sign-off, success audit, and deterministic business event.

No caller-supplied review ID or maker can redirect the command to another run.

### Maker-Checker And Fresh Authentication

The checker is the authenticated command actor. The maker is always `BranchDailyCloseRun.startedById` from the transaction row.

The existing sensitive-action policy requires:

- direct `branch.daily-close.sign` permission;
- distinct maker and checker;
- L1 assurance evidence;
- authentication no older than 300 seconds.

Future-dated authentication evidence is rejected before the transaction. The sign-off persists only `authAssuranceLevel: L1` and `freshAuthAt`; no raw authentication material is accepted or stored.

### Entitlement And Denial Evidence

The command reads `Organization.requestedModules` inside the transaction and evaluates the enforced `dashboard` write entitlement.

Sensitive-action denials use the shared control audit writer. Module denial writes the same canonical denied audit action with a data-minimized module reason. A denied transaction returns a denial outcome so its audit commits, then the service throws the safe business or forbidden error outside the transaction. No denied path reaches sign-off lookup, creation, success audit, or business event creation.

### Idempotency And Concurrency

The request hash binds:

- command version;
- tenant, actor, location, and business date;
- stored review ID;
- signed readiness source hash;
- signed evidence hash;
- idempotency key.

Correlation ID, invocation time, and fresh-auth time are deliberately excluded so a valid replay returns the original record rather than manufacturing a different result.

An exact idempotency replay returns the original active sign-off. Reusing the key for different evidence is a conflict. A different active sign-off for the same run is a conflict. `P2002` unique races and `P2034` serializable conflicts recover only when the stored row is an exact replay; otherwise they fail closed and write a surviving conflict audit.

### Atomic Audit And Event Proof

The creation transaction contains:

- allowed critical-control audit;
- `ACTIVE` sign-off persistence;
- `BRANCH_DAILY_CLOSE_SIGNED` success audit;
- `branch.daily-close.signed` business event.

The event is deterministic, tenant/location scoped, linked to the sign-off record, and carries the exact signed evidence hash as `documentHash`. Its payload states that independent checking is required, final close is not claimed, and readiness is not promoted.

`outboxMessages` is an empty array. Slice 12 records business-event evidence but creates no email, notification, webhook, receipt, sync, report, AI, or WhatsApp delivery.

### Data-Minimized Result

The result exposes the active sign-off identity, tenant/run binding, exact signed hashes and observation time, signer/time, L1/fresh-auth time, idempotency/correlation identifiers, and record timestamps.

It does not expose request hashes, organization configuration, policy detector inputs, raw auth material, event internals, audit internals, customer/employee data, monetary totals, or credentials. Before returning either a creation or replay, the mapper independently reasserts tenant, run, signer, evidence hashes, idempotency, request hash, assurance, lifecycle, and timestamp integrity.

## Files

Added for Slice 12:

- `services/end-of-day-close/branch-daily-close-sign-off.service.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_REPORT_2026-07-18.md`

Updated for Slice 12:

- `services/end-of-day-close/branch-daily-close-sign-off-contracts.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

No server action, API route, page, component, readiness service, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 12.

## Verification

Focused command suite:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts
```

Result: 1 suite passed, 20 tests passed, 0 failed.

Required Slice 12 regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off-control.test.ts services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts services/events/__tests__/business-event.service.test.ts
```

Result: 6 suites passed, 85 tests passed, 0 failed.

Complete end-of-day-close regression:

```text
npm test -- --runInBand services/end-of-day-close
```

Result: 7 suites passed, 111 tests passed, 0 failed.

Additional checks:

- focused ESLint for command, contract, and tests: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed;
- `npx prisma validate`: schema valid;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- route/action/component import scan for the command: 0 public-surface references;
- raw-auth, credential, notification, WhatsApp, certificate, and review-mutation marker scan: 0 forbidden markers;
- event boundary: `outboxMessages: []`;
- finalization boundary: `finalCloseClaimed: false`;
- readiness boundary: `readinessPromoted: false`.

The role-cockpit gate applies to the Daily Digest supporting surface, not every Stoquify role surface. It remains supporting release evidence rather than broad Phase 2 certification.

## Slice 12 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Strict tenant/actor/location/day input | command normalizer and actor/context check | passed |
| Access before writable evidence | drift preflight invocation order test | passed |
| Tenant/location/day `IN_REVIEW` run | composite transaction lookup and fail-closed tests | passed |
| Maker from stored run | control input uses transaction `startedById`; no maker input field | passed |
| `CURRENT` drift only | state and internal-consistency checks before transaction | passed |
| Critical control composition | Slice 10 evaluator with direct permission, fresh auth, maker-checker, entitlement | passed |
| Replay and mismatch handling | exact request hash, replay test, mismatch conflict audit | passed |
| Concurrent active safety | active-key lookup plus `P2002`/`P2034` recovery tests | passed |
| One atomic write boundary | serializable transaction contains sign-off, two audits, and event | passed |
| Exact evidence persistence | create-data and result assertions for hashes and observation time | passed |
| Failure propagation/rollback structure | persistence, success-audit, and event failure tests from one transaction | passed |
| Denial audit without sign-off | permission, stale-auth, self-approval, and module-denial tests | passed |
| Tenant-safe result mapping | cross-tenant replay and transaction-row tests | passed |
| No product or delivery surface | static import/boundary scans | passed |
| Focused and regression gates | 20 focused, 85 required-regression, 111 complete-close tests | passed |

## Residual Risks

- The service command remains intentionally unreachable from a server action, route, or UI. This is a verified backend capability, not a completed user workflow.
- Readiness still reports sign-off and completion as unsupported. It must not be described as closed or signed in the product yet.
- A future readiness integration must keep the pre-sign evidence baseline separate from the sign-off projection. Including the new signature in the source hash being compared to the original review would create self-induced drift and break safe replay.
- Physical database rollback was not integration-tested against a migrated database in this run. Atomicity is established by one Prisma transaction and failure-path unit evidence; Slice 6 and Slice 11 migrations remain undeployed locally.
- Revocation and supersession remain persistence semantics only; no policy or command implements them.
- Direct privileged SQL could still mutate signed fields. Service and release gates must continue to prohibit such writes.
- Provider reconciliation and unlinked payment branch coverage remain incomplete.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 13 should add a **service-owned branch daily-close sign-off state read model only**. It should:

1. accept trusted operating access, one location, and one strict business date;
2. establish tenant/location authorization before reading the review or sign-off;
3. return `NOT_STARTED`, `AWAITING_SIGN_OFF`, `SIGNED`, or a fail-closed inconsistent state from service-owned records;
4. read the review and at most one active sign-off through tenant/run binding;
5. reassert active lifecycle, exact signed hashes, signer/time, and L1/fresh-auth evidence before reporting `SIGNED`;
6. preserve terminal history without treating revoked or superseded rows as active;
7. keep sign-off projection separate from the pre-sign readiness source hash so the signature cannot create self-drift;
8. expose a data-minimized typed result suitable for later readiness and action-surface composition;
9. add focused tests for tenant/location denial, missing review, awaiting state, exact signed state, cross-tenant rows, hash mismatch, terminal-only history, duplicate/inconsistent active evidence, and redaction;
10. add no server action, API route, page, component, readiness promotion, revocation, certificate, delivery, AI, or WhatsApp behavior.

Expected report: `what-next/referrals/DAILY_TRUTH_SIGN_OFF_STATE_READ_MODEL_REPORT_<date>.md`.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
