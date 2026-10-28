# AqStoqFlow 011 AP Action/RBAC Gate Closure Report

Date: 2026-06-15

Selected skill: `011-aqstoqflow-purchasing-ap-controls`

Companion skill: `011-aqstoqflow-ap-gate-closer`

Decision: The 011 action/RBAC/fresh-auth slice is now closed. Do not advance to `012-aqstoqflow-payroll-presence-engine` yet; the AP workbench UI, balanced SYSCOHADA AP posting recipes, and outbound supplier payment reconciliation slices remain open.

## Implemented

- Added AP-specific permission names for invoice posting, AP viewing, match review, supplier bank request/approval, and supplier payment request/approval/release.
- Added RBAC compatibility aliases so existing legacy supplier payable/payment and financial-control grants can satisfy the new AP permission names.
- Added critical sensitive-action policies for supplier bank-change approval, supplier payment approval, and supplier payment release.
- Added `actions/purchasing/ap-control.actions.ts` with protected server actions for:
  - `getAPWorkbenchAction`
  - `postSupplierInvoiceAction`
  - `requestSupplierBankChangeAction`
  - `approveSupplierBankChangeAction`
  - `releaseSupplierPaymentAction`
- Added a tenant-scoped `getAPWorkbenchData` service read model that exposes honest AP queue, ledger-blocker, bank-change, invoice, and payment status data for the future UI.
- Preserved the backend AP kernel as the source of truth for duplicate detection, three-way match checks, payment allocation checks, bank approval checks, maker-checker rules, business events, audit logs, and explicit ledger blockers.

## Gates Passed

- Tenant gate: server actions derive `organizationId` from the authenticated RBAC context and overwrite any client-supplied organization value.
- RBAC gate: AP actions use explicit AP permissions through the shared `protect` boundary.
- Fresh-auth gate: supplier bank approval and supplier payment release require fresh authentication.
- Maker-checker gate: supplier bank approval and payment release run through the shared sensitive-action policy before the AP kernel is called.
- Error gate: action failures return the existing client-safe protected action result shape.
- Evidence gate: denied sensitive AP attempts are audited; allowed approval/release controls are audited in the same transaction as the AP service call.
- Ledger-first gate: the action layer does not create AP totals, postings, or payment facts directly; it delegates to the existing AP kernel and preserves explicit ledger blockers.
- Verification gate: focused AP action, sensitive-action, RBAC, AP service, Prisma, typecheck, and inventory-boundary checks passed.

## Gates Still Blocked

- UI gate: AP workbench components and route states are not yet built.
- Full ledger gate: AP supplier invoice and supplier payment posting still use explicit failed `LedgerPostingBatch` blockers until balanced SYSCOHADA posting recipes are implemented and tested.
- Reconciliation gate: released supplier payments still surface reconciliation-required evidence, but are not yet connected to outbound payment reconciliation truth records.
- Country-pack gate: input VAT, withholding, and payment-specific statutory behavior remain country-pack controlled and expert-review required.

## Verification

Commands passed:

```powershell
npm test -- actions/purchasing/__tests__/ap-control.actions.test.ts --runInBand
npm test -- services/controls/__tests__/sensitive-action.service.test.ts --runInBand
npm test -- lib/security/__tests__/rbac-permissions.test.ts --runInBand
npm test -- services/purchasing/__tests__/ap-control.service.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run prisma:generate
npm run inventory:boundary:fail
```

## Next Required 011 Slice

Build the AP workbench UI using `getAPWorkbenchAction`, then continue to balanced AP posting recipes and outbound reconciliation integration.
