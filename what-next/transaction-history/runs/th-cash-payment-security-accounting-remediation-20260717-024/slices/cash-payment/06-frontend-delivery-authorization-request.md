# Stage 06 Frontend Delivery Authorization Request - Cash Payment

Run: `th-cash-payment-security-accounting-remediation-20260717-024`
Slice: `cash-payment`
Requested stage: `stoquify-transaction-history-06-frontend-delivery`
Mode: `implement`

## Why This Is Needed

Stage 05 passed as a UX/product handoff, but Stage 06 cannot implement visible product UI while the run manifest only allows Stage 06 evidence files. To make the cash/payment transaction-history work visible in the application, Stage 06 needs explicit product-file authorization.

## Preconditions Already Met

- Stage 02 security proof gate: PASS
- Stage 03 accounting control gate: PASS
- Stage 04 read-model optimizer: PASS
- Stage 05 workbench UX contract: PASS
- Current run artifact validation: PASS before this request

## Exact Requested Allowlist

Evidence files:

- `what-next/transaction-history/runs/th-cash-payment-security-accounting-remediation-20260717-024/slices/cash-payment/06-frontend-delivery.md`
- `what-next/transaction-history/runs/th-cash-payment-security-accounting-remediation-20260717-024/slices/cash-payment/06-frontend-delivery.json`
- `what-next/transaction-history/runs/th-cash-payment-security-accounting-remediation-20260717-024/slices/cash-payment/06-frontend-delivery-command-log.md`

Product route and frontend files:

- `app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.tsx`
- `components/finance/CashPaymentHistoryWorkbench.tsx`
- `components/finance/__tests__/CashPaymentHistoryWorkbench.test.tsx`
- `hooks/useCashPaymentHistoryWorkbench.ts`
- `hooks/__tests__/useCashPaymentHistoryWorkbench.test.ts`
- `messages/en.json`
- `messages/fr.json`

Conditionally allowed only if the existing shell lacks a needed generic prop, with no business semantics added there:

- `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx`
- `components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx`

## Forbidden Files

Do not edit services, actions, schemas, migrations, RBAC/auth, accounting, proof, export safety, redaction policy, global styles, generic primitives, unrelated routes, or unrelated locale keys during Stage 06.

## Required Stage 06 Evidence

Stage 06 must return PASS only if it creates visible cash/payment transaction-history UI and records:

- exact edits
- focused tests
- focused lint/typecheck where available
- EN/FR message coverage
- URL state and cursor reset behavior
- robust states
- mobile 320px check
- keyboard/drawer accessibility check
- residual risks, especially full typecheck heap OOM if still unresolved

## Recommended Manifest Patch After Approval

Replace `run-manifest.json` `stageAllowlists["06"]` with the exact requested allowlist above, then run Stage 06 as a frontend product implementation task. After Stage 06 PASS, Stage 07 release review becomes eligible.
