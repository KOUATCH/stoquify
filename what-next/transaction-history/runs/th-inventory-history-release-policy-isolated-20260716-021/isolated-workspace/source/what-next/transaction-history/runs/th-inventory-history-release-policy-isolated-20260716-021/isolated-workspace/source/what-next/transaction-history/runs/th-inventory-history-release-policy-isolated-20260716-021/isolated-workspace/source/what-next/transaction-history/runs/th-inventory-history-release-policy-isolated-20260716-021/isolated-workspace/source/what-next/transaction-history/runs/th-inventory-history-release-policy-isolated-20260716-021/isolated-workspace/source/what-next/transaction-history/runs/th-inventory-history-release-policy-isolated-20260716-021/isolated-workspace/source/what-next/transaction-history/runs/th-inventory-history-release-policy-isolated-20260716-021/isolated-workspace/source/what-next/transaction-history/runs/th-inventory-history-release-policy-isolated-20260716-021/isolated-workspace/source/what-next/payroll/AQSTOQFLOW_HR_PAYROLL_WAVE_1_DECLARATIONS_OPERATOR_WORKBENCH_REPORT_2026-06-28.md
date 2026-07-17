# AqStoqFlow HR/Payroll Wave 1 Declaration Operator Workbench Report

Generated: 2026-06-28

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice moves payroll declarations from an unsupported dashboard-route gap into an implemented, service-backed operator surface. It does not certify automated statutory filing. The route exposes manual authority lifecycle evidence, source payroll register proof, adapter readiness, blockers, and next actions backed by the payroll declaration lifecycle service.

## What Changed

- Added a service-owned declaration workbench read model in `services/payroll/declaration-lifecycle.service.ts`.
- Added a protected read action in `actions/payroll/payroll-control.actions.ts` using authenticated tenant context, payroll module entitlement, and `payroll.command.read`.
- Added `/dashboard/payroll/declarations` with RBAC denial, module-denied, error, empty, and proof-backed render states.
- Added `components/payroll/PayrollDeclarationWorkbench.tsx` to show declaration status, source register proof, payload/evidence hashes, authority receipts/responses, manual adapter status, blockers, and next manual actions.
- Added sidebar visibility for implemented declaration and payment routes while keeping missing payroll runs/presence routes out of navigation.
- Added declarations/payments to route smoke and browser-smoke route allow-lists.
- Updated the HR/payroll operations runbook so declaration fallback routes to `/dashboard/payroll/declarations` and payment exceptions route to `/dashboard/payroll/payments`.

## Evidence Added

- Service test: `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- Protected action test: `actions/payroll/__tests__/payroll-control.actions.test.ts`
- Component test: `components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`
- Route smoke: `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- Sidebar test: `config/__tests__/sidebar.test.ts`
- Runbook test: `services/assurance/__tests__/payroll-observability-runbook.test.ts`

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts --runInBand`
  - 6 suites passed
  - 46 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- <touched files>`
  - Passed with CRLF normalization warnings only for Windows-edited files.

## Production Controls Preserved

- Tenant scope comes from the authenticated RBAC context, not client input.
- Payroll module entitlement is enforced before action execution.
- Declaration evidence remains lifecycle-owned by `declaration-lifecycle.service.ts`.
- The UI is read-only for declaration lifecycle actions in this slice; mutation still goes through the protected fresh-auth declaration evidence action.
- Source register proof is visible and missing proof remains a blocker.
- Manual authority evidence remains the truth until reviewed country-pack and authority adapter mappings are certified.
- Browser smoke includes only implemented payroll routes; `/dashboard/payroll/runs` and `/dashboard/presence` remain excluded.

## Remaining Blockers

- Full statutory automation is still blocked until reviewed authority payload mappings, response mappings, credentials, idempotency, rejection/amendment handling, receipts, and provider settlement proof are certified.
- `/dashboard/payroll/runs` is still not implemented as a full service-backed operator route.
- Declarations are currently surfaced for operator review and proof inspection; full form-driven declaration lifecycle actions should be added only after the existing fresh-auth/maker-checker write action is wired into a controlled workflow.
- Full production remains gated by the final readiness report blockers, one clean pilot payroll cycle, and accounting/security/operations signoff.

## Next Recommended Slice

Implement `/dashboard/payroll/runs` as a service-backed payroll run lifecycle operator workbench. It should expose run state, calculation/register tie-out, correction history, locked-register proof, accounting posting state, declaration/payment readiness, close blockers, fresh-auth action affordances, and denied/redacted views without making POS, sales, or finance own payroll truth.