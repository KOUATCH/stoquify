# Daily Truth Review Command UI Report

Generated: 2026-07-18  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 2 - Daily Truth Dashboard And Action Center  
Slice: 19 - Permission-aware branch daily-close review-start product command  
Primary skill: `stoquify-daily-truth-command-center`

## Decision

Slice 19 is complete.

Stoquify now exposes one controlled review-start command for a branch daily close only when the protected completion state is `NOT_STARTED` and the current server-resolved RBAC context explicitly grants `branch.daily-close.review`. The command calls only the protected review action, remains non-optimistic, and refreshes the protected completion read after a server-confirmed creation or idempotent replay.

Phase 2 remains active. The next slice should implement the controlled critical sign-off workflow, including password step-up and maker-checker behavior, without adding revocation, supersession, notifications, certificates, AI, or WhatsApp.

## Before And After

### Before

- `startBranchDailyCloseReviewAction()` existed with service-owned identity, evidence, status, persistence, audit, and event controls, but had no product caller.
- The daily-close page discarded its trusted RBAC context after the `dashboard.read` guard.
- The workspace rendered `NOT_STARTED` as read-only truth and could not begin a durable review.
- No authenticated fixture proved the difference between review-permitted and read-only users for the same tenant, location, and completion state.

### After

- The page derives `branch.daily-close.review` capability from the trusted guarded context with `canUsePermission()`.
- Capability is passed only in the server-created workspace model; query parameters and client input cannot grant it.
- The workspace renders the command only for `NOT_STARTED` plus explicit capability.
- The client sends only `locationId`, explicit `businessDate`, and one bounded idempotency key per attempt to `startBranchDailyCloseReviewAction()`.
- Creation and replay are treated as server-confirmed success and trigger `router.refresh()`.
- Safe retry reuses the same key; a new page attempt receives a new key.
- Permission or managed-location changes refresh capability without claiming success.
- Double submission is synchronously blocked and the completion state is never mutated in the browser.
- Authenticated evidence proves read-only desktop, permitted desktop, and permitted mobile states against the same E2E tenant and location.

## Implementation

