# Daily Truth Close Workspace Report

Generated: 2026-07-18  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 2 - Daily Truth Dashboard And Action Center  
Slice: 18 - Managed-location read-only branch daily-close workspace  
Primary skill: `stoquify-daily-truth-command-center`

## Decision

Slice 18 is complete.

Stoquify now has a localized, permission-guarded, read-only daily-close workspace for one authorized branch and one explicitly selected business date. The workspace consumes only the protected versioned completion action and does not expose review, sign-off, revocation, supersession, step-up, notification, certificate, AI, or WhatsApp commands.

Phase 2 remains active. The next slice must add a narrowly controlled review-start product command without weakening the read-model, RBAC, module, audit, actor, tenant, or branch-scope boundaries proven here.

## Before And After

### Before

- Completion, review, and sign-off service/action contracts existed, but no product route consumed daily-close completion evidence.
- Managed-location bundles had no daily-close entry path.
- A product surface could not demonstrate empty, date-invalid, denied, unavailable, not-started, blocked, awaiting-sign-off, signed, or drifted completion states.
- The route-smoke manifest did not include branch daily close.

### After

- `/[locale]/dashboard/manager-action-center/daily-close` is a localized child route guarded by `dashboard.read`.
- Every rendered managed-location bundle exposes exactly one localized daily-close link carrying only `locationId`.
- The page requires a real `YYYY-MM-DD` calendar date before calling the completion action; it does not infer a date from browser, server, or organization timezone.
- Completion evidence is loaded only through `getBranchDailyCloseCompletionAction()`.
- The workspace presents the authorized location, contract version, completion state, evidence alignment, readiness, supported/unsupported counts, checklist, blockers, and safe active-sign metadata.
- Payment reconciliation, readiness promotion, and final accounting close are visibly marked `Not claimed`.
- The route is registered for authenticated mobile and desktop smoke evidence.

## Implementation

### Product Route

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx`
  - Guards the page with `requirePermission("dashboard.read")` before parsing branch input.
  - Treats missing location, missing date, invalid date, access/scope failure, and unavailable action responses as explicit safe states.
  - Passes only `{ locationId, businessDate }` to the protected completion action.
  - Does not import Prisma or any end-of-day-close service.

### Read-Only Workspace

- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
  - Uses the existing dashboard canvas, panel, row, muted-text, and tone tokens.
  - Provides English and French copy.
  - Renders all five completion states: `NOT_STARTED`, `BLOCKED`, `AWAITING_SIGN_OFF`, `SIGNED`, and `EVIDENCE_DRIFTED`.
  - Does not render source/composition hashes or caller-supplied location identity as verified branch evidence.
  - Contains only navigation and explicit-date loading controls; it contains no daily-close write command.

### Authorized Entry Path

- `components/manager-action-center/ManagerLocationActionCenterDashboard.tsx`
  - Adds one localized daily-close link to each authorized location bundle.
  - Encodes the location identity and carries no date, completion claim, permission claim, or evidence value.

### Route Smoke

- `scripts/ui-route-smoke-gate.js`
  - Registers `manager-daily-close` at `/en/dashboard/manager-action-center/daily-close`.
  - Requires authenticated mobile and desktop capture.
- `scripts/__tests__/ui-route-smoke-gate.test.js`
  - Locks the route path, protected status, surface name, and viewport set.

## Trust Boundaries

| Boundary | Result |
|---|---|
| Service-owned truth | Preserved; the component receives the versioned completion result. |
| Tenant isolation | Preserved by the protected action and operating-access service chain. |
| Branch scope | Preserved; entry originates from authorized bundles and the action revalidates location scope. |
| RBAC | Page requires `dashboard.read`; the action independently protects the completion read. |
| Module entitlement | Page and action are mapped to the `dashboard` module with no inventory finding. |
| Audit | Page guard records the workspace resource; the action retains protected read audit metadata. |
| Redaction/minimization | No raw auth claims, tokens, source hashes, composition hashes, or unverified branch details are rendered. |
| Date authority | Explicit input only; no timezone-derived business date is invented. |
| Unsupported controls | Payment reconciliation, readiness promotion, and final close remain visibly unclaimed. |
| AI/WhatsApp | Absent and not treated as a source of truth. |

## Safe State Matrix

| State | Evidence behavior | Commands |
|---|---|---|
| No location | Directs the user back to an authorized managed-location bundle; no branch evidence shown. | None |
| No date | Shows required date input; completion action is not called. | Load only |
| Invalid date | Shows calendar validation state; completion action is not called. | Load only |
| Permission/scope denied | Shows a combined fail-closed access/scope state without branch evidence. | None |
| Unavailable | Shows a safe unavailable state; no replacement completion value is fabricated. | Load only |
| Not started | Renders `NOT_STARTED` from the completion contract. | None |
| Blocked | Renders blockers and current readiness evidence. | None |
| Awaiting sign-off | Renders the read-model state without a sign command. | None |
| Signed | Renders safe active sign time/actor metadata and current alignment. | None |
| Evidence drifted | Renders drift explicitly without preserving a false completed state. | None |

## Verification Evidence

### Focused Tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/__tests__/page.test.tsx"
```

