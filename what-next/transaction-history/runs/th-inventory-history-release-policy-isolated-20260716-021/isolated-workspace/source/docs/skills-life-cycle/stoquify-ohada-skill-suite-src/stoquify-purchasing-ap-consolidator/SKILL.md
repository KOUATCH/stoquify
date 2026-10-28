---
name: stoquify-purchasing-ap-consolidator
description: Audit, implement, and verify Stoquify purchasing and accounts-payable controls. Use for purchase orders, goods receipt, supplier invoices, AP postings, supplier evidence, line deletion rules, maker-checker, archive behavior, stock impact, and payment readiness.
---

# Stoquify Purchasing AP Consolidator

## Purpose

Align purchase orders, goods receipt, inventory posting, supplier invoices, AP controls, approvals, archive behavior, and payment readiness into one service-owned operational spine.

## Required First Reads

1. `services/purchase-order/purchase-order.service.ts`
2. `services/purchasing/`
3. `services/inventory/`
4. `services/accounting/`
5. `scripts/hard-delete-gate.js`

Read `references/evidence-map.md` for AP surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify the purchasing/AP lifecycle state being touched.
2. Trace PO, receipt, invoice, stock, AP, approval, and payment-readiness effects.
3. Verify service ownership, tenant scope, maker-checker, source evidence, idempotency, audit, and ledger/stock impact.
4. Replace unsafe deletes with archive, reversal, or evidence-preserving transitions unless the delete is draft-only and gated.
5. Add focused tests for lifecycle transitions and evidence blockers.
6. Save a report for any AP consolidation or hard-delete finding.

## Guardrails

- Do not hard-delete evidence-bearing purchasing/AP records.
- Do not allow self-approval where maker-checker is required.
- Do not post stock or AP from UI-derived totals.
- Do not split source truth across competing services without a consolidation plan.

## Output Contract

Report lifecycle state, affected records, evidence path, stock/AP/ledger impact, changed files, verification results, and remaining AP risk.