### Server-Derived Capability

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx`
  - Retains the trusted result of `requirePermission("dashboard.read")`.
  - Evaluates `canUsePermission(ctx, "branch.daily-close.review")` only after the completion action succeeds.
  - Does not evaluate review capability for denied or failed completion reads.
  - Accepts no capability, actor, tenant, status, evidence, clock, or correlation value from the query string.

### Review Command

- `components/manager-action-center/BranchDailyCloseReviewCommand.tsx`
  - Calls only `startBranchDailyCloseReviewAction()`.
  - Generates a bounded `daily-close-review-ui:<nonce>` idempotency key lazily on the first click.
  - Retains that key across safe retry and blocks duplicate in-flight submission.
  - Presents explicit pending, created, replayed, access-change, and safe failure states in English and French.
  - Displays a safe correlation reference when the protected action returns one.
  - Refreshes protected truth after creation, replay, or an access/scope change.
  - Contains no direct Prisma, service, sign-off, step-up, revocation, supersession, notification, certificate, AI, or WhatsApp dependency.

### Workspace Integration

- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
  - Adds `canStartReview` to the server-created `READY` model.
  - Renders the command only when `canStartReview` is true and completion state is exactly `NOT_STARTED`.
  - Keeps `BLOCKED`, `AWAITING_SIGN_OFF`, `SIGNED`, and `EVIDENCE_DRIFTED` read-only.

## Trust Boundaries

| Boundary | Result |
|---|---|
| Service-owned truth | Preserved; review readiness, status, evidence, hashes, persistence, audit, and event remain in the protected action/service chain. |
| Tenant and actor | Preserved; neither value is accepted from client or query input. |
| Branch scope | Preserved; the protected action re-resolves current operating scope for the location. |
| RBAC | Page capability comes from the guarded server context; action independently requires explicit high-risk `branch.daily-close.review`. |
| Module entitlement | Page maps to `dashboard.read`; review action maps to enforced `dashboard` write access with no relevant module finding. |
| Idempotency | One bounded key per UI attempt, retained for safe retry; service remains authoritative for replay. |
| Audit and event | Preserved in the protected action and service; the client supplies neither metadata nor outcome. |
| Redaction | Raw auth claims, password, evidence hashes, service errors, and internal objects are not exposed. |
| Displayed state | Non-optimistic; protected completion is refreshed after confirmed mutation. |
| AI/WhatsApp | Absent and not treated as a source of truth. |

## State Matrix

| Completion/capability state | Review command behavior |
|---|---|
| `NOT_STARTED` plus review permission | One enabled start command. |
| `NOT_STARTED` without review permission | Read-only completion; no command or dead placeholder. |
| `BLOCKED` | No second review-start command. |
| `AWAITING_SIGN_OFF` | No review-start command. |
| `SIGNED` | No review-start command. |
| `EVIDENCE_DRIFTED` | No review-start command. |
| Pending | Button is disabled; synchronous duplicate clicks are ignored. |
| Created | Success is announced, command becomes terminal, completion refresh begins. |
| Idempotent replay | Replay is announced as confirmed, command becomes terminal, completion refresh begins. |
| Safe action failure | Safe message/reference is shown; no completion state is invented; retry retains the key. |
| Permission or scope change | Access-change message is shown and server capability is refreshed. |
| Transport exception | Generic safe error only; raw exception is not shown. |

## Verification Evidence

### Focused Tests

```text
node node_modules/jest/bin/jest.js --runInBand --silent --runTestsByPath "app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/__tests__/page.test.tsx" "components/manager-action-center/__tests__/BranchDailyCloseReviewCommand.test.tsx" "components/manager-action-center/__tests__/BranchDailyCloseWorkspace.test.tsx" "actions/end-of-day-close/__tests__/branch-daily-close-review.actions.test.ts"
```

- 4 suites passed.
- 55 tests passed.
- Coverage includes trusted capability derivation, minimal action input, created/replay refresh, retained retry idempotency, 401/403 capability refresh, double-submit blocking, safe transport failure, localization, state gating, and forbidden dependency scans.

### Complete Daily-Close Regression

```text
node node_modules/jest/bin/jest.js --runInBand --silent actions/end-of-day-close services/end-of-day-close
```

- 12 suites passed.
- 237 tests passed.

### Static And Architecture Checks

- Focused ESLint across the route, workspace, command, and focused tests: passed with 0 findings.
- Runtime forbidden-dependency scan: 0 findings. The workspace retains only type-only imports of versioned read-model contracts.
- `npm run service:boundary`: 0 active violations.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- `npm run module:surface:ratchet`: 367 records; the page maps to `dashboard.read` and the review action maps to `branch.daily-close.review`, both with no dependency gaps. The repository still reports 10 unrelated gaps in warn mode.
- `npm run typecheck`: did not pass because unrelated modified work in `components/auth/AuthLayout.tsx:79` references `moduleHighlights.reconciliation` on a locale union where that member is absent. TypeScript emitted no Slice 19 diagnostic. That user-owned file was not changed.

### Local Schema Readiness

- Initial live completion verification failed closed because the local database had not applied the already-versioned review and sign-off migrations.
- Applied `20260718100000_branch_daily_close_review_foundation` and `20260718130000_branch_daily_close_sign_off_foundation` with `npx prisma migrate deploy`.
- Final `npx prisma migrate status`: 19 migrations found; database schema is up to date.
- A disposable live service diagnostic then proved `NO_ACTIVITY` composes to `NOT_STARTED`; the diagnostic file and location were removed.

### Browser, Accessibility, And Visual Evidence

Machine-readable evidence:

- `what-next/referrals/DAILY_TRUTH_REVIEW_COMMAND_UI_BROWSER_EVIDENCE_2026-07-18.json`

Screenshots:

- `what-next/referrals/screenshots/daily-truth-review-command-ui-2026-07-18/read-only-desktop.png`
- `what-next/referrals/screenshots/daily-truth-review-command-ui-2026-07-18/permitted-desktop.png`
- `what-next/referrals/screenshots/daily-truth-review-command-ui-2026-07-18/permitted-mobile.png`

Results:

- Read-only desktop: fresh `/api/me/permissions` context had `dashboard.read` and lacked `branch.daily-close.review`; command count 0.
- Permitted desktop and mobile: fresh context explicitly included `branch.daily-close.review`; command count 1 and the start button was visible.
- All three states used `org_payroll_e2e_local`, the same disposable managed location, and business date `2026-07-18`.
- Completion state remained `NOT_STARTED`; the command was not clicked and no close mutation was created.
- Desktop 1440 x 1000 and mobile 390 x 844: 0 serious/critical axe violations, no document overflow, no clipped controls, and no overlapping controls.
- Visual inspection confirmed stable desktop placement, mobile stacking, readable scope context, and no dead command area for the read-only state.
- The temporary E2E role permission was restored and the disposable location was removed after capture.
- A stale generated Next client manifest initially omitted the new client module. Clearing only `.next-dev/cache` and restarting the isolated port-3011 runtime rebuilt the manifest; failed diagnostic captures were removed.

## Files Added

- `components/manager-action-center/BranchDailyCloseReviewCommand.tsx`
- `components/manager-action-center/__tests__/BranchDailyCloseReviewCommand.test.tsx`
- `what-next/referrals/DAILY_TRUTH_REVIEW_COMMAND_UI_REPORT_2026-07-18.md`
- `what-next/referrals/DAILY_TRUTH_REVIEW_COMMAND_UI_BROWSER_EVIDENCE_2026-07-18.json`
- Three screenshot artifacts under `what-next/referrals/screenshots/daily-truth-review-command-ui-2026-07-18/`.

## Files Updated

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/__tests__/page.test.tsx`
- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
- `components/manager-action-center/__tests__/BranchDailyCloseWorkspace.test.tsx`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

## Non-Goals Preserved

- No sign-off command or password step-up UI was added.
- No review status, evidence, tenant, actor, clock, audit, event, or completion value is authored by the browser.
- No revocation or supersession command was added.
- No notification, certificate, external proof, AI, or WhatsApp workflow was added.
- No permission default, role assignment, seed, service, persistence model, or migration file was changed.

## Next Slice Recommendation

Select Phase 2 / Slice 20: **controlled branch daily-close sign-off product command with password step-up**.

The slice should derive `branch.daily-close.sign` capability server-side, render only for `AWAITING_SIGN_OFF`, use `stepUpWithPasswordAction()` for password assurance, invoke only `signBranchDailyCloseAction()` with location/date/idempotency input, preserve maker-checker separation, and refresh protected completion truth after confirmed signing or replay. It must not add revocation, supersession, delivery, certificates, AI, or WhatsApp.
