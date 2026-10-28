# AqStoqFlow Close & Assurance Readiness Audit

Date: 2026-06-16
Verdict: GO_WITH_GATES
Compliance language: partial, implementation-ready

## Current Foundations Found

- `AccountingPeriod`, `JournalEntry`, `JournalEntryLine`, `LedgerPostingBatch`, `AccountingSourceLink`, and `LedgerAuditEvent` exist in `prisma/schema.prisma`.
- `getPeriodClosePreflight` already blocks period close on draft journal entries, unresolved posting batches, unlinked posted entries, open payment exceptions, open suspense, unsigned reconciliation runs, and unbalanced trial balance.
- `reconcileLedger` provides period-scoped ledger traceability and trial-balance failures.
- Payment reconciliation has provider/statement evidence, `ReconciliationRun`, certificate signing/export, suspense workflow, payment exceptions, and close-blocking dashboard counts.
- Accountant data-trust services already expose provenance, source tables, as-of metadata, audit events, and T-level trust status.
- Protected action infrastructure exists through `services/_shared/protect.ts`, RBAC permission checks, safe error mapping, and fresh-auth support.
- Accounting dashboard shell and system dashboard tokens are already available.

## Missing Pieces

- No durable Close & Assurance models or enums currently exist.
- No close readiness service, evidence graph service, protected close actions, hooks, or `/dashboard/accounting/close` route currently exist.
- No close-specific findings, assignment, comment, or waiver workflow exists.
- Close pack export/certification is intentionally outside the first usable slice.

## Build Gates

- Additive Prisma schema only; no reset, rename, or removal.
- Compose existing accounting and payment reconciliation services; do not duplicate ledger or suspense truth.
- Missing domains must render `UNAVAILABLE`, not pass or zero.
- All close actions must be organization-scoped and protected by server-side permissions.
- Sensitive waiver approval must require fresh auth and service-side segregation-of-duties checks.
- The UI must display provenance, as-of metadata, blockers, evidence coverage, and partial-data states.

## Implementation Scope For This Slice

- Add close-assurance schema, contracts, permissions, service, actions, hooks, dashboard route, evidence graph, finding/comment workflow, and focused tests.
- Leave certified close pack export to the later certification phase.
