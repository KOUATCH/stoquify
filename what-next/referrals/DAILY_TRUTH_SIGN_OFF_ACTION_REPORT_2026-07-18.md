# Daily Truth Sign-Off Action Report

Generated: 2026-07-18
Program: Stoquify Referral-Worthy Execution Program
Phase: 2 - Daily Truth Dashboard And Action Center
Slice: 17 - Protected critical branch daily-close sign-off action
Primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Status: complete

## Executive Result

Phase 2 / Slice 17 is complete. Stoquify now has one protected critical server action that signs a branch daily-close review through the existing service-owned command.

The action requires explicit `branch.daily-close.sign` authority, allowed-write audit evidence, 300-second fresh authentication, and enforced dashboard module write access with module audit. It reasserts that fresh-auth claims match the currently protected actor and tenant before invoking the service.

Only verified `lastAuthAt` crosses the fresh-auth boundary. The service receives a newly constructed operating access context containing tenant, user, roles, permissions, and super-user state. Raw session ID, session token, membership, assurance method, assurance claims, and module claims are not forwarded.

The action accepts only branch, business date, idempotency key, and optional snapshot age. Caller-supplied tenant, actor, signer, authentication time, assurance level, clock, correlation, and token fields cannot change the command. Missing or cross-context protected fresh-auth evidence fails before the service is called.

No revocation action, supersession action, API route, page, component, notification, certificate, AI, or WhatsApp behavior was added.

## Before

- Critical sign-off existed only as `signBranchDailyClose()` in the service layer.
- The critical permission and sensitive-action policy existed, but no protected action bound an authenticated session to the service command.
- A future UI had no safe way to supply fresh-auth evidence without risking caller-controlled timestamps or raw session leakage.
- Completion and review creation had protected actions, while the final signature remained unreachable.

## After

### Critical Protection Metadata

`signBranchDailyCloseAction()` is registered with:

- permission: `branch.daily-close.sign`;
- audit resource: `BranchDailyCloseSignOff`;
- allowed-write audit: `true`;
- fresh-auth maximum age: 300 seconds;
- module: `dashboard`;
- surface type: `action`;
- access intent: `write`;
- module mode: `enforce`;
- module audit: `true`.

The 300-second action setting is sourced from `BRANCH_DAILY_CLOSE_SIGN_OFF_PERSISTENCE`, the same frozen persistence contract used by the service.

### Fresh-Auth Identity Binding

Before invoking the command, the action requires:

- protected fresh-auth evidence to exist;
- fresh-auth user ID to equal the protected user;
- fresh-auth tenant ID to equal the protected tenant;
- assurance organization to equal the protected tenant;
- assurance level to meet password/L1 minimum;
- numeric claims timestamp to equal the verified `Date` timestamp.

Any mismatch throws `FreshAuthRequiredError`. Production `protect()` converts that error to the established safe `FRESH_AUTH_REQUIRED` action response.

The underlying service independently checks that authentication is not future-dated and remains within its 300-second control window. The action does not replace service enforcement.

### Sanitized Service Context

The action reconstructs `OperatingAccessContext` from five allowed fields:

- `orgId`;
- `userId`;
- `roles`;
- `permissions`;
- `isSuperUser`.

It passes `actorId` from the protected user and `lastAuthAt` from protected fresh auth. Tests serialize the service input and prove that raw session and assurance claim material is absent.

### Narrow Command Input

The caller can provide only:

- one nonblank location ID, trimmed and limited to 240 characters;
- one strict, real `YYYY-MM-DD` calendar date;
- one nonblank idempotency key, trimmed and limited to 200 characters;
- optional positive integer `maxAgeMinutes`, capped at 31 days.

The action owns neither command time nor correlation ID. Both remain service-owned.

### Service-Owned Sign-Off Truth

The action delegates only to `signBranchDailyClose()`. Created and replayed results pass through unchanged.

Inherited service and control tests continue to prove:

- canonical critical permission and sensitive-action policy;
- enforced module entitlement;
- current review and drift refresh;
- exact readiness/evidence hash binding;
- maker-checker and signer-tenant separation;
- fresh-auth age and future-time checks;
- one active sign-off per review;
- deterministic idempotency and conflict handling;
- atomic sign-off, audit, and business-event persistence;
- data-minimized result without request hash;
- no self-induced readiness drift.

## Files

Added for Slice 17:

- `actions/end-of-day-close/branch-daily-close-sign-off.actions.ts`
- `actions/end-of-day-close/__tests__/branch-daily-close-sign-off.actions.test.ts`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_ACTION_REPORT_2026-07-18.md`

Updated for Slice 17:

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Generated supporting evidence refreshed:

- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

No existing service, control policy, permission registry, action, route, page, component, Prisma schema, migration, notification, certificate, AI, WhatsApp, or unrelated application file was changed by Slice 17.

## Verification

Focused Slice 17 suite:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-sign-off.actions.test.ts
```

