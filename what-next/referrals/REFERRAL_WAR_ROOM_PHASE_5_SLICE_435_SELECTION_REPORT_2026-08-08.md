# Phase 5 Slice 435 Selection Report

Date: 2026-08-08
Selected slice: Customer Settlement And Invoice Allocation Source Foundation
Status: selection complete; current-worktree implementation certified

## Why This Slice

Slice 434 protects existing balance writes but does not make the customer ledger complete receivables truth. The missing positive collection path is the narrowest material dependency between today's POS residual ledger and a defensible customer statement.

The slice deliberately uses a dedicated settlement aggregate. A legacy POS `Payment` belongs to one sales order and cannot conserve a customer receipt across multiple invoices. The supplier-payment aggregate proves that a separate payment/allocation boundary is already an accepted architecture pattern in this repository.

## In Scope

1. Add settlement and allocation persistence with tenant, customer, evidence, idempotency, posting, event, and status fields.
2. Add an explicit migration with foreign keys, uniqueness, and collection-query indexes.
3. Add a required, bounded command schema and service-owned control context.
4. Protect recording with `finance.receivables.collect`, critical risk classification, and five-minute fresh authentication.
5. Validate exact amount/allocation conservation and per-order open balances from customer-ledger truth.
6. Record one per-order `PAYMENT` credit through the Slice 434 balance kernel.
7. Post the receipt through a configured `CUSTOMER_SETTLEMENT` rule into cash/bank/clearing and accounts receivable.
8. Commit settlement, allocations, customer ledger, journal, source link, close invalidation, audit, event, and outbox evidence atomically.
9. Add focused tests and a fail-closed release ratchet.

## Out Of Scope

- reversal execution, settlement editing, deletion, or voiding;
- reconciliation/provider matching;
- actions, routes, components, hooks, or dashboards;
- customer or supplier statement generation;
- external signed access, recipient actions, delivery, AI, or WhatsApp.

## Acceptance Criteria

1. The service rejects inactive or cross-tenant actors, customers, and sales orders.
2. The collection permission is known, mapped, critical, fresh-auth protected, and checked before source reads.
3. Idempotency is required; exact replay is side-effect free and mismatched reuse conflicts.
4. Evidence/document hashes and supported settlement methods are validated before mutation.
5. Allocation IDs are unique, positive, bounded, and sum exactly to the declared amount.
6. Every allocation is limited to the source-owned open amount for its sales order.
7. Customer balance and ledger movements are written only through `createCustomerLedgerEntry`.
8. A configured rule produces a balanced non-zero posted journal tied to the customer settlement.
9. All source, posting, event, outbox, audit, and allocation writes share one serializable transaction.
10. Reversal remains unavailable and statement generation remains blocked after certification.

## Handoff

Run `stoquify-statement-proof-network` for Slice 435 under the active `stoquify-referral-war-room-orchestrator` and `/caveman full` discipline.

## Implementation Outcome

Slice 435 passed its current-worktree release boundary with a required one-to-one allocation-to-customer-ledger evidence link, 13 affected suites / 343 tests, Prisma schema validation, TypeScript, focused lint, and report-trust readiness at 29/29 with zero blockers.

Implementation evidence: `what-next/referrals/CUSTOMER_SETTLEMENT_ALLOCATION_SOURCE_FOUNDATION_SLICE_435_REPORT_2026-08-08.md`.

No Slice 436 is selected. Reversal, SalesInvoice lifecycle truth, statement generation, external access, and production deployment remain blocked.
