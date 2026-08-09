# Phase 5 Slice 438 Selection Report

Date: 2026-08-08
Selected slice: Immutable Posted Customer Receivable Document Foundation
Status: selected for next implementation run

## Why This Slice

Slice 437 closed authenticated reversal execution but statement-readiness still lacks immutable, invoice-grade
receivable source truth. Without a dedicated posted receivable document, customer statements cannot be
issued safely and any external proof surface would be anchored to mutable operational `SalesOrder` fields and
ledger projections.

Slice 438 is required before slice families for:

- customer statement generation,
- signed statement access,
- dispute/promise-to-pay actions,
- and external delivery.

## In Scope

1. Add an immutable, tenant-scoped posted customer receivable aggregate (for example `CustomerReceivableDocument`)
   with strict organization and customer ownership.
2. Define canonical receivable identity and versioning fields:
   document number/version, issued date, invoice date, due date, currency, payment terms, status transitions
   (`DRAFT`, `ISSUED`, `PAID`, `CANCELLED`/`VOIDED`), and cancellation/reversal lineage.
3. Capture posted-document financial totals (subtotal, tax, discount, paid, unpaid, currency precision),
   tenant/customer snapshot fields, and signed metadata references for audit/event replay.
4. Add a customer grouping/read model that produces customer-scoped receivable lines and open/closed status
   from immutable posted docs, not mutable `SalesOrder` rows.
5. Define deterministic settlement linkage from existing `CustomerSettlement`/allocation sources to
   posted receivables and settlement application state.
6. Add a migration/backfill strategy for existing legacy `SalesOrder` and settlement rows and classify
   migration health as a release gate for this slice.
7. Add a fail-closed report-trust mutation that checks:
   identity stability, tenant isolation, monetary precision, status transitions, cancellation/correction evidence,
   and posted-source replay integrity.

## Acceptance Criteria

1. A posted receivable can be generated from settlement events and/or legacy order state without mutable
   order data becoming proof authority.
2. Customer receivables expose immutable identifiers and versioned lifecycle state with explicit cancellation lineage.
3. Open-item calculations for statement readiness come from the posted receivable aggregate first, with
   deterministic tie-breakers and reproducible evidence.
4. Settlement application and reversal effects are represented through stable source links to posted docs.
5. Any consumer requesting statement support (future slices) can rely on posted-doc evidence, not `SalesOrder`
   presentation fields.
6. No route, action, API, UI, statement token, recipient workflow, or delivery channel is introduced in Slice 438.
7. Slice 438 report-trust coverage includes one mutation for weakening posted-document immutability or tenant scoping.

## Out of Scope

- customer/supplier statement APIs, routes, tokens, or recipient flows;
- signed access, disputes, promise-to-pay, or delivery channels;
- AI/copilot or WhatsApp execution;
- repository integration, migration-history sign-off, PostgreSQL concurrency, or production release certification.

## Verification Plan

- `rg` evidence checks on schema/model bindings and statement-read dependencies:
  `rg -n "model\\s+SalesInvoice|model\\s+CustomerReceivable|referenceType:\\s*\"SALES_ORDER\"|evidenceGrade"` `prisma/schema.prisma` `services/accounting`
- focused slice selection handoff review and status register refresh.

## Handoff

Slice 438 is now the next selected roadmap slice.

Next skill: `stoquify-statement-proof-network` and implementation should execute through:

- `/stoquify-statement-proof-network` command routing,
- under `/caveman full` with `stoquify-referral-war-room-orchestrator`.
