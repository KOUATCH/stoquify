# Purchase Order Analytics Modernization

Date: 2026-08-14  
Status: Implemented — analytics-only scope

## Outcome

Stoquify now has a localized, tenant-scoped purchase-order analytics route at `/dashboard/purchase-orders/analytics`. The route turns existing purchase-order, line-item, supplier, location, and goods-receipt records into a management dashboard without introducing or copying purchase-order creation, submission, approval, receiving, cancellation, deletion, or closing commands.

## Delivered analytics

| Signal | Definition |
| --- | --- |
| Ordered value | Sum of non-cancelled purchase-order totals in the selected order-date window. |
| Average order value | Ordered value divided by non-cancelled orders. |
| Open goods commitment | Remaining line quantity multiplied by purchase-order unit cost for draft, submitted, approved, and partially received orders. |
| Receipt progress | Received units divided by ordered units, excluding cancelled orders. |
| Overdue exposure | Open commitment on orders whose expected delivery date has passed. |
| Approval cycle | Created-to-approved duration with average, median, P90, and sample size. |
| On-time delivery | Received/completed orders delivered by the expected date, only when expected-date and delivery evidence exist. |
| Completion rate | Received or completed orders divided by non-cancelled orders. |
| Supplier concentration | Highest supplier ordered value divided by total ordered value. |
| Operational slices | Monthly trend, persisted status mix, supplier performance, location performance, top items, and open-order aging. |
| Exception watchlist | Overdue, approval-waiting, receipt-waiting, and partially received purchase orders with read-only detail links. |
| Data trust | Expected-date, approval-evidence, and delivery-evidence coverage with denominator sizes. |

The dashboard supports 30-day, 90-day, 12-month, and all-time URL-driven views. It includes English and French presentation copy, responsive charts and tables, an empty state, evidence/sample labels, organization currency formatting, and links back to existing read-only purchase-order details.

## Security and control boundary

- The route uses the shared `withPurchaseOrdersSurfaceAccess` server wrapper.
- The route catalog requires `purchases.orders.read` and maps the surface to the `purchasing` module with read intent.
- `organizationId` comes from the authenticated RBAC context, not from query-string or client input.
- The read model filters soft-deleted purchase orders and cancelled goods receipts.
- The analytics route and component contain no mutation hook, mutation function, or purchase-order workflow command.
- No Prisma schema change, migration, database procedure, or duplicate purchase-order lifecycle was added.

## Files

- `types/purchase-order-analytics.ts` — analytics DTO contract.
- `services/purchase-order/purchase-order.service.ts` — canonical purchase-order analytics read model.
- `components/purchase-orders/PurchaseOrderAnalyticsDashboard.tsx` — responsive bilingual analytics presentation.
- `app/[locale]/(dashboard)/dashboard/purchase-orders/analytics/page.tsx` — localized protected route.
- `app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts` — route permission/module registration.
- `app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx` — analytics CTA target.
- `config/sidebar.ts` — purchasing navigation entry.
- Focused service, presentation, read-only boundary, route-access, and route-catalog tests.

## Verification

| Check | Result |
| --- | --- |
| Focused Jest suites | Pass — 4 suites, 6 tests. |
| Focused TypeScript project | Pass. |
| Targeted ESLint | Pass. |
| Prisma validation | Pass. |
| Service boundary gate | Pass — 0 active violations. |
| Inventory boundary gate | Pass — 0 active violations. |
| Purchasing/AP consolidation gate | Pass — 11/11 checks ready, 0 blockers. |
| Mutation-source scan | Pass — no analytics-route mutation command or hook references. |
| Repository-wide `npm run typecheck` | Inconclusive — twice exceeded execution limits without emitting diagnostics; focused TypeScript validation passed. |
| Module surface inventory | The navigation was detected correctly. Its page scanner reported the shared access-wrapper pattern as unguarded, the same heuristic false positive it reports for all existing purchase-order pages. Explicit route-access tests verify the real permission and module contract. |

## Interpretation limits

- “Ordered value” is purchase-order commitment, not invoiced, paid, or ledger-posted spend.
- Status analytics use each order's current persisted status; they do not reconstruct historical status as of a prior date.
- On-time delivery is reported only for orders with both expected-date and delivery evidence. Coverage and sample size are surfaced so a low-evidence population is not presented as certainty.
- Open commitment uses purchase-order line unit cost and remaining quantity; it does not claim statutory valuation or accounts-payable liability.
