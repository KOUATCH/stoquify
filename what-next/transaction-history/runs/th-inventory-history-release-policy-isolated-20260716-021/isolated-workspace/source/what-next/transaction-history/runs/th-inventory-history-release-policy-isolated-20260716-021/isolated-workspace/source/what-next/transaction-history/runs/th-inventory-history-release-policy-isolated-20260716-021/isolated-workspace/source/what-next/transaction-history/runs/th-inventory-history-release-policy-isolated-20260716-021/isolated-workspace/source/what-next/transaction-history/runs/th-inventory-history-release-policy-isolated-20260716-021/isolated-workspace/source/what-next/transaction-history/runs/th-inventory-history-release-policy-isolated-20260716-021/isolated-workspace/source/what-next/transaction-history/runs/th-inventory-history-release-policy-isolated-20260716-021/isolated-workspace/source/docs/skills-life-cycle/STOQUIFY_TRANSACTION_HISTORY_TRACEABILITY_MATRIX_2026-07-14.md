# Stoquify Transaction History Traceability Matrix

Date: 2026-07-14
Status legend: `A` authoritative, `F` functional incomplete, `R` recent/bounded, `B` blocked, `M` missing.

| Surface | Route/page | Component | Hook/action/API | Service truth | Prisma/evidence | Access boundary | Tests/evidence | Status |
|---|---|---|---|---|---|---|---|---|
| Inventory movements | `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx` | `components/inventory/movements/StockMovementDashboard.tsx` | `hooks/useInventoryMovementQueries.ts`; `actions/inventory/inventoryMovementActions.ts` | `services/inventory/inventory-read.service.ts` | `InventoryTransaction`; item/location/user reference | Page checks `inventory.levels.read`; read actions only establish trusted org | `actions/inventory/__tests__/inventoryMovementActions.test.ts`; boundary gate | F |
| Inventory adjustments/write-offs | No complete exception-history route | Existing movement component partially represents types | Inventory adjustment actions/services | `services/inventory/inventory-adjustment.service.ts`; read service | `StockAdjustment`, `InventoryTransaction`, posting links | Inventory permissions vary by action | Inventory adjustment and reconciliation tests | B |
| Cash drawer/session | Canonical `/dashboard/finance/cash-drawer`; legacy redirect `/dashboard/cashDrawer` | `components/pos/CashDrawerManagementDashboard.tsx` | `hooks/posHooks/useDrawerDashboard.ts`; `actions/pos/drawer-dashboard.actions.ts` | `services/pos/drawer-dashboard.service.ts` | `POSSession`, `CashDrawer`, `CashDrawerTransaction` | `finance.cash-drawer.read` or `finance.read`; POS entitlement observed | Drawer action/page tests | R |
| Payment capture | `/dashboard/finance/payments` | `components/finance/FinanceSpecializedLedgerSurfaces.tsx` | Finance dashboard action/hook | `services/finance/finance-dashboard.service.ts`; payment workbench | `Payment`, refunds | Finance route permissions | Finance/dashboard tests | R |
| Payment reconciliation | `/dashboard/finance/reconciliation` | `components/finance/PaymentReconciliationWorkbench.tsx` | `actions/payments/reconciliation-workbench.actions.ts`; reconciliation actions | `services/payments/payment-reconciliation-workbench.service.ts`; `services/reconciliation/*` | Provider events, statements, matches, suspense, exceptions, runs, evidence, certificates | `payments.reconciliation.read`; sensitive commands use dedicated controls | Payment/reconciliation service and component tests; cash-truth gate | F/A kernel |
| Purchasing/AP | `/dashboard/purchases/payables` | `components/purchasing/APControlWorkbench.tsx` | `actions/purchasing/ap-control.actions.ts` | `services/purchasing/ap-control.service.ts` | Supplier invoice/match/payment/allocation, business events, posting batches, source links | `purchasing.ap.*`; fresh auth for bank/payment approvals | AP service/action/page tests; purchasing gate | F/A kernel |
| Supplier activity | `/dashboard/suppliersSystem` and supplier detail | `components/suppliers/SupplierManagementDashboard.tsx` | `hooks/useSupplierManagement.ts`; supplier management actions | `services/supplier/supplier.service.ts` | Supplier, POs, supplier ledger | `purchases.suppliers.read` plus action permission | Supplier service/page tests | R |
| Supplier payable statement | No authoritative full statement page | None | None | AP and supplier services are separate inputs | Supplier invoice/payment/allocation/ledger/source links | Not yet defined as one contract | No opening/movement/closing and control-account suite | B |
| Customer activity | `/dashboard/customers` and customer detail | `components/customers/CustomerManagementDashboard.tsx` | customer hooks and management actions | `services/customer/customer.service.ts` | Customer, sales orders, payments, customer ledger | `customers.read` or analytics permission | Customer service/page tests | R |
| Receivables | `/dashboard/finance/receivables` | `FinanceReceivablesSurface` | Specialized finance hook/action | `services/finance/finance-dashboard.service.ts` | SalesOrder, Payment, Customer balances | Finance view permissions | Finance tests | B |
| Payables finance view | `/dashboard/finance/payables` | `FinancePayablesSurface` | Specialized finance hook/action | Finance dashboard service | PurchaseOrder, Payment, Supplier balances | Finance view permissions | Finance tests | R/duplicated |
| Journals and source links | Accounting routes | Accounting components | Accounting actions | posting, journal, source-link services | `JournalEntry`, `JournalEntryLine`, `LedgerPostingBatch`, `AccountingSourceLink` | Accounting permissions | Posting, journal, source-link tests; ledger gate | A kernel |
| Close assurance | Accounting close routes | `CloseAssuranceCenter`, `AccountantPortal` | close/data-trust actions | close assurance and data-trust services | Close runs/items/findings/evidence/reviews/exports | Accounting close/data permissions | Close/data-trust tests; ledger and report gates | F/A kernel |
| Proof drawer | Embedded supported surfaces | `components/evidence/ProofTrailDrawer.tsx` | proof actions/hooks | `services/evidence/proof-trail.service.ts` | Four supported subject contracts | Subject permission map | Proof-trail tests | F |
| Public receipts | `/api/receipts/[receiptId]` | Customer receipt surface | API route | receipt service/token registry | Signed token registry, sales/payment data | Signed expiring org-bound token and service recheck | Route/service/token tests | A narrow boundary |

## Cross-Cutting Gaps

- No shared transaction-history result or cursor type exists.
- No common server export contract guarantees row/summary/export parity.
- No URL-state contract preserves filters, snapshot, and selected proof row.
- No complete role matrix covers table, drawer, export, and remediation actions.
- Proof subjects do not yet cover inventory, POS session/settlement, AP invoice/payment, sales/AR, or payroll batch.
- Several dashboards calculate totals from bounded presentation arrays.
- Multiple query orders omit a unique final key and a recorded-through cutoff.
