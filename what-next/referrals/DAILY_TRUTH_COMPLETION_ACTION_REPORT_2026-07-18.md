# Daily Truth Completion Action Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 15 - Protected read-only branch daily-close completion action
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 15 is complete. Stoquify now exposes the versioned branch daily-close completion composition through one protected server action. The action is a thin validation and orchestration boundary: it derives tenant and actor from the protected server context, accepts only branch, business date, and optional snapshot age, and returns the service result without flattening or reconstructing evidence.

The action uses `dashboard.read`, allowed-read audit evidence, and dashboard module entitlement metadata in observe mode. The existing service remains responsible for operating scope, tenant/location evidence, readiness, sign-off state, drift interpretation, redaction, and completion semantics.

Caller-supplied organization, actor, user, correlation, and evaluation-clock fields are never forwarded to the service. The default `protect()` tenant guard rejects hostile tenant identifiers before the handler in production; the action parser strips all unknown fields before service invocation. The evaluation clock therefore remains server-owned.

No review command, sign-off command, revocation command, API route, page, component, notification, certificate, AI, or WhatsApp behavior was added.

## Before

- `getBranchDailyCloseCompletion()` was service-owned and regression-verified but unreachable through a protected action.
- A future UI would otherwise be tempted to import the service directly or reconstruct completion from independent readiness and sign-off calls.
- No `actions/end-of-day-close/` boundary existed.
- The versioned result had no public server-action envelope carrying RBAC, audit, and module metadata.

## After

### Narrow Action Input

`getBranchDailyCloseCompletionAction()` accepts:

- one nonblank location ID, trimmed and limited to 240 characters;
- one strict, real `YYYY-MM-DD` calendar date;
- optional positive integer `maxAgeMinutes`, capped at 31 days.

It does not accept a caller-controlled evaluation time. Missing, blank, oversized, malformed, impossible-date, zero-age, fractional-age, and oversized-age inputs fail before the service is called.

### Trusted Identity

The action passes `ctx` from `protect()` as `accessContext`. It does not read tenant or actor identity from input and does not forward unknown input fields.

The protected action retains the default trusted-tenant guard. A caller-supplied `organizationId` or `orgId` must therefore match the authenticated tenant before the handler can run in production. Other hostile identity fields are removed by the Zod object parser and cannot change service scope.

### Protection Metadata

The action is registered with:

- permission: `dashboard.read`;
- audit resource: `BranchDailyCloseCompletion`;
- allowed-read audit: `true`;
- module: `dashboard`;
- surface: `actions/end-of-day-close/branch-daily-close-completion.actions.ts`;
- access intent: `read`;
- module mode: `observe`.

The generated module inventory classifies the action as:

```text
moduleApplicability: required
moduleSlug: dashboard
permission: dashboard.read
guard: protect
dependencyGaps: []
classification: mapped, enforcement candidate
```

### Exact Result Preservation

The action returns the exact `BranchDailyCloseCompletionResult` object from the service inside the standard protected-action response. Tests verify referential preservation of:

- the complete versioned result;
- `preSignReadiness`;
- `postReviewSignOffState`.

The action does not recalculate state, hashes, controls, evidence alignment, or completion satisfaction.

## Files

Added for Slice 15:

- `actions/end-of-day-close/branch-daily-close-completion.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-completion.actions.test.ts`
- `what-next/referrals/DAILY_TRUTH_COMPLETION_ACTION_REPORT_2026-07-18.md`

Updated for Slice 15:

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

No existing close service, command, action, route, page, component, permission registry, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 15.

## Verification

Focused Slice 15 suite:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-completion.actions.test.ts
```

Result: 1 suite passed, 15 tests passed, 0 failed.

Required action/composition/state/command/drift/readiness regression set:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-completion.actions.test.ts services/end-of-day-close/__tests__/branch-daily-close-completion.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off-state.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-review-drift.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts
```

Result: 6 suites passed, 141 tests passed, 0 failed.

Complete action and end-of-day-close regression:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__ services/end-of-day-close/__tests__
```

Result: 10 suites passed, 193 tests passed, 0 failed.

Additional checks:

- focused ESLint for action and tests: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed;
- `npm run service:boundary:fail`: passed with 0 active violations;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- module inventory record for the Slice 15 action: mapped to `dashboard`, protected by `dashboard.read`, no dependency gaps;
- route/page/component/hook caller scan: 0 product callers;
- focused direct-database, mutation, write-command, delivery, AI, and WhatsApp scan: 0 forbidden dependencies;
- focused file trailing-whitespace scan: 0 findings;
- temporary Slice 15 artifacts: 0.

### Repository Module Ratchet

`npm run module:surface:fail` did not pass. It found 10 new repository-wide gaps, none belonging to Slice 15:

- six unmapped HRIS actions;
- an unmapped and permissionless step-up-auth action;
- an unknown `hris` sidebar module slug;
- one permissionless analytics financial-report action.

The generated inventory proves the new completion action itself is correctly mapped and protected. The unrelated module-ratchet findings remain visible in the refreshed inventory and were not changed or suppressed by this slice.

## Slice 15 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Invoke the completion service only | action source and service mock | passed |
| RBAC, audit, and module metadata | exact protection-options test | passed |
| Trusted tenant and actor | protected context propagation and hostile-field test | passed |
| Bounded branch/day/age input | parameterized validation tests | passed |
| Preserve versioned source layers | object-identity tests | passed |
| Denial yields no partial evidence | service-denial test and protected envelope | passed |
| No write command or product UI | source test and static scans | passed |
| Service ownership | service-boundary fail gate, 0 active violations | passed |
| Module classification | generated Slice 15 inventory record | passed |
| Focused and inherited regression | 15 focused, 141 required, 193 complete tests | passed |

## Residual Risks

- No page or component consumes the read action yet.
- Review creation and sign-off remain service-only.
- `dashboard.read` is intentionally sufficient only for this read action. It is assigned to staff, cashier, and viewer roles, so it must not protect future review or sign-off writes.
- The module action is in observe mode, matching current dashboard action conventions; entitlement is recorded but not enforced by this adapter.
- The repository-wide module-surface ratchet remains red on 10 unrelated findings.
- Slice 6 and Slice 11 migrations remain validated but undeployed locally.
- Revocation and supersession remain persistence semantics only.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 16 should add a **dedicated branch daily-close review-write permission and protected start-review action only**. It should:

1. add `branch.daily-close.review` to the canonical permission registries and assign it only to intended admin/manager defaults, never staff, cashier, or viewer;
2. protect the action with that permission, allowed-write audit evidence, dashboard module `write` intent, and `enforce` mode;
3. accept only bounded location ID, strict business date, bounded idempotency key, and optional positive max-age input;
4. derive tenant and actor exclusively from the protected context and keep the evaluation clock and correlation ID server-owned;
5. call only `startBranchDailyCloseReview()` and preserve its created/replayed result without reconstructing evidence;
6. preserve deterministic idempotency, one-review-per-branch/day, atomic audit/event behavior, location scope, and data minimization through inherited service tests;
7. add focused tests for permission metadata, default-role assignment, hostile identity/clock/correlation fields, trusted context, input rejection, exact result preservation, replay, and denial propagation;
8. add no sign-off action, revocation action, API route, page, component, notification, certificate, AI, or WhatsApp behavior.

Expected implementation files:

- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- focused permission tests already colocated under `config/__tests__/` and `lib/security/__tests__/`
- `actions/end-of-day-close/branch-daily-close-review.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-review.actions.test.ts`
- `what-next/referrals/DAILY_TRUTH_REVIEW_ACTION_REPORT_<date>.md`

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
