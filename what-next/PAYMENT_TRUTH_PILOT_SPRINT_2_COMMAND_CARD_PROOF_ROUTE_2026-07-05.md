# Payment Truth Pilot Sprint 2 - Command Card Proof Route

Date: 2026-07-05

## Decision

The next logical step was to promote the deterministic payment-truth proof into the tenant operating read model without adding a new dashboard shell. The payment command card now has a focused test proving that fresh cash-truth values, route metadata, evidence state, and permission requirements are exposed from the service-owned snapshot contract.

## Executed Slice

- Added a focused tenant operating snapshot assertion for the payment command card.
- Proved the card exposes:
  - `label`: `Cash truth`
  - `metricLabel`: `External matched`
  - `value`: fresh external matched amount from the payment truth snapshot
  - `uiState`: `fresh`
  - `evidenceGrade`: `operational`
  - `blockerState`: `none`
  - `actionRoute`: `/dashboard/finance/reconciliation`
  - `proofRoute`: `/dashboard/finance/reconciliation`
  - `requiredPermission`: `payments.reconciliation.read`
  - `sourceModules`: `payments`, `finance`
- Proved the detail copy carries internal collected, external matched, variance, and suspense values from the snapshot contract.

## Prerequisites Confirmed

- The payment-truth pilot fixture already proves provider event capture, statement import, reconciliation, evidence-state updates, match record creation, and snapshot metrics.
- The tenant operating snapshot already builds command cards from service-owned child snapshots.
- The dashboard mapper already reads `actionRoute` and `proofRoute` from the command-card contract.

## Files Changed

- `services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts --runInBand`
  - 1 suite passed.
  - 6 tests passed.
- `npm test -- --runTestsByPath services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/reconciliation/__tests__/payment-truth-pilot-fixture.test.ts services/snapshots/__tests__/payment-truth-snapshot.service.test.ts --runInBand`
  - 3 suites passed.
  - 9 tests passed.
- `npm run typecheck`
  - Passed.

## Result

No new dashboard shell was added. The existing Daily Business Confidence Brief can rely on the tenant operating snapshot payment command card for fresh cash-truth value, proof routing, and permission metadata.

## Next Logical Step

Add the dashboard mapper/view assertion that the Daily Business Confidence Brief turns this command-card contract into a visible payment action with the reconciliation proof link. Keep it mapper-level or component-test-level first; do not add new panels until the current first viewport proves the route and proof state.
