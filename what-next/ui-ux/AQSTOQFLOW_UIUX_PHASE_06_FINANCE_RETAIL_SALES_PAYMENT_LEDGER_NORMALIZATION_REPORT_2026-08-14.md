# Finance Retail and Sales payment-ledger normalization

Date: 2026-08-14  
Scope: `/en/dashboard/finance/retail` and `/en/dashboard/finance/sales`

## Outcome

The Retail and Sales `Recent payments` sections now use the same shared enhanced payments ledger as the Receivables reference surface. The underlying dashboard query, payment records, money formatting, localized labels, and workflow links remain unchanged.

Both routes now expose:

- Search across payment, counterparty, processor, method, status, and amount.
- Status and method filters.
- From/to date filters.
- Sort controls for Payment, Counterparty, Method, Status, Amount, and Time.
- Column visibility controls.
- Configurable rows per page and first/previous/next/last pagination.
- Filtered result counts and responsive, contained table scrolling.

## Surgical implementation

- Updated `components/finance/FinanceCommandCenterDashboard.tsx` to select the existing `FinanceSpecializedLedgerSurfaces.PaymentsTable` when the live Finance view is `retail` or `sales`.
- Preserved the simpler table for other dashboard views that have not been normalized to the enhanced ledger.
- Added route-level interaction coverage in `components/finance/__tests__/FinancePaymentsTable.test.tsx` for both Retail and Sales.
- No API, service, hook, database, accounting calculation, RBAC, entitlement, or localization changes were made.

## Automated verification

- Focused ESLint: passed.
- Focused Jest: passed, 1 suite / 18 tests.
- New route tests confirm all ledger controls and exercise Amount sorting plus next-page navigation on both routes.
- Full `npm run typecheck`: blocked by unrelated existing repository diagnostics. Neither edited Finance file appears in the diagnostics. Existing failures include generated Sales route typing, accounting call signatures, assurance route imports, inventory/settings route typing, notification module typing, inventory Blob typing, and supplier E2E typing.

## Authenticated browser verification

| Route | Viewport | Controls | Pagination | Page overflow |
| --- | ---: | --- | --- | --- |
| Sales | Wide desktop (configured 1440px; measured client 1781px due browser scaling) | Search, 2 filters, 2 dates, columns, 6 sort buttons | Page 1 of 6; next moved to Page 2 of 6 | `scrollWidth 1781 = clientWidth 1781` |
| Retail | Wide desktop (configured 1440px; measured client 1781px due browser scaling) | Search, 2 filters, 2 dates, columns, 6 sort buttons | Page 1 of 6 | `scrollWidth 1781 = clientWidth 1781` |
| Retail | Mobile (measured 391px) | Toolbar wraps across 6 control rows | Next-page control present | `scrollWidth 391 = clientWidth 391` |
| Sales | Mobile (measured 391px) | Search width 284px; toolbar width 309px; 6 sort buttons | Next-page control present | `scrollWidth 391 = clientWidth 391` |

The mobile ledger table measures 1040px inside a 308px `overflow-x: auto` wrapper, keeping horizontal scrolling local to the table instead of creating page-level overflow.

Sales interaction evidence:

- Initial first row: `PAY-20260810-4LNHZRC`.
- After sorting Amount ascending: `CMP005-PAY-001` at `FCFA 10,750`.
- After Next page: `CMP005-PAY-011`, with the pagination label updated to `Page 2 of 6`.

Browser console error check: no errors recorded.

## Controls preserved

- Accounting truth and monetary calculations were not touched.
- Tenant, RBAC, entitlement, fresh-auth, and maker-checker boundaries were not touched.
- No workflow action, payment record, or route was added, removed, duplicated, or redirected.
- Existing dirty-worktree changes were preserved.
