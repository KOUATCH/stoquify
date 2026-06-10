# Active Surface Map For Accounting Backbone

Date: 2026-06-09

Purpose: identify the active operational paths that may eventually emit accounting commands. This map prevents the accounting engine from binding to legacy, duplicate, or draft implementations before the ledger kernel is proven.

Status: Phase 0 baseline. No operational flow should post to the general ledger until manual journals, posting, reversal, period locking, source idempotency, and trial balance are implemented and tested.

## Architecture Anchors

- Authentication and tenant resolution: `lib/auth-server.ts`, `lib/security/rbac.ts`, `services/_shared/require-org.ts`, `services/_shared/protect.ts`.
- Permission compatibility: `config/permissions.ts`, `lib/security/rbac-permissions.ts`.
- Locale-safe routes: `i18n/routing.ts`, `app/[locale]/layout.tsx`.
- Graphify refreshed on 2026-06-09: `graphify-out/GRAPH_REPORT.md` reports 554 files, 2,221 nodes, 3,008 edges, and 72 communities.
- Graphify hubs reviewed: `requireOrg()`, `scopedOrg()`, `getSession()`, `hasAppPermission()`, `getFinanceDashboard()`, `commitPOSSale()`.

## Active Source Path Detail

These are the active chains to map before touching accounting code. They identify the service boundary where future accounting commands may attach after the accounting kernel is implemented.

| Source | Active Chain | Current Aggregates Touched Or Read | Future Accounting Attachment |
| --- | --- | --- | --- |
| POS sale | `app/[locale]/(dashboard)/dashboard/pos/page.tsx` -> `components/pos/ProfessionalPOSSystem.tsx` -> `hooks/posHooks/usePosOperations.ts` -> `actions/pos/tender.actions.ts` -> `services/pos/pos.service.ts` | `commitPOSSaleAction()` resolves `requireOrg()`, validates `commitSaleSchema`, and calls `commitPOSSale()`. `commitPOSSale()` runs a Prisma transaction that touches `SalesOrder`, `SalesOrderLine`, `InventoryLevel`, `InventoryTransaction`, `CashDrawer`, `CashDrawerTransaction`, `Payment`, `Customer`, `CustomerLedgerEntry`, and `AuditLog`. It builds a balanced journal-like payload but stores it only in `AuditLog`. | Attach `postSale()` inside the existing sale transaction only after `services/accounting/posting.service.ts` accepts caller `tx`, enforces open period, leaf accounts, balanced lines, idempotency, source link, and ledger audit. Source type: `POS_SALE`; purpose: `SALE_COMPLETION`. |
| POS session and cash drawer | `hooks/posHooks/usePosOperations.ts` -> `actions/pos/session.actions.ts` -> `services/pos/pos.service.ts`; dashboard chain: `app/[locale]/(dashboard)/dashboard/finance/cash-drawer/page.tsx` -> `components/pos/CashDrawerManagementDashboard.tsx` -> `hooks/posHooks/useDrawerDashboard.ts` -> `actions/pos/drawer-dashboard.actions.ts` -> `services/pos/drawer-dashboard.service.ts` | `openPOSShift()` creates `POSSession` and opening `CashDrawerTransaction`. `closePOSShift()` updates `POSSession`, `CashDrawer`, and closing `CashDrawerTransaction` with variance. `getCashDrawerDashboard()` reads drawers, sessions, transactions, variance, alerts, and a cash journal-style event list. | Attach `postCashDrawerClose()` only on close events after cash accounts, over/short mappings, and step-up permission rules exist. Dashboard remains read-only operational reconciliation, not statutory ledger truth. |
| Finance dashboards | `app/[locale]/(dashboard)/dashboard/finance/page.tsx` -> `components/finance/FinanceCommandCenterDashboard.tsx` -> `hooks/finance/useFinanceDashboard.ts` -> `actions/finance/finance-dashboard.actions.ts` -> `services/finance/finance-dashboard.service.ts` | `getFinanceDashboardAction()` resolves `requireOrg()`, validates input, and calls `getFinanceDashboard()`. The service reads operational tables: `SalesOrder`, `PurchaseOrder`, `Expense`, `Payment`, `PaymentRefund`, `Customer`, `Supplier`, `CashDrawer`, and `Location`. | Keep this as operational analytics. Do not retrofit statutory accounting into this service. Ledger reports should be separate accounting report services reading `JournalEntryLine`, periods, accounts, and source links. |
| Purchase receiving | `app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx` -> `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx` -> `hooks/useRecentPurchaseOrderQueries.ts` -> `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts` -> `services/purchase-order/purchase-order.service.ts` | `receiveItems()` validates `ReceiveItemsSchema`, scopes organization with `scopedOrg()`, and calls the service. The service creates `GoodsReceipt`, `GoodsReceiptLine`, updates `PurchaseOrderLine`, updates `PurchaseOrder` status, updates or creates `InventoryLevel`, and creates `InventoryTransaction` through `applyInventoryReceipt()`. | Attach `postGoodsReceipt()` after inventory receipt is stable and posting rules include stock asset, GRNI, VAT recoverable when applicable, and supplier invoice clearing policy. Source type: `GOODS_RECEIPT`; purpose: `GOODS_RECEIPT`. |
| Inventory movement | `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx` -> `components/inventory/movements/StockMovementDashboard.tsx` -> `hooks/useInventoryMovementQueries.ts` -> `actions/inventory/inventoryMovementActions.ts`; transfer approvals also use `hooks/useTransferQueries.ts` -> `actions/inventory/inventoryMovementActions.ts` | Active movement reads use `getInventoryTransactionsMovement()` and `getStockMovementSummary()`. Transfer mutations use `approveTransfer()` and helper `createInventoryTransaction()` to update `InventoryLevel` and create signed `InventoryTransaction` rows. `actions/inventory/inventoryActions.ts` also contains older inventory update/adjustment paths and must be classified before accounting integration. | Attach posting only to approved, auditable inventory events. Define policy first: internal transfer may be non-GL if same valuation entity; stock adjustment/write-off posts to inventory variance or shrinkage. Avoid direct accounting attachment to read dashboards. |
| Customer ledger | `app/[locale]/(dashboard)/dashboard/customers/page.tsx` -> `components/customers/CustomerManagementDashboard.tsx` -> `hooks/useCustomerManagement.ts` -> `actions/customers/customer-management-actions.ts` -> `services/customer/customer.service.ts` | Management actions enforce customer permissions and organization access, then call service methods. The service reads `Customer.currentBalance`, `SalesOrder`, `Payment`, and `CustomerLedgerEntry` for management rows and analytics. POS on-account sales currently create `CustomerLedgerEntry` directly in `commitPOSSale()`. | Treat existing customer ledger rows as subledger projections, not GL truth. Future A/R posting should be driven from sale/payment posting commands and reconcile account 411 to customer subledger. |
| Supplier ledger | `app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx` and `app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx` -> `components/suppliers/SupplierManagementDashboard.tsx` -> `hooks/useSupplierManagement.ts` -> `actions/suppliers/supplier-management-actions.ts` -> `services/supplier/supplier.service.ts` | Management actions enforce supplier permissions and organization access, then call service methods. The service reads `Supplier.currentBalance`, `PurchaseOrder`, `ItemSupplier`, and `SupplierLedgerEntry` for management rows and analytics. | Treat existing supplier ledger rows as subledger projections, not GL truth. Future A/P posting should be driven from goods receipt, supplier invoice, and supplier payment commands and reconcile account 401 to supplier subledger. |

