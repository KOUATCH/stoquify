# Finance Dashboard Color Semantics Upgrade

Date: 2026-06-19

## Scope

- Replaced finance-local palette classes with the system dashboard token layer for the finance command center, specialized ledger surfaces, and cash drawer finance route.
- Added `components/finance/finance-dashboard-theme.ts` to centralize dashboard tone, severity, panel, row, empty-state, and stat-card class mappings for finance pages.
- Moved `/dashboard/finance/tax-rates/create` onto the existing semantic `TaxRatesManagementDashboard` create surface instead of the legacy standalone tax-rate form wrapper.

## Covered Routes

- `/dashboard/finance`
- `/dashboard/finance/analytics`
- `/dashboard/finance/cash-flow`
- `/dashboard/finance/costs`
- `/dashboard/finance/profit-loss`
- `/dashboard/finance/profitability`
- `/dashboard/finance/retail`
- `/dashboard/finance/sales`
- `/dashboard/finance/payments`
- `/dashboard/finance/receivables`
- `/dashboard/finance/payables`
- `/dashboard/finance/cash-drawer`
- `/dashboard/finance/tax-rates/create`

## Verification

- `rg` scan confirmed the upgraded finance route surfaces no longer carry the old slate/blue/emerald/amber/rose utility palette in the touched dashboard shells.
- `npx eslint --no-error-on-unmatched-pattern ...` passed for the touched finance routes and dashboard components.
- `npm run typecheck` passed.
