# Phase 3 close publication and source revision contract

Implemented 2026-10-16. Extends [the close control contract](CLOSE_CONTROL_CONTRACT.md) and [account reconciliation coverage](ACCOUNT_RECONCILIATION_COVERAGE.md). Scope version remains 1; source revision is a separate versioned contract. See [execution evidence](CLOSE_PUBLICATION_RACE_SAFETY_EVIDENCE_2026-10-16.md) for tested boundaries.

## Publication rules

1. Before collecting evidence, create a RUNNING assessment with `metadata.sourceRevision = { version: 1, revision: "<decimal integer>" }`. PostgreSQL stores an organization-level BIGINT; JSON uses a string to avoid precision loss.
2. Collection runs outside the publication transaction. Its result is eligible only if the revision is unchanged and this remains the latest, unambiguous assessment for the period.
3. Final publication locks period assessment order, then the organization revision row, then the close run. It rechecks revision/order before writing findings, evidence, checklist state or readiness. A conditional RUNNING update preserves existing invalidation/voiding decisions.
4. Certified export follows the same order and reloads the run after waiting. Missing, malformed or changed revisions deny certification. Invalidation commits before the caller receives the denial. Existing authorization, independent review, freshness and domain checks remain.
5. Publication requires Read Committed. The revision helper rejects other isolation levels: an earlier read must not prevent observation of a source commit after waiting.

A source writer committing first changes the revision, so publication is rejected. If publication locks first, the writer waits, then invalidates the result in its own transaction. Source rollback leaves no revision change, stale marker or provenance record.

## Source registry

The migration's explicit table list is authoritative. BEFORE ROW INSERT/UPDATE/DELETE triggers increment the revision, retain minimal provenance, block active assessments and mark retained certified exports stale atomically with the source mutation. Direct SQL and application writes share this guard. Exact no-op updates are ignored. Disabled triggers, privileged TRUNCATE and trigger bypass are outside the contract.

| Family | Covered sources |
|---|---|
| Setup/ledger | Organization, fiscal year/period, accounting settings, chart, journal, payment rail, journal entry/line, posting batch, source link |
| Reconciliation | Provider/settlement account, provider event, statement file/line, payment transaction, match, reconciliation run, no-activity evidence, suspense, exception |
| Inventory | Item, location, transaction, adjustment, count session; inventory levels and adjustment/count lines resolve organization through their parent |
| Purchasing | Supplier invoice, payment, allocation, credit note |
| Payroll | Period, run, transition, run line, payslip, declaration/evidence, payment batch/allocation, employee balance case/event |
| Other controls | Fiscal document, business event, offline POS event/conflict/certificate |
| Audit-backed evidence | Audit rows with both `PayrollPilotCycleCertification` entity type and `PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED` action, including changes into/out of that subset |

Ordinary audit records and nonfailed close business events are outputs and do not self-invalidate. FAILED/REJECTED close events remain source changes because data trust consumes those failures. Existing typed application invalidation still retains domain-specific audit evidence after the database guard has blocked a run.

Invalidation deliberately covers all periods of the organization: later-recorded transactions and changed opening balances can affect earlier obligations or later cumulative balances. This can require reassessment after unrelated-period or descriptive changes. Effective-dated dependency narrowing is not inferred. Reassignment invalidates both distinct organizations in sorted order.

## Retention and rollout

`close_source_changes` retains organization, revision, source table/ID, operation and database time without copying financial payloads or personal details. Every mutation is retained even when evidence is already stale. Certificate hashes, certification flags and historical metadata remain; stale status prevents current reliance. Already-stale exports retain their first invalidation marker.

Deployment blocks legacy active assessments and marks retained certified exports stale with `CLOSE_REVISION_CONTRACT_REQUIRED`; those records did not observe this protocol. Regenerate the application Prisma client and deploy migration/compatible code through normal release controls, then reassess. Historical hashes are not rewritten. This implementation migrated only disposable databases.

Revision locking serializes financial writes within an organization. Large imports can increase contention. Existing domain locks remain; deadlock/timeout failures must roll back and use existing operation retry paths. Tests prove the publication interleavings, not all domain-lock combinations or production throughput. Add new consumed source tables/authoritative audit categories to the registry with regression tests.

Global rules/authority changes, live authentication, arbitrary external evidence changes and rendered UI behavior are not certified here. Existing controls remain responsible for those boundaries. Downloaded historical files cannot be recalled; consumers must consult current stale status before relying on them.
