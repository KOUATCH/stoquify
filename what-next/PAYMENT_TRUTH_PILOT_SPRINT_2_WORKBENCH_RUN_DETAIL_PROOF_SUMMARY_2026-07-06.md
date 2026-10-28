# Payment Truth Pilot Sprint 2 - Workbench Run Detail Proof Summary - 2026-07-06

## Decision

The next logical step was to render the run-detail proof summary inside the existing reconciliation workbench signoff queue. This keeps the proof path visible where operators already inspect runs, without adding a new route, dashboard shell, or mutation workflow.

## Slice Executed

- Wired `useReconciliationRunDetail` into `PaymentReconciliationWorkbench`.
- Defaulted the selected run detail to the first recent durable reconciliation run.
- Added a compact Proof action on each signoff queue row.
- Rendered selected-run blocker chips, signoff eligibility, proof subject counts, matched evidence rows, unresolved exception rows, and suspense rows.
- Added English and French labels for the proof summary.
- Added component coverage proving the summary renders from the service-owned read detail.

## Prerequisites Confirmed

- The run detail read action is protected by `payments.reconciliation.read`.
- The run detail DTO already exposes certification blockers and evidence subjects.
- The workbench already has the durable dashboard read model and signoff queue.
- The UI does not reconstruct certification truth; it renders the service-owned detail.

## Verification

- `npm test -- --runTestsByPath components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand`
- `npm test -- --runTestsByPath components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
- `npm run typecheck`

## Result

The reconciliation workbench now has an honest run-detail proof summary: one selected run, blocker chips, service-owned signoff eligibility, evidence subject counts, and compact matched/exception/suspense rows. It remains a read-only dashboard enhancement.

## Next Logical Step

Add row-level proof opening from the rendered run-detail evidence subjects only where a concrete proof subject exists. Keep it inside the current summary and reuse the existing proof drawer pattern; do not add another page or broad evidence explorer.