## Pre-Accounting Attachment Rules

- Do not add accounting writes to client components, hooks, dashboard components, or read-only dashboard services.
- First accounting writes must live under `services/accounting/*`, then be called by operational services with the caller's Prisma transaction.
- Accounting actions must stay thin: `requireOrg()` or equivalent auth, permission check, Zod validation, service call, typed result, and cache revalidation.
- Every new accounting source must declare source type, source id, posting purpose, idempotency key, period, actor, organization, and audit event.
- Manual journal, period service, posting invariants, reversals, and trial balance tests remain mandatory before operational posting starts.

## Active Operational Surfaces

| Domain | Active Files | Current Accounting Relevance | Accounting Command Status |
| --- | --- | --- | --- |
| POS sale completion | `actions/pos/tender.actions.ts`, `services/pos/pos.service.ts`, `services/pos/pos.schemas.ts`, `app/[locale]/(dashboard)/dashboard/pos/page.tsx` | `commitPOSSale()` already builds an in-memory balanced finance journal payload and writes an audit event, but it does not create durable GL entries. | Future `PostSaleCommand`. Blocked until kernel, posting service, mappings, and idempotency tests exist. |
| POS cart/catalog/session | `actions/pos/cart.actions.ts`, `actions/pos/catalog.actions.ts`, `actions/pos/session.actions.ts`, `services/pos/pos.service.ts`, `hooks/posHooks/usePosOperations.ts` | Supports the sale workflow and shift state used by future source links. | No ledger command yet. |
| Cash drawer and reconciliation | `actions/pos/drawer-dashboard.actions.ts`, `services/pos/drawer-dashboard.service.ts`, `services/pos/drawer-dashboard.schemas.ts`, `app/[locale]/(dashboard)/dashboard/finance/cash-drawer/page.tsx`, `app/[locale]/(dashboard)/dashboard/cashDrawer/page.tsx` | Produces drawer events, expected cash, counted cash, refunds, cash in/out, and variance data. | Future `PostCashDrawerCloseCommand`. Blocked until cash accounts and variance mappings exist. |
| Finance dashboards | `actions/finance/finance-dashboard.actions.ts`, `services/finance/finance-dashboard.service.ts`, `services/finance/finance-dashboard.schemas.ts`, `hooks/finance/useFinanceDashboard.ts`, `app/[locale]/(dashboard)/dashboard/finance/*` | Current finance numbers read operational tables such as sales, payments, customers, suppliers, and inventory. They are operational dashboards, not statutory ledger reports. | Keep as operational analytics. Do not treat as accounting truth until reports read journal lines. |
| Purchasing and goods receipt | `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`, `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`, `services/purchase-order/purchase-order.service.ts`, `services/purchase-order/purchase-order.schemas.ts`, `app/[locale]/(dashboard)/dashboard/purchase-orders/*`, `app/[locale]/(dashboard)/dashboard/purchases/*` | `receiveItems()` updates stock and creates goods receipts. This is the active procure-to-stock source. | Future `PostGoodsReceiptCommand` and later supplier invoice/payment posting. |
| Inventory movement | `actions/inventory/inventoryMovementActions.ts`, `actions/inventory/inventoryActions.ts`, `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`, `app/[locale]/(dashboard)/dashboard/inventory/transfers/page.tsx` | Inventory transactions already include signed quantities, unit cost, total cost, source references, and organization scope. | Future `PostInventoryAdjustmentCommand` and stock-transfer accounting policy. |
| Customers and receivables | `actions/customers/customer-management-actions.ts`, `services/customer/customer.service.ts`, `services/customer/customer.schemas.ts`, `app/[locale]/(dashboard)/dashboard/customers/*` | Customer analytics read `CustomerLedgerEntry` and sales/payment data. Existing customer ledger is a subledger-style table, not the general ledger. | Future ledger-derived receivables and `PostCustomerSettlementCommand`. |
| Suppliers and payables | `actions/suppliers/supplier-management-actions.ts`, `services/supplier/supplier.service.ts`, `services/supplier/supplier.schemas.ts`, `app/[locale]/(dashboard)/dashboard/purchases/suppliers/*`, `app/[locale]/(dashboard)/dashboard/suppliersSystem/*` | Supplier analytics read `SupplierLedgerEntry` and purchase/payment data. Existing supplier ledger is a subledger-style table, not the general ledger. | Future ledger-derived payables, supplier invoice, and payment posting. |
| Expenses | `prisma/schema.prisma` models `ExpenseCategory` and `Expense`; active route/action coverage is not yet confirmed. | Expense schema exists and can become an approved source event once active workflow is mapped. | Future `PostExpenseCommand`. Blocked until active action/service surface is confirmed. |
| Payroll | Permission and sidebar references exist in `lib/permissions.ts` and `config/sidebar.ts`; active schema/service surface is not part of the clean baseline. | Quarantined or draft until reconciled with active schema. | No accounting command until payroll domain is active and tested. |
| Production | `prisma/schema.prisma` models `Recipe`, `RecipeIngredient`, and `ProductionBatch`; sidebar and permission references exist. | Production schema exists, but active costing/posting workflow is not confirmed. | Future `PostProductionBatchCommand` after inventory valuation and production cost policy exist. |
| Tax rates | `actions/taxRate/tax-rate-management-actions.ts`, dashboard settings/finance tax-rate pages, `TaxRate` model. | Tax setup informs posting rules and setup validation. | Used by setup and posting rules, not a standalone ledger source. |
| Roles and permissions | `actions/roles/*`, `config/permissions.ts`, `lib/security/rbac.ts`, `lib/security/rbac-permissions.ts` | Role management validates grantable permissions and supports canonical dot-style permissions with legacy aliases. | Accounting permissions should be added here before accounting actions. |

## Surfaces To Avoid For First Ledger Work

- Draft or legacy finance schemas/actions that reference inactive Prisma delegates.
- Draft payroll, presence, and production code that is not part of the clean TypeScript baseline.
- Legacy POS/session/cash-system modules outside the active `actions/pos/*` and `services/pos/*` paths.
- Any report that computes statutory accounting truth directly from operational tables.

## First Allowed Accounting Sources

Allowed only after the accounting kernel and manual journal MVP are implemented:

1. Manual journal posted.
2. POS sale completed.
3. POS payment received.
4. Refund processed.
5. Cash drawer close.
6. Goods receipt.
7. Supplier payment.
8. Expense approved.
9. Stock adjustment approved.

## Immediate Gate

Before wiring any source event:

- `OrganizationAccountingSettings`, `FiscalYear`, `AccountingPeriod`, `ChartOfAccount`, `Journal`, `JournalEntry`, `JournalEntryLine`, `LedgerPostingBatch`, `AccountingSourceLink`, `PostingRule`, `PostingRuleLine`, and `LedgerAuditEvent` must exist in the active Prisma schema.
- Accounting permissions must be available through canonical RBAC.
- Manual journal posting, reversal, period locking, source idempotency, and trial balance equality must have focused tests.
