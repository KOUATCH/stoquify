# Kontava POS Sale Truth Assurance Run Report

Date: 2026-06-21
Skill: `kontava-pos-sale-truth-assurance`
Mode: implementation, observe-mode only

## Objective

Run the POS sale truth assurance slice so completed POS sales are checked for aligned payment, receipt, stock, ledger, and idempotency proof without replacing existing POS, accounting, fiscal, inventory, or payment services.

## Implementation Summary

The existing check `pos.completed_sale_payment.required` already covered completed POS sales that lack paid or partial payment evidence.

This run added four additional scheduled, observe-mode checks:

1. `pos.completed_sale_receipt.required`
   - Verifies completed POS sales have visible POS receipt fiscal-document proof.
   - Uses `sales_orders` and `fiscal_documents`.
   - Treats `QUEUED`, `SUBMITTED`, and `CERTIFIED` receipt documents as visible proof.

2. `pos.completed_sale_stock_movement.required`
   - Verifies completed POS sales with inventory-tracked items have stock movement proof.
   - Uses `sales_orders`, `sales_order_lines`, `items`, and `inventory_transactions`.
   - Requires `InventoryTransaction` rows with `referenceType = SALES_ORDER` and `type = SALE`.

3. `pos.completed_sale_ledger_source_link.required`
   - Verifies completed POS sales have posted ledger batch, posted journal, and accounting source-link proof.
   - Uses `sales_orders`, `ledger_posting_batches`, `journal_entries`, and `accounting_source_links`.
   - Requires `POS_SALE` source proof and `SALE_COMPLETION` posting purpose.

4. `pos.network_tender_idempotency_hash.required`
   - Verifies card, mobile money, bank transfer, cheque, and mixed POS tenders retain idempotency keys and payment transaction payload hashes.
   - Uses `sales_orders`, `payments`, and `payment_transactions`.

All checks use:

- `workflow: "pos"`
- `executionMode: "scheduled_scan"`
- `enforceMode: false`
- `actionRoute: "/dashboard/pos"`
- tenant-scoped source predicates
- source hashes for durable incident dedupe
- sample metadata for manager investigation without creating per-sale noise

## Files Touched

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`

Generated reports:

- `what-next/WORKFLOW_ASSURANCE_POS_SALE_TRUTH_RELEASE_GATE_STATIC_REPORT_2026-06-21.md`
- `what-next/WORKFLOW_ASSURANCE_POS_SALE_TRUTH_RELEASE_GATE_STATIC_REPORT_2026-06-21.json`

## Verification

Passed:

- `npm test -- services/assurance/__tests__/assurance-registry.service.test.ts --runInBand`
  - 1 suite passed
  - 28 tests passed
- `npx eslint services/assurance/assurance-registry-contracts.ts services/assurance/assurance-registry.service.ts services/assurance/__tests__/assurance-registry.service.test.ts`
- `git diff --check -- services\assurance\assurance-registry-contracts.ts services\assurance\assurance-registry.service.ts services\assurance\__tests__\assurance-registry.service.test.ts`
- `node scripts\workflow-assurance-release-gate.js --mode report --out what-next\WORKFLOW_ASSURANCE_POS_SALE_TRUTH_RELEASE_GATE_STATIC_REPORT_2026-06-21.md --json-out what-next\WORKFLOW_ASSURANCE_POS_SALE_TRUTH_RELEASE_GATE_STATIC_REPORT_2026-06-21.json`
  - Checks ready: 25/25
  - Indexes ready: 6/6
  - Engine-health gates ready: 2/2
  - Blockers: 0

Limited:

- `npm run typecheck` timed out after about 184 seconds without returning a useful diagnostic. The focused Jest, ESLint, whitespace, and release-gate checks above are the verified scope for this run.

## Enforce-Mode Status

Enforce-mode was not enabled.

These checks must remain observe-mode until seeded partial-failure tests cover sale payment, receipt generation, stock movement, ledger posting, idempotency replay, refunds, and voids through the real POS workflows.

## Next Recommended Slice

Run `kontava-offline-pos-replay-assurance` next, because offline replay depends on POS sale truth and must prove accepted offline events replay exactly once without bypassing stock, receipt, payment, or ledger controls.
