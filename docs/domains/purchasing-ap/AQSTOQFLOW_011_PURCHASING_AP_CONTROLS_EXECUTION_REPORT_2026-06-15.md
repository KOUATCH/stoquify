# AqStoqFlow 011 Purchasing/AP Controls Execution Report

Date: 2026-06-15  
Suite skill: `000-aqstoqflow-execution-suite`  
Active numbered skill: `011-aqstoqflow-purchasing-ap-controls`  
Decision: 011 advanced with a durable backend AP control kernel, but the suite must stop at 011 until the remaining AP UI/RBAC/full-ledger gates are completed.

## Implemented Slice

This execution created the first enterprise-grade procure-to-pay control kernel for supplier invoices, AP matching, supplier bank changes, and supplier payment release.

Files added:

- `services/purchasing/ap-control.schemas.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `prisma/migrations/20260615150000_purchasing_ap_controls/migration.sql`

Files updated:

- `prisma/schema.prisma`

## Data Architecture Added

New AP control models:

- `SupplierBankAccount`
- `SupplierBankChangeRequest`
- `SupplierInvoice`
- `SupplierInvoiceLine`
- `ThreeWayMatch`
- `SupplierPayment`
- `SupplierPaymentAllocation`

New AP control enums:

- `SupplierBankAccountStatus`
- `SupplierBankChangeStatus`
- `SupplierInvoiceStatus`
- `ThreeWayMatchStatus`
- `SupplierPaymentStatus`

Tenant and evidence controls:

- Every AP model is tenant-scoped with `organizationId`.
- Supplier invoices have duplicate detection by `(organizationId, supplierId, invoiceNumber)` and a normalized duplicate fingerprint.
- Supplier payments have tenant-scoped payment numbers and idempotency keys.
- Bank destinations store masked values and hashes only.
- Supplier invoice/payment events store document/evidence hashes.

## Service Kernel Added

Main service functions:

- `postSupplierInvoice`
- `requestSupplierBankChange`
- `approveSupplierBankChange`
- `releaseSupplierPayment`

Business gates implemented:

- Supplier invoice duplicate detection.
- Supplier invoice line requires goods receipt evidence.
- Supplier invoice quantity cannot exceed received and uninvoiced goods.
- Supplier invoice unit cost mismatch blocks posting until a match exception workflow exists.
- Supplier bank changes require maker-checker approval.
- Supplier payment release is blocked if the supplier bank destination is pending or unapproved.
- Supplier payment release is blocked while any bank change is pending.
- Supplier payment allocation cannot exceed outstanding invoice balance.
- Supplier payment requester cannot approve or release the same payment.

Ledger/event controls implemented:

- Supplier invoice posts to supplier subledger and creates `purchase.supplier_invoice.posted`.
- Supplier payment posts to supplier subledger and creates `supplier.payment.released`.
- Both supplier invoice and payment create explicit failed `LedgerPostingBatch` blockers until SYSCOHADA AP posting rules are configured.
- Business events create notification outbox messages for accounting, management, and reconciliation follow-up.
- Audit logs capture AP posting, bank change approval, and payment release evidence.

## Gates Passed

- Schema gate: `npm run prisma:validate` passed.
- Prisma client gate: `npm run prisma:generate` passed.
- Focused AP tests: `npm test -- services/purchasing --runInBand` passed.
- TypeScript gate: `npm run typecheck` passed.
- 010 regression gate: `npm run inventory:boundary:fail` passed with 0 active stock mutation violations.

## Gates Still Blocked

011 is not complete enough to advance to 012 because the following gates remain open:

- RBAC/action gate: server actions for AP approval/release have not yet been added with session, permission, module, fresh-auth, and typed action-result wrappers.
- UX gate: AP dashboard/workbench screens for invoice matching, bank-change approvals, payment release, exception states, bilingual notifications, and permission-denied states are not yet built.
- Full ledger gate: AP posting recipes for purchase/input VAT/AP and supplier payment settlement are not yet configured as balanced SYSCOHADA journal entries. The current slice creates explicit close blockers instead of pretending the ledger is complete.
- Reconciliation gate: released supplier payments are queued via notification evidence, but not yet connected to the payment reconciliation workbench as outbound payment truth.
- Country-pack gate: withholding/input VAT behavior remains country-pack dependent and requires expert validation before production claims.

## Verification Evidence

Commands run:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- services/purchasing --runInBand
npm run typecheck
npm run inventory:boundary:fail
```

Results:

- Prisma schema valid.
- Prisma Client generated.
- 7 AP service tests passed.
- TypeScript completed with no errors.
- Inventory boundary gate reported 0 active violations.

## Next Recommended Work

Do not advance to `012-aqstoqflow-payroll-presence-engine` yet.

Next recommended numbered skill remains:

- `011-aqstoqflow-purchasing-ap-controls`

Required next 011 sub-slice:

1. Add AP server actions with typed success/error results, session tenant scope, RBAC/module checks, fresh-auth checks, and maker-checker enforcement.
2. Add AP approval/release UI surfaces for supplier invoice posting, three-way match review, bank-change approval, and supplier payment release.
3. Add balanced AP posting rules or a dedicated AP posting service for SYSCOHADA purchase/input VAT/AP and supplier payment settlement.
4. Connect supplier payments to the payment reconciliation workbench as outbound payment evidence.
5. Add RBAC rejection, tenant rejection, typed action-error, and AP UI state tests.

Only after those gates pass should the execution suite select:

- `012-aqstoqflow-payroll-presence-engine`
- then `013-aqstoqflow-data-trust-accountant-portal`
- then `014-aqstoqflow-offline-pos-sync`
- then `015-aqstoqflow-country-adapter-pilot`
- then `016-aqstoqflow-ai-copilot-guardrails`
- then `017-aqstoqflow-enterprise-release-gate`
