---
name: stoquify-offline-pos-fiscal-replay-finalizer
description: Audit, implement, and verify Stoquify offline POS replay safety. Use for offline device identity, device sequence chains, idempotency keys, conflict resolution, provisional receipts, fiscal numbering, replay outcomes, stock posting, cash evidence, and server certification.
---

# Stoquify Offline POS Fiscal Replay Finalizer

## Purpose

Make offline POS replay-safe without corrupting fiscal numbering, inventory, cash, receipt evidence, or ledger truth.

## Required First Reads

1. `lib/pos/offline-local-queue.ts`
2. `services/pos/offline-sync.service.ts`
3. `services/pos/receipt.service.ts`
4. `services/pos/`
5. `services/accounting/`

Read `references/evidence-map.md` for offline POS surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify the offline event type and replay state.
2. Trace device identity, sequence, idempotency key, entry hash, conflict handling, and replay outcome.
3. Verify offline receipts remain provisional until server certification.
4. Verify replay posts inventory, cash/payment, ledger, and receipt evidence exactly once.
5. Add tests for duplicate replay, wrong device, sequence gap, conflict, provisional receipt, and final certification.
6. Save a report for material replay or fiscal-safety work.

## Guardrails

- Do not assign final fiscal numbering on the client.
- Do not accept duplicate replay under a new identifier.
- Do not bypass server certification for legal receipt delivery.
- Do not hide conflict states from operators or managers.

## Output Contract

Report device/replay state, idempotency evidence, fiscal status, inventory/cash/ledger impact, verification results, and remaining offline POS risk.
