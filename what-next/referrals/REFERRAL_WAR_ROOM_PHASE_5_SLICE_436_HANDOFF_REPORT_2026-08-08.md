# Phase 5 Slice 436 Handoff Report

Date: 2026-08-08
Slice: Customer Settlement Compensating Reversal Foundation
Primary skill: `stoquify-statement-proof-network`
Status: ready for narrow implementation

## Implementation Targets

- `prisma/schema.prisma`
- one new Slice 436 migration
- `services/accounting/customer-settlement.schemas.ts`
- one source-owned customer-settlement reversal service and focused tests
- `services/accounting/customer-ledger.service.ts`
- `services/accounting/ar-open-item.service.ts` and focused tests
- `services/accounting/posting.service.ts` and focused bypass test
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/controls/sensitive-action.service.ts`
- focused settlement security tests
- `scripts/report-trust-export-gate.js` and its mutation suite

## Required Write Order

1. Validate command, authorization, service clock, tenant actor, and complete original settlement evidence.
2. Return only an exact complete replay; reject every conflicting or partial reversal state.
3. Compare-and-set the tenant settlement from `POSTED` to the claimed reversal state inside a serializable transaction.
4. Create one `PAYMENT_REVERSAL` debit per allocation through the customer-ledger kernel.
5. Attach each reversal ledger entry to its allocation with a one-row compare-and-set update.
6. Create and post one source-specific reversal batch/journal from the original lines.
7. Mark the original journal reversed and create the reversal source link and ledger audit.
8. Record reversed-close invalidation, applied business event/outbox, final settlement references, and domain audit.
9. Commit all evidence together or roll everything back.

## Guardrails

- No caller-owned tenant, actor, clock, balance, posting, or evidence authority.
- No generic journal-only reversal for customer settlements.
- No direct `Customer.currentBalance` write outside the ledger kernel.
- No deletion or mutation of original allocation amounts or original ledger rows.
- No reason, document content, authentication data, or raw metadata in audit/event/outbox payloads.
- No action, API route, UI, statement, token, delivery, AI, or WhatsApp implementation.

## Residual Release Holds

- repository ownership and integration review;
- blocked migration-history health;
- PostgreSQL migration, rollback, and concurrency evidence;
- production deployment and monitoring;
- SalesInvoice and statement-generation truth audit.
