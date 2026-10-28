# AqStoqFlow HR/Payroll Wave 1 Run Lifecycle Workbench Report

Generated: 2026-06-28

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice moves `/dashboard/payroll/runs` from an unsupported HR/payroll route gap into a service-backed run lifecycle workbench. It exposes payroll run state, locked register proof, correction linkage, accounting posting proof, declaration/payment evidence, employee balance exceptions, blockers, and next-action affordances without moving payroll truth into the browser.

## What Changed

- Added `getPayrollRunWorkbenchData` in `services/payroll/payroll-control.service.ts`.
- Added `payrollRunWorkbenchInputSchema` and `PayrollRunWorkbenchData` to keep the workbench contract typed, tenant-scoped, redacted, and auditable.
- Added `getPayrollRunWorkbenchAction` in `actions/payroll/payroll-control.actions.ts` using authenticated tenant context, payroll module entitlement, and `payroll.command.read`.
- Added `/dashboard/payroll/runs` with RBAC denial, module-denied, error, empty, and proof-backed render states.
- Added `components/payroll/PayrollRunWorkbench.tsx` to show run status, run type, correction linkage, register hashes, component mapping proof, ledger/journal/source-link proof, declaration/payment facts, active balance cases, blockers, and next actions.
- Added sidebar visibility for `Runs` while keeping unsupported `/dashboard/presence` excluded.
- Added `payroll-runs` to the browser smoke route inventory and payroll smoke npm command.
- Updated the HR/payroll operations runbook so payroll cycle incidents open `/dashboard/payroll/runs` first.

## Evidence Added

- Service test: `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- Protected action test: `actions/payroll/__tests__/payroll-control.actions.test.ts`
- Component test: `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- Route smoke: `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- Sidebar test: `config/__tests__/sidebar.test.ts`
- Runbook test: `services/assurance/__tests__/payroll-observability-runbook.test.ts`

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts --runInBand`
  - 6 suites passed
  - 40 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- <touched files>`
  - Passed with CRLF normalization warnings only for Windows-edited files.

## Production Controls Preserved

- Tenant scope comes from the authenticated action context, not client input.
- Payroll module entitlement is enforced before the route executes the protected read action.
- Payroll amounts use the existing redaction policy and read audit trail.
- Payroll run truth remains service-owned in `payroll-control.service.ts`.
- The UI is read-only for lifecycle actions. Existing protected write actions remain the mutation boundary for calculate, approve/post, declaration preparation, and payment release.
- Locked run proof requires calculation, attendance, document, evidence, ledger, journal, and source-link facts.
- Declaration rejection, missing declaration register proof, failed/incomplete payment proof, missing settlement register proof, and ledger failures surface as blockers.
- Browser smoke now includes only implemented payroll routes; `/dashboard/presence` remains excluded.

## Remaining Blockers

- Full statutory automation remains blocked until reviewed authority payload/response mappings, credentials, receipts, amendments, rejections, retries, idempotency, and provider settlement proof are certified.
- The run workbench is currently a read-only operator surface. Form-driven lifecycle actions can be added after the existing fresh-auth write actions are wired with proof drawers and maker-checker states.
- Full production still requires one clean controlled pilot payroll cycle, close reconciliation, and accounting/security/operations signoff against the final readiness report blockers.

## Next Recommended Slice

Add controlled action drawers to the run workbench for only already-implemented protected actions: calculate, approve/post, prepare declarations, and release payment batches. Each drawer should preserve fresh-auth, maker-checker, redaction, idempotency, source-register proof, denied states, and route smoke coverage.