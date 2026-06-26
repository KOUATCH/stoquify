# AqStoqFlow First-Ring Close Invalidation Mesh Run Report

Date: 2026-06-23

## Scope

Implemented the first-ring close certification invalidation mesh for payment evidence changes:

- Added typed close invalidation source metadata in `services/accounting/close-assurance-pack.service.ts`.
- Preserved the existing `recordCloseCertificationInvalidation()` audit, business-event, and stale metadata semantics by factoring a transaction-safe core behind it.
- Added `recordCloseCertificationInvalidationsForSourceInTx()` to discover certified close runs by direct close run, accounting period, or overlapping period dates.
- Wired statement import into close invalidation after `payment.statement.imported` is recorded.
- Wired reconciliation sign-off into close invalidation after `payment.reconciliation.signed` is recorded.
- Added certificate payload hash recomputation before reconciliation certificate export.
- Added `payment.reconciliation.certificate.exported` business event recording and close invalidation after successful certificate export.
- Added certificate-hash-drift invalidation before export and blocked export when drift is detected.

## Files Changed In This Slice

- `services/accounting/close-assurance-pack.service.ts`
- `services/payments/statement-import.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/payments/__tests__/statement-import.service.test.ts`
- `services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`

## Focused Test Coverage Added

- Stale close evidence after provider statement import overlaps a certified close period.
- Reconciliation certificate hash drift before export invalidates close evidence and blocks export.

## Verification

Passed:

- `npm test -- services/payments/__tests__/statement-import.service.test.ts`
  - 1 suite passed, 6 tests passed.
- `npm test -- services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`
  - 1 suite passed, 4 tests passed.
- `npm test -- services/accounting/__tests__/close-assurance-pack.service.test.ts`
  - 1 suite passed, 7 tests passed.
- Relevant payment/close/action slice:
  - `npm test -- services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/payments/__tests__/statement-import.service.test.ts services/payments/__tests__/provider-operations.service.test.ts services/payments/__tests__/provider-event.service.test.ts services/payments/__tests__/payment-reconciliation.service.test.ts services/payments/__tests__/payment-reconciliation-workbench.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/accounting/__tests__/reconciliations.test.ts actions/accounting/__tests__/close-assurance.actions.test.ts`
  - 13 suites passed, 54 tests passed.
- `npm run prisma:validate`
  - Prisma schema is valid.
- Focused touched-file lint:
  - `npx eslint services/accounting/close-assurance-pack.service.ts services/payments/statement-import.service.ts services/reconciliation/payment-reconciliation-certification.service.ts services/payments/__tests__/statement-import.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts --ext .ts`
  - Passed.
- `git diff --check -- <touched files>`
  - Passed.

Blocked repo-wide gates:

- `npm run typecheck`
  - Failed on an unrelated existing file: `services/owner-war-room/owner-war-room.service.ts(305,24): error TS2304: Cannot find name 'buildOwnerMorningBrief'.`
- `npm run lint`
  - Failed on unrelated existing lint errors:
    - `components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx:5:40` react/display-name.
    - `config/__tests__/sidebar.test.ts:3:40` react/display-name.
  - Existing warnings also remain in `components/auth/EmailVerificationForm.tsx`, image usage sites, and `config/permissions.ts` anonymous default export.

## Gates

Passed for this slice:

- Payment statement import records durable payment business event before close invalidation.
- Reconciliation sign-off records signed certificate business event before close invalidation.
- Certificate export now records export audit, export business event, and close invalidation.
- Certificate hash drift blocks export and marks certified close evidence stale.
- Close invalidation stale state includes typed source metadata: source code, ring, domain, model, table, event name, and close impact.
- Existing close stale metadata, `close.certification.invalidated` event, ledger audit event, and certified-export stale updates are preserved.

Blocked outside this slice:

- Full repo typecheck and lint remain blocked by unrelated files listed above.

## Next Recommended Step

Continue the mesh with suspense posting, provider event capture, ledger reversals/posting changes, inventory valuation writes, payroll, compliance/country-pack changes, and permission/trust-rule changes.