Result: 1 suite passed, 25 tests passed, 0 failed.

The first test run exposed Jest loading `better-auth` ESM through the auth-session module. The focused test now isolates that infrastructure module with a faithful error-class and assurance-level mock; product code was not changed to accommodate the test harness.

Required action/service/control/RBAC regression set:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__/branch-daily-close-sign-off.actions.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts services/end-of-day-close/__tests__/branch-daily-close-sign-off-control.test.ts lib/security/__tests__/rbac-permissions.test.ts
```

Result: 4 suites passed, 67 tests passed, 0 failed.

Complete action and end-of-day-close regression:

```text
npm test -- --runInBand actions/end-of-day-close/__tests__ services/end-of-day-close/__tests__
```

Result: 12 suites passed, 237 tests passed, 0 failed.

Additional checks:

- focused ESLint: passed with 0 errors and 0 warnings;
- `npm run typecheck`: passed;
- `npm run service:boundary:fail`: passed with 0 active violations;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- module inventory record: mapped to `dashboard`, protected by `branch.daily-close.sign`, no dependency gaps or Slice 17 findings;
- route/page/component/hook caller scan: 0 product callers;
- focused direct-database, direct-mutation, revocation/supersession, raw-claim forwarding, delivery, AI, and WhatsApp scan: 0 forbidden dependencies;
- focused file trailing-whitespace scan: 0 findings;
- temporary Slice 17 artifacts: 0.

### Repository Module Ratchet

`npm run module:surface:fail` remains red with the same 10 unrelated HRIS, security, sidebar, and analytics findings recorded in Slices 15 and 16. The new sign-off action introduces no finding and the unrelated gaps were not changed or suppressed.

## Slice 17 Gate Audit

| Requirement | Authoritative evidence | Result |
|---|---|---|
| Critical permission and 300-second fresh auth | exact protection-options test | passed |
| Audited enforced module write | exact protection-options test | passed |
| Bounded command input | parameterized validation tests | passed |
| Protected tenant/actor/signer | sanitized context assertions | passed |
| Protected auth time only | hostile input and exact timestamp test | passed |
| Cross-context auth fails closed | missing and five mismatch tests | passed |
| Raw session claims not forwarded | serialized service-input redaction test | passed |
| Exact created/replayed result | object-identity and replay tests | passed |
| Preserve critical service controls | inherited service/control regression | passed |
| No revocation or UI behavior | source test and static scans | passed |
| Service ownership | service-boundary fail gate, 0 active violations | passed |
| Focused and complete regression | 25 focused, 67 required, 237 complete tests | passed |

## Residual Risks

- No page or component consumes the completion, review, or sign-off actions.
- The product still lacks a visible step-up and sign-off workflow despite the underlying password step-up action existing.
- Admin and manager defaults hold both review and sign permissions; service maker-checker blocks same-actor approval, while customized role separation remains advisable.
- The repository-wide module-surface ratchet remains red on 10 unrelated findings.
- Slice 6 and Slice 11 migrations remain validated but undeployed locally.
- Revocation and supersession remain persistence semantics only.
- The close contract still uses UTC despite organization timezone availability.

## Next Slice Gate

Phase 2 / Slice 18 should add a **managed-location read-only branch daily-close workspace**. It should:

1. add a localized dashboard route under the Manager Action Center and a restrained workspace component using existing dashboard design tokens;
2. provide a branch entry link only from authorized managed-location bundles, carrying location identity but no business evidence;
3. require an explicit valid business date before loading completion so the UI does not invent an organization timezone;
4. load data only through `getBranchDailyCloseCompletionAction()`, never direct Prisma, readiness, sign-off, or composition service imports;
5. render authorized location identity, version, completion state, evidence alignment, readiness state, supported/unsupported counts, blocker count, and safe signing metadata;
6. keep unsupported payment reconciliation and final close visibly unclaimed;
7. render safe empty, validation, permission, scope, unavailable, not-started, blocked, awaiting, signed, and drifted states without fabricating values;
8. expose no review, sign-off, revocation, supersession, step-up, notification, certificate, AI, or WhatsApp command in this slice;
9. add focused route/component tests, localized entry-link tests, mobile/desktop screenshots, accessibility checks, and route-smoke evidence.

Expected implementation areas:

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/`
- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
- `components/manager-action-center/ManagerLocationActionCenterDashboard.tsx`
- focused route and component tests
- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_REPORT_<date>.md`

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `/stoquify-referral-war-room` for evidence review.
