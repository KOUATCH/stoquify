# Payment Truth Pilot Sprint 2 - Run Detail Proof Drillthrough - 2026-07-06

## Decision

The next logical step was to strengthen the existing reconciliation run detail read action, not add a new dashboard page. The workbench already has a protected `getReconciliationRunDetailAction` and hook, so the useful slice was to make that DTO carry proof-ready matched evidence, unresolved exception state, suspense links, and certification blockers.

## Slice Executed

- Added proof subject metadata to reconciliation run detail match records.
- Added unresolved state and proof subjects to exception rows.
- Added unresolved state and proof subjects to suspense rows.
- Added a compact `certification` block with signoff eligibility, period status, and blocker records.
- Kept the action tenant-owned by the authenticated session context.
- Preserved the read-only `payments.reconciliation.read` permission boundary.

## Prerequisites Confirmed

- `/dashboard/finance/reconciliation` already has the workbench route.
- `useReconciliationRunDetail` already exists and uses a tenant-scoped query key.
- The read action already routes through `getReconciliationRunDetailAction`.
- The certification service already owns the sign-off rules; the read model now mirrors those blockers instead of asking the UI to infer them.

## Verification

- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts --runInBand`
- `npm test -- --runTestsByPath services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
- `npm run typecheck`

## Result

The run detail proof action can now support a workbench drill-through without client-side trust reconstruction. Operators can receive one service-owned detail payload with matched evidence subjects, unresolved blocker state, suspense proof links, and the exact reasons sign-off is or is not eligible.

## Next Logical Step

Render the run-detail proof summary inside the existing reconciliation workbench signoff queue. Keep it compact: one selected run, blocker chips, evidence subject counts, and matched/exception/suspense rows. Do not add a new page or mutation flow.
