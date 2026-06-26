# Finance Specialized Surfaces Implementation Report

Date: 2026-06-19

## Scope

Replaced the generic finance alias pages for:

- `/[locale]/dashboard/finance/payments`
- `/[locale]/dashboard/finance/receivables`
- `/[locale]/dashboard/finance/payables`

Each route now renders a specialized ledger surface instead of the shared `FinanceCommandCenterDashboard` wrapper.

## Implementation

- Added `components/finance/FinanceSpecializedLedgerSurfaces.tsx`.
- Updated the three route pages to import `FinancePaymentsSurface`, `FinanceReceivablesSurface`, and `FinancePayablesSurface`.
- Added route metadata for payments, receivables, and payables.
- Added bilingual copy under `financeSurfaces` in `messages/en.json` and `messages/fr.json`.

## Data Sources Reused

No service or Prisma query changes were made.

The new surfaces reuse:

- `useFinanceDashboard`
- `getFinanceDashboardAction`
- `getFinanceDashboard`
- `FinanceDashboardData` summary, aging, payment method, recent payment, alert, location, and organization currency fields

## Surface Behavior

- Payments focuses on captured payments, pending clearance, tender mix, recent payment direction, cash drawer variance, reconciliation, POS, and cash-flow workflows.
- Receivables focuses on customer AR aging, overdue exposure, recent inbound receipts, customer ledger links, sales workflows, and collection assurance.
- Payables focuses on supplier AP aging, overdue payment attention, purchase exposure, recent outbound disbursements, AP workbench links, purchase orders, suppliers, reconciliation, and cash planning.

## Verification

- `npm run typecheck` passed.
- Focused ESLint passed for:
  - `components/finance/FinanceSpecializedLedgerSurfaces.tsx`
  - `app/[locale]/(dashboard)/dashboard/finance/payments/page.tsx`
  - `app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx`
  - `app/[locale]/(dashboard)/dashboard/finance/payables/page.tsx`
- Confirmed the three touched routes no longer import `FinanceCommandCenterDashboard`.

## Notes

The worktree already contains unrelated modified and untracked files. They were not changed as part of this implementation.
