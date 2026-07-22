# Stage 06 Frontend Delivery - Cash Payment

Status: PASS_FOR_DEV_TEST_HANDOFF

Implemented visible product frontend for the cash-payment transaction-history slice.

## Changed Files

- `app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.tsx`
- `components/finance/CashPaymentHistoryWorkbench.tsx`
- `components/finance/__tests__/CashPaymentHistoryWorkbench.test.tsx`
- `hooks/useCashPaymentHistoryWorkbench.ts`
- `hooks/__tests__/useCashPaymentHistoryWorkbench.test.ts`
- `messages/en.json`
- `messages/fr.json`
- `what-next/transaction-history/runs/th-cash-payment-security-accounting-remediation-20260717-024/run-manifest.json`
- `what-next/transaction-history/runs/th-cash-payment-security-accounting-remediation-20260717-024/slices/cash-payment/06-frontend-delivery-command-log.md`

## Product Result

The cash/payment history is now visible through a locale-aware finance route:

- `/[locale]/dashboard/finance/cash-payment-history`

The route is protected by the finance route access boundary and accepts cashier/POS and finance/payment permissions. The frontend consumes `getCashPaymentHistoryAction` and renders the server-owned result through `TransactionHistoryWorkbenchShell`.

## Implemented UX Contract

- Complete-history page label and organization-timezone metadata.
- Server-owned KPIs for transaction count, expected cash, cash variance, and electronic tenders.
- Action queue for partial sources, cash variance, and unresolved payments.
- URL state for lane, location, cashier, payment method, payment status, cash type, date range, effective-as-of, page size, cursor, and selected row.
- Cursor and selected row reset when filters change.
- Export preparation through `prepareCashPaymentHistoryExportAction`; no client-visible row export.
- One shared details drawer with cash/payment identity, source attribution, physical cash impact, payment/reconciliation state, provider reference redaction context, and neutral proof-unavailable messaging.
- EN/FR message coverage for visible copy and enum labels.

## Verification

- JSON messages parse: PASS.
- Focused ESLint: PASS.
- Focused frontend tests: PASS, 2 suites / 4 tests.
- Combined backend + frontend focused tests: PASS, 7 suites / 23 tests.
- `git diff --check`: PASS after message EOF cleanup.
- Temporary Next route smoke: PASS for route registration/auth boundary, `HTTP/1.1 307 Temporary Redirect` to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance%2Fcash-payment-history`.

## Residual Release Risks

- Full `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=8192` timed out after 240s without diagnostics.
- Authenticated Playwright screenshots, 320px visual overflow check, keyboard traversal, drawer focus restoration, and automated accessibility scan were not completed in this pass.
- No production release claim is made by this stage alone; Stage 07 must treat these as release-review gates.
- Client/customer, supplier/AP, customer/AR, and party-specific cashier history pages remain outside this cash-payment slice.

## Stage 07 Handoff

Stage 07 is eligible for release review of the cash-payment slice, but should not mark release-ready until the full typecheck and browser/accessibility checks are either passed or explicitly waived with stronger evidence.
