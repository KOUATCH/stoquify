# Stage 02 Security Proof Gate - AP Supplier History Backend Remediation

Status: PASS

Run: `th-ap-supplier-history-readmodel-implementation-20260717-027`  
Slice: `ap-ar`  
Active lane: `ap`  
Mode: implement

## Decision

The new AP backend history action closes the AP transaction-history security gaps identified in the narrowed AP audit run for the backend/read-model layer.

## Evidence

- `actions/purchasing/ap-history.actions.ts` uses `requireAnyPermission` for `purchasing.ap.invoice.view`, `finance.payables.read`, and `purchases.suppliers.read`.
- It enforces module entitlement with `observeModuleAccess(... mode: "enforce")` for the `purchasing` module at the server action boundary.
- Export preparation requires `finance.reports.export` or `reports.export`, requires fresh auth, builds a filter hash/watermark, and calls export safety evaluation.
- `services/purchasing/ap-history.service.ts` derives tenant scope from the trusted action input, validates organization existence, tenant-binds rows, rejects tenant/filter/adapter cursor mismatches, and redacts supplier bank destination details through `supplier_bank_detail` policy.

## Verification

- PASS: `npm test -- services/purchasing/__tests__/ap-history.service.test.ts --runInBand`.
- PASS: `npx eslint services/purchasing/ap-history.schemas.ts services/purchasing/ap-history.service.ts actions/purchasing/ap-history.actions.ts services/purchasing/__tests__/ap-history.service.test.ts`.

## Residual Risk

Full browser role-matrix and export-generation parity remain Stage 06/07 verification work. No AR security claim is made.