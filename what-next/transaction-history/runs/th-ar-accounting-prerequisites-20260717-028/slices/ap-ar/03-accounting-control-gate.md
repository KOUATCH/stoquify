# Stage 03 Accounting Control Gate - Customer/AR Prerequisites

Status: BLOCKED

Run: `th-ar-accounting-prerequisites-20260717-028`  
Slice: `ap-ar`  
Blocked lane: `ar`  
Mode: audit

## Decision

Customer/AR transaction-history implementation must not start yet. The current codebase has useful AR-adjacent foundations, but it does not prove the full AR accounting prerequisite contract required by the transaction-history suite.

## Positive Evidence Found

- `prisma/schema.prisma` has `Customer`, `SalesOrder`, `Payment`, `PaymentRefund`, and `CustomerLedgerEntry`.
- `services/accounting/postings/post-sale.ts` posts completed POS sales and includes customer receivable line semantics.
- `services/accounting/postings/post-payment.ts` posts captured POS payment receipts and clears customer receivable for linked sales.
- `services/accounting/postings/post-refund.ts` handles processed POS refund posting.
- `services/pos/pos.service.ts` creates customer ledger debits for on-account POS sales and credits on voided credit sales.
- `services/accounting/customer-ledger.service.ts` validates debit/credit exclusivity and creates customer ledger entries.
- `services/customer/customer.service.ts` reads recent sales orders, ledger entries, and payments for customer detail analytics.
- `app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx` exposes an existing finance receivables overview behind finance permissions.
- `lib/security/rbac-permissions.ts` and `config/permissions.ts` define `finance.receivables.read`.

## Blocking Gaps Against AR Prerequisites

1. No explicit customer invoice/open-item entity distinct from `SalesOrder` is proven as the AR source of truth.
2. No service-owned receipt-to-open-item allocation model exists for partial, multi-item, or multi-payment AR settlement.
3. No allocation reversal/correction path is proven for AR receipts, credits, refunds, write-offs, or bad-debt corrections.
4. `CustomerLedgerEntry` is an append helper and read source, but the inspected service does not prove immutable open-item state, aging basis, settlement status, or GL tie-out.
5. Existing receivables/customer pages are overview surfaces, not a canonical customer/AR transaction-history read model with signed cursor, export parity, redaction, and proof drawer contract.
6. Current customer analytics uses capped recent arrays (`take: 8`), which cannot support complete historical roll-forward or release-grade transaction-history claims.

## Required Remediation Before AR Stage 04

- Define the AR source-of-truth contract: `SalesOrder` as invoice or a new/explicit customer invoice abstraction.
- Add service-owned AR open-item/allocation semantics: receipt allocation, partial allocation, multi-item allocation, idempotency, reversal, refund, credit note, write-off, and correction.
- Persist or reconstruct due-date, open balance, settlement state, aging bucket basis, and source link for each AR item.
- Add tests proving tenant scope, idempotency, allocation reversal, signed AR movement, opening + movement = closing, and customer subledger to AR control-account tie-out.
- Only after those tests pass should Stage 02/03 be rerun as PASS and Stage 04 customer/AR read-model implementation begin.

## Verdict

`BLOCKED_FOR_AR_ACCOUNTING_PREREQUISITES`.

This is not a block on AP. Supplier/AP has already progressed separately. This only prevents customer/AR history from being implemented prematurely with incomplete accounting semantics.
