# Information Architecture — Branch Manager Control Center

## Primary Persona (locked)
**Branch Manager.** Owns one physical branch. Opens the dashboard at 8am before the floor opens. Cares about: are my terminals safe to open, did yesterday's shift close clean, am I on track for today's target, what's about to run out, what's stuck waiting for me to approve. Does NOT care about: org-wide metrics, customer lifetime value, vendor analytics, accounting close.

## The 8am questions (3 answers in 5 seconds)
1. **Are all my cash drawers in a known-good state?** (closed and reconciled from yesterday, or correctly open at an active terminal)
2. **Am I on pace for today's sales target?** (with progress vs. target and trajectory vs. same-weekday-last-week)
3. **What's blocking the floor right now?** (low-stock items at risk of stockouts + purchase orders waiting on my approval)

Everything else is a second-glance widget.

## Action zone (what needs me today)
- Purchase orders in SUBMITTED state waiting for approval (the manager is the approver in this branch's workflow)
- Low-stock items at or below reorder point that have no open PO covering them

## Trend strip (the one trend always worth watching)
- 14-day daily revenue line for this branch, with a target overlay. Not "all-time chart" — operators don't need that.

## Shortcuts (3-5)
- Open POS terminal
- Create purchase order
- Adjust stock (count / shrinkage)
- View today's sales report

## Live feed
- Recent POS sessions opened/closed at this branch (last 10)
- Recent inventory adjustments at this branch (last 10)

## Cut from scope (explicitly NOT on this dashboard)
- Customer LTV, customer acquisition, customer cohort (this is a branch ops surface, not CRM)
- Accounting close, P&L (excluded domain AP/AR per `project_excluded_domains.md`)
- HR / shift schedules / time clocks (excluded domain Presence/HR)
- ClientOrder pipeline (excluded domain)
- Commercial agent performance (excluded domain)
- Org-wide multi-branch comparison (different persona — owner dashboard, not this one)

---

## Widget → Real StockFlow data source mapping

The user named four widgets. Each is mapped below to a concrete file path in the StockFlow codebase. If the underlying action/hook does not yet exist, the row is marked `needs new aggregation in actions/analytics/` per the project override skill.

### 1. Open cash drawers (operational status strip)

| Concern | Path | Status |
|---|---|---|
| Server action (read open sessions for branch) | `actions/pos-session-actions.ts` → `getActiveSession(terminalId)` | EXISTS but per-terminal only; aggregation across the branch's terminals does not yet exist |
| Hook (current stub) | `hooks/useAllCashDrawerHooks.ts` → `useCashDrawerStatus(orgId)` | EXISTS BUT IS A STUB — returns `EMPTY_STATUS`. Documented at top of file: "STATUS: Stub implementations… server actions to authorize cash drawer queries have not been wired through yet." |
| What's actually queryable today | `db.pOSSession.findMany({ where: { status: "ACTIVE", terminal: { organizationId: orgId, locationId } }, include: { terminal: true, user: true, cashDrawerTransactions: { orderBy: { createdAt: "desc" }, take: 1, include: { cashDrawer: true } } } })` | The underlying Prisma model supports this — the action just doesn't expose it yet |
| Recommended new action | `actions/analytics/getBranchOpenDrawers.ts` exporting `getBranchOpenDrawers({ locationId })` returning `{ terminalId, terminalName, sessionId, cashierName, openedAt, openingBalance, lastTransactionAt, currentBalance }[]` | **needs new aggregation in `actions/analytics/`** |
| Recommended new hook | `hooks/dashboard/useBranchOpenDrawers.ts` wrapping the above action in TanStack Query with `refetchInterval: 30_000` (per override skill's real-time strategy) | **needs new hook** |
| Sample widget file (Phase 4) | `app/[locale]/(dashboard)/dashboard/_components/cash-drawers-strip.tsx` | written in this run |

### 2. Today's sales vs target

| Concern | Path | Status |
|---|---|---|
| Closest existing server action | `actions/analytics/requestDailySalesReport.ts` → `requestDailySalesReport({ locationId, date })` | EXISTS but is an **async Inngest job kickoff** — returns `{ jobId }`, not data. The actual aggregation lives in `lib/inngest/functions/daily-sales-report.ts` and writes to a `DailySalesReport` table. |
| Closest existing hook | `hooks/useDailySalesReporting.ts` → `useDailySalesReporting(date, locationId, orgId)` | EXISTS BUT IS A STUB — returns empty defaults. Top of file: "STATUS: Stub implementation. No server actions exist for daily sales aggregation yet." |
| What's actually queryable today | Either: (a) read the most recent finalized `DailySalesReport` row for `(locationId, today)`, or (b) sum `POSSession.cashDrawerTransactions` of type `SALE` for the branch's terminals since midnight | Both Prisma paths work; choice depends on whether yesterday's nightly job already ran for today's snapshot |
| Branch sales target source | No `SalesTarget` model in scope today — needs either a config setting on `Location` or a small new `BranchSalesTarget` table. Flag as a follow-up; for v1, store branch monthly target in `Location.metadata` or accept a fixed default | **needs schema + new aggregation action** |
| Recommended new action | `actions/analytics/getBranchTodaySales.ts` exporting `getBranchTodaySales({ locationId })` returning `{ revenueToday, transactionsToday, target, paceVsTarget, comparisonSameWeekdayLastWeek }` | **needs new aggregation in `actions/analytics/`** |
| Recommended new hook | `hooks/dashboard/useBranchTodaySales.ts` (no real-time polling needed; invalidate after POS session close mutations) | **needs new hook** |

### 3. Stock that's running low

| Concern | Path | Status |
|---|---|---|
| Server action — low-stock filter | `actions/inventory/inventoryAlerts.ts` → `getLowStockItems(threshold)` and `getInventoryAlerts()` | EXISTS AND IS REAL — returns `{ lowStock, outOfStock, overStock }` partitioned from `getInventoryLevels()`. Already respects `reorderPoint` per item. |
| Underlying levels source | `actions/inventory/getInventoryLevels.ts` → `getInventoryLevels(locationId?)` | EXISTS AND IS REAL — accepts optional `locationId` (branch-scoped) |
| Hook | `hooks/use-inventory.ts` → `useInventoryLevels(locationId)` and `useLowStockItems(threshold)` | EXISTS AND IS REAL — uses `useState`/`useEffect` (not TanStack Query — see note below) |
| Architectural note | `hooks/use-inventory.ts` does NOT use TanStack Query, unlike the rest of the codebase. For the dashboard widget, write a thin TanStack Query wrapper: `hooks/dashboard/useBranchLowStock.ts` calling `getInventoryAlerts()` with `refetchInterval: 60_000` per the override skill's real-time strategy. Do NOT add `services/` layer. | minor wrapper |
| Recommended new hook | `hooks/dashboard/useBranchLowStock.ts` | **needs thin TanStack-Query wrapper hook** (action exists) |

### 4. Pending purchase approvals

| Concern | Path | Status |
|---|---|---|
| Server action | `actions/purchaseOrderWorkflow/purchase-order.actions.ts` → `getPurchaseOrdersRequiringAttention(limit?)` | EXISTS AND IS REAL — delegates to `POService.getRequiringAttention(orgId, limit)`. Returns POs in states that need operator action (SUBMITTED for approval, RECEIVED awaiting close, etc.) |
| Complementary action | `actions/purchaseOrderWorkflow/purchase-order.actions.ts` → `getPurchaseOrdersSummary()` | EXISTS AND IS REAL — returns aggregate counts by status. Use it for the section header badge "3 awaiting approval". |
| Workflow mutation hook | `hooks/purchaseOrderWorkflowHooks/usePurchaseOrderWorkflow.ts` → `usePurchaseOrderWorkflow(poId, orgId, userId)` | EXISTS AND IS REAL — exposes `executeAction("approve" / "cancel" / etc.)` with confirmation flow. Reuse for inline approve buttons in the widget. |
| Branch-scope gap | `getPurchaseOrdersRequiringAttention()` filters by `organizationId`, NOT by branch/location. For a branch-manager-scoped view, either (a) add a new `getBranchPurchaseOrdersRequiringAttention({ locationId, limit })` action, or (b) filter client-side in the hook (acceptable while result sets are small). Recommended: add the server-side variant. | **needs branch-scoped variant in `actions/purchaseOrderWorkflow/`** |
| Recommended new hook | `hooks/dashboard/useBranchPendingApprovals.ts` wrapping the new branch-scoped action | **needs new hook** |

---

## Real-time refresh policy (per override skill)
- Cash drawers strip: poll every 30s
- Today's sales: refetch on POS close mutation invalidation; no polling
- Low stock: poll every 60s
- Pending approvals: refetch on approve/reject mutation; manual refresh button; no polling

## Mobile strategy
- Cash drawers strip → collapses to a single status pill with count + tap-to-sheet
- Today's sales → full-width hero card, no comparison column
- Low stock → keep table but reduce columns to (item, qty, action)
- Pending approvals → keep, reduce metadata to (PO #, supplier, total, approve/decline)

## RBAC notes
- Verify role gates server-side in each new action via the existing `requireOrg()` + permission check pattern used in `actions/pos-session-actions.ts` (`can(user, "pos.create")`, etc.).
- Pending-approvals widget visible only to roles with `purchase-order.approve` permission. Branch manager has this; cashier does not.
- Cash drawers strip visible to anyone with `pos.read`.
- Low stock visible to anyone with `inventory.read`.

## Excluded-domain check (per override skill)
Confirmed nothing in this IA touches:
- Presence/HR
- AP/AR
- ClientOrder
- Commercial agents

The phrase "across their branch" was tempting toward HR (open shifts) and AR (invoices owed). Both were considered and rejected — they're excluded by schema design.
