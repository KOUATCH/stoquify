# Payroll Trust Spine migration, cutover, and rollback contract

## Additive migration

1. Add `PayrollRunTransitionOrigin` with `RUNTIME` and `LEGACY_BACKFILL`.
2. Add `PayrollRunTransitionEvidenceStatus` with `VERIFIED` and `LEGACY_PARTIAL_EVIDENCE`.
3. Add an append-only `PayrollRunTransition` table with organization/run compound ownership, sequence, source/target status, source/resulting version, actor, timestamps, event link, idempotency key, payload hash, origin, evidence status, and optional legacy note.
4. Add nullable evidence links to current source models:
   - payroll run: `reviewedAt`, reviewed/approved/emitted business-event IDs, and transitions;
   - payslip: emitted business-event ID;
   - HR time request: decision business-event ID.
5. Add tenant-compound foreign keys and uniqueness for:
   - `(organization_id, run_id, sequence)`;
   - `(organization_id, run_id, to_status)`;
   - `(organization_id, idempotency_key)`;
   - `(organization_id, business_event_id)` when present.
6. Add checks that distinguish runtime from legacy evidence:
   - runtime rows require source status, actor, event, verified evidence, and consecutive versions;
   - legacy rows require partial-evidence status and may leave unavailable facts null.
7. Install update/delete rejection triggers for the transition ledger.

No column is removed, no current evidence is rewritten, and all new source evidence links remain nullable during migration and backfill.

## Historical inventory and backfill

Before backfill, record counts by tenant and status, detect orphan source/event references, and hash the candidate set. For an existing run whose current status proves a combined historical lifecycle, append exactly one `LEGACY_BACKFILL` snapshot describing only facts already present on the run. Do not synthesize intermediate transition rows or infer missing actors, event IDs, stage times, idempotency keys, or sequence history.

Backfill must be restartable and idempotent. A second run must produce zero additional transition rows. Any conflict, ambiguous tenant ownership, or missing run identity is quarantined for review rather than repaired automatically.

## Cutover

1. Deploy additive schema and append-only controls.
2. Validate schema, tenant compound keys, trigger behavior, and no-op rerun.
3. Run historical inventory/backfill and reconcile before/after counts and hashes.
4. Deploy the four lifecycle commands and protected actions with writes still disabled.
5. Pass focused negative, tenant-isolation, SoD, idempotency, concurrency, rollback, and gate-mutation tests.
6. Remove external access to `approveAndPostPayrollRun` and its combined action.
7. Enable `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true` in a controlled environment.
8. Verify the command/read model and canonical event/outbox evidence before broader rollout.

## Incident rollback

Set `PAYROLL_TRUST_SPINE_WRITES_ENABLED` to a value other than `true`. New lifecycle commands must then fail closed with `PAYROLL_LIFECYCLE_WRITES_DISABLED`. Retain the additive schema, transition ledger, events, outbox records, audit evidence, accounting journals, source links, and close invalidations. Do not delete evidence, reverse a committed posting in place, or restore the combined command. Recovery resumes from the persisted last valid transition or uses the governed correction/reversal workflow.

## Acceptance evidence

- Migration applies to an empty and representative populated database.
- Tenant-crossed foreign keys and commands fail.
- Runtime rows with missing evidence fail.
- Legacy rows cannot claim verified evidence.
- Transition update/delete fails.
- Backfill rerun is a no-op.
- A failure at every transactional stage leaves no partial transition, event, outbox, audit, close invalidation, payslip, journal, or status/version change.
