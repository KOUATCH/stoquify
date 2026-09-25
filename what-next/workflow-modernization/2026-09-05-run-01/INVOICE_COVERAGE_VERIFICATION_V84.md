# v84 — Invoice payment/credit coverage

Evidence date: 2026-09-08. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with existing unrelated uncommitted work preserved. Final file hashes are in `evidence/source-baseline-v84-final.json` and `evidence/invoice-coverage-v84.json`; the earlier v84 baseline is preliminary and retained.

## Delivered corrections

Payment completion uses the locked credit-aware outstanding amount. Credit posting and reversal refresh the invoice status in the same transaction without changing cash paid. Reversal locks the invoice before the supplier, matching the payment lock order. Exact replay preserves later state. A negative remaining amount stays a supplier credit position.

Real service execution exposed two additional blockers: nested return/credit lines incorrectly supplied a tenant field inherited from their parent relation, and credit posting rejected receipt-based invoices with a null purchase-order header. Removed only the redundant nested field; parent tenant checks remain. Accept a null header while retaining exact receipt/order/item lineage validation and rejection of a conflicting explicit header.

Existing PAID enum wording now means covered by payments/credits in EN/FR invoice surfaces. AP history detail uses the same translated state as the table. Shared DetailDrawer accepts an optional close-focus callback and localized close label; history remembers its opener. The browser exposed that AP detail selection also invoked the filter-loading transition, which removed that opener. Detail selection now updates its existing URL without triggering that data loader; filter transitions keep their behavior.

## Passed verification

All commands use the bundled Node executable directly, without npm lifecycle hooks, migrations or seeds. Working directory is the repository root.

| Check | Result / receipt |
| --- | --- |
| Focused Jest, final session 60697 | 131 tests in 11 suites passed; `evidence/invoice-coverage-final-v84-3.json` |
| PostgreSQL service verification, session 24297 | Eight checks passed; `lanes/environment/invoice-coverage-12538a14-3c8.json` |
| Actual application browser, session 13593 | EN/FR, four stages each, 14 screenshots, zero page errors; `lanes/environment/invoice-coverage-browser-56370d48-4d3.json` |
| Full typecheck | `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`; final session 64418. Terminal result retained in the consolidated receipt. Earlier shared-component typecheck 92917 also passed. |
| Changed-file lint | Service/test session 42428, AP history 27892, shared components/test 26188, final hook/test 4862; passed |

Final Jest command:

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/purchasing/__tests__/supplier-payment-balance.test.ts services/purchasing/__tests__/ap-control.service.test.ts services/purchasing/__tests__/purchase-return-credit.service.test.ts services/purchasing/__tests__/ap-history-financial.test.ts services/purchasing/__tests__/payment-request-read.service.test.ts components/purchasing/__tests__/APHistoryWorkbench.test.tsx components/purchasing/__tests__/InvoiceApprovalWorkbench.test.tsx components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/finance/__tests__/CashPaymentHistoryWorkbench.test.tsx hooks/__tests__/useAPHistoryWorkbench.test.ts hooks/__tests__/useAPHistoryWorkbench.scope.test.tsx --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/invoice-coverage-final-v84-3.json
```

Changed-file lint used `node node_modules/eslint/bin/eslint.js` for `services/purchasing/{supplier-payment-balance.ts,ap-control.service.ts,purchase-return-credit.service.ts,__tests__/supplier-payment-balance.test.ts,__tests__/purchase-return-credit.service.test.ts}`, `components/purchasing/{APControlWorkbench.tsx,APHistoryWorkbench.tsx}`, `components/dashboard/{history/TransactionHistoryWorkbenchShell.tsx,primitives/command-center-primitives.tsx,primitives/__tests__/command-center-primitives.test.tsx}`, and `hooks/{useAPHistoryWorkbench.ts,__tests__/useAPHistoryWorkbench.scope.test.tsx}`. Braces describe the file list, not a PowerShell expansion command.

Database and browser commands are the retained `lanes/environment/verify-invoice-coverage.cjs` and `verify-invoice-coverage-browser.cjs`. Each asserts the owned localhost database before synthetic writes; they ran sequentially. The application is `http://127.0.0.1:3110`, owned database `stoquify_local_registration_20260906_01`; outbound browser requests are fenced. Both receipts verify bound source stability and unchanged non-fixture records.

Database checks cover partial cash plus credit, final payment, credit reversal, payment/credit replay after reopening, nested tenant inheritance, actual return reversal, negative supplier credit position and concurrent execution/reversal. Negative unit cases cover wrong receipt, order and item provenance for a null-header invoice. Fixtures invoke actual receiving/invoice/payment/credit services, with trusted synthetic credit/return actor scope; this is not proof of those public action authority boundaries.

Browser checks cover current covered/reopened amounts, localized invoice detail, localized close button, eight Tab steps contained in the drawer, Escape returning focus, widths 390 and 768, 200% text without document horizontal overflow, and current-role denial without financial KPIs. These are bounded assertions, not full accessibility certification. Screenshots are actual viewport captures, not complete-page coverage. French mobile and English reopened desktop captures were visually inspected. Development load timings are observations in the browser receipt, not approved production budgets.

## Retained failed attempts

- Initial real-service runs exposed nested `organizationId` rejection and the incompatible invoice-header query; receipts `invoice-coverage-59b5722f-b60.json` and `invoice-coverage-379364fa-e68.json`. Both defects were corrected before the final eight-check run.
- Browser `0ea3505f-a57` exposed raw PAID in invoice details. `ac8f19e0-acb` and `2ad152bd-92f` exposed focus return failure. The latter showed that forwarding a focus callback alone was insufficient; the AP loading transition also destroyed the table opener. Final browser verification includes the corrected hook hash.
- Session 15409 could not retain receipt `55cc1794-6de` due to filesystem EPERM. Its outcome is not counted as a pass; the final scoped run retained its full result. This was a filesystem restriction, not an automatic approval-review rejection.
- Earlier 71/114/122-test runs and the 20-test hook/shared recheck remain historical intermediate evidence. Final combined evidence is 131 tests, not their sum.

## Remaining boundaries and rollout

No migration, production deployment, live bank payment, external notification, X1 clearance or certification occurred. Existing invoice statuses were not silently backfilled. Historical status repair, full public credit/return authority and lifecycle, retained obligations, no-journal reversal period handling, broader close/reconciliation, native assistive technology and inherited shell localization remain engineering work. `reversePurchaseCorrectionLedgerInTx` currently returns before its period lookup when the original journal is absent; this is the next priority finding, not an external approval dependency.

Use [the operator and input guide](SUPPLIER_INVOICE_COVERAGE_GUIDE.md) for routes, ownership, source documents and recovery. Preserve all retained financial events on rollback. This batch does not mark any whole workflow or the overall assignment complete.
