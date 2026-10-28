# AqStoqFlow HR/Payroll Phase 1 Command Center UX Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-12-command-center-ux`

Prompt name: Payroll Command Center UX And Proof Drawer

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Predecessor:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_READ_MODEL_REPORT_2026-06-27.md`

## Decision

The payroll command center now renders next actions from a service-owned availability contract.

Prompt 11 gave each next action a service-owned `href`. Prompt 12 adds the missing role-aware UX boundary: each action now carries `allowed`, computed in `services/payroll/command-read-model.service.ts` from the actor permissions and the same RBAC helper used by the rest of the service layer. The client no longer decides whether a linked payroll, accounting, or finance action is openable.

This remains a render-only command center hardening slice. It does not add payroll run calculation, payment release, declaration automation, close mutation, or client-computed payroll totals.

## Expert Lenses Applied

- Enterprise architect.
- Payroll/accounting controls reviewer.
- Security, RBAC, and privacy reviewer.
- UI command-center reviewer.
- Test and release gate reviewer.

## Prerequisite Gate

Status: passed for this narrow Prompt 12 command-center UX slice.

- The command read model already composes trusted HR, payroll, attendance, payment evidence, posting, reconciliation, declaration, and close facts.
- `PayrollCommandNextAction.href` already points only to implemented or existing control surfaces.
- The command read action still requires `payroll.command.read` and module entitlement before data reaches the UI.
- Salary/person amount redaction stays service-owned through the existing payroll redaction policy.
- Payroll tenant-boundary and privacy tests pass after the UX contract change.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-12-command-center-ux\SKILL.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_READ_MODEL_REPORT_2026-06-27.md`
- `services/payroll/command-read-model.service.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `actions/payroll/__tests__/payroll-command-read-model.actions.test.ts`
- `config/__tests__/sidebar.test.ts`
- `lib/security/rbac-permissions.ts`

## Implementation Summary

- Added `allowed: boolean` to `PayrollCommandNextAction`.
- Updated `addAction` in the payroll command read model to compute `allowed` with `hasAnyRbacPermission` through the existing `can` helper.
- Updated every next-action construction site to pass `parsed.actorPermissions` into the service-owned action builder.
- Updated `PayrollCommandCenter` action rendering:
  - linked and allowed actions render `Open`;
  - linked but unauthorized actions render `Need access` without a link;
  - future or unimplemented workflow actions with no `href` render `Pending route`.
- Kept pending workflow sources visible as blockers/readiness hints without exposing fake routes.
- Updated component tests to cover service-owned links, denied routed actions, pending routes, and proof drawer hashes.
- Updated service tests to prove command-reader-only access does not open actions and that broader actor permissions mark selected actions as available.

## Security And Privacy

- Action availability is now computed on the protected read model, not inferred in the browser.
- The UI does not receive additional salary, bank, mobile-money, or person-sensitive values.
- Redacted payroll amounts remain redacted in the command center fixture and service output.
- `Need access` avoids leaking a navigable route to unauthorized operators while still explaining that the action exists.
- RBAC behavior intentionally follows the existing alias-aware helper in `lib/security/rbac-permissions.ts`; the tests assert that helper behavior instead of adding a parallel permission model.

## Accounting And Finance Decisions

- Accounting and finance actions still use service-owned routes from Prompt 11.
- Ledger blockers remain routed to `/dashboard/accounting/control-center` only when authorized.
- Payment reconciliation exceptions remain routed to `/dashboard/finance/reconciliation` only when authorized.
- No payroll-local finance mutation, payment release, posting, or close action was added.

## UI/UX Decisions

- The action board keeps the existing compact command-center hierarchy and dimensions.
- `Open`, `Need access`, and `Pending route` are explicit operational states, not hidden failures.
- The component uses lock iconography for unavailable actions and avoids fake disabled links.
- The proof drawer remains render-only over existing proof subjects and hashes.
- No decorative redesign, nested cards, or marketing-style shell was introduced.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-command-read-model.actions.test.ts config/__tests__/sidebar.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
npm run typecheck
npm run lint -- --quiet
```

Results:

- Command read-model/component/route smoke tests: 3 suites passed, 8 tests passed.
- Command action/sidebar tests: 2 suites passed, 17 tests passed.
- Payroll tenant/privacy tests: 2 suites passed, 6 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: passed, 0 active violations.
- Typecheck: passed.
- ESLint: passed with 0 errors and 5 existing unrelated warnings.

Skipped:

- `npm run prisma:generate`: no schema or migration changes.
- Full authenticated browser visual smoke: not run because the command center requires a running app and authenticated payroll-enabled state.
- Full policy gate suite: not run for this narrow render/read-model contract slice after the focused service, route, privacy, boundary, typecheck, and lint gates passed.

## Files Changed

- `services/payroll/command-read-model.service.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_CENTER_UX_REPORT_2026-06-27.md`

## Source-Of-Truth Risks Avoided

- No client-side permission decision.
- No fake links to payroll run, payment release, or declaration automation surfaces.
- No UI-derived payroll, accounting, or finance totals.
- No weakening of module entitlement, RBAC, tenant scope, audit, or payroll redaction boundaries.
- No exposure of raw payment destination or salary/person-sensitive data.

## Handoff

The command center is now safer for role-aware daily operation: operators can see what is blocked, open only actions their permissions allow, and distinguish unavailable future workflows from access-gated existing workflows. The next safe HR/payroll slice is a later-phase workflow only after the corresponding run, register, payment, declaration, or close service contract is implemented and tested.