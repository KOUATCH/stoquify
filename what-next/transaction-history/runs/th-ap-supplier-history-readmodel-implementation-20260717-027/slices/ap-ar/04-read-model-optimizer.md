# Stage 04 Read Model Optimizer - AP Supplier History Backend

Status: PARTIAL

Run: `th-ap-supplier-history-readmodel-implementation-20260717-027`  
Slice: `ap-ar`  
Active lane: `ap`  
Mode: implement

## Implemented Files

- `services/purchasing/ap-history.schemas.ts`
- `services/purchasing/ap-history.service.ts`
- `actions/purchasing/ap-history.actions.ts`
- `services/purchasing/__tests__/ap-history.service.test.ts`

## Product Capability Added

This run adds the backend foundation for supplier/AP transaction history. It does not add a visible frontend page yet.

The backend now supports server-owned AP history filters, enforced purchasing module access, AP read permissions, export preparation with fresh auth and export safety, supplier invoice/payment merged ordering, signed payable movements, AP summaries, bank-destination redaction, and tenant/filter-bound cursor rejection.

## Verification

- PASS: `npm test -- services/purchasing/__tests__/ap-history.service.test.ts --runInBand` - 1 suite / 2 tests passed.
- PASS: `npx eslint services/purchasing/ap-history.schemas.ts services/purchasing/ap-history.service.ts actions/purchasing/ap-history.actions.ts services/purchasing/__tests__/ap-history.service.test.ts`.
- FAIL/TIMEOUT: `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false --incremental false` timed out after 180 seconds without diagnostics.

## Residual Blockers

- Stage 02/03 remain PARTIAL in the preceding audit run; the backend closes several AP history gaps but does not yet prove release-grade GL control-account tie-out or reconciliation fixtures.
- Stage 05 UX contract and Stage 06 visible AP frontend delivery are still pending.
- No customer/AR work is included in this run.

## Verdict

PARTIAL. AP backend/read-model implementation has begun and is verified by focused tests/lint, but AP is not yet visible in the product as a history dashboard.