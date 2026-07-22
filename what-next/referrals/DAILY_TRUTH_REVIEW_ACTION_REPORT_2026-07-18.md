# Daily Truth Review Action Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 16 - Dedicated review-write permission and protected start-review action
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 16 is complete. Stoquify now has a dedicated `branch.daily-close.review` permission and one protected action that starts a durable branch daily-close review through the existing service-owned command.

The permission is classified as high risk, cannot be satisfied by wildcard authority, and is assigned by default only to admin and manager roles. Staff, cashier, and viewer defaults retain `dashboard.read` but do not receive review-write authority. The existing critical `branch.daily-close.sign` permission remains separate.

The action runs behind allowed-write audit evidence and an enforced dashboard module write gate. Tenant and actor come only from the protected server context. The action accepts branch, business date, idempotency key, and optional snapshot age; caller-supplied identity, clock, and correlation fields are not forwarded. The service remains responsible for readiness refresh, operating scope, data-minimized evidence, idempotency, one-review-per-branch/day, atomic audit/event persistence, and conflict handling.

No sign-off action, revocation action, API route, page, component, notification, certificate, AI, or WhatsApp behavior was added.

## Before

- Review creation existed only as `startBranchDailyCloseReview()` in the service layer.
- The only branch-close-specific permission was the critical sign-off permission.
- `dashboard.read` could not safely protect review creation because it is assigned to staff, cashier, and viewer defaults.
- No protected review-write action or product caller existed.

## After

### Least-Privilege Permission

`branch.daily-close.review` is now part of the canonical branch daily-close permission group. Because admin and manager default roles spread that group, both receive review authority. Staff, cashier, and viewer role lists do not spread the group and focused tests prove they do not receive it.

The RBAC compatibility registry classifies review authority as `high` risk. Therefore:

- wildcard `*` does not satisfy it;
- an explicit review grant satisfies it;
- `dashboard.read` does not imply it;
- `branch.daily-close.sign` does not imply it.

Review and sign-off remain independent permissions suitable for later separation of duties.

### Protected Write Action

`startBranchDailyCloseReviewAction()` is registered with:

- permission: `branch.daily-close.review`;
- audit resource: `BranchDailyCloseRun`;
- allowed-write audit: `true`;
- module: `dashboard`;
- surface type: `action`;
- access intent: `write`;
- module mode: `enforce`;
- module audit: `true`.

The generated module inventory maps the action to `dashboard`, detects `protect`, records the review permission, reports no dependency gaps, and produces no Slice 16 finding.

### Narrow Command Input

The action accepts only:

- one nonblank location ID, trimmed and limited to 240 characters;
- one strict, real `YYYY-MM-DD` calendar date;
- one nonblank idempotency key, trimmed and limited to 200 characters;
- optional positive integer `maxAgeMinutes`, capped at 31 days.

It does not accept a caller-controlled actor, organization, evaluation time, or correlation ID. `actorId` is set to the protected context user. The service owns the command clock and generates the correlation ID.

### Service-Owned Command Truth

The action calls only `startBranchDailyCloseReview()`. It does not import Prisma, write evidence directly, rebuild the evidence manifest, derive status, or create business events.

Created and replayed service results pass through unchanged. Existing service tests continue to prove:

- branch and tenant operating scope;
- actor identity reassertion;
- current capture-aware readiness;
- deterministic request and evidence hashes;
- exact idempotent replay;
- changed-evidence conflict rejection;
- one review per organization/location/day;
- atomic run, audit, and business-event persistence;
- no partial success when event persistence fails;
- data-minimized non-final evidence.

## Files

Updated for Slice 16:

- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Added for Slice 16:

- `actions/end-of-day-close/branch-daily-close-review.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-review.actions.test.ts`
- `config/__tests__/branch-daily-close-permissions.test.ts`
- `lib/security/__tests__/branch-daily-close-review-permission.test.ts`
- `what-next/referrals/DAILY_TRUTH_REVIEW_ACTION_REPORT_2026-07-18.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

No existing close service, sign-off control, action, route, page, component, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 16.

## Verification

Focused Slice 16 suites:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-review.actions.test.ts config/__tests__/branch-daily-close-permissions.test.ts lib/security/__tests__/branch-daily-close-review-permission.test.ts
```

Result: 3 suites passed, 27 tests passed, 0 failed.

