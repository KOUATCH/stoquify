# Phase 5 Post-Slice 434 Audit Report

Date: 2026-08-08
Phase: 5 - Statement Hub And External Proof Network
Operating skills: `caveman` (`full`), `stoquify-referral-war-room-orchestrator`, `stoquify-statement-proof-network`
Decision: Slice 435 selected

## Current-Worktree Evidence

- Slice 434 made customer running balances service-owned and compare-and-set protected, but production customer-ledger credits still come only from POS voids.
- `AccountingSourceType.CUSTOMER_SETTLEMENT` and `AccountingPostingPurpose.CUSTOMER_SETTLEMENT` exist and accounting setup readiness expects the posting purpose, but no active default rule or posting command exists.
- `Payment` is a POS/purchase-order tender record and has no customer-wide multi-invoice allocation relation. Pretending that it already represents collections would lose settlement identity and allocation conservation.
- `SupplierPayment` and `SupplierPaymentAllocation` provide the strongest live persistence and command analog: tenant-scoped identity, evidence hashes, idempotency, allocation validation, ledger posting, business events, and audit evidence.
- `CustomerLedgerEntry` already supports `PAYMENT` credits and per-sales-order references. Slice 434's kernel can atomically claim each new customer balance before appending the movement.
- AR open-item truth is derived from ledger entries keyed by `referenceType = SALES_ORDER` and the sales-order ID. A settlement must therefore append one credit movement per allocation, not one unallocated customer credit.
- `finance.receivables.collect` exists in the canonical permission catalog but is not mapped by the RBAC adapter and has no sensitive-action policy.
- No customer-settlement model, allocation model, migration, service, action, reversal command, reconciliation link, statement read model, or external statement surface exists.

## Selection Decision

The next dependency-complete slice is the incoming settlement source command. A schema-only slice would create persistence without trustworthy accounting behavior, while a statement slice would still formalize incomplete receivables truth.

## Selected Slice

**Slice 435: Customer Settlement And Invoice Allocation Source Foundation**

Required product scope:

- dedicated tenant-scoped `CustomerSettlement` and `CustomerSettlementAllocation` models plus an explicit PostgreSQL migration;
- service-owned organization currency and active actor/customer validation;
- `finance.receivables.collect` RBAC mapping and a critical five-minute fresh-auth sensitive-action policy;
- required idempotency and evidence hashes, with exact replay and conflicting reuse rejection;
- unique, positive, bounded allocations whose sum exactly equals the settlement amount;
- allocation targets constrained to non-deleted sales orders for the same tenant and customer;
- allocation amounts constrained by source-owned per-order customer-ledger open balances;
- one `PAYMENT` customer-ledger credit per sales-order allocation through the Slice 434 kernel;
- an active configured `CUSTOMER_SETTLEMENT` posting rule, balanced journal entry, posting batch, source link, ledger audit, and close-evidence invalidation;
- one immutable business event/outbox record and one domain audit record in the same serializable transaction;
- fail-closed treatment of incomplete or already-reversed replay evidence.

## Reversal Boundary

The persistence vocabulary reserves `POSTED` and `REVERSED` settlement states, but Slice 435 does not expose a reversal mutation. Settlements are never edited or deleted in place. A later selected slice must add a fresh-auth, compensating reversal command that restores each allocation, reverses the journal, updates the settlement state by compare-and-set, and records dedicated evidence. Customer statements remain blocked until that path is certified.

## Non-Goals

- no server action, API route, page, dashboard, hook, or public link;
- no statement generation, snapshot, statement token, dispute, promise-to-pay, or delivery;
- no reconciliation/provider matching or WhatsApp/AI authority;
- no mutation of legacy POS `Payment` semantics;
- no settlement reversal execution in this slice.

## Verification Plan

- focused settlement schema/service/posting tests;
- focused customer-ledger, posting-rule, event, RBAC, and migration checks;
- report-trust release-ratchet mutations;
- Prisma format, validation, and client generation;
- TypeScript and focused ESLint;
- JavaScript syntax, static authority scans, and focused diff hygiene.
