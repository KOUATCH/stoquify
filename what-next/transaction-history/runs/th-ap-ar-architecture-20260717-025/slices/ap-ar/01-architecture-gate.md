# Stage 01 Architecture Gate - AP/AR

Status: PARTIAL

Mode: audit
Run: `th-ap-ar-architecture-20260717-025`
Slice: `ap-ar`
Active lanes inspected: `ap`, `ar`
Recommended narrowed continuation: `ap` first, supplier/AP histories.

## Scope Decision

The AP/AR delivery slice should not advance as one combined implementation run yet.

- `ap` is mappable enough to continue to Stage 02 and Stage 03 in a narrowed supplier/AP run.
- `ar` remains blocked until customer/AR accounting prerequisites are explicit and passed. Current code has customer and receivable surfaces, but this Stage 01 pass did not establish an AR read-model/accounting proof contract equivalent to the supplier/AP controls.

This follows the requested sequence: supplier/AP histories first, then customer/AR histories after AR accounting prerequisites are made explicit and passed.

## Dependency Mapping

| surface | route/page | component | hook/action | service owner/function | Prisma model/query | permission/tenant source | audit/evidence source | tests/gates | truth class | status | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AP workbench | `app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx` | `components/purchasing/APControlWorkbench` | `actions/purchasing/ap-control.actions.ts:getAPWorkbenchAction` | `services/purchasing/ap-control.service.ts` owns AP queues, invoice posting, payment release, bank-change controls | `SupplierInvoice`, `SupplierInvoiceLine`, `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierBankAccount`, `SupplierBankChangeRequest`, `PurchaseOrder`, `GoodsReceipt` | `requirePermission("purchasing.ap.invoice.view")`; module `purchasing` observed on page | business events, ledger posting batches, sensitive-action decisions, assurance registry AP checks | `services/purchasing/__tests__/ap-control.service.test.ts`, `actions/purchasing/__tests__/ap-control.actions.test.ts`, `scripts/payment-cash-truth-gate.js`, assurance checks | SYSTEM_OF_RECORD for AP commands; DERIVED_PARTIAL for current dashboard queue | PASS_FOR_AP_STAGE_02_03 | CURRENT_CODE: page imports action and route guard; service imports posting, periods, posting rules, business events, sensitive action, country packs |
| Supplier management | `app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx` | `components/suppliers/SupplierManagementDashboard` | `actions/suppliers/supplier-management-actions.ts` | `services/supplier/supplier.service.ts` owns supplier rows and supplier ledger summaries | `Supplier`, `ItemSupplier`, `PurchaseOrder`, `SupplierLedgerEntry` | `purchases.suppliers.read`; supplier routes have boundary tests | supplier ledger entries and supplier service summaries | `services/supplier/__tests__/supplier.service.test.ts`, supplier page boundary tests | SYSTEM_OF_RECORD for supplier identity; DERIVED_PARTIAL for supplier dashboard analytics | PASS_FOR_AP_CONTEXT | CURRENT_CODE: supplier service tenant predicates include `organizationId` and `deletedAt`; tests cover cross-tenant item-supplier rejection |
| Finance payables overview | `app/[locale]/(dashboard)/dashboard/finance/payables/page.tsx` | finance specialized ledger surface | finance route access | finance dashboard/read-model surfaces, not AP source owner | payables/ledger aggregates | `finance.payables.read` and finance route access | accounting/data-trust AP blockers | finance route tests and security permission tests | DERIVED_PARTIAL / overview | DO_NOT_USE_AS_AP_HISTORY_TRUTH | INFERENCE from route purpose and finance permissions; AP history should use purchasing AP service/read model |
| Customer/AR overview | `app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx`; customer pages under `/dashboard/customers` | customer/finance surfaces | customer actions and finance routes | `services/customer/customer.service.ts`, `services/accounting/customer-ledger.service.ts` | `Customer`, `SalesOrder`, `Payment`, `CustomerLedgerEntry` | customer and finance permissions exist, but AR history permission/export/proof contract not mapped in this run | customer ledger service exists, but AR accounting prerequisites not accepted by current AP/AR gate | customer service tests; customer pages tests | UNKNOWN for canonical AR history | BLOCKED_FOR_AR | Stage 01 cannot authorize AR Stage 02/03 until AR accounting prerequisites are explicit and passed |

## Verified AP Architecture Findings

1. AP has a domain owner: `services/purchasing/ap-control.service.ts` owns supplier invoice posting, bank changes, payment approval/release, ledger posting, business event application, sensitive-action evaluation, and country-pack resolution.
2. AP page access is tenant/user derived at the server boundary through `requirePermission("purchasing.ap.invoice.view")`; module access is observed for `purchasing`.
3. AP service uses explicit Prisma models for supplier invoices/payments and links accounting posting, business events, ledger batches, and assurance controls.
4. AP sensitive actions are represented by critical/high permissions in `lib/security/rbac-permissions.ts`, including supplier bank approval and payment release.
5. AP assurance/data-trust checks already identify missing three-way match proof, missing AP posting proof, released supplier payment evidence, pending supplier bank release, open AP invoices, and supplier payments missing ledger batches.

## AP Gaps Routed Downstream

- Stage 02 must harden/read-proof supplier/AP history access for owner, finance officer, purchasing manager, accountant, and supplier-bank/payment release roles.
- Stage 02 must define redaction for supplier bank details, provider/payment references, notes, and export/log payloads.
- Stage 03 must prove AP signs, invoice/payment allocation, three-way match, ledger posting batch, business-event source links, country-pack tax/withholding semantics, and close/data-trust blockers.
- Stage 04 must create a canonical AP history read model. Current AP workbench queues are not a complete transaction history because they are bounded operational queues.

## AR Stop Condition

AR is not authorized to progress in this combined run. Before AR Stage 02/03, create an explicit AR prerequisites artifact that maps:

- customer ledger source of truth;
- sales invoice/order lifecycle;
- receipts, allocations, refunds, credit notes, write-offs, and reversals;
- OHADA posting/control accounts;
- customer credit/contact redaction;
- tenant/RBAC/fresh-auth/export boundaries;
- filter-summary-export parity and cursor semantics.

## Architecture Verdict

`PARTIAL` for the combined `ap-ar` slice.

This is not a failure of AP. It means the combined slice should be narrowed:

1. Continue with a new AP-only or AP-active narrowed run for Stages 02 and 03.
2. Keep AR blocked until its accounting prerequisites are explicit and passed.

## Changed Files

- Control-plane run artifacts only.

## Commands

- `rg --files app actions components services hooks | rg -i "payable|payables|supplier-invoice|supplier-payment|supplier|purchase-order|three-way|ap-control|accounts-payable|receivable|receivables|customer"` - PASS.
- `rg -n "model SupplierInvoice|model SupplierPayment|model Supplier|model PurchaseOrder|model Payment|model Customer|model SalesOrder" prisma/schema.prisma` - PASS.
- `rg -n "purchases\.suppliers|finance\.payables|payables|purchasing|supplier|SupplierInvoice|SupplierPayment|PAYABLE" config lib services actions app` - PASS with large output.
- Read AP workbench page and AP control service excerpts - PASS.

## Stage Eligibility

- Stage 02: eligible only for narrowed AP/supplier lane, not combined AP/AR.
- Stage 03: eligible only for narrowed AP/supplier lane, not combined AP/AR.
- Stage 04: not eligible until AP Stage 02 and Stage 03 both PASS.
