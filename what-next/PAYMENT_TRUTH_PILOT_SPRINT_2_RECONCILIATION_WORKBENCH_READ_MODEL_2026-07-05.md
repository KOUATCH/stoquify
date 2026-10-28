# Payment Truth Pilot Sprint 2 - Reconciliation Workbench Read Model - 2026-07-05

## Decision

The next logical step was to harden the existing durable reconciliation dashboard read model and action behind `/dashboard/finance/reconciliation`, not create another dashboard shell. The workbench already consumes the service-owned dashboard action, so the safest useful slice was to make that read model honest when signoff-looking runs still have unresolved evidence blockers.

## Slice Executed

- Kept the durable read action tenant-owned by the authenticated session context.
- Preserved the `payments.reconciliation.read` permission boundary for the workbench read path.
- Updated the durable dashboard certification status order so unresolved review state, critical exceptions, or open suspense items report `NEEDS_REVIEW` before `READY_FOR_SIGNOFF`.
- Added service coverage for route-ready provider evidence, recent runs, exception groups, suspense queue facts, notification queue, and period-close blocker notification behavior.
- Added action coverage proving caller-supplied organization IDs do not override the session tenant.

## Prerequisites Confirmed

- The dashboard already has a route-backed reconciliation workbench at `/dashboard/finance/reconciliation`.
- The durable read model already lives in `services/reconciliation/payment-reconciliation-dashboard.service.ts`.
- The read action already routes through `getPaymentReconciliationDashboardAction`.
- The existing Daily Business Confidence Brief can continue using the payment command-card proof route while the workbench receives richer read-only evidence.

## Verification

- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts --runInBand`
- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
- `npm run typecheck`

## Result

The route-facing read model can now say "not signoff-ready" when evidence is still blocked, even if a reconciliation run has reached a signoff-like lifecycle state. This keeps the workbench aligned with the Daily Business Confidence Brief: action first, proof route available, and no false trust badge.

## Next Logical Step

Add a narrow run-detail/proof drill-through read action for one selected reconciliation run. It should expose matched evidence, unresolved exceptions, suspense links, and certification blockers for the existing workbench detail area without adding a new page or mutation flow.
