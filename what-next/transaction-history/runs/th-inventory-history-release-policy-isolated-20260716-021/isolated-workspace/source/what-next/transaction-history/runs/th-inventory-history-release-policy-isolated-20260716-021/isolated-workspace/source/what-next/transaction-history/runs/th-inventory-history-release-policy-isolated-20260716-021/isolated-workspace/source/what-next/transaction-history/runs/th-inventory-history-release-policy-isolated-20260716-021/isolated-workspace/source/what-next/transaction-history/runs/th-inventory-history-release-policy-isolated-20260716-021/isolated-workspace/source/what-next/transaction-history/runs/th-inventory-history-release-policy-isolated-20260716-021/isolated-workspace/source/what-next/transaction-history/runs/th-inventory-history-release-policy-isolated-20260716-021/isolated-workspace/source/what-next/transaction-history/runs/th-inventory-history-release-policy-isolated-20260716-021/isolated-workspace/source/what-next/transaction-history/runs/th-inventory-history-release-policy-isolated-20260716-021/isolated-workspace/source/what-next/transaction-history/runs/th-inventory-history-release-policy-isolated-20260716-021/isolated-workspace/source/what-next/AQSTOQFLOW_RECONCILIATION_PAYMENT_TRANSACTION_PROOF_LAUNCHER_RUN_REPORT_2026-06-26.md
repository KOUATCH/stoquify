# AqStoqFlow Reconciliation Payment Transaction Proof Launcher Run Report - 2026-06-26

## Scope

Added a direct `payment.transaction` proof launcher to reconciliation suspense-ready transaction rows in `components/finance/PaymentReconciliationWorkbench.tsx`.

## Implementation

- Reused the existing `getProofTrailAction` contract for `payment.transaction` subjects.
- Reused `BIProofDrawerHost` and `ProofTrailDrawer`, extending them with optional loading and error rendering while preserving existing unavailable and redaction rendering.
- Added `paymentTransactionId` to `PaymentSuspenseReadyFailure` so row launchers use the real payment transaction proof subject rather than the payment row id.
- Rendered disabled proof buttons when a reconciliation row has no linked payment transaction proof subject.
- Kept RBAC delegated to the protected proof action and `SUBJECT_PERMISSION_MAP["payment.transaction"]`, which resolves to `payments.reconciliation.read`.

## Tests Added

- Successful row proof launch using `subjectType: "payment.transaction"` and the row `paymentTransactionId`.
- Redacted provider evidence rendering in the proof drawer.
- Unavailable proof state for rows without a transaction proof subject.
- Permission-denied action response rendering.
- Drawer loading state while proof is pending.
- Safe drawer error rendering when proof loading throws.
- Service assertion that payment-linked suspense failures carry `paymentTransactionId`.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/evidence/__tests__/proof-trail.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx services/payments/__tests__/payment-reconciliation-workbench.service.test.ts --runInBand
npm test -- --runTestsByPath services/evidence/__tests__/proof-trail.service.test.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx --runInBand
git diff --check -- components/finance/PaymentReconciliationWorkbench.tsx components/bi/BIProofDrawerHost.tsx components/evidence/ProofTrailDrawer.tsx services/payments/payment-reconciliation-workbench.service.ts components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx services/payments/__tests__/payment-reconciliation-workbench.service.test.ts messages/en.json messages/fr.json
```

Blocked by pre-existing unrelated typecheck issue:

```text
npm run typecheck
services/payroll/employee.service.ts(201,3): capturedAt is string | undefined but PayrollHrEvidenceReference expects Date | undefined.
```

## Notes

The proof launcher remains scoped to `payment.transaction`; no new proof domain or broader proof graph expansion was added.