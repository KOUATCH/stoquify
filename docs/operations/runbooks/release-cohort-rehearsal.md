# Release cohort operations rehearsal

This procedure qualifies a declared candidate and environment. It does not authorize production activation. Local synthetic evidence must remain distinct from hosted controls, operator acceptance and country/provider qualification.

## Candidate and environment

Record HEAD, dirty-source archive and its digest, owned hunks, migration checksums, lockfile, required vendored dependencies, runtime versions and capability/cohort. Concurrent edits belong to their authors; never reset the shared tree to obtain a clean test. Freeze datamodel bytes for paired schema comparisons. Reject changed catalogs and record source drift rather than relabeling earlier evidence as current.

The S12 local runner is `node scripts/run-s12-rehearsal.cjs <existing-evidence-directory>`. Inspect its current definition and registry before execution. It creates two new localhost databases, replays the captured migrations, seeds synthetic POS/auth/operational data, dumps the source read-only and restores to a separate new target. It retains both databases, sanitized logs and reports; the existing restore runner removes its owned temporary dump. It never resets an existing target. HTTP alerts bind to loopback and use synthetic credentials. No production/provider configuration is inherited by the probes.

Compare all public table counts and content fingerprints before running mutating functional probes on the restored target. Then check stock value/quantity, cash, receivables, balanced journals, sale replay, retained close blockers, actual credential-handler sign-in/session/sign-out, and worker recovery. Record failed attempts as well as passes. A blocked close proof must remain blocked after restore; a persisted `CERTIFIED` label is not sufficient evidence.

## Worker and receiver contract

- A business outbox consumer may commit and then die before acknowledgement. Restart must retain the original idempotency key; the consumer must atomically deduplicate its own effect. The S12 crash probe exits after a real PostgreSQL consumer commit and before acknowledgement. Its synthetic receiver guarantee does not certify an email, payment, fiscalization or other external provider.
- Assurance webhook acknowledgements must match organization, delivery, status, worker, lock timestamp and attempt number. A stale success or failure cannot finish or reschedule another worker's lease. Expired leases are reclaimed by the existing worker; exhausted attempts become dead letters before another HTTP request.
- Assurance HTTP receivers must deduplicate using the `idempotency-key` header or the matching `idempotencyKey` payload field. This is a SHA-256 of the organization/delivery identity. `dedupeKey` remains diagnostic source-event identity and must not be used as a global receiver key. Retain receiver request IDs alongside delivery and incident IDs.
- **Existing-delivery rollout gate:** the previous worker sent a source-derived key. Before switching a live cohort, stop/drain the prior worker and reconcile any attempted pending/processing/dead-letter delivery against receiver receipts. Establish a reviewed mapping/continuation strategy for old and new keys; otherwise an accepted-but-unacknowledged old delivery could create another external effect. Do not clear receipts, reset attempts or mass-requeue to hide uncertainty.
- Providers without durable deduplication remain at-least-once destinations. Operator reconciliation, provider receipt lookup and any permitted compensation need separate proof. No exactly-once external-delivery claim follows from the local test.

## Alert receipt and incident correlation

Exercise an approved synthetic incident against the actual nonproduction alert receiver and verify receipt, incident/delivery IDs, request ID, receiver key and operator access to the relevant incident. Retain timestamps and the observed responder. Local localhost receipt proves the transport/persistence path only. Verify host log collection and search by the action's correlation ID separately; console emission alone is insufficient. Never record bearer secrets, session tokens, passwords or raw financial payloads in the release evidence.

## Recovery objectives and owner handover

Record approved RPO (maximum acceptable data loss), RTO (time to usable service), backup/PITR retention, database/provider/region, restore permissions, named incident commander, recovery operator, domain acceptor and escalation route. Unassigned owners or unapproved objectives are release gates. Measure from a declared incident trigger through restored authentication, financial invariants, worker catch-up and user availability. A local dump/restore stopwatch is not deployed RTO. No lost synthetic pre-backup rows is not a production RPO measurement.

Confirm PITR/retention from actual provider configuration and recovery tests, including a specified recovery point and writes around that point. Do not infer it from a subscription tier, a runbook recommendation, a successful `pg_dump`, or a historical report.

## Stop and rollback triggers

Stop promotion/cohort expansion on mismatched candidate bytes, migration history drift, balance mismatch, lost pending intent, duplicate consumer effects, stale lease acknowledgement, missing alert receipt or failed authentication. The release lead owns the stop decision; the domain acceptor confirms financial recovery. Both must be named before rollout.

Keep the failed target and evidence for diagnosis. Never restore over the source during rehearsal. Promote only a reviewed prior artifact compatible with the expanded schema; schema/data changes need a reviewed fix-forward or restore/reconciliation procedure. Verify the hosting hook and protected environment actually enforce the [artifact/schema sequence](../../release/ARTIFACT_SCHEMA_PROMOTION.md).

## Gates carried from S06–S11

| Step | Unresolved rollout evidence |
| --- | --- |
| S06 | Trusted ingress/header ownership and origin isolation; shared multi-instance enforcement; outage policy and realistic POS/NAT false-throttle behavior. Legacy IP compatibility and per-process fallback are not distributed qualification. |
| S07 | Opt-in EN/FR login CSP cohort only; real authentication/navigation/POS/upload/public flows, supported-browser report-only behavior and rendering/cache cost remain open. Default stays off. |
| S08 | Authenticated deployment journeys, payroll settlement UI, representative operators, task/error baseline and agreed improvement target, screen-reader/broader-browser evidence. Initial synthetic POS/AP checks are not enterprise-wide UX acceptance. |
| S09 | Independent review and demonstrated maintenance benefit of the pure POS result-builder extraction. No broader decomposition based only on line counts. |
| S10 | Two measured cases missed 250 ms p95; hosted/larger samples, same-organization contention, startup/reconnect bursts and recovery-backlog drain remain open. Historical listing remains unpaginated. |
| S11 | Full current-candidate artifact/runtime and prior-application compatibility; current-catalog populated upgrade; immutable custody/trusted digest; verified hosted serialized promotion, health/rollback and independent operator review. Source archive alone may omit vendored dependencies. |

S12 adds current hosted required-check policy, PITR/retention, approved recovery objectives, real receiver/deduplication evidence, legacy alert-key transition, and named handover owners. Passing the bounded local lane does not close these gates.
