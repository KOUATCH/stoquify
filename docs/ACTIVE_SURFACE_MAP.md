# Active Surface Map For Accounting Backbone

Date: 2026-06-09

Purpose: identify the active operational paths that may eventually emit accounting commands. This map prevents the accounting engine from binding to legacy, duplicate, or draft implementations before the ledger kernel is proven.

Status: Phase 0 baseline. No operational flow should post to the general ledger until manual journals, posting, reversal, period locking, source idempotency, and trial balance are implemented and tested.

## Architecture Anchors

- Authentication and tenant resolution: `lib/auth-server.ts`, `lib/security/rbac.ts`, `services/_shared/require-org.ts`, `services/_shared/protect.ts`.
- Permission compatibility: `config/permissions.ts`, `lib/security/rbac-permissions.ts`.
- Locale-safe routes: `i18n/routing.ts`, `app/[locale]/layout.tsx`.
- Graphify hubs reviewed: `requireOrg()`, `scopedOrg()`, `getSession()`, `hasAppPermission()`, `getFinanceDashboard()`, `commitPOSSale()`.

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
