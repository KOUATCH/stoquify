# Finance Payment Mix and command CTA normalization

Date: 2026-08-14

## Scope

Reference surface:

- `/en/dashboard/finance/payments`

Normalized shared Finance dashboard routes:

- `/en/dashboard/finance`
- `/en/dashboard/finance/analytics`
- `/en/dashboard/finance/cash-flow`
- `/en/dashboard/finance/costs`
- `/en/dashboard/finance/profit-loss`
- `/en/dashboard/finance/profitability`
- `/en/dashboard/finance/retail`
- `/en/dashboard/finance/sales`

## Outcome

Every applicable shared Finance dashboard now renders the exact Payment Mix component used by the dedicated Payments route. The shared component provides:

- Captured volume.
- Transaction count.
- Average payment.
- Leading method and captured-volume share.
- Per-method amount, payment count, captured-volume share, and relative bar.
- The same responsive auto-fit grid, empty state, styling, formatting, and localization keys.

The identical three Finance command CTAs (Reconciliation, Order payments, and Cash flow) now use the below-content responsive grid on all eight shared routes. They occupy one row at wide desktop widths and wrap instead of compressing on mobile.

## Surgical implementation

- Exported the Payments-route mix renderer as `FinancePaymentMethodBreakdown` from `components/finance/FinanceSpecializedLedgerSurfaces.tsx`.
- Reused that component in `components/finance/FinanceCommandCenterDashboard.tsx` and removed the simpler duplicate renderer.
- Reused the canonical Payments description on shared dashboards.
- Set the shared Finance command header's action placement to `below-content`, which uses the established three-column desktop grid.
- No service, API, hook, database, monetary calculation, workflow link, RBAC, entitlement, or localization changes were made.

## Route-level regression coverage

The focused Finance test matrix renders all eight shared routes and confirms for each route:

- The canonical Payment Mix test hook and responsive grid template are present.
- The four canonical summary cards are present.
- The expected method-card count is preserved from the dashboard payload.
- The canonical Payments description is present.
- All three command CTA links share the same responsive action grid outside the metadata aside.
- Existing final-two-section ordering and workflow actions remain intact.

## Automated verification

- Focused ESLint: passed.
- Focused Jest: passed, 1 suite / 18 tests.
- Full `npm run typecheck`: blocked by unrelated existing repository diagnostics. None of the edited Finance files appears in the output. Existing failures include generated Sales route typing, accounting call signatures, assurance route imports, inventory/settings route typing, notification module typing, inventory Blob typing, and supplier E2E typing.

## Authenticated browser verification

Wide desktop was configured at 1440px; browser scaling produced a measured 1781px client width.

| Route | Payment Mix | CTA positions | Page overflow |
| --- | --- | --- | --- |
| Payments reference | 5 cards; canonical four summary labels plus Cash method | Not applicable | `1781 = 1781` |
| Profit & Loss | 5 cards; same four summary labels plus Cash method | Y: `288, 288, 288`; widths: `228, 228, 228` | `1781 = 1781` |
| Cash Flow | 5 cards; same four summary labels plus Cash method | Y: `356, 356, 356`; widths: `228, 228, 228` | `1781 = 1781` |

Mobile Cash Flow verification at a measured 391px client width:

- The three CTAs wrap to three 325px rows at Y positions `576, 624, 672`.
- All five Payment Mix cards measure 309px inside the 309px mix grid.
- Document `scrollWidth 391 = clientWidth 391`; no page-level overflow.
- No browser console errors were recorded.

## Controls preserved

- Payment amounts, counts, methods, and aggregation inputs remain service-owned.
- Tenant scoping, permissions, module access, fresh-auth, and maker-checker controls were not touched.
- No CTA was added, removed, duplicated, or redirected.
- Existing dirty-worktree changes were preserved.
