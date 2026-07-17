# AqStoqFlow HR/Payroll Wave 1 Run Payment Requester Workflow Report

Generated: 2026-06-28

## Decision

Status: IMPLEMENTED AND VERIFIED FOR THE CONTROLLED-PILOT SCOPE.

This slice hardens the `/dashboard/payroll/runs` payment release drawer by replacing the free-form `requestedById` field with a service-backed requester candidate list. The requester remains a business maker/checker input, but the browser no longer asks the operator to type arbitrary IDs. Eligible candidates are sourced by the payroll run workbench read model from active same-tenant users with payroll role permissions, excluding the current actor when actor context is available.

## What Changed

- Extended `PayrollRunWorkbenchData` in `services/payroll/payroll-control.service.ts` with `paymentRequesterCandidates`.
- Added a bounded requester query over active tenant users whose roles include payroll request/review/release-adjacent permissions.
- Excluded the current workbench actor from requester candidates so the UI naturally supports maker-checker separation.
- Returned requester display name, email, role labels, and matched permission evidence for operator-visible proof.
- Replaced the payment release drawer's free-form requester ID input in `components/payroll/PayrollRunActionPanel.tsx` with a service-backed select.
- Disabled payment release when no separate requester candidate is available, while preserving the existing server-side maker-checker enforcement in `releasePayrollPaymentBatch`.
- Passed requester candidates from `components/payroll/PayrollRunWorkbench.tsx` into action panels.

## Evidence Added

- `services/payroll/__tests__/payroll-run-workbench.service.test.ts` now proves requester candidates are service-derived, include matched permission evidence, and exclude the current actor in the candidate query.
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx` now proves the release payload uses the selected service-backed requester.
- The component test also proves the drawer disables release when no separate requester candidate exists.

## Production Controls Preserved

- Tenant scope still comes from the protected read/action context, not browser input.
- Release actor, approver/releaser IDs, permissions, and fresh-auth claims remain derived by `actions/payroll/payroll-control.actions.ts`.
- The payment release service still rejects requester/approver/releaser conflicts.
- Payment allocations remain service-owned from emitted payslips, not operator-entered payroll facts.
- Payment release remains blocked by redacted amounts, missing emitted payslips, missing payment destination proof, or missing requester candidates.
- Service boundary policy remains clean: no client-side Prisma runtime coupling was introduced.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand`
  - 2 suites passed
  - 6 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run policy:gates`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-run-workbench.service.test.ts components/payroll/PayrollRunActionPanel.tsx components/payroll/PayrollRunWorkbench.tsx components/payroll/__tests__/PayrollRunWorkbench.test.tsx`

Not run:

- Fresh `npm run ui:smoke:payroll` was not run because the local port/readiness check for `127.0.0.1:3000` timed out again in this turn. Existing browser-smoke evidence exists at `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`, but it predates this requester workflow change.

## Generated Validation Outputs

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

These files were refreshed by `npm run policy:gates` through the payroll immutability runtime proof.

## Remaining Blockers

- Full production remains blocked until statutory adapter automation, pilot-cycle reconciliation, browser smoke, and accounting/security/operations signoff are completed against the final readiness report.
- The requester candidate permission set is conservative and uses existing payroll permissions. A later RBAC policy slice should introduce an explicit `payroll.payments.request` permission if the product wants a narrower maker role.
- Browser smoke with screenshots should be rerun after the local app server is confirmed ready.

## Next Recommended Slice

Add an explicit payment-request maker role/permission policy and seed/update the payroll browser-smoke fixture with separate maker and releaser users, then rerun authenticated browser smoke for `/dashboard/payroll/runs` with the requester select visible.