- 1 suite passed.
- 9 tests passed.

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "components/manager-action-center/__tests__/BranchDailyCloseWorkspace.test.tsx" "components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx" "actions/end-of-day-close/__tests__/branch-daily-close-completion.actions.test.ts" "scripts/__tests__/ui-route-smoke-gate.test.js"
```

- 4 suites passed.
- 38 tests passed.
- Focused total: 5 suites and 47 tests.

### Complete Daily-Close Regression

```text
node node_modules/jest/bin/jest.js --runInBand actions/end-of-day-close services/end-of-day-close
```

- 12 suites passed.
- 237 tests passed.

### Static And Architecture Checks

- `npm run typecheck`: passed.
- Focused ESLint across route, workspace, entry-link, tests, and route-smoke files: passed with 0 findings.
- `npm run service:boundary`: 0 active violations.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- `npm run module:surface:ratchet`: inventory refreshed to 367 records; the page and completion action are mapped to `dashboard.read`; Slice 18 has 0 findings.
- The repository module ratchet still reports the same 10 unrelated gaps and is not promoted by this slice.

### Browser And Accessibility

Authoritative route-smoke evidence:

- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_ROUTE_SMOKE_2026-07-18.json`
- Status: `ok: true`.
- Protected route validated with saved tenant storage state.
- Mobile screenshot: `what-next/referrals/screenshots/daily-truth-close-workspace-2026-07-18/manager-daily-close-mobile.png`.
- Desktop screenshot: `what-next/referrals/screenshots/daily-truth-close-workspace-2026-07-18/manager-daily-close-desktop.png`.

Machine-readable DOM evidence:

- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_BROWSER_EVIDENCE_2026-07-18.json`.
- Mobile 390 x 844: 0 serious/critical axe violations, no document overflow, no clipped elements, no overlapping controls, no console errors.
- Desktop 1440 x 1100: 0 serious/critical axe violations, no document overflow, no clipped elements, no overlapping controls, no console errors.
- Both final URLs remained authenticated and rendered neither access denial nor application error.

The first attempt against a pre-existing stalled port-3000 process timed out before rendering. The authoritative successful evidence above was produced against a clean isolated Next.js runtime on port 3011; the failed evidence was overwritten.

## Files Added

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/__tests__/page.test.tsx`
- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
- `components/manager-action-center/__tests__/BranchDailyCloseWorkspace.test.tsx`
- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_REPORT_2026-07-18.md`
- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_ROUTE_SMOKE_2026-07-18.json`
- `what-next/referrals/DAILY_TRUTH_CLOSE_WORKSPACE_BROWSER_EVIDENCE_2026-07-18.json`
- Mobile and desktop screenshot artifacts under `what-next/referrals/screenshots/daily-truth-close-workspace-2026-07-18/`.

## Files Updated

- `components/manager-action-center/ManagerLocationActionCenterDashboard.tsx`
- `components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx`
- `scripts/ui-route-smoke-gate.js`
- `scripts/__tests__/ui-route-smoke-gate.test.js`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/role-based-operating-cockpit-readiness.md`
- `what-next/role-based-operating-cockpit-readiness.json`

## Non-Goals Preserved

- No review-start command was added.
- No sign-off, revocation, or supersession command was added.
- No password step-up component or fresh-auth UX was added.
- No payment reconciliation completion was claimed.
- No readiness promotion or final accounting close was claimed.
- No notification, close certificate, external proof, AI, or WhatsApp workflow was added.
- No service, persistence model, migration, permission default, or role assignment was changed.

## Next Slice Recommendation

Select Phase 2 / Slice 19: **permission-aware branch daily-close review-start product command**.

The slice should expose only the existing protected review action, preserve server-owned actor/tenant/date/evidence fields, suppress the command when permission or current completion state does not allow review, refresh completion after a successful command, and remain separate from sign-off and fresh-auth UX. Before implementation, the war room must confirm whether the page can derive a trustworthy review capability from the guarded RBAC context or whether a service-owned capability field is required in the completion read model.

Next skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`, followed by `stoquify-referral-war-room-orchestrator` after the slice.
