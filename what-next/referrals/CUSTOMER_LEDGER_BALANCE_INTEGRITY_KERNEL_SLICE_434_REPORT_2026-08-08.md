# Customer Ledger Balance Integrity Kernel - Slice 434 Report

Date: 2026-08-08
Phase: 5 - Statement Hub And External Proof Network
Status: certified complete at current-worktree implementation level

## Outcome

Slice 434 moved customer running-balance authority from POS callers into `services/accounting/customer-ledger.service.ts`.

The helper no longer accepts `balanceAfter`. It resolves the customer by tenant, derives the next balance from the stored current balance and one-sided movement, enforces customer-ledger type polarity, prevents negative balances, optionally enforces the credit limit, and claims the balance with a tenant-scoped compare-and-set update before appending the ledger row.

Both live producers now use that kernel:

- POS on-account sale delegates the debit and service-owned credit-limit check.
- POS on-account void delegates the credit-note balance reduction.
- Neither caller writes `Customer.currentBalance` or supplies a running balance.

## Source-Truth Decision

The original customer-statement read-model candidate was rejected and removed even though its prototype suite passed 18/18. Source tracing proved that the customer ledger currently contains POS on-account residuals and voids, not a complete invoice/receipt/allocation chronology. There is no production customer-settlement writer or receipt-to-invoice allocation model.

This slice improves the integrity of existing ledger truth without relabeling it as an authoritative customer statement.

## Controls Added

- nonblank organization, customer, and description inputs;
- valid service-normalized entry date;
- nonnegative and exactly one-sided movement amount;
- explicit debit/credit polarity by `LedgerEntryType`, with `ADJUSTMENT` retained as the controlled bidirectional exception;
- tenant and soft-delete scoped customer resolution;
- service-derived two-decimal running balance;
- nonnegative resulting balance;
- service-owned optional credit-limit enforcement;
- tenant/customer/prior-balance/soft-delete compare-and-set update;
- conflict on a lost balance claim with no ledger append;
- normalized source reference fields.

## Release Ratchet

`customer_ledger_service_owned_balance_integrity_kernel` was added to the existing report-trust gate. It checks the service-owned lookup, derivation, polarity, negative-balance guard, credit-limit guard, compare-and-set scope/result, write ordering, and both POS integrations.

The focused gate suite includes 11 new mutations covering caller-supplied balances, lookup scope, polarity, negative balances, credit limits, non-CAS updates, CAS scope/result, and POS bypasses.

## Verification

- Customer-ledger and POS focused run: 2 suites / 38 tests passed.
- Report-trust gate suite: 1 suite / 223 tests passed.
- Consolidated affected-boundary run: 6 suites / 273 tests passed.
- Live report-trust fail gate: ready, 28/28 checks, zero blockers.
- TypeScript: passed.
- Focused ESLint: passed.
- JavaScript syntax: passed.
- Focused `git diff --check`: passed.
- Direct authority scan: exactly two POS customer-ledger calls; no caller-supplied `balanceAfter`, direct POS customer balance update, or `sale.customer.currentBalance` dependency remains in the migrated paths.

## Certification Boundary

This certifies the current-worktree balance-integrity kernel and its two migrated POS producers. It does not certify repository integration, migration history, PostgreSQL concurrency behavior, production deployment, complete receivables truth, customer settlement, invoice allocation, customer/supplier statements, snapshots, signed external access, recipient actions, or delivery.

## Required Next Audit

Run a fresh Phase 5 audit for a source-owned customer-settlement and allocation command. That slice must address idempotency, invoice allocation conservation, payment evidence, accounting posting, reversal semantics, audit/business events, permissions, and migration proof before statement generation is reconsidered.
