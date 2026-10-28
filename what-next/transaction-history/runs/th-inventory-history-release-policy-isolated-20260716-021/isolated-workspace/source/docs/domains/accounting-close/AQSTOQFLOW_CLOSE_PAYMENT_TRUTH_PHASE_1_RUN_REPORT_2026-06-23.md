# Close-Payment Truth Phase 1 Run Report - 2026-06-23

## Scope

Implemented Phase 1 read-access and dashboard trust-signal work for the finance payment reconciliation surface.

## Changes

- Switched finance reconciliation sidebar access from `payments.reconciliation.run` to `payments.reconciliation.read`.
- Switched the reconciliation workbench read action from `payments.reconciliation.run` to `payments.reconciliation.read`.
- Kept elevated reconciliation operations behind their existing higher-risk permissions: import, run, match, override, exception assignment, suspense proposal/posting, sign-off, and certificate export.
- Added a payment trust banner to `/dashboard/finance/reconciliation` using durable dashboard data only:
  - provider evidence
  - statement evidence
  - signed runs
  - open suspense and suspense exposure
  - critical exceptions
  - close blockers
  - freshness/as-of time
- Added English and French banner labels.
- Added focused tests for RBAC separation, action wrapper permissions, sidebar access, and banner rendering.

## Verification

PASS `npm test -- actions/payments/__tests__/reconciliation.actions.test.ts config/__tests__/sidebar.test.ts lib/security/__tests__/rbac-permissions.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand`

- 4 suites passed
- 18 tests passed

PASS `npm test -- services/payments/__tests__ services/reconciliation/__tests__ --runInBand`

- 9 suites passed
- 32 tests passed

PASS `npx eslint actions/payments/reconciliation-workbench.actions.ts actions/payments/__tests__/reconciliation.actions.test.ts components/finance/PaymentReconciliationWorkbench.tsx components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx config/sidebar.ts config/__tests__/sidebar.test.ts lib/security/__tests__/rbac-permissions.test.ts --ext .ts,.tsx`

BLOCKED `npm run typecheck`

- Existing unrelated error: `services/owner-war-room/owner-war-room.service.ts(305,24): error TS2304: Cannot find name 'buildOwnerMorningBrief'.`

BLOCKED `npm run lint`

- Existing unrelated error: `components/owner-war-room/OwnerWarRoomDashboard.tsx(537,8): error 'ProofTrailDrawer' is not defined react/jsx-no-undef`.
- Existing warnings remain in auth, item image usage, carousel image usage, inventory image usage, and config default export style.

## Notes

- The banner does not fabricate provider or statement evidence; it displays the durable reconciliation dashboard booleans and counts currently returned by the service.
- Full-repo verification is blocked by owner-war-room issues outside this Phase 1 change set.