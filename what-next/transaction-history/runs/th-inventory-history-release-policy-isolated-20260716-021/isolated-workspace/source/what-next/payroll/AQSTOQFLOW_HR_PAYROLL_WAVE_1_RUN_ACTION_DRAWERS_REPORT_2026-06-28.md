# AqStoqFlow HR/Payroll Wave 1 Run Action Drawers Report

Generated: 2026-06-28

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice upgrades `/dashboard/payroll/runs` from a proof-backed read-only workbench into a controlled operator surface for the already-implemented lifecycle actions: calculate run, approve/post run, prepare declarations, and release payments. It does not expand payroll truth into the browser. The client collects only business inputs and evidence references; tenant, actor, permissions, and fresh-auth claims remain derived by the protected server action boundary.

## What Changed

- Added `components/payroll/PayrollRunActionPanel.tsx` with protected drawers for calculate, approve/post, declaration preparation, and payment release.
- Wired `PayrollRunActionPanel` into `components/payroll/PayrollRunWorkbench.tsx` under each eligible next action.
- Extended `getPayrollRunWorkbenchData` in `services/payroll/payroll-control.service.ts` with `paymentAllocationCandidates` sourced from service-owned payslips.
- Release payments now use payslip-derived `{ payslipId, employeeId, amount }` allocations instead of operator-entered payroll facts.
- Payment release is disabled when payroll amounts are redacted, emitted payslip allocation candidates are missing, or employee payment-destination proof is missing.
- Fresh-auth/action denials render safely with user-facing error text and correlation IDs.
- Removed client-side Prisma enum coupling from the action panel so the UI remains on DTO/action-safe string values.

## Evidence Added

- Service test coverage for payslip allocation candidates in `services/payroll/__tests__/payroll-run-workbench.service.test.ts`.
- Component test coverage for release-payment payload construction in `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`.
- Component test coverage proving approve/payment action payloads do not include `organizationId`, derived actor IDs, `actorPermissions`, or `lastAuthAt`.
- Fresh-auth denial rendering coverage with correlation ID display.

## Production Controls Preserved

- Tenant scope remains handler-derived in `actions/payroll/payroll-control.actions.ts`.
- Actor identity, permissions, approver/releaser IDs, and fresh-auth timestamps remain server-derived.
- Idempotency keys are generated per drawer submission and rotated after successful actions.
- Payroll amount redaction blocks payment release rather than allowing hidden values to be submitted blindly.
- Payment release requires payslip proof and employee payment-destination proof before the operator can submit.
- The service boundary gate is clean; the new client component does not import Prisma client runtime types.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand`
  - 3 suites passed
  - 20 tests passed
- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 1 suite passed
  - 4 tests passed after removing client Prisma enum coupling
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- services/payroll/payroll-control.service.ts`

Not run:

- `npm run ui:smoke:payroll` was not run in this slice because the local `http://127.0.0.1:3000` readiness probe timed out. The payroll auth state exists at `playwright/.auth/payroll.json`, so the browser smoke can be rerun once the local app server is confirmed ready.

## Generated Validation Outputs

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

These files were refreshed by `npm run policy:gates` through the payroll immutability runtime proof.

## Remaining Blockers

- Full production remains blocked until the final readiness report blockers are closed with evidence, including statutory authority adapters, one clean pilot payroll cycle, and accounting/security/operations signoff.
- Payment release still accepts a `requestedById` business input because the existing release schema requires requester/approver separation. A later workflow slice should replace this free-form ID with a service-backed requester/approval selection flow.
- Browser smoke should be rerun with screenshots once the local app server is available.

## Next Recommended Slice

Harden the payment-requester and approval workflow around the run workbench: service-backed requester lookup, denied states for maker-checker conflicts, and browser-smoke proof for `/dashboard/payroll/runs` with the action drawers visible.