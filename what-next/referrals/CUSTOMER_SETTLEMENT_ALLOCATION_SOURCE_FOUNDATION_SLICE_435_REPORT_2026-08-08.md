# Customer Settlement And Allocation Source Foundation - Slice 435 Report

Date: 2026-08-08
Phase: 5 - Statement Hub And External Proof Network
Status: certified complete at current-worktree implementation level

## Outcome

Slice 435 adds a dedicated incoming customer-settlement aggregate and a source-owned collection command without relabeling the legacy POS `Payment` model.

The command records one tenant/customer settlement, conserves the declared amount across a bounded set of sales-order allocations, writes each customer-ledger credit through the Slice 434 balance kernel, links every allocation to exactly one ledger entry, creates the configured `CUSTOMER_SETTLEMENT` accounting posting, and records close-invalidation, audit, business-event, and outbox evidence in one serializable transaction.

This is a source foundation. It does not expose a server action, API route, UI, or external statement surface.

## Source Truth

- `CustomerSettlement` owns settlement number, customer, method, amount, currency, date, idempotency payload hash, correlation, document/evidence hashes, posting references, event reference, and reserved reversal provenance.
- `CustomerSettlementAllocation` owns the conserved amount assigned to one tenant-scoped sales order.
- Every allocation has a required unique `customerLedgerEntryId`; nullable or descriptive-only ledger discovery is not accepted.
- Allocation creation occurs only after its ledger credit exists inside the same transaction, so incomplete allocation evidence cannot commit.
- Exact replay loads ledger rows by the stored allocation links and revalidates tenant, customer, payment type, sales-order reference, zero debit, and exact credit amount.
- The legacy POS `Payment` table and `SalesOrder.paymentStatus` are not written by this command.

The allocation source currently uses `SalesOrder`-referenced customer-ledger open items. This slice does not introduce a separate `SalesInvoice` aggregate and therefore does not claim complete invoice lifecycle truth.

## Command Controls

- required bounded Zod input with five supported receipt methods;
- positive two-decimal settlement and allocation amounts;
- exact allocation conservation and duplicate-sales-order rejection;
- active tenant, actor, customer, and same-customer sales-order resolution;
- per-order open-balance validation from tenant/customer ledger truth;
- canonical payload hash with sorted allocations;
- exact idempotent replay and conflict on changed payload;
- tenant-unique correlation and method/external-reference controls;
- critical `finance.receivables.collect` permission with five-minute fresh authentication;
- serializable execution with three bounded `P2034` attempts and exact `P2002` recovery.

## Accounting And Evidence

The new default `AR-CUSTOMER-SETTLEMENT` rule debits the configured cash, bank, mobile-money, card, or cheque rail and credits accounts receivable. Runtime posting fails closed when the active rule, journal, open period, mapping, or balanced line set is unavailable.

The same transaction records:

- settlement and allocation source rows;
- linked customer-ledger credits and balance claims;
- ledger posting batch and posted journal entry;
- accounting source link and ledger audit event;
- close-certification invalidation evidence;
- applied business event and outbox notification;
- domain audit evidence with correlation identifiers.

## Release Ratchet

`customer_settlement_allocation_source_foundation` was added to the report-trust gate. It verifies schema and migration persistence, required allocation-to-ledger linkage, command bounds, critical authorization, serializable idempotency, tenant/customer scope, allocation conservation, open-balance limits, balance-kernel use, strict posting, source linking, close invalidation, audit/event evidence, and write ordering.

The gate suite includes mutations for nullable or omitted ledger links and weakened replay amount validation, in addition to the other settlement source controls.

## Verification

- Settlement command and security: 2 suites / 23 tests passed.
- Report-trust mutation suite: 1 suite / 245 tests passed.
- Consolidated affected boundary: 13 suites / 343 tests passed.
- Live report-trust fail gate: ready, 29/29 checks, zero blockers.
- Prisma format: passed through the installed project CLI.
- Prisma client generation: passed with `--no-engine`.
- Prisma schema validation: passed.
- TypeScript: passed.
- Focused ESLint: passed.
- JavaScript syntax: passed.
- Focused `git diff --check`: passed.
- Temporary patch-file scan: clean.
- Direct authority scan: required allocation ledger link present; no legacy payment create or sales-order payment-status mutation in the settlement service.

## Certification Boundary

Current-worktree source foundation: GO.

Repository integration and production deployment: NO-GO. The migration was not applied to a PostgreSQL environment, migration-history health remains outside this slice, and real database concurrency/rollback behavior was not certified.

Reversal execution remains unavailable. No settlement edit/delete path, provider reconciliation, SalesInvoice aggregate, customer/supplier statement generation, immutable snapshot, signed statement access, recipient action, delivery workflow, AI authority, or WhatsApp authority is certified.

## Required Next Audit

No Slice 436 is selected. Run a fresh `/caveman full` Phase 5 audit for the narrow compensating customer-settlement reversal command before reconsidering customer statement generation.
