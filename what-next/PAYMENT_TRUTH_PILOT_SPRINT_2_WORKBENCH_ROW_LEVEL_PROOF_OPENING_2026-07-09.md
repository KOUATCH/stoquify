# Payment Truth Pilot Sprint 2 - Workbench Row-Level Proof Opening - 2026-07-09

## Decision

The next logical step was to let operators open proof directly from the selected run-detail evidence rows, but only for subjects that already have a concrete proof route. This keeps the workbench as the daily trust surface and avoids a new evidence explorer.

## Slice Executed

- Mapped run-detail evidence subjects to existing proof-drawer subjects for payment transactions and reconciliation runs.
- Kept unsupported provider event, statement line, ledger entry, exception, and suspense subjects in an honest unavailable state.
- Reused the existing `BIProofDrawerHost` inside the compact run-detail matched, exception, and suspense mini lists.
- Preserved the service call contract: proof lookup still receives only `subjectType` and `subjectId`.
- Added row-specific drawer state so duplicate rows sharing the same proof subject do not all open together.
- Added focused component coverage for opening proof from a selected run matched evidence subject.

## Prerequisites Confirmed

- The workbench and run-detail read path already require `payments.reconciliation.read`.
- The proof drawer pattern already handles loading, errors, unavailable subjects, and evidence-chain rendering.
- The run-detail DTO exposes evidence subjects without requiring the UI to reconstruct certification truth.
- No new dashboard shell, route, broad evidence page, or mutation workflow was needed.

## Verification

- `npm test -- --runTestsByPath components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand`
- `npm test -- --runTestsByPath components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-dashboard.service.test.ts components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
- `npm run typecheck`

## Result

The reconciliation workbench now supports row-level proof opening from the selected run-detail proof summary where proof is actionable, while clearly showing unavailable proof for subjects that do not yet have a first-class evidence trail.

## Next Logical Step

Promote the remaining concrete evidence subjects deliberately: decide whether provider events, statement lines, ledger entries, exceptions, or suspense records deserve first-class proof trails, then add service-owned proof support for the highest-value subject only. Do not broaden the dashboard until one more subject has a real proof source and tests.
