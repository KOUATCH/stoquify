# Kontava Purchasing/AP Assurance Run Report

Date: 2026-06-21
Skill: `kontava-purchasing-ap-assurance`
Mode: observe-mode only

## Implementation Summary

Added a purchasing/AP assurance slice that verifies the purchase-to-pay evidence chain without replacing existing services or data sources. The new checks are registered in the central Workflow Assurance registry, remain `enforceMode: false`, create normalized incidents when broken, and link managers directly into purchase orders, purchases, purchasing payables, and finance payables.

## New Observe-Mode Checks

1. `purchasing_ap.po_approval_receipt_trace.required`
   - Flags controlled purchase orders that are missing approval evidence or posted receipt trace.
   - Links to `/dashboard/purchase-orders`.

2. `purchasing_ap.goods_receipt_stock_movement.required`
   - Flags received/completed goods receipts that do not have `GOODS_RECEIPT` inventory transaction proof.
   - Links to `/dashboard/purchases`.

3. `purchasing_ap.supplier_invoice_three_way_match.required`
   - Flags supplier invoices tied to purchase orders that lack accepted 3-way match evidence or PO/GR line links.
   - Links to `/dashboard/purchases/payables`.

4. `purchasing_ap.supplier_invoice_posting_proof.required`
   - Flags posted supplier invoices missing AP ledger batch, business-event, document hash, evidence hash, or posting timestamp proof.
   - Links to `/dashboard/finance/payables`.

Existing supplier payment release and supplier-bank pending-change checks were preserved.

## Files Updated

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/assurance/__tests__/assurance-registry.service.test.ts` - passed, 36 tests.
- `npm test -- --runTestsByPath services/assurance/__tests__/assurance-registry-contracts.test.ts` - passed, 4 tests.
- `npm test -- --runTestsByPath services/purchasing/__tests__/ap-control.service.test.ts` - passed, 13 tests.
- `npm run typecheck` - passed.
- `npm run lint` - passed with 5 pre-existing warnings outside this slice.
- `node scripts/workflow-assurance-release-gate.js --mode report --out what-next/WORKFLOW_ASSURANCE_PURCHASING_AP_RELEASE_GATE_STATIC_REPORT_2026-06-21.md --json-out what-next/WORKFLOW_ASSURANCE_PURCHASING_AP_RELEASE_GATE_STATIC_REPORT_2026-06-21.json` - passed with 33/33 checks ready and 0 blockers.

## Release Gate Evidence

- `what-next/WORKFLOW_ASSURANCE_PURCHASING_AP_RELEASE_GATE_STATIC_REPORT_2026-06-21.md`
- `what-next/WORKFLOW_ASSURANCE_PURCHASING_AP_RELEASE_GATE_STATIC_REPORT_2026-06-21.json`

## Safety Notes

- No enforce-mode behavior was enabled.
- No purchasing, AP, inventory, ledger, or payment workflow service was replaced.
- The new checks are manager-visible and action-linked, but remain observe-mode until seeded failure tests, tenant scheduler telemetry, incident triage, and business signoff prove they are safe to enforce.
