# Workflow Assurance Multi-Finding Persistence Certification

Date: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Slice: Phase 3 / Slice 9  
Skill: `stoquify-cash-leakage-radar`  
Status: certified with one local environment note

## Decision

Slice 9 is certified as dormant generic Workflow Assurance infrastructure. Stoquify can now persist one normalized definition execution, zero through 100 immutable finding snapshots, and any resulting incident/event/audit/alert evidence inside one Serializable transaction with replay-safe execution identity.

This does not activate POS cash-shortage detection. No cash-shortage registry definition, runner, worker, scheduler, production threshold, route, action, dashboard, inventory-loss behavior, AI authority, or WhatsApp authority was added.

## What Changed

- `WorkflowAssuranceCheckRun` now carries optional `executionKey` and `executionDigest` evidence with a tenant/check/version/key uniqueness constraint.
- New `WorkflowAssuranceCheckFinding` stores immutable per-run source findings with ordinal, stable source identity, source hash, fingerprint, counts, evidence links, metadata, and optional incident linkage.
- The registry runner boundary now accepts the Slice 8 aggregate-plus-findings envelope and persists through a dedicated persistence service.
- The persistence service validates aggregate reconciliation, computes a canonical digest, detects identical replays, rejects key reuse with different evidence, retries database serialization races, and writes all evidence in one transaction.
- The incident upsert now has a transaction-aware helper while preserving the existing public wrapper for current callers.
- Workflow Assurance release/runtime gates now require the finding table, Slice 9 migration row, execution-key index, finding ordinal/fingerprint indexes, and tenant/source lookup index.
- Focused unit, migration, release-gate, runtime-gate, and gated PostgreSQL certification coverage was added.

## Verification Evidence

- `npx prisma validate`: passed.
- `npx prisma migrate status`: passed; PostgreSQL database `dbakesman` at `localhost:5432` reports 24 migrations and schema up to date.
- `npm run workflow:assurance:runtime-check`: passed; 7/7 runtime tables, 3/3 migration rows, 0 blockers.
- `npm run workflow:assurance:release-gate`: passed; 37/37 checks, 11/11 indexes, 2/2 engine-health gates, 0 blockers.
- Focused Slice 9 suite: passed; 6 suites passed, 1 gated suite skipped, 72 tests passed, 3 skipped.
- Gated PostgreSQL persistence certification with `RUN_WORKFLOW_ASSURANCE_PERSISTENCE_POSTGRES_CERTIFICATION=1`: passed; 1 suite, 3 tests.
- Expanded assurance suite: passed; 9 suites passed, 2 gated suites skipped, 94 tests passed, 8 skipped.
- `npm run service:boundary:fail`: passed; 0 active service-boundary violations.
- `npm run typecheck`: passed.
- Focused ESLint over touched Slice 9 files: passed.
- Scoped `git diff --check` over Slice 9 files: passed.

## Environment Note

`npx prisma generate` was attempted twice after successful schema validation and failed both times with Windows `EPERM` while renaming `node_modules/.prisma/client/query_engine-windows.dll.node`. Running Node processes in the shared desktop workspace appear to hold the Prisma engine DLL open. I did not terminate those processes because they may belong to unrelated local dev servers or tasks. The generated client was already usable for the passing typecheck, runtime gate, and PostgreSQL certification.

## Safety Assessment

- Aggregate reconciliation fails before persistence when finding counts, strongest status, or maximum severity do not match the aggregate.
- Identical execution key plus digest replay returns the original receipt and performs no duplicate incident, event, audit, alert, run, or finding write.
- Same execution key with different evidence fails as a conflict.
- Different execution keys for the same source create distinct runs and findings while converging to one stable incident occurrence.
- Finding snapshots reject update and delete at the database trigger boundary.
- Permission denial, missing runner, and runner-wide errors remain aggregate-only executions with zero source findings.

## Remaining Gates

- Money-protection incident lifecycle remains uncertified: source recheck, allowed transitions, tenant-safe assignment, suppression, waiver, resolution, and maker-checker closure still require a separate slice.
- Worker checkpointing, lease, retry, watermark, overlap recovery, and scheduler activation remain unauthorized.
- Production cash-shortage policy entry and threshold approval remain unauthorized.
- Any product UI, notification, WhatsApp, or AI surface must stay downstream of deterministic service-owned evidence.

## Handoff

Return to `/stoquify-referral-war-room`. The next candidate should be the POS money-protection incident lifecycle control. Do not select worker, detector, scheduler, notification, dashboard, AI, or WhatsApp activation before the lifecycle gate is certified.
