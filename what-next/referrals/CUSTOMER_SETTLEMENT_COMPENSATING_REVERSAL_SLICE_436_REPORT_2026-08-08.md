# Customer Settlement Compensating Reversal Foundation - Slice 436 Report

Date: 2026-08-08
Phase: 5 - Statement Hub And External Proof Network
Status: certified complete at current-worktree service-foundation level

## Outcome

Slice 436 adds a source-owned, compensating reversal foundation for posted customer settlements. It does not delete or rewrite the original settlement. The command validates the original settlement, allocations, ledger credits, posting batch, journal, and accounting source link; writes one linked `PAYMENT_REVERSAL` debit per allocation through the customer-ledger balance kernel; mirrors the original journal; records reversal source, close-invalidation, audit, applied business-event, and outbox evidence; and commits the settlement transition through one final serializable compare-and-set.

The generic journal reversal path now refuses `CUSTOMER_SETTLEMENT` journals and commits a durable, redacted bypass-attempt audit before returning the refusal.

This is an internal service foundation. No action, API route, UI, external statement, provider refund, or WhatsApp/AI authority was added.

## Source Truth

- `CustomerSettlement` retains the original posted evidence and owns bounded reversal provenance.
- `CustomerSettlementAllocation.reversalCustomerLedgerEntryId` links each allocation to exactly one compensating customer-ledger debit.
- `PAYMENT_REVERSAL` is a customer debit in the balance kernel and a negative allocation in the AR open-item projection.
- Original source rows remain present; reversal changes chronology through explicit compensating evidence.
- The database invariant requires complete reversal evidence, different receiving/reversing actors, bounded reason and identifiers, shaped hashes, and a reversal date not before the settlement date.
- The service performs a final `POSTED -> REVERSED` aggregate compare-and-set only after ledger, posting, journal, source-link, event, outbox, and close-invalidation work succeeds.

## Command Controls

- bounded reversal date, reason, idempotency key, correlation ID, document hash, and evidence hash;
- active tenant and actor resolution;
- critical `finance.receivables.reverse` permission;
- five-minute L1 fresh-auth policy and maker-checker denial;
- actor-, tenant-, assurance-organization-, level-, and timestamp-bound auth evidence;
- one service-owned clock shared by preflight, in-transaction authorization, reversal-date tolerance, and audit timestamps;
- actor-bound idempotency hash and same-actor exact replay;
- three bounded `P2034` attempts and exact `P2002` replay recovery;
- no direct customer-balance mutation and no direct aggregate update outside the final `updateMany` claim.

The service accepts a trusted control context but has no product call site. A future action must derive identity, permissions, and fresh-auth claims from the authenticated server session. Public execution remains unauthorized until that boundary is implemented and tested.

## Replay Assurance

Exact replay now revalidates:

- original and reversal customer-ledger rows;
- original and reversal posting batches;
- original reversed journal and posted mirror journal;
- original and reversal accounting source links;
- the tenant-scoped, applied reversal business event;
- event payload hash;
- the expected notification outbox identity and payload hash.

A dangling or mismatched event/outbox reference no longer qualifies as completed replay evidence.

## Review Hardening

An independent security review identified four concerns. The slice was hardened before certification:

1. The caller-controlled clock was removed; the service now owns one execution instant.
2. The raw persistence row was removed from the result; only bounded reversal identifiers and status are returned.
3. Replay now verifies the applied business event and outbox evidence.
4. The report-trust ratchet now requires allocation/final CAS count checks, service-owned time, event replay validation, and the bounded result shape.

The report-trust gate remains a static source ratchet, not runtime or production proof. Its certification boundary is stated accordingly.

## Release Ratchet

`customer_settlement_compensating_reversal_foundation` verifies schema and migration evidence, command bounds, actor-bound auth evidence, critical RBAC, maker-checker controls, service-owned time, serializable retry/recovery, balance-kernel use, allocation and final CAS count checks, journal/source/event ordering, applied-event replay validation, AR reopening, generic-reversal refusal, and bounded return data.

Five review-driven mutations were added for caller-controlled time, missing allocation CAS count validation, missing applied-event replay validation, missing final CAS count validation, and raw settlement-row return.

## Verification

- Hardened reversal service: 1 suite / 15 tests passed.
- Combined accounting, event, posting-guard, and security boundary: 8 suites / 73 tests passed.
- Report-trust mutation suite: 1 suite / 262 tests passed.
- Live report-trust fail gate: ready, 30/30 checks, zero blockers.
- Prisma schema validation: passed.
- Prisma client generation: passed with `--no-engine`.
- TypeScript: passed.
- Focused ESLint: passed; the broader first pass had zero errors and one pre-existing anonymous-default-export warning in `config/permissions.ts`.
- JavaScript syntax: passed.
- Focused diff and trailing-whitespace checks: passed.
- Public exposure scan: no action, route, UI, or other product call site.
- Temporary patch/reject scan: clean.

## Certification Boundary

Current-worktree service foundation: GO.

Authenticated product execution, repository integration, and production deployment: NO-GO.

The migration was not applied to PostgreSQL. Migration-history health, rollback, and real concurrent transaction behavior were not certified. No public action derives the trusted control context from a server session. No provider cash refund, payment-rail execution, partial reversal, statement generation, signed statement access, recipient workflow, AI authority, or WhatsApp authority is certified.

## Required Next Audit

No Slice 437 is selected. Run `stoquify-referral-war-room-orchestrator` under `/caveman full` for a fresh post-Slice 436 Phase 5 audit before choosing either the authenticated reversal action boundary or the next invoice/statement truth slice.