Required action/service/default-role/RBAC regression set:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-review.actions.test.ts services/end-of-day-close/__tests__/end-of-day-close-review.service.test.ts config/__tests__/branch-daily-close-permissions.test.ts config/__tests__/sidebar.test.ts lib/security/__tests__/branch-daily-close-review-permission.test.ts lib/security/__tests__/rbac-permissions.test.ts
```

Result: 6 suites passed, 81 tests passed, 0 failed.

Complete action and end-of-day-close regression:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__ services/end-of-day-close/__tests__
```

Result: 11 suites passed, 212 tests passed, 0 failed.

Additional checks:

- `npm run typecheck`: passed on the second run with an expanded timeout; the first run timed out without compiler diagnostics;
- focused ESLint: 0 errors and one pre-existing `import/no-anonymous-default-export` warning at `config/permissions.ts:567`;
- `npm run service:boundary:fail`: passed with 0 active violations;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- module inventory record: mapped to `dashboard`, protected by `branch.daily-close.review`, no dependency gaps or Slice 16 findings;
- route/page/component/hook caller scan: 0 product callers;
- focused direct-database, direct-mutation, sign-off/revocation, delivery, AI, and WhatsApp scan: 0 forbidden dependencies;
- focused file trailing-whitespace scan: 0 findings;
- temporary Slice 16 artifacts: 0.

### Repository Module Ratchet

`npm run module:surface:fail` remains red with the same 10 unrelated HRIS, security, sidebar, and analytics findings recorded in Slice 15. The new review action introduces no finding and the unrelated gaps were not changed or suppressed.

## Slice 16 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Canonical review permission | permission group and known-permission test | passed |
| Admin/manager default only | parameterized role tests | passed |
| Wildcard denied, explicit grant required | high-risk RBAC tests | passed |
| Protected audited enforced write | exact protection-options test | passed |
| Trusted tenant and actor | context propagation and hostile-input test | passed |
| Server-owned clock/correlation | omitted-field assertions | passed |
| Bounded command input | parameterized validation tests | passed |
| Exact created/replayed result | object-identity and replay tests | passed |
| Preserve service idempotency/audit/event controls | inherited review-service suite | passed |
| No sign-off or product UI | source test and static scans | passed |
| Service ownership | service-boundary fail gate, 0 active violations | passed |
| Focused and complete regression | 27 focused, 81 required, 212 complete tests | passed |

## Residual Risks

- No page or component consumes the review action or completion read action.
- Sign-off remains service-only.
- Admin and manager defaults currently receive both review and sign permissions. Maker-checker remains enforced by service identity, but customized role separation is still advisable.
- The review action depends on `dashboard.read` also being present in the protected context because the underlying operating-readiness service requires it; current admin and manager defaults include both permissions.
- The repository-wide module-surface ratchet remains red on 10 unrelated findings.
- Slice 6 and Slice 11 migrations remain validated but undeployed locally.
- Revocation and supersession remain persistence semantics only.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 17 should add a **protected critical branch daily-close sign-off action only**. It should:

1. protect the action with existing `branch.daily-close.sign`, allowed-write audit evidence, `freshAuth: { maxAgeSeconds: 300 }`, and dashboard module `write` enforcement with module audit;
2. accept only bounded location ID, strict business date, bounded idempotency key, and optional positive max-age input;
3. derive tenant, signer, and actor exclusively from the protected context;
4. derive `lastAuthAt` only from `ctx.freshAuth.lastAuthAt` and never accept caller auth time, assurance, clock, or correlation ID;
5. fail closed if protected fresh-auth evidence is unexpectedly absent;
6. call only `signBranchDailyClose()` and preserve created/replayed results unchanged;
7. preserve the service's critical control policy, module enforcement, maker-checker, signer tenant, drift refresh, exact evidence binding, idempotency, atomic audit/event persistence, and data minimization through inherited tests;
8. add focused tests for protection metadata, trusted context/auth propagation, hostile identity/auth/control fields, validation, created/replayed preservation, missing fresh auth, and denial propagation;
9. add no revocation action, supersession action, API route, page, component, notification, certificate, AI, or WhatsApp behavior.

Expected implementation files:

- `actions/end-of-day-close/branch-daily-close-sign-off.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-sign-off.actions.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_ACTION_REPORT_<date>.md`

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
