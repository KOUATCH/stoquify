# Phase 5 Slice 436 Selection Report

Date: 2026-08-08
Selected slice: Customer Settlement Compensating Reversal Foundation
Status: certified complete at current-worktree service-foundation level

## Why This Slice

Slice 435 can post and allocate an incoming settlement, but source truth cannot yet be corrected. A generic journal-only reversal would create accounting, customer-ledger, allocation, event, and source-state drift. A source-owned compensating command is therefore required before customer statement generation can be reconsidered.

## In Scope

1. Add explicit payment-reversal ledger vocabulary and persistence evidence.
2. Add direct allocation-to-reversal-ledger linkage and complete reversal provenance on the settlement.
3. Add a bounded reversal command schema and service-owned control context.
4. Add a distinct critical reversal permission and five-minute fresh-auth policy.
5. Validate original settlement, allocation-ledger, posting, journal, and source-link evidence.
6. Atomically claim one posted settlement for reversal with exact idempotency and conflict rules.
7. Restore each sales-order open amount and customer balance through the customer-ledger kernel.
8. Create a source-specific reversing journal by swapping the original posted lines.
9. Record source link, ledger audit, reversed-close invalidation, domain audit, applied business event, and outbox evidence.
10. Block generic journal reversal from bypassing the customer-settlement source command.
11. Update AR open-item projection and add a fail-closed release ratchet.

## Acceptance Criteria

1. Only an active tenant actor with explicit `finance.receivables.reverse` and fresh authentication may run the command.
2. Reversal date is valid, not before settlement date, and not beyond the service clock tolerance.
3. Exact idempotent replay is side-effect free; changed payload, correlation, evidence, or target conflicts.
4. Only a complete `POSTED` settlement with intact original ledger, journal, posting-batch, and source-link evidence can be reversed.
5. Every allocation receives exactly one linked `PAYMENT_REVERSAL` debit matching its amount and sales-order reference.
6. Customer balance and open-item truth are restored without direct balance writes or deleted source rows.
7. One balanced posted reversing journal references the original settlement journal and preserves dimensions.
8. Original journal, settlement status, reversal references, audit, event, outbox, and close invalidation commit atomically.
9. Generic journal reversal refuses `CUSTOMER_SETTLEMENT` source journals.
10. Report-trust fails if authorization, linkage, replay, accounting, source ownership, or bypass controls are weakened.

## Out Of Scope

- partial reversal, edit, delete, or second reversal;
- action, route, UI, dashboard, or external surface;
- provider reconciliation, cash refund, or payment-rail execution;
- SalesInvoice model and statement generation;
- migration deployment, PostgreSQL concurrency certification, or production release.

## Verification Plan

- focused reversal service and security suites;
- customer-ledger and AR open-item regression;
- posting and close-invalidation regression;
- business-event regression;
- report-trust mutation suite and live fail-mode generation;
- Prisma format, generation, and validation;
- TypeScript, focused ESLint, JavaScript syntax, direct authority scan, and scoped diff hygiene.

## Handoff

Slice 436 has completed under `stoquify-statement-proof-network`, the active `stoquify-referral-war-room-orchestrator`, and `/caveman full` discipline.

## Implementation Outcome

Slice 436 is certified at current-worktree service-foundation level. The implementation adds linked compensating ledger entries, mirrored accounting, source/event/outbox/close evidence, final aggregate CAS, AR reopening, and a generic reversal bypass guard.

Independent review hardening removed the caller-controlled clock and raw persistence result, added applied event/outbox replay validation, and strengthened the release ratchet. Verification passed 15 reversal tests, 73 combined boundary tests, 262 report-trust mutations, TypeScript, Prisma validation/generation, focused lint, syntax, and hygiene checks. Live report-trust readiness is 30/30.

No action, route, UI, provider refund, statement surface, migration deployment, or PostgreSQL concurrency claim is included. No Slice 437 is selected; the next run is a fresh post-Slice 436 war-room audit